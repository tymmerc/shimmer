/**
 * SAV (after-sales) routes — tickets opened from mails or reviews,
 * tracked through statuses, escalated when needed.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { enqueueSavEscalationCheck } from '../lib/automations/queue.js';

export const savRouter = Router();

const TYPES = ['delivery', 'product_defect', 'return', 'refund', 'question', 'other'] as const;
const STATUSES = ['open', 'in_progress', 'awaiting_customer', 'escalated', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const createSchema = z.object({
  orderId: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  type: z.enum(TYPES),
  priority: z.enum(PRIORITIES).optional(),
  description: z.string().min(3).max(2000),
  source: z.enum(['mail', 'review', 'manual', 'chat']).optional(),
  externalRef: z.string().max(80).optional(),
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  resolution: z.string().max(2000).optional(),
  refundAmount: z.number().min(0).max(100000).optional(),
});

function nextTicketNumber(): string {
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `SAV-${Date.now().toString(36).slice(-4).toUpperCase()}${r}`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/sav/tickets — create a ticket
// ─────────────────────────────────────────────────────────────
savRouter.post('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const storeId = req.storeId!;
    const prisma = getPrisma();

    // Ensure orderId is valid (or pick a placeholder by linking to a recent order)
    let orderId = body.orderId;
    if (!orderId) {
      const recent = await prisma.order.findFirst({
        where: { storeId, customerId: body.customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (!recent) {
        throw new ShimmerError('No order found for this customer', 'NO_ORDER', 400);
      }
      orderId = recent.id;
    }

    const ticket = await prisma.savRequest.create({
      data: {
        storeId,
        requestNumber: nextTicketNumber(),
        orderId,
        customerId: body.customerId,
        type: body.type,
        status: 'open',
        description: body.description,
      },
    });

    try {
      await enqueueSavEscalationCheck(ticket.id);
    } catch (err) {
      logger.warn({ err, ticketId: ticket.id }, 'sav.ticket.escalation-enqueue-failed');
    }

    logger.info({ storeId, ticketId: ticket.id, type: body.type }, 'sav.ticket.created');
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sav/tickets — list tickets
// ─────────────────────────────────────────────────────────────
savRouter.get('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const prisma = getPrisma();
    const tickets = await prisma.savRequest.findMany({
      where: { storeId, ...(status ? { status } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { customer: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    const counts = await prisma.savRequest.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(counts.map(c => [c.status, c._count._all]));

    res.json({ tickets, byStatus });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sav/tickets/:id — get one ticket
// ─────────────────────────────────────────────────────────────
savRouter.get('/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const ticket = await prisma.savRequest.findFirst({
      where: { id, storeId },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true, status: true } },
      },
    });
    if (!ticket) throw new ShimmerError('Ticket not found', 'NOT_FOUND', 404);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/sav/tickets/:id — update status / resolution
// ─────────────────────────────────────────────────────────────
savRouter.patch('/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const body = updateSchema.parse(req.body);
    const prisma = getPrisma();
    const existing = await prisma.savRequest.findFirst({ where: { id, storeId } });
    if (!existing) throw new ShimmerError('Ticket not found', 'NOT_FOUND', 404);

    const data: {
      status?: string;
      resolution?: string;
      refundAmount?: number;
      resolvedAt?: Date;
    } = {};
    if (body.status) data.status = body.status;
    if (body.resolution !== undefined) data.resolution = body.resolution;
    if (body.refundAmount !== undefined) data.refundAmount = body.refundAmount;
    if (body.status === 'resolved' || body.status === 'closed') {
      data.resolvedAt = new Date();
    }

    const updated = await prisma.savRequest.update({ where: { id }, data });
    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sav/tickets/:id/reply — send a reply email to the customer
// ─────────────────────────────────────────────────────────────
const replySchema = z.object({
  message: z.string().min(3).max(5000),
  closeTicket: z.boolean().optional(),
});

savRouter.post('/tickets/:id/reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const body = replySchema.parse(req.body);
    const prisma = getPrisma();
    const ticket = await prisma.savRequest.findFirst({
      where: { id, storeId },
      include: { customer: { select: { email: true, firstName: true } } },
    });
    if (!ticket) throw new ShimmerError('Ticket not found', 'NOT_FOUND', 404);
    if (!ticket.customer?.email) throw new ShimmerError('Customer email missing', 'BAD_REQUEST', 400);

    const email = await sendEmail({
      storeId,
      to: ticket.customer.email,
      subject: `Votre demande ${ticket.requestNumber} · réponse de notre équipe`,
      bodyText: `Bonjour ${ticket.customer.firstName ?? ''},\n\n${body.message}\n\n— Le service après-vente`,
      tag: `sav-reply`,
      relatedEntity: 'sav',
      relatedId: id,
    });

    if (body.closeTicket) {
      await prisma.savRequest.update({
        where: { id },
        data: { status: 'resolved', resolvedAt: new Date(), resolution: body.message },
      });
    }

    logger.info({ storeId, ticketId: id, emailId: email.id, closed: body.closeTicket }, 'sav.reply.sent');
    res.json({ email, ticketClosed: !!body.closeTicket });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sav/stats — counters for dashboard
// ─────────────────────────────────────────────────────────────
savRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);

    const [total, openCount, urgentCount, resolvedThisMonth, recentResolved] = await Promise.all([
      prisma.savRequest.count({ where: { storeId } }),
      prisma.savRequest.count({ where: { storeId, status: { in: ['open', 'in_progress', 'awaiting_customer', 'escalated'] } } }),
      prisma.savRequest.count({ where: { storeId, type: 'delivery', status: { in: ['open', 'escalated'] } } }),
      prisma.savRequest.count({ where: { storeId, status: 'resolved', resolvedAt: { gte: thirtyDaysAgo } } }),
      prisma.savRequest.findMany({
        where: { storeId, status: 'resolved' },
        select: { createdAt: true, resolvedAt: true },
        take: 50,
      }),
    ]);

    const totalResolutionMs = recentResolved.reduce((sum, r) => {
      if (!r.resolvedAt) return sum;
      return sum + (r.resolvedAt.getTime() - r.createdAt.getTime());
    }, 0);
    const avgResolutionHours = recentResolved.length
      ? Math.round((totalResolutionMs / recentResolved.length) / 3600000)
      : 0;

    res.json({
      total,
      open: openCount,
      urgent: urgentCount,
      resolvedThisMonth,
      avgResolutionHours,
    });
  } catch (err) {
    next(err);
  }
});
