import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { createCopySchema, updateCopySchema, copyParamsSchema, transferCopySchema } from './schemas/copy.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';

export async function copyRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const { bookId, branchId, status } = request.query as any;

    const where: any = {};
    if (bookId) where.bookId = bookId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const copies = await prisma.copy.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, isbn: true } },
        branch: { select: { id: true, name: true } },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: copies });
  });

  fastify.get('/:id', async (request, reply) => {
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

    const updated = await prisma.copy.update({
      where: { id },
      data: { branchId: targetBranchId, status: 'TRANSFERRED' },
      include: {
        book: { select: { id: true, title: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'TRANSFER',
        entityType: 'Copy',
        entityId: id,
        metadata: JSON.stringify({
          fromBranchId: copy.branchId,
          toBranchId: targetBranchId,
        }),
      },
    });

    setTimeout(async () => {
      await prisma.copy.update({
        where: { id },
        data: { status: 'AVAILABLE' },
      });
    }, 5000);

    return reply.send({ data: updated });
  });
}
