import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  schedule: z.string().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const branchParamsSchema = z.object({
  id: z.string().cuid(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
