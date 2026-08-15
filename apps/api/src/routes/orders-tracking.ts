/**
 * Order tracking routes — status updates, shipment events, automated notifications.
 * The actual notification (SMS / email) is queued; the route returns what will be sent.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger, ShimmerError } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { enqueueReviewRequest } from '../lib/automations/queue.js';
import { sendSms } from '@shimmer/sms-connector';

export const ordersTrackingRouter = Router();

const STATUSES = ['pending', 'confirmed', 'prepared', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned'] as const;

const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  carrier: z.string().max(80).optional(),
  trackingNumber: z.string().max(80).optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

// Friendly customer messages per status
function customerMessage(orderNumber: string, status: string, carrier?: string, trackingNumber?: string): string {
  switch (status) {
    case 'confirmed':
      return `Commande ${orderNumber} confirmée. On la prépare et on vous écrit dès qu'elle part.`;
    case 'prepared':
      return `Commande ${orderNumber} emballée. Elle part au transporteur aujourd'hui ou demain.`;
    case 'shipped':
      return `Commande ${orderNumber} en route avec ${carrier ?? 'votre transporteur'}.${trackingNumber ? ` Suivi : ${trackingNumber}.` : ''}`;
    case 'in_transit':
      return `Commande ${orderNumber} en transit. Arrivée prévue d'ici 2-3 jours.`;
    case 'delivered':
      return `Commande ${orderNumber} livrée. Bonne réception. On vous écrit dans 48 h pour votre avis.`;
    case 'cancelled':
      return `Commande ${orderNumber} annulée. Le remboursement arrive sous 5 jours ouvrés.`;
    case 'returned':
      return `Retour reçu pour la commande ${orderNumber}. On vous tient au courant du remboursement.`;
    default:
      return `Commande ${orderNumber} : statut mis à jour (${status}).`;
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/orders — list orders for the merchant admin
// ─────────────────────────────────────────────────────────────
ordersTrackingRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const prisma = getPrisma();
    const orders = await prisma.order.findMany({
      where: { storeId, ...(status ? { status } : {}) },
      orderBy: { orderedAt: 'desc' },
      take: limit,
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/orders/:id/timeline — full timeline of an order
// ─────────────────────────────────────────────────────────────
ordersTrackingRouter.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const order = await prisma.order.findFirst({
      where: { id, storeId },
      include: {
        shipments: { orderBy: { id: 'asc' } },
        customer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!order) throw new ShimmerError('Order not found', 'NOT_FOUND', 404);

    const events: Array<{ at: Date; label: string; status: string; channel?: string; message: string }> = [];
    events.push({
      at: order.createdAt,
      label: 'Commande passée',
      status: 'confirmed',
      channel: 'EMAIL',
      message: customerMessage(order.orderNumber, 'confirmed'),
    });
    for (const s of order.shipments) {
      const lbl = s.status === 'shipped' ? 'Expédiée' : s.status === 'in_transit' ? 'En transit' : s.status;
      const eventAt = s.shippedAt ?? s.estimatedDelivery ?? s.deliveredAt ?? order.createdAt;
      events.push({
        at: eventAt,
        label: lbl,
        status: s.status,
        channel: 'SMS',
        message: customerMessage(order.orderNumber, s.status, s.carrier, s.trackingNumber),
      });
    }
    if (order.deliveredAt) {
      events.push({
        at: order.deliveredAt,
        label: 'Livrée',
        status: 'delivered',
        channel: 'SMS',
        message: customerMessage(order.orderNumber, 'delivered'),
      });
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    res.json({ order, events });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status — change status, schedule notification
// ─────────────────────────────────────────────────────────────
ordersTrackingRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const body = updateStatusSchema.parse(req.body);
    const prisma = getPrisma();
    const order = await prisma.order.findFirst({ where: { id, storeId } });
    if (!order) throw new ShimmerError('Order not found', 'NOT_FOUND', 404);

    const data: { status: string; deliveredAt?: Date } = { status: body.status };
    if (body.status === 'delivered') data.deliveredAt = new Date();

    await prisma.order.update({ where: { id }, data });

    if (body.status === 'shipped' || body.status === 'in_transit') {
      await prisma.shipment.create({
        data: {
          orderId: id,
          status: body.status,
          carrier: body.carrier ?? 'Colissimo',
          trackingNumber: body.trackingNumber ?? `LP${Math.floor(Math.random() * 1e9)}`,
          shippedAt: body.status === 'shipped' ? new Date() : undefined,
          estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : undefined,
        },
      });
    }

    const message = customerMessage(order.orderNumber, body.status, body.carrier, body.trackingNumber);

    // Send notifications. Shipping/delivery → SMS (preferred), other status → email.
    const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
    let emailResult: { id: number; status: string } | null = null;
    let smsResult: { id: number; status: string } | null = null;
    const shouldSms = ['shipped', 'in_transit', 'delivered'].includes(body.status);

    if (customer?.phone && shouldSms) {
      const r = await sendSms({
        storeId,
        to: customer.phone,
        body: message,
        tag: `order-${body.status}-sms`,
        relatedEntity: 'order',
        relatedId: id,
      });
      smsResult = { id: r.id, status: r.status };
    }
    if (customer?.email) {
      const r = await sendEmail({
        storeId,
        to: customer.email,
        subject: `Commande ${order.orderNumber} · ${body.status}`,
        bodyText: message,
        tag: `order-${body.status}`,
        relatedEntity: 'order',
        relatedId: id,
      });
      emailResult = { id: r.id, status: r.status };
    }

    // When the order becomes delivered, create a review request and send the ask
    let reviewRequestId: number | null = null;
    if (body.status === 'delivered' && customer) {
      const existing = await prisma.reviewRequest.findFirst({ where: { orderId: id } });
      if (!existing) {
        const token = `rr_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        const scheduledAt = new Date(Date.now() + 48 * 3600 * 1000);
        const expiresAt = new Date(Date.now() + 30 * 86400 * 1000);
        const rr = await prisma.reviewRequest.create({
          data: {
            storeId,
            orderId: id,
            customerId: customer.id,
            token,
            scheduledAt,
            expiresAt,
          },
        });
        reviewRequestId = rr.id;
        try {
          await enqueueReviewRequest(rr.id, scheduledAt);
        } catch (err) {
          logger.warn({ err, reviewRequestId: rr.id }, 'review-request.enqueue-failed');
        }
      }
    }

    logger.info({ storeId, orderId: id, status: body.status, emailId: emailResult?.id, smsId: smsResult?.id, reviewRequestId }, 'order.status.updated');
    res.json({
      order: { id, status: body.status, orderNumber: order.orderNumber },
      notification: { channel: shouldSms ? 'SMS' : 'EMAIL', message },
      email: emailResult,
      sms: smsResult,
      reviewRequestId,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/orders/tracking-stats — counters for dashboard
// ─────────────────────────────────────────────────────────────
ordersTrackingRouter.get('/tracking-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const counts = await prisma.order.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(counts.map(c => [c.status, c._count._all]));
    const total = counts.reduce((s, c) => s + c._count._all, 0);
    res.json({ total, byStatus });
  } catch (err) {
    next(err);
  }
});
