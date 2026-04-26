import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';
import { AppError } from '../../shared/errors/index.js';
import { addDays } from '../../shared/utils/date.js';
import {
  createReservationSchema,
  fulfillReservationSchema,
  listReservationsSchema,
  reservationParamsSchema,
} from './schemas/reservation.schema.js';
import {
  ACTIVE_RESERVATION_STATUSES,
  READY_RESERVATION_DAYS,
  WAITING_RESERVATION_DAYS,
  compactReservationQueue,
  releaseOrPromoteReservation,
} from './reservation-queue.js';

const DEFAULT_LOAN_DAYS = 14;
const DEFAULT_MAX_RENEWALS = 2;
const MAX_ACTIVE_LOANS = 5;
const RESERVABLE_COPY_STATUSES = ['AVAILABLE', 'LOANED', 'RESERVED'];

const reservationInclude = {
  user: { select: { id: true, name: true, email: true } },
  copy: {
    include: {
      book: { select: { id: true, title: true, isbn: true, coverUrl: true } },
      branch: { select: { id: true, name: true } },
    },
  },
} as const;

function statusWhere(status: string) {
  if (status === 'active') {
    return { status: { in: ACTIVE_RESERVATION_STATUSES } };
  }

  if (status === 'all') {
    return {};
  }

  return { status: status.toUpperCase() };
}

async function assertBorrowerCanReceiveLoan(userId: string) {
  const [user, activeLoansCount, pendingFines] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, blockedUntil: true },
    }),
    prisma.loan.count({ where: { userId, returnDate: null } }),
    prisma.fine.count({ where: { userId, status: 'PENDING' } }),
  ]);

  if (!user) {
    throw new AppError('User not found', 'NOT_FOUND', 404);
  }

  if (!user.isActive) {
    throw new AppError('User is inactive', 'FORBIDDEN', 403);
  }

  if (user.blockedUntil && user.blockedUntil > new Date()) {
    throw new AppError('User is blocked', 'FORBIDDEN', 403);
  }

  if (activeLoansCount >= MAX_ACTIVE_LOANS) {
    throw new AppError(`User has reached maximum of ${MAX_ACTIVE_LOANS} active loans`, 'BAD_REQUEST', 400);
  }

  if (pendingFines > 0) {
    throw new AppError('User has pending fines', 'FORBIDDEN', 403);
  }
}

async function expireReadyReservation(reservationId: string) {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, copyId: true, status: true, expiresAt: true },
    });

    if (!reservation || reservation.status !== 'READY' || reservation.expiresAt >= new Date()) {
      return;
    }

    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: 'EXPIRED' },
    });

    await releaseOrPromoteReservation(tx, reservation.copyId);
  });
}

async function expireReadyReservations() {
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'READY',
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
    take: 50,
  });

  for (const reservation of expiredReservations) {
    await expireReadyReservation(reservation.id);
  }
}

export async function reservationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    await expireReadyReservations();

    const query = listReservationsSchema.parse(request.query);
    const search = query.q?.trim();
    const where: any = {
      ...statusWhere(query.status),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
              { copy: { barcode: { contains: search } } },
              { copy: { book: { title: { contains: search } } } },
              { copy: { book: { isbn: { contains: search } } } },
            ],
          }
        : {}),
    };

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: reservationInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.status === 'all'
          ? { createdAt: 'desc' }
          : [{ status: 'asc' }, { expiresAt: 'asc' }, { position: 'asc' }],
      }),
      prisma.reservation.count({ where }),
    ]);

    return reply.send({
      data: reservations,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.get('/my', { preValidation: [requireAuth()] }, async (request, reply) => {
    await expireReadyReservations();

    const query = listReservationsSchema.parse(request.query);
    const userId = request.userId;

    const reservations = await prisma.reservation.findMany({
      where: {
        userId,
        ...statusWhere(query.status),
      },
      include: reservationInclude,
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    return reply.send({ data: reservations });
  });

  fastify.post('/', { preValidation: [requireAuth()] }, async (request, reply) => {
    const input = createReservationSchema.parse(request.body);
    const userId = request.userId;

    if (!userId) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const [copy, user, duplicateReservation, activeLoan] = await Promise.all([
      prisma.copy.findUnique({
        where: { id: input.copyId },
        include: {
          book: { select: { id: true, title: true } },
          branch: { select: { id: true, name: true, isActive: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true, blockedUntil: true },
      }),
      prisma.reservation.findFirst({
        where: {
          copyId: input.copyId,
          userId,
          status: { in: ACTIVE_RESERVATION_STATUSES },
        },
      }),
      prisma.loan.findFirst({
        where: {
          copyId: input.copyId,
          userId,
          returnDate: null,
        },
      }),
    ]);

    if (!copy) {
      throw new AppError('Copy not found', 'NOT_FOUND', 404);
    }

    if (!user || !user.isActive) {
      throw new AppError('User is inactive', 'FORBIDDEN', 403);
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw new AppError('User is blocked', 'FORBIDDEN', 403);
    }

    if (!copy.branch.isActive) {
      throw new AppError('Branch is inactive', 'BAD_REQUEST', 400);
    }

    if (!RESERVABLE_COPY_STATUSES.includes(copy.status)) {
      throw new AppError('Copy cannot be reserved', 'BAD_REQUEST', 400);
    }

    if (duplicateReservation) {
      throw new AppError('User already has an active reservation for this copy', 'CONFLICT', 409);
    }

    if (activeLoan) {
      throw new AppError('User already has this copy on loan', 'CONFLICT', 409);
    }

    const pendingFines = await prisma.fine.count({
      where: { userId, status: 'PENDING' },
    });

    if (pendingFines > 0) {
      throw new AppError('User has pending fines', 'FORBIDDEN', 403);
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const activeReservationsCount = await tx.reservation.count({
        where: {
          copyId: input.copyId,
          status: { in: ACTIVE_RESERVATION_STATUSES },
        },
      });

      const now = new Date();
      const isReady = copy.status === 'AVAILABLE' && activeReservationsCount === 0;
      const createdReservation = await tx.reservation.create({
        data: {
          copyId: input.copyId,
          userId,
          position: isReady ? 1 : activeReservationsCount + 1,
          status: isReady ? 'READY' : 'WAITING',
          notifiedAt: isReady ? now : null,
          expiresAt: addDays(now, isReady ? READY_RESERVATION_DAYS : WAITING_RESERVATION_DAYS),
        },
        include: reservationInclude,
      });

      if (isReady) {
        await tx.copy.update({
          where: { id: input.copyId },
          data: { status: 'RESERVED' },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE_RESERVATION',
          entityType: 'Reservation',
          entityId: createdReservation.id,
          userId,
          metadata: JSON.stringify({
            copyId: input.copyId,
            bookId: copy.bookId,
            status: createdReservation.status,
          }),
        },
      });

      return createdReservation;
    });

    return reply.status(201).send({ data: reservation });
  });

  fastify.post('/:id/cancel', { preValidation: [requireAuth()] }, async (request, reply) => {
    const { id } = reservationParamsSchema.parse(request.params);
    const userId = request.userId;
    const userRole = request.userRole;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 'NOT_FOUND', 404);
    }

    if (userRole !== 'ADMIN' && userRole !== 'LIBRARIAN' && reservation.userId !== userId) {
      throw new AppError('Cannot cancel another user reservation', 'FORBIDDEN', 403);
    }

    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new AppError('Reservation is not active', 'BAD_REQUEST', 400);
    }

    const cancelledReservation = await prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: reservationInclude,
      });

      if (reservation.status === 'READY') {
        await releaseOrPromoteReservation(tx, reservation.copyId);
      } else {
        await compactReservationQueue(tx, reservation.copyId, reservation.position);
      }

      await tx.auditLog.create({
        data: {
          action: 'CANCEL_RESERVATION',
          entityType: 'Reservation',
          entityId: id,
          userId,
          metadata: JSON.stringify({
            copyId: reservation.copyId,
            reservationUserId: reservation.userId,
          }),
        },
      });

      return updatedReservation;
    });

    return reply.send({ data: cancelledReservation });
  });

  fastify.post('/:id/fulfill', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = reservationParamsSchema.parse(request.params);
    const input = fulfillReservationSchema.parse(request.body ?? {});

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        copy: true,
        user: { select: { id: true, isActive: true, blockedUntil: true } },
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 'NOT_FOUND', 404);
    }

    if (reservation.status === 'READY' && reservation.expiresAt < new Date()) {
      await expireReadyReservation(reservation.id);
      throw new AppError('Reservation expired', 'BAD_REQUEST', 400);
    }

    if (reservation.status !== 'READY') {
      throw new AppError('Reservation is not ready to fulfill', 'BAD_REQUEST', 400);
    }

    if (reservation.copy.status !== 'RESERVED') {
      throw new AppError('Reserved copy is not available for pickup', 'BAD_REQUEST', 400);
    }

    await assertBorrowerCanReceiveLoan(reservation.userId);

    const result = await prisma.$transaction(async (tx) => {
      await tx.copy.update({
        where: { id: reservation.copyId },
        data: { status: 'LOANED' },
      });

      const loan = await tx.loan.create({
        data: {
          copyId: reservation.copyId,
          userId: reservation.userId,
          branchId: reservation.copy.branchId,
          loanDate: new Date(),
          dueDate: addDays(new Date(), input.dueDays || DEFAULT_LOAN_DAYS),
          maxRenewals: DEFAULT_MAX_RENEWALS,
        },
        include: {
          copy: {
            include: {
              book: { select: { id: true, title: true, isbn: true, coverUrl: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          fines: true,
        },
      });

      await tx.reservation.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      await compactReservationQueue(tx, reservation.copyId, reservation.position);

      await tx.auditLog.create({
        data: {
          action: 'FULFILL_RESERVATION',
          entityType: 'Reservation',
          entityId: id,
          userId: request.userId,
          metadata: JSON.stringify({
            copyId: reservation.copyId,
            borrowerId: reservation.userId,
            loanId: loan.id,
          }),
        },
      });

      return loan;
    });

    return reply.send({ data: result });
  });
}
