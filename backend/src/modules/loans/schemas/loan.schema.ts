import { z } from 'zod';

export const createLoanSchema = z.object({
  copyId: z.string().cuid(),
  userId: z.string().cuid(),
  branchId: z.string().min(1),
  dueDays: z.number().int().positive().default(14),
});

export const loanStatusSchema = z.enum(['active', 'returned', 'overdue', 'all']);

export const listLoansSchema = z.object({
  status: loanStatusSchema.default('active'),
  userId: z.string().cuid().optional(),
  branchId: z.string().min(1).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

export const returnLoanSchema = z.object({
  copyId: z.string().cuid().optional(),
});

export const renewLoanSchema = z.object({});

export const loanParamsSchema = z.object({
  id: z.string().cuid(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ListLoansInput = z.infer<typeof listLoansSchema>;
export type ReturnLoanInput = z.infer<typeof returnLoanSchema>;
