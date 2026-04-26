import { z } from 'zod';

export const fineStatusSchema = z.enum(['PENDING', 'PAID', 'WAIVED']);

export const listFinesSchema = z.object({
  status: fineStatusSchema.optional(),
  userId: z.string().cuid().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const fineParamsSchema = z.object({
  id: z.string().cuid(),
});

export type ListFinesInput = z.infer<typeof listFinesSchema>;