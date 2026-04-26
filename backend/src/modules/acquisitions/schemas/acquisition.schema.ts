import { z } from 'zod';

export const vendorSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  contact: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createVendorSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const orderItemSchema = z.object({
  id: z.string().cuid(),
  isbn: z.string().nullable(),
  title: z.string(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  publishedYear: z.number().nullable(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  receivedQuantity: z.number().int().nonnegative(),
  status: z.string(),
  orderId: z.string(),
  bookId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createOrderItemSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1),
  author: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
  quantity: z.number().int().positive().default(1),
  price: z.number().nonnegative().default(0),
  bookId: z.string().cuid().optional(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().cuid(),
  orderNumber: z.string(),
  status: z.string(),
  vendorId: z.string(),
  vendor: vendorSchema.nullable(),
  notes: z.string().nullable(),
  total: z.number(),
  orderDate: z.string().nullable(),
  expectedDate: z.string().nullable(),
  receivedDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(orderItemSchema),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().cuid(),
  notes: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1),
});

export const listOrdersSchema = z.object({
  status: z.string().optional(),
  vendorId: z.string().cuid().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const orderParamsSchema = z.object({
  id: z.string().cuid(),
});

export const receiveOrderItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  createCopy: z.boolean().default(true),
  branchId: z.string().cuid().optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).default('NEW'),
});

export const bookSuggestionSchema = z.object({
  id: z.string().cuid(),
  isbn: z.string().nullable(),
  title: z.string(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  publishedYear: z.number().nullable(),
  reason: z.string().nullable(),
  status: z.string(),
  userId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBookSuggestionSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1),
  author: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
  reason: z.string().optional(),
});

export const updateBookSuggestionSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ORDERED']),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type CreateBookSuggestionInput = z.infer<typeof createBookSuggestionSchema>;
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
