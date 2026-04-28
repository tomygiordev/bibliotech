import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/AppError.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

const prisma = new PrismaClient();

export function requireAuth() {
  return async function(request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const payload = request.user as { sub: string; role?: string; email?: string };
      request.userId = payload.sub;

      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      });

      if (!dbUser) {
        throw new AppError('User not found', 'UNAUTHORIZED', 401);
      }

      if (!dbUser.isActive) {
        throw new AppError('User is inactive', 'UNAUTHORIZED', 401);
      }

      request.userRole = dbUser.role;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const userRole = request.userRole;
    if (!userRole || !roles.includes(userRole)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403);
    }
  };
}
