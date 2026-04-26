import { z } from 'zod';

export const createCopySchema = z.object({
  barcode: z.string().min(1).max(50),
  bookId: z.string().cuid(),
  branchId: z.string().cuid(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).default('GOOD'),
  zone: z.string().max(10).optional(),
  shelf: z.string().max(10).optional(),
  position: z.number().int().positive().optional(),
});

export const updateCopySchema = z.object({
  status: z.enum(['AVAILABLE', 'LOANED', 'RESERVED', 'MAINTENANCE', 'TRANSFERRED']).optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).optional(),
  zone: z.string().max(10).optional().nullable(),
  shelf: z.string().max(10).optional().nullable(),
  position: z.number().int().positive().optional().nullable(),
});

export const copyParamsSchema = z.object({
  id: z.string().cuid(),
});

export const transferCopySchema = z.object({
  targetBranchId: z.string().cuid(),
});

export type CreateCopyInput = z.infer<typeof createCopySchema>;
export type UpdateCopyInput = z.infer<typeof updateCopySchema>;
export type TransferCopyInput = z.infer<typeof transferCopySchema>;
