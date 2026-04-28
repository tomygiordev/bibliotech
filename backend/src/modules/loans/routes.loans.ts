import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { createLoanSchema, listLoansSchema, loanParamsSchema } from './schemas/loan.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';
import { addDays } from '../../shared/utils/date.js';
import {
  ACTIVE_RESERVATION_STATUSES,
  releaseOrPromoteReservation,
} from '../reservations/reservation-queue.js';
import { getConfig } from '../../config/config.js';

const loanInclude = {
  copy: {
    include: {
      book: { select: { id: true, title: true, isbn: true, coverUrl: true } },
      branch: { select: { id: true, name: true } },
    },
  },
  user: { select: { id: true, name: true, email: true } },
  branch: { select: { id: true, name: true } },
  fines: true,
} as const;

async function calculateOverdueFine(overdueDays: number): Promise<number> {
  if (overdueDays <= 0) {
    return 0;
  }

  const graceDays = await getConfig('OVERDUE_GRACE_DAYS', 1);
  const effectiveDays = overdueDays - graceDays;

  if (effectiveDays <= 0) {
    return 0;
  }

  const fineCap = await getConfig('FINE_CAP', 100);
  let fine = 0;

  if (effectiveDays <= 7) {
    fine = effectiveDays * 1;
  } else if (effectiveDays <= 14) {
    fine = 7 * 1 + (effectiveDays - 7) * 2;
  } else if (effectiveDays <= 30) {
    fine = 7 * 1 + 7 * 2 + (effectiveDays - 14) * 3;
  } else {
    fine = 7 * 1 + 7 * 2 + 16 * 3 + (effectiveDays - 30) * 5;
  }

  return Math.min(fine, fineCap as number);
}

export async function loanRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = listLoansSchema.parse(request.query);
    const now = new Date();
    const where: any = {};

    if (query.userId) where.userId = query.userId;

    if (query.branchId) where.branchId = query.branchId;

    if (query.status === 'active') {
      where.returnDate = null;
    }

    if (query.status === 'returned') {
      where.returnDate = { not: null };
    }

    if (query.status === 'overdue') {
      where.returnDate = null;
      where.dueDate = { lt: now };
    }

    const search = query.q?.trim().slice(0, 120);
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { copy: { barcode: { contains: search } } },
        { copy: { book: { title: { contains: search } } } },
        { copy: { book: { isbn: { contains: search } } } },
      ];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: loanInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.status === 'returned'
          ? { returnDate: 'desc' }
          : query.status === 'all'
            ? { createdAt: 'desc' }
            : { dueDate: 'asc' },
      }),
      prisma.loan.count({ where }),
    ]);

    return reply.send({
      data: loans,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const input = createLoanSchema.parse(request.body);

    const [copy, user] = await Promise.all([
      prisma.copy.findUnique({
        where: { id: input.copyId },
        include: { branch: { select: { id: true, name: true, isActive: true } } },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true, isActive: true, blockedUntil: true },
      }),
    ]);

    if (!copy) {
      throw new AppError('Copy not found', 'NOT_FOUND', 404);
    }

    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404);
    }

    if (!user.isActive) {
      throw new AppError('User is inactive', 'FORBIDDEN', 403);
    }

    if (copy.status !== 'AVAILABLE') {
      throw new AppError('Copy is not available', 'BAD_REQUEST', 400);
    }

    if (copy.branchId !== input.branchId) {
      throw new AppError('Copy belongs to another branch', 'BAD_REQUEST', 400);
    }

    if (!copy.branch.isActive) {
      throw new AppError('Branch is inactive', 'BAD_REQUEST', 400);
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw new AppError('User is blocked', 'FORBIDDEN', 403);
    }

    const [activeLoansCount, maxActiveLoans] = await Promise.all([
      prisma.loan.count({
        where: { userId: input.userId, returnDate: null },
      }),
      getConfig('MAX_ACTIVE_LOANS', 5),
    ]);

    if (activeLoansCount >= maxActiveLoans) {
      throw new AppError(`User has reached maximum of ${maxActiveLoans} active loans`, 'BAD_REQUEST', 400);
    }

    const pendingFines = await prisma.fine.count({
      where: { userId: input.userId, status: 'PENDING' },
    });

    if (pendingFines > 0) {
      throw new AppError('User has pending fines', 'FORBIDDEN', 403);
    }

    const [defaultLoanDays, defaultMaxRenewals] = await Promise.all([
      getConfig('DEFAULT_LOAN_DAYS', 14),
      getConfig('DEFAULT_MAX_RENEWALS', 2),
    ]);

    const loan = await prisma.$transaction(async (tx) => {
      const updatedCopy = await tx.copy.updateMany({
        where: { id: input.copyId, status: 'AVAILABLE' },
        data: { status: 'LOANED' },
      });

      if (updatedCopy.count !== 1) {
        throw new AppError('Copy is not available', 'BAD_REQUEST', 400);
      }

      const createdLoan = await tx.loan.create({
        data: {
          copyId: input.copyId,
          userId: input.userId,
          branchId: input.branchId,
          loanDate: new Date(),
          dueDate: addDays(new Date(), input.dueDays || defaultLoanDays as number),
          maxRenewals: defaultMaxRenewals as number,
          status: 'ACTIVE',
        },
        include: loanInclude,
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_LOAN',
          entityType: 'Loan',
          entityId: createdLoan.id,
          userId: request.userId,
          metadata: JSON.stringify({
            copyId: input.copyId,
            borrowerId: input.userId,
            branchId: input.branchId,
          }),
        },
      });

      return createdLoan;
    });

    return reply.status(201).send({ data: loan });
  });

  fastify.post('/:id/return', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = loanParamsSchema.parse(request.params);

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { copy: true, user: true },
    });

    if (!loan) {
      throw new AppError('Loan not found', 'NOT_FOUND', 404);
    }

    if (loan.returnDate) {
      throw new AppError('Loan already returned', 'BAD_REQUEST', 400);
    }

    if (loan.copy.status !== 'LOANED') {
      throw new AppError('Copy is not currently on loan', 'BAD_REQUEST', 400);
    }

    const now = new Date();
    const isOverdue = now > loan.dueDate;
    const overdueDays = isOverdue
      ? Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const [overdueFine, defaultLoanDays, defaultMaxRenewals] = await Promise.all([
      calculateOverdueFine(overdueDays),
      getConfig('DEFAULT_LOAN_DAYS', 14),
      getConfig('DEFAULT_MAX_RENEWALS', 2),
    ]);

    const updatedLoan = await prisma.$transaction(async (tx) => {
      if (overdueFine > 0) {
        await tx.fine.create({
          data: {
            amount: overdueFine,
            reason: `Overdue by ${overdueDays} days`,
            userId: loan.userId,
            loanId: loan.id,
          },
        });
      }

      await releaseOrPromoteReservation(tx, loan.copyId);

      const returnedLoan = await tx.loan.update({
        where: { id },
        data: { returnDate: now, status: 'RETURNED' },
        include: loanInclude,
      });

      await tx.auditLog.create({
        data: {
          action: 'RETURN_LOAN',
          entityType: 'Loan',
          entityId: id,
          userId: request.userId,
          metadata: JSON.stringify({
            copyId: loan.copyId,
            borrowerId: loan.userId,
            overdueDays,
            fineAmount: overdueFine,
          }),
        },
      });

      const readyReservation = await tx.reservation.findFirst({
        where: {
          copyId: loan.copyId,
          status: 'READY',
          expiresAt: { gt: now },
        },
      });

      if (readyReservation) {
        const [user, activeLoansCount, pendingFines, maxActiveLoans] = await Promise.all([
          tx.user.findUnique({
            where: { id: readyReservation.userId },
            select: { id: true, isActive: true, blockedUntil: true },
          }),
          tx.loan.count({ where: { userId: readyReservation.userId, returnDate: null } }),
          tx.fine.count({ where: { userId: readyReservation.userId, status: 'PENDING' } }),
          getConfig('MAX_ACTIVE_LOANS', 5),
        ]);

        if (user && user.isActive && (!user.blockedUntil || user.blockedUntil <= now) &&
            activeLoansCount < maxActiveLoans && pendingFines === 0) {

          await tx.copy.update({
            where: { id: loan.copyId },
            data: { status: 'LOANED' },
          });

          const autoLoan = await tx.loan.create({
            data: {
              copyId: loan.copyId,
              userId: readyReservation.userId,
              branchId: loan.copy.branchId,
              loanDate: now,
              dueDate: addDays(now, defaultLoanDays as number),
              maxRenewals: defaultMaxRenewals as number,
              status: 'ACTIVE',
            },
            include: loanInclude,
          });

          await tx.reservation.update({
            where: { id: readyReservation.id },
            data: { status: 'COMPLETED' },
          });

          await tx.auditLog.create({
            data: {
              action: 'AUTO_FULFILL_RESERVATION',
              entityType: 'Loan',
              entityId: autoLoan.id,
              userId: request.userId,
              metadata: JSON.stringify({
                copyId: loan.copyId,
                borrowerId: readyReservation.userId,
                reservationId: readyReservation.id,
                loanId: autoLoan.id,
              }),
            },
          });
        } else {
          await tx.reservation.update({
            where: { id: readyReservation.id },
            data: { status: 'EXPIRED' },
          });
          await releaseOrPromoteReservation(tx, loan.copyId);
          await tx.auditLog.create({
            data: {
              action: 'AUTO_FULFILL_FAILED',
              entityType: 'Reservation',
              entityId: readyReservation.id,
              userId: request.userId,
              metadata: JSON.stringify({
                copyId: loan.copyId,
                reservationId: readyReservation.id,
                reason: user ? 'User constraints not met' : 'User not found',
              }),
            },
          });
        }
      }

      return returnedLoan;
    });

    return reply.send({ data: updatedLoan });
  });

  fastify.post('/:id/renew', { preValidation: [requireAuth()] }, async (request, reply) => {
    const { id } = loanParamsSchema.parse(request.params);
    const userId = request.userId;
    const userRole = request.userRole;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { copy: true, user: { select: { id: true, isActive: true, blockedUntil: true } } },
    });

    if (!loan) {
      throw new AppError('Loan not found', 'NOT_FOUND', 404);
    }

    if (userRole !== 'ADMIN' && userRole !== 'LIBRARIAN' && loan.userId !== userId) {
      throw new AppError('Cannot renew another user loan', 'FORBIDDEN', 403);
    }

    if (!loan.user.isActive) {
      throw new AppError('User is inactive', 'FORBIDDEN', 403);
    }

    if (loan.user.blockedUntil && loan.user.blockedUntil > new Date()) {
      throw new AppError('User is blocked', 'FORBIDDEN', 403);
    }

    if (loan.returnDate) {
      throw new AppError('Loan already returned', 'BAD_REQUEST', 400);
    }

    const now = new Date();
    if (loan.dueDate < now) {
      throw new AppError('Cannot renew overdue loan', 'BAD_REQUEST', 400);
    }

    if (loan.renewalCount >= loan.maxRenewals) {
      throw new AppError(`Maximum renewals (${loan.maxRenewals}) reached`, 'BAD_REQUEST', 400);
    }

    const pendingFines = await prisma.fine.count({
      where: { userId: loan.userId, status: 'PENDING' },
    });

    if (pendingFines > 0) {
      throw new AppError('User has pending fines', 'FORBIDDEN', 403);
    }

    const existingReservations = await prisma.reservation.count({
      where: { copyId: loan.copyId, status: { in: ACTIVE_RESERVATION_STATUSES } },
    });

    if (existingReservations > 0) {
      throw new AppError('Cannot renew, there are pending reservations', 'BAD_REQUEST', 400);
    }

    const defaultRenewalDays = await getConfig('DEFAULT_RENEWAL_DAYS', 7);

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        renewalCount: { increment: 1 },
        dueDate: addDays(loan.dueDate, defaultRenewalDays as number),
      },
      include: loanInclude,
    });

    return reply.send({ data: updatedLoan });
  });

  fastify.get('/my', { preValidation: [requireAuth()] }, async (request, reply) => {
    const userId = request.userId;
    const query = request.query as { history?: string; page?: string; limit?: string };
    const history = query.history === 'true';
    const page = Math.max(1, parseInt(query.page ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20') || 20));

    const where = history
      ? { userId }
      : { userId, returnDate: null };

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          copy: {
            include: {
              book: { select: { id: true, title: true, coverUrl: true, isbn: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          branch: { select: { id: true, name: true } },
        },
        orderBy: history ? { createdAt: 'desc' } : { dueDate: 'asc' },
      }),
      prisma.loan.count({ where }),
    ]);

    return reply.send({
      data: loans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  fastify.get('/overdue', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (_request, reply) => {
    const loans = await prisma.loan.findMany({
      where: {
        returnDate: null,
        dueDate: { lt: new Date() },
      },
      take: 200,
      include: loanInclude,
      orderBy: { dueDate: 'asc' },
    });

    return reply.send({ data: loans });
  });
}
