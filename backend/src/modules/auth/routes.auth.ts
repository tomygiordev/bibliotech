import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { registerSchema, loginSchema } from './schemas/auth.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth } from '../../shared/middleware/auth.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

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
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
      throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 'UNAUTHORIZED', 401);
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.blockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${remainingMinutes} minute(s)`, 'UNAUTHORIZED', 401);
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!validPassword) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      const blocked = await prisma.user.update({
        where: { id: user.id, failedAttempts: { lt: MAX_LOGIN_ATTEMPTS } },
        data: {
          failedAttempts: { increment: 1 },
          blockedUntil: lockUntil,
        },
      }).catch(() => null);

      if (blocked) {
        throw new AppError(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes`, 'UNAUTHORIZED', 401);
      }

      const resetFailed = await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 } },
      }).catch(() => null);

      if (resetFailed && resetFailed.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        throw new AppError(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes`, 'UNAUTHORIZED', 401);
      }

      throw new AppError(`Invalid credentials. ${MAX_LOGIN_ATTEMPTS - (resetFailed?.failedAttempts || 0)} attempts remaining`, 'UNAUTHORIZED', 401);
    }

    if (user.failedAttempts > 0 || user.blockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, blockedUntil: null },
      });
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
    const userId = request.userId;
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
