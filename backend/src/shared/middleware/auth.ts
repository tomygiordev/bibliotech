import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/AppError.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

export function requireAuth() {
  return async function(request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      request.userId = user.sub;
      request.userRole = user.role;
    } catch {
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
