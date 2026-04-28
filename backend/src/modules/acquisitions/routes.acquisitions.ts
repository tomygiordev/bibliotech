import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/index.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.js';
import {
  createVendorSchema,
  updateVendorSchema,
  createPurchaseOrderSchema,
  listOrdersSchema,
  orderParamsSchema,
  suggestionParamsSchema,
  createBookSuggestionSchema,
  updateBookSuggestionSchema,
} from './schemas/acquisition.schema.js';

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}${month}-${random}`;
}

export async function acquisitionRoutes(fastify: FastifyInstance) {

  // ============ VENDORS ============

  fastify.get('/vendors', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (_request, reply) => {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return reply.send({ data: vendors });
  });

  fastify.post('/vendors', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const input = createVendorSchema.parse(request.body);
    const vendor = await prisma.vendor.create({
      data: input,
    });
    return reply.status(201).send({ data: vendor });
  });

  fastify.put('/vendors/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = orderParamsSchema.parse(request.params);
    const input = updateVendorSchema.parse(request.body);
    const vendor = await prisma.vendor.update({
      where: { id },
      data: input,
    });
    return reply.send({ data: vendor });
  });

  fastify.delete('/vendors/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = orderParamsSchema.parse(request.params);
    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
    return reply.send({ success: true });
  });

  // ============ PURCHASE ORDERS ============

  fastify.get('/orders', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = listOrdersSchema.parse(request.query);
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.q) {
      where.OR = [
        { orderNumber: { contains: query.q } },
        { vendor: { name: { contains: query.q } } },
        { items: { some: { title: { contains: query.q } } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: true,
          items: true,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return reply.send({
      data: orders,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  fastify.post('/orders', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const input = createPurchaseOrderSchema.parse(request.body);

    const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor || !vendor.isActive) {
      throw new AppError('Vendor not found or inactive', 'NOT_FOUND', 404);
    }

    const total = input.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        vendorId: input.vendorId,
        notes: input.notes,
        total,
        orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        status: 'ORDERED',
        items: {
          create: input.items.map(item => ({
            isbn: item.isbn || null,
            title: item.title,
            author: item.author || null,
            publisher: item.publisher || null,
            publishedYear: item.publishedYear || null,
            quantity: item.quantity,
            price: item.price,
            receivedQuantity: 0,
            status: 'PENDING',
            bookId: item.bookId || null,
          })),
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PURCHASE_ORDER',
        entityType: 'PurchaseOrder',
        entityId: order.id,
        userId: request.userId,
        metadata: JSON.stringify({
          orderNumber: order.orderNumber,
          vendorId: input.vendorId,
          total,
          itemCount: input.items.length,
        }),
      },
    });

    return reply.status(201).send({ data: order });
  });

  fastify.get('/orders/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = orderParamsSchema.parse(request.params);
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 'NOT_FOUND', 404);
    }

    return reply.send({ data: order });
  });

  fastify.post('/orders/:id/receive', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = orderParamsSchema.parse(request.params);
    const { itemId, quantity, createCopy: _createCopy, branchId: _branchId, condition: _condition } = request.body as {
      itemId?: string;
      quantity?: number;
      createCopy?: boolean;
      branchId?: string;
      condition?: string;
    };

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found', 'NOT_FOUND', 404);
    }

    if (order.status !== 'ORDERED' && order.status !== 'PARTIAL') {
      throw new AppError('Order cannot be received in current status', 'BAD_REQUEST', 400);
    }

    let updatedOrder;

    if (itemId) {
      const item = order.items.find(i => i.id === itemId);
      if (!item) {
        throw new AppError('Item not found in order', 'NOT_FOUND', 404);
      }

      const receiveQty = quantity || (item.quantity - item.receivedQuantity);

      updatedOrder = await prisma.$transaction(async (tx) => {
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            receivedQuantity: { increment: receiveQty },
            status: item.receivedQuantity + receiveQty >= item.quantity ? 'RECEIVED' : 'PARTIAL',
          },
        });

        const allReceived = await tx.orderItem.count({
          where: { orderId: id, status: { not: 'RECEIVED' } },
        });

        const orderStatus = allReceived === 0 ? 'RECEIVED' : 'PARTIAL';

        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: orderStatus,
            receivedDate: orderStatus === 'RECEIVED' ? new Date() : undefined,
          },
          include: { vendor: true, items: true },
        });

        await tx.auditLog.create({
          data: {
            action: 'RECEIVE_ORDER_ITEM',
            entityType: 'PurchaseOrder',
            entityId: id,
            userId: request.userId,
            metadata: JSON.stringify({ itemId, quantity: receiveQty }),
          },
        });

        return updated;
      });
    } else {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        
        for (const item of items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              receivedQuantity: item.quantity,
              status: 'RECEIVED',
            },
          });
        }

        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: 'RECEIVED',
            receivedDate: new Date(),
          },
          include: { vendor: true, items: true },
        });

        await tx.auditLog.create({
          data: {
            action: 'RECEIVE_ORDER',
            entityType: 'PurchaseOrder',
            entityId: id,
            userId: request.userId,
            metadata: JSON.stringify({ fullReceive: true }),
          },
        });

        return updated;
      });
    }

    return reply.send({ data: updatedOrder });
  });

  fastify.delete('/orders/:id', { preValidation: [requireAuth(), requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = orderParamsSchema.parse(request.params);

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      throw new AppError('Order not found', 'NOT_FOUND', 404);
    }

    if (order.status === 'RECEIVED') {
      throw new AppError('Cannot delete received order', 'BAD_REQUEST', 400);
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_PURCHASE_ORDER',
        entityType: 'PurchaseOrder',
        entityId: id,
        userId: request.userId,
        metadata: JSON.stringify({ orderNumber: order.orderNumber }),
      },
    });

    return reply.send({ success: true });
  });

  // ============ BOOK SUGGESTIONS ============

  fastify.get('/suggestions', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const query = request.query as { status?: string; q?: string; page?: number; limit?: number };
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { author: { contains: query.q } },
        { isbn: { contains: query.q } },
      ];
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;

    const [suggestions, total] = await Promise.all([
      prisma.bookSuggestion.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookSuggestion.count({ where }),
    ]);

    return reply.send({
      data: suggestions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post('/suggestions', { preValidation: [requireAuth()] }, async (request, reply) => {
    const input = createBookSuggestionSchema.parse(request.body);
    const userId = request.userId;

    const suggestion = await prisma.bookSuggestion.create({
      data: {
        ...input,
        status: 'PENDING',
        userId,
      },
    });

    return reply.status(201).send({ data: suggestion });
  });

  fastify.get('/suggestions/my', { preValidation: [requireAuth()] }, async (request, reply) => {
    const userId = request.userId;
    const suggestions = await prisma.bookSuggestion.findMany({
      where: { userId },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ data: suggestions });
  });

  fastify.put('/suggestions/:id', { preValidation: [requireAuth(), requireRole('ADMIN', 'LIBRARIAN')] }, async (request, reply) => {
    const { id } = suggestionParamsSchema.parse(request.params);
    const input = updateBookSuggestionSchema.parse(request.body);

    const suggestion = await prisma.bookSuggestion.update({
      where: { id },
      data: input,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_BOOK_SUGGESTION',
        entityType: 'BookSuggestion',
        entityId: id,
        userId: request.userId,
        metadata: JSON.stringify({ status: input.status }),
      },
    });

    return reply.send({ data: suggestion });
  });
}