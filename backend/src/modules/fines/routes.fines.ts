import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { listFinesSchema, fineParamsSchema } from './schemas/fine.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';

const fineInclude = {
  user: { select: { id: true, name: true, email: true } },
  loan: {
    select: {
      id: true,
      dueDate: true,
      returnDate: true,
      copy: {
        select: {
          id: true,
          barcode: true,
          book: { select: { id: true, title: true } },
        },
      },
    },
  },
};

export async function fineRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = listFinesSchema.parse(request.query);
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    const search = query.q?.trim().slice(0, 120);
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { reason: { contains: search } },
      ];
    }

    const [fines, total] = await Promise.all([
      prisma.fine.findMany({
        where,
        include: fineInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fine.count({ where }),
    ]);

    return reply.send({
      data: fines,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.get('/my', { preValidation: [requireAuth()] }, async (request, reply) => {
    const userId = request.userId;

    const fines = await prisma.fine.findMany({
      where: { userId },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: fines });
  });

  fastify.patch('/:id/pay', { preValidation: [requireAuth()] }, async (request, reply) => {
    const { id } = fineParamsSchema.parse(request.params);
    const userId = request.userId;
    const userRole = request.userRole;

    const updatedFine = await prisma.$transaction(async (tx) => {
      const existing = await tx.fine.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Fine not found', 'NOT_FOUND', 404);
      }
      if (existing.status === 'PAID' || existing.status === 'WAIVED') {
        throw new AppError(existing.status === 'PAID' ? 'Fine already paid' : 'Fine already waived', 'BAD_REQUEST', 400);
      }
      if (userRole !== 'ADMIN' && userRole !== 'LIBRARIAN' && existing.userId !== userId) {
        throw new AppError('Cannot pay another user fine', 'FORBIDDEN', 403);
      }
      return tx.fine.update({
        where: { id, status: 'PENDING' },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
        include: fineInclude,
      });
    });

    await prisma.auditLog.create({
      data: {
        action: 'PAY_FINE',
        entityType: 'Fine',
        entityId: id,
        userId: request.userId,
        metadata: JSON.stringify({
          amount: updatedFine.amount,
          paidBy: userId,
        }),
      },
    });

    return reply.send({ data: updatedFine });
  });

  fastify.patch('/:id/waive', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = fineParamsSchema.parse(request.params);

    const updatedFine = await prisma.$transaction(async (tx) => {
      const existing = await tx.fine.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Fine not found', 'NOT_FOUND', 404);
      }
      if (existing.status === 'PAID' || existing.status === 'WAIVED') {
        throw new AppError(existing.status === 'PAID' ? 'Fine already paid' : 'Fine already waived', 'BAD_REQUEST', 400);
      }
      return tx.fine.update({
        where: { id, status: 'PENDING' },
        data: {
          status: 'WAIVED',
          waivedBy: request.userId,
          waivedAt: new Date(),
        },
        include: fineInclude,
      });
    });

    await prisma.auditLog.create({
      data: {
        action: 'WAIVE_FINE',
        entityType: 'Fine',
        entityId: id,
        userId: request.userId,
        metadata: JSON.stringify({
          amount: updatedFine.amount,
          reason: updatedFine.reason,
        }),
      },
    });

    return reply.send({ data: updatedFine });
  });
}