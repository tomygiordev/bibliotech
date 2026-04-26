import { z } from 'zod';

export const copyStatusSchema = z.enum([
  'AVAILABLE',
  'LOANED',
  'RESERVED',
  'MAINTENANCE',
  'TRANSFERRED',
  'LOST',
  'DAMAGED',
]);

export const copyConditionSchema = z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']);

export const listCopiesSchema = z.object({
  bookId: z.string().optional(),
  branchId: z.string().optional(),
  status: copyStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

export const createCopySchema = z.object({
  barcode: z.string().min(1).max(50),
  bookId: z.string().cuid(),
  branchId: z.string().min(1),
  condition: copyConditionSchema.default('GOOD'),
  zone: z.string().max(10).optional(),
  shelf: z.string().max(10).optional(),
  position: z.number().int().positive().optional(),
});

export const updateCopySchema = z.object({
  status: copyStatusSchema.optional(),
  condition: copyConditionSchema.optional(),
  zone: z.string().max(10).optional().nullable(),
  shelf: z.string().max(10).optional().nullable(),
  position: z.number().int().positive().optional().nullable(),
});

export const copyParamsSchema = z.object({
  id: z.string().cuid(),
});

export const transferCopySchema = z.object({
  targetBranchId: z.string().min(1),
});

export type CreateCopyInput = z.infer<typeof createCopySchema>;
export type UpdateCopyInput = z.infer<typeof updateCopySchema>;
export type TransferCopyInput = z.infer<typeof transferCopySchema>;
