import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { copyRoutes } from './modules/copies/routes.copies.js';
import { loanRoutes } from './modules/loans/routes.loans.js';
import { reservationRoutes } from './modules/reservations/routes.reservations.js';
import { userRoutes } from './modules/users/routes.users.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe('app', () => {
  it('responds to health checks', async () => {
    app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('rejects protected routes without a token', async () => {
    app = await buildApp();
    await app.register(copyRoutes, { prefix: '/api/v1/copies' });
    await app.register(loanRoutes, { prefix: '/api/v1/loans' });
    await app.register(reservationRoutes, { prefix: '/api/v1/reservations' });
    await app.register(userRoutes, { prefix: '/api/v1/users' });

    const loansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/loans/my',
    });
    const loansAdminResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/loans',
    });
    const usersResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
    });
    const reservationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/reservations/my',
    });
    const copiesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/copies',
    });

    expect(loansResponse.statusCode).toBe(401);
    expect(loansAdminResponse.statusCode).toBe(401);
    expect(usersResponse.statusCode).toBe(401);
    expect(reservationsResponse.statusCode).toBe(401);
    expect(copiesResponse.statusCode).toBe(401);
    expect(loansResponse.json()).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  });
});
