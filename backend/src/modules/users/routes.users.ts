import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';
import { AppError } from '../../shared/errors/index.js';
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  userParamsSchema,
} from './schemas/user.schema.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  blockedUntil: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      loans: true,
      reservations: true,
      fines: true,
    },
  },
} as const;

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = listUsersSchema.parse(request.query);

    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive ? { isActive: query.isActive === 'true' } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { email: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      data: users,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.get('/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = userParamsSchema.parse(request.params);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        loans: {
          select: {
            id: true,
            loanDate: true,
            dueDate: true,
            returnDate: true,
            copy: {
              select: {
                book: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: user });
  });

  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const input = createUserSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('Email already registered', 'CONFLICT', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        isActive: input.isActive,
      },
      select: userSelect,
    });

    return reply.status(201).send({ data: user });
  });

  fastify.put('/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = userParamsSchema.parse(request.params);
    const input = updateUserSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: input,
      select: userSelect,
    });

    return reply.send({ data: user });
  });

  fastify.delete('/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = userParamsSchema.parse(request.params);

    const [activeLoans, pendingFines] = await Promise.all([
      prisma.loan.count({ where: { userId: id, returnDate: null } }),
      prisma.fine.count({ where: { userId: id, status: 'PENDING' } }),
    ]);

    if (activeLoans > 0) {
      throw new AppError(`User has ${activeLoans} active loan(s). Cannot deactivate.`, 'BAD_REQUEST', 400);
    }

    if (pendingFines > 0) {
      throw new AppError(`User has ${pendingFines} pending fine(s). Cannot deactivate.`, 'BAD_REQUEST', 400);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });
}
