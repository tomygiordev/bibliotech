import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { createLoanSchema, loanParamsSchema } from './schemas/loan.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';
import { addDays } from '../../shared/utils/date.js';

const DEFAULT_LOAN_DAYS = 14;
const DEFAULT_MAX_RENEWALS = 2;
const DEFAULT_RENEWAL_DAYS = 7;
const MAX_ACTIVE_LOANS = 5;

export async function loanRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const input = createLoanSchema.parse(request.body);

    const [copy, user] = await Promise.all([
      prisma.copy.findUnique({ where: { id: input.copyId } }),
      prisma.user.findUnique({ where: { id: input.userId } }),
    ]);

    if (!copy) {
      throw new AppError('Copy not found', 'NOT_FOUND', 404);
    }

    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404);
    }

    if (copy.status !== 'AVAILABLE') {
      throw new AppError('Copy is not available', 'BAD_REQUEST', 400);
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw new AppError('User is blocked', 'FORBIDDEN', 403);
    }

    const activeLoansCount = await prisma.loan.count({
      where: { userId: input.userId, returnDate: null },
    });

    if (activeLoansCount >= MAX_ACTIVE_LOANS) {
      throw new AppError(`User has reached maximum of ${MAX_ACTIVE_LOANS} active loans`, 'BAD_REQUEST', 400);
    }

    const pendingFines = await prisma.fine.count({
      where: { userId: input.userId, status: 'PENDING' },
    });

    if (pendingFines > 0) {
      throw new AppError('User has pending fines', 'FORBIDDEN', 403);
    }

    const loan = await prisma.loan.create({
      data: {
        copyId: input.copyId,
        userId: input.userId,
        branchId: input.branchId,
        loanDate: new Date(),
        dueDate: addDays(new Date(), input.dueDays || DEFAULT_LOAN_DAYS),
        maxRenewals: DEFAULT_MAX_RENEWALS,
      },
      include: {
        copy: { include: { book: { select: { id: true, title: true } } } },
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await prisma.copy.update({
      where: { id: input.copyId },
      data: { status: 'LOANED' },
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

    const now = new Date();
    const isOverdue = now > loan.dueDate;

    if (isOverdue) {
      const overdueDays = Math.floor((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      let fineAmount = 0;

      if (overdueDays <= 7) {
        fineAmount = overdueDays * 1;
      } else if (overdueDays <= 14) {
        fineAmount = 7 * 1 + (overdueDays - 7) * 2;
      } else {
        fineAmount = 7 * 1 + 7 * 2 + (overdueDays - 14) * 5;
      }

      await prisma.fine.create({
        data: {
          amount: Math.min(fineAmount, 100),
          reason: `Overdue by ${overdueDays} days`,
          userId: loan.userId,
          loanId: loan.id,
        },
      });
    }

    await prisma.copy.update({
      where: { id: loan.copyId },
      data: { status: 'AVAILABLE' },
    });

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: { returnDate: now },
      include: {
        copy: { include: { book: { select: { id: true, title: true } } } },
        user: { select: { id: true, name: true } },
        fines: true,
      },
    });

    return reply.send({ data: updatedLoan });
  });

  fastify.post('/:id/renew', { preValidation: [requireAuth()] }, async (request, reply) => {
    const { id } = loanParamsSchema.parse(request.params);
    const userId = (request.user as any).sub;
    const userRole = (request.user as any).role;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { copy: true },
    });

    if (!loan) {
      throw new AppError('Loan not found', 'NOT_FOUND', 404);
    }

    if (userRole !== 'ADMIN' && userRole !== 'LIBRARIAN' && loan.userId !== userId) {
      throw new AppError('Cannot renew another user loan', 'FORBIDDEN', 403);
    }

    if (loan.returnDate) {
      throw new AppError('Loan already returned', 'BAD_REQUEST', 400);
    }

    if (loan.renewalCount >= loan.maxRenewals) {
      throw new AppError(`Maximum renewals (${loan.maxRenewals}) reached`, 'BAD_REQUEST', 400);
    }

    const existingReservations = await prisma.reservation.count({
      where: { copyId: loan.copyId, status: 'WAITING' },
    });

    if (existingReservations > 0) {
      throw new AppError('Cannot renew, there are pending reservations', 'BAD_REQUEST', 400);
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        renewalCount: { increment: 1 },
        dueDate: addDays(loan.dueDate, DEFAULT_RENEWAL_DAYS),
      },
      include: {
        copy: { include: { book: { select: { id: true, title: true } } } },
        user: { select: { id: true, name: true } },
      },
    });

    return reply.send({ data: updatedLoan });
  });

  fastify.get('/my', { preValidation: [requireAuth()] }, async (request, reply) => {
    const userId = (request.user as any).sub;

    const loans = await prisma.loan.findMany({
      where: { userId, returnDate: null },
      include: {
        copy: {
          include: {
            book: { select: { id: true, title: true, coverUrl: true, isbn: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return reply.send({ data: loans });
  });

  fastify.get('/overdue', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (_request, reply) => {
    const loans = await prisma.loan.findMany({
      where: {
        returnDate: null,
        dueDate: { lt: new Date() },
      },
      include: {
        copy: {
          include: { book: { select: { id: true, title: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return reply.send({ data: loans });
  });
}
