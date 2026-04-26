import { z } from 'zod';

export const userRoleSchema = z.enum(['ADMIN', 'LIBRARIAN', 'MEMBER']);

export const listUsersSchema = z.object({
  q: z.string().optional(),
  role: userRoleSchema.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const userParamsSchema = z.object({
  id: z.string().cuid(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase, one lowercase and one number',
  }),
  name: z.string().min(2).max(100),
  role: userRoleSchema.default('MEMBER'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  blockedUntil: z.coerce.date().nullable().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
