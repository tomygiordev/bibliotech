import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { registerSchema, loginSchema } from './schemas/auth.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth } from '../../shared/middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);

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
        role: 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return reply.status(201).send({
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  });

  fastify.post('/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 'UNAUTHORIZED', 401);
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw new AppError(`Account blocked until ${user.blockedUntil.toISOString()}`, 'UNAUTHORIZED', 401);
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
    }

    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: '15m' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  fastify.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const token = body.refreshToken;

    if (!token) {
      throw new AppError('Refresh token required', 'BAD_REQUEST', 400);
    }

    try {
      const decoded = fastify.jwt.verify(token) as any;
      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 'UNAUTHORIZED', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 'UNAUTHORIZED', 401);
      }

      const newAccessToken = fastify.jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        { expiresIn: '15m' }
      );

      return reply.send({ data: { accessToken: newAccessToken } });
    } catch {
      throw new AppError('Invalid or expired refresh token', 'UNAUTHORIZED', 401);
    }
  });

  fastify.get('/me', { preValidation: [requireAuth()] }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: user });
  });
}
