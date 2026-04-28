import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { createBranchSchema, updateBranchSchema, branchParamsSchema } from './schemas/branch.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';

export async function branchRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { copies: true, loans: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return reply.send({ data: branches });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = branchParamsSchema.parse(request.params);

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        copies: {
          include: {
            book: { select: { id: true, title: true, coverUrl: true } },
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { copies: true, loans: true } },
      },
    });

    if (!branch) {
      throw new AppError('Branch not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: branch });
  });

  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const input = createBranchSchema.parse(request.body);

    const branch = await prisma.branch.create({
      data: {
        ...input,
        schedule: input.schedule ?? '{"open": "08:00", "close": "20:00"}',
      },
    });

    return reply.status(201).send({ data: branch });
  });

  fastify.put('/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = branchParamsSchema.parse(request.params);
    const input = updateBranchSchema.parse(request.body);

    const branch = await prisma.branch.update({
      where: { id },
      data: input,
    });

    return reply.send({ data: branch });
  });

  fastify.delete('/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = branchParamsSchema.parse(request.params);

    const [activeCopiesCount, activeLoansCount] = await Promise.all([
      prisma.copy.count({ where: { branchId: id, status: { not: 'AVAILABLE' } } }),
      prisma.loan.count({ where: { branchId: id, returnDate: null } }),
    ]);

    if (activeCopiesCount > 0) {
      throw new AppError(`Branch has ${activeCopiesCount} non-available copy(ies). Cannot deactivate.`, 'BAD_REQUEST', 400);
    }

    if (activeLoansCount > 0) {
      throw new AppError(`Branch has ${activeLoansCount} active loan(s). Cannot deactivate.`, 'BAD_REQUEST', 400);
    }

    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });
}
