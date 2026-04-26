import { z } from 'zod';

export const createBookSchema = z.object({
  isbn: z.string().min(10).max(17),
  title: z.string().min(1).max(500),
  synopsis: z.string().max(5000).optional(),
  coverUrl: z.string().url().optional(),
  publishedYear: z.number().int().min(1000).max(2100).optional(),
  publisher: z.string().max(200).optional(),
  language: z.string().min(2).max(10).default('es'),
  pageCount: z.number().int().positive().optional(),
  authorId: z.string().cuid(),
  genreId: z.string().cuid(),
});

export const updateBookSchema = createBookSchema.partial();

export const searchBooksSchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  author: z.string().optional(),
  branch: z.string().optional(),
  available: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['relevance', 'title', 'date']).default('relevance'),
});

export const bookParamsSchema = z.object({
  id: z.string().cuid(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type SearchBooksInput = z.infer<typeof searchBooksSchema>;
export type BookParamsInput = z.infer<typeof bookParamsSchema>;
