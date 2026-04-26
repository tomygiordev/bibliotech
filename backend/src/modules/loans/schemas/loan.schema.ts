import { z } from 'zod';

export const createLoanSchema = z.object({
  copyId: z.string().cuid(),
  userId: z.string().cuid(),
  branchId: z.string().cuid(),
  dueDays: z.number().int().positive().default(14),
});

export const returnLoanSchema = z.object({
  copyId: z.string().cuid().optional(),
});

export const renewLoanSchema = z.object({});

export const loanParamsSchema = z.object({
  id: z.string().cuid(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ReturnLoanInput = z.infer<typeof returnLoanSchema>;
