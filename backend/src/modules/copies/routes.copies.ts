import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import {
  createCopySchema,
  listCopiesSchema,
  updateCopySchema,
  copyParamsSchema,
  transferCopySchema,
} from './schemas/copy.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';

export async function copyRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = listCopiesSchema.parse(request.query);

    const where: any = {};
    if (query.bookId) where.bookId = query.bookId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;

    const [copies, total] = await Promise.all([
      prisma.copy.findMany({
        where,
        include: {
          book: { select: { id: true, title: true, isbn: true } },
          branch: { select: { id: true, name: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.copy.count({ where }),
    ]);

    return reply.send({
      data: copies,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.get('/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = copyParamsSchema.parse(request.params);

    const copy = await prisma.copy.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true, isbn: true, coverUrl: true } },
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    if (!copy) {
      throw new AppError('Copy not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: copy });
  });

  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const input = createCopySchema.parse(request.body);

    const existing = await prisma.copy.findUnique({ where: { barcode: input.barcode } });
    if (existing) {
      throw new AppError('Barcode already exists', 'CONFLICT', 409);
    }

    const copy = await prisma.copy.create({
      data: input,
      include: {
        book: { select: { id: true, title: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ data: copy });
  });

  fastify.put('/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = copyParamsSchema.parse(request.params);
    const input = updateCopySchema.parse(request.body);

    const copy = await prisma.copy.update({
      where: { id },
      data: input,
      include: {
        book: { select: { id: true, title: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return reply.send({ data: copy });
  });

  fastify.post('/:id/transfer', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = copyParamsSchema.parse(request.params);
    const { targetBranchId } = transferCopySchema.parse(request.body);

    const [copy, targetBranch] = await Promise.all([
      prisma.copy.findUnique({ where: { id } }),
      prisma.branch.findUnique({ where: { id: targetBranchId } }),
    ]);

    if (!copy) {
      throw new AppError('Copy not found', 'NOT_FOUND', 404);
    }

    if (!targetBranch) {
      throw new AppError('Target branch not found', 'NOT_FOUND', 404);
    }

    if (copy.status === 'LOANED') {
      throw new AppError('Cannot transfer a loaned copy', 'BAD_REQUEST', 400);
    }

    const [updated] = await prisma.$transaction([
      prisma.copy.update({
        where: { id },
        data: { branchId: targetBranchId, status: 'AVAILABLE' },
        include: {
          book: { select: { id: true, title: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'TRANSFER',
          entityType: 'Copy',
          entityId: id,
          userId: request.userId,
          metadata: JSON.stringify({
            fromBranchId: copy.branchId,
            toBranchId: targetBranchId,
          }),
        },
      }),
    ]);

    return reply.send({ data: updated });
  });
}
