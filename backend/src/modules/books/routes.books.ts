import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { createBookSchema, updateBookSchema, searchBooksSchema, bookParamsSchema } from './schemas/book.schema.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';

export async function bookRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const query = searchBooksSchema.parse(request.query);

    const where: any = {};

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { author: { name: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    if (query.genre) {
      where.genreId = query.genre;
    }

    if (query.author) {
      where.authorId = query.author;
    }

    if (query.available === 'true') {
      where.copies = { some: { status: 'AVAILABLE' } };
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          genre: { select: { id: true, name: true } },
          copies: {
            select: { id: true, status: true, branchId: true },
            where: query.branch ? { branchId: query.branch } : undefined,
          },
          _count: { select: { copies: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sort === 'title'
          ? { title: 'asc' }
          : query.sort === 'date'
            ? { createdAt: 'desc' }
            : { createdAt: 'desc' },
      }),
      prisma.book.count({ where }),
    ]);

    const facetGenres = await prisma.genre.findMany({
      select: { id: true, name: true, _count: { select: { books: true } } },
    });

    return reply.send({
      data: books,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      facets: {
        genres: facetGenres.map(g => ({
          id: g.id,
          name: g.name,
          count: g._count.books,
        })),
      },
    });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = bookParamsSchema.parse(request.params);

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        author: true,
        genre: true,
        copies: {
          include: { branch: { select: { id: true, name: true } } },
        },
        reviews: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!book) {
      throw new AppError('Book not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: book });
  });

  fastify.post('/', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const input = createBookSchema.parse(request.body);

    const book = await prisma.book.create({
      data: input,
      include: {
        author: { select: { id: true, name: true } },
        genre: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ data: book });
  });

  fastify.put('/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = bookParamsSchema.parse(request.params);
    const input = updateBookSchema.parse(request.body);

    const book = await prisma.book.update({
      where: { id },
      data: input,
      include: {
        author: { select: { id: true, name: true } },
        genre: { select: { id: true, name: true } },
      },
    });

    return reply.send({ data: book });
  });

  fastify.delete('/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = bookParamsSchema.parse(request.params);

    await prisma.book.delete({ where: { id } });

    return reply.status(204).send();
  });
}
