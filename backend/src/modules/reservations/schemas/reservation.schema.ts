import { z } from 'zod';

export const reservationStatusSchema = z.enum([
  'WAITING',
  'READY',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);

export const reservationViewStatusSchema = z.enum([
  'active',
  'waiting',
  'ready',
  'completed',
  'cancelled',
  'expired',
  'all',
]);

export const createReservationSchema = z.object({
  copyId: z.string().cuid(),
});

export const createReservationByTitleSchema = z.object({
  bookId: z.string().cuid(),
});

export const listReservationsSchema = z.object({
  status: reservationViewStatusSchema.default('active'),
  userId: z.string().cuid().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

export const reservationParamsSchema = z.object({
  id: z.string().cuid(),
});

export const fulfillReservationSchema = z.object({
  dueDays: z.number().int().positive().max(60).default(14),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsInput = z.infer<typeof listReservationsSchema>;
export type FulfillReservationInput = z.infer<typeof fulfillReservationSchema>;
