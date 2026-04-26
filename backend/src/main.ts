import { buildApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { authRoutes } from './modules/auth/routes.auth.js';
import { bookRoutes } from './modules/books/routes.books.js';
import { copyRoutes } from './modules/copies/routes.copies.js';
import { loanRoutes } from './modules/loans/routes.loans.js';
import { branchRoutes } from './modules/branches/routes.branches.js';
import { userRoutes } from './modules/users/routes.users.js';
import { reservationRoutes } from './modules/reservations/routes.reservations.js';
import { fineRoutes } from './modules/fines/routes.fines.js';
import { acquisitionRoutes } from './modules/acquisitions/routes.acquisitions.js';

async function main() {
  const app = await buildApp();

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(bookRoutes, { prefix: '/api/v1/books' });
  await app.register(copyRoutes, { prefix: '/api/v1/copies' });
  await app.register(loanRoutes, { prefix: '/api/v1/loans' });
  await app.register(reservationRoutes, { prefix: '/api/v1/reservations' });
  await app.register(branchRoutes, { prefix: '/api/v1/branches' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(fineRoutes, { prefix: '/api/v1/fines' });
  await app.register(acquisitionRoutes, { prefix: '/api/v1/acquisitions' });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
