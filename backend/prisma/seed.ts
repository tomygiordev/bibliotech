import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const librarianPassword = await bcrypt.hash('Librarian123!', 12);
  const memberPassword = await bcrypt.hash('Member123!', 12);

  const [admin, librarian, member] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@bibliotech.com' },
      update: {},
      create: {
        email: 'admin@bibliotech.com',
        passwordHash: adminPassword,
        name: 'Administrador',
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'librarian@bibliotech.com' },
      update: {},
      create: {
        email: 'librarian@bibliotech.com',
        passwordHash: librarianPassword,
        name: 'María López',
        role: 'LIBRARIAN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'member@bibliotech.com' },
      update: {},
      create: {
        email: 'member@bibliotech.com',
        passwordHash: memberPassword,
        name: 'Juan Pérez',
        role: 'MEMBER',
      },
    }),
  ]);

  console.log('Created users:', { admin: admin.email, librarian: librarian.email, member: member.email });

  const [fiction, tech, history] = await Promise.all([
    prisma.genre.upsert({
      where: { name: 'Ficción' },
      update: {},
      create: { name: 'Ficción' },
    }),
    prisma.genre.upsert({
      where: { name: 'Tecnología' },
      update: {},
      create: { name: 'Tecnología' },
    }),
    prisma.genre.upsert({
      where: { name: 'Historia' },
      update: {},
      create: { name: 'Historia' },
    }),
  ]);

  console.log('Created genres:', { fiction: fiction.name, tech: tech.name, history: history.name });

  const [garcia, orwell, tolstoy] = await Promise.all([
    prisma.author.upsert({
      where: { name: 'Gabriel García Márquez' },
      update: {},
      create: {
        name: 'Gabriel García Márquez',
        bio: 'Escritor colombiano, premio Nobel de Literatura 1982',
        country: 'Colombia',
      },
    }),
    prisma.author.upsert({
      where: { name: 'George Orwell' },
      update: {},
      create: {
        name: 'George Orwell',
        bio: 'Escritor y periodista británico',
        country: 'Reino Unido',
      },
    }),
    prisma.author.upsert({
      where: { name: 'León Tolstói' },
      update: {},
      create: {
        name: 'León Tolstói',
        bio: 'Escritor ruso considerado uno de los más grandes de la literatura universal',
        country: 'Rusia',
      },
    }),
  ]);

  console.log('Created authors:', { garcia: garcia.name, orwell: orwell.name, tolstoy: tolstoy.name });

  const [centralBranch, norteBranch] = await Promise.all([
    prisma.branch.upsert({
      where: { id: 'branch-central' },
      update: {},
      create: {
        id: 'branch-central',
        name: 'Sucursal Central',
        address: 'Av. Principal 1234, Ciudad',
        phone: '+54 11 1234-5678',
        schedule: '{"open": "08:00", "close": "20:00"}',
      },
    }),
    prisma.branch.upsert({
      where: { id: 'branch-norte' },
      update: {},
      create: {
        id: 'branch-norte',
        name: 'Sucursal Norte',
        address: 'Av. Norte 567, Ciudad',
        phone: '+54 11 5678-1234',
        schedule: '{"open": "09:00", "close": "18:00"}',
      },
    }),
  ]);

  console.log('Created branches:', { central: centralBranch.name, norte: norteBranch.name });

  const [cienAnos, book1984, annaKarenina] = await Promise.all([
    prisma.book.upsert({
      where: { isbn: '978-3-16-150400-0' },
      update: {},
      create: {
        isbn: '978-3-16-150400-0',
        title: 'Cien años de soledad',
        synopsis: 'La saga de la familia Buendía en Macondo, un pueblo ficticio de la costa caribeña colombiana.',
        publishedYear: 1967,
        publisher: 'Editorial Sudamericana',
        language: 'es',
        pageCount: 417,
        authorId: garcia.id,
        genreId: fiction.id,
      },
    }),
    prisma.book.upsert({
      where: { isbn: '978-0-452-28423-4' },
      update: {},
      create: {
        isbn: '978-0-452-28423-4',
        title: '1984',
        synopsis: 'Novela ambientada en un sociedad totalitaria liderada por el Gran Hermano.',
        publishedYear: 1949,
        publisher: 'Secker & Warburg',
        language: 'es',
        pageCount: 328,
        authorId: orwell.id,
        genreId: fiction.id,
      },
    }),
    prisma.book.upsert({
      where: { isbn: '978-0-14-044793-6' },
      update: {},
      create: {
        isbn: '978-0-14-044793-6',
        title: 'Ana Karenina',
        synopsis: 'La historia de Ana Karenina, una mujer casada que busca la felicidad en el amor.',
        publishedYear: 1877,
        publisher: 'The Russian Messenger',
        language: 'es',
        pageCount: 864,
        authorId: tolstoy.id,
        genreId: fiction.id,
      },
    }),
  ]);

  console.log('Created books:', { cienAnos: cienAnos.title, n984: book1984.title, annaKarenina: annaKarenina.title });

  await prisma.copy.createMany({
    data: [
      { barcode: 'CYM001', bookId: cienAnos.id, branchId: centralBranch.id, status: 'AVAILABLE', condition: 'GOOD', zone: 'A', shelf: 'A1', position: 1 },
      { barcode: 'CYM002', bookId: cienAnos.id, branchId: centralBranch.id, status: 'AVAILABLE', condition: 'FAIR', zone: 'A', shelf: 'A1', position: 2 },
      { barcode: 'CYM003', bookId: cienAnos.id, branchId: norteBranch.id, status: 'AVAILABLE', condition: 'NEW', zone: 'A', shelf: 'A1', position: 1 },
      { barcode: 'CYM004', bookId: book1984.id, branchId: centralBranch.id, status: 'AVAILABLE', condition: 'GOOD', zone: 'B', shelf: 'B2', position: 1 },
      { barcode: 'CYM005', bookId: book1984.id, branchId: norteBranch.id, status: 'AVAILABLE', condition: 'NEW', zone: 'B', shelf: 'B1', position: 1 },
      { barcode: 'CYM006', bookId: annaKarenina.id, branchId: centralBranch.id, status: 'AVAILABLE', condition: 'GOOD', zone: 'C', shelf: 'C3', position: 1 },
    ],
  });

  console.log('Created copies');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
