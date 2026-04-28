import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        metadata: error.metadata,
      },
    });
  }

  if (error.name === 'FST_ERR_VALIDATION_FAILED') {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        metadata: (error as any).validation,
      },
    });
  }

  if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
}
