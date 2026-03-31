/**
 * Review routes — questionnaire management, submission, moderation, publication.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, logger } from '@shimmer/core';
import {
  createReviewRequest,
  sendReviewRequest,
  getReviewRequest,
} from '@shimmer/reviews';
import {
  submitReview,
  moderateReview,
  getProductReviews,
  getReviewStats,
} from '@shimmer/reviews';
import { publishReview } from '@shimmer/reviews';

const createRequestSchema = z.object({
  orderId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  delayHours: z.number().min(0).max(720).optional(), // max 30 days
});

const submitSchema = z.object({
  token: z.string().min(1),
  overallRating: z.number().int().min(1).max(5),
  productRatings: z.array(z.object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
  })).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().max(5000).optional(),
  pros: z.string().max(2000).optional(),
  cons: z.string().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
});

const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional(),
});

const publishSchema = z.object({
  targets: z.array(z.enum(['PRODUCT_PAGE', 'GOOGLE', 'TRUSTPILOT'])).min(1),
});

export const reviewsRouter = Router();

// POST /api/reviews/request — Create a review request (triggers questionnaire)
reviewsRouter.post('/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createRequestSchema.parse(req.body);
    const request = await createReviewRequest({
      storeId: req.storeId!,
      ...body,
    });
    res.json(request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/reviews/request/:id/send — Mark request as sent
reviewsRouter.post('/request/:id/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const request = await sendReviewRequest(id);
    res.json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/questionnaire/:token — Get questionnaire data (public, no auth needed)
// Note: This is also exposed without auth below
reviewsRouter.get('/questionnaire/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getReviewRequest(req.params.token);
    if (!data) { res.status(404).json({ error: 'Invalid token' }); return; }
    if (data.expired) { res.status(410).json({ error: 'Review link expired' }); return; }

    // Don't expose sensitive customer data
    res.json({
      token: req.params.token,
      customerName: data.customer.firstName,
      orderNumber: data.order.orderNumber,
      products: data.order.items.map(i => ({
        id: i.product.id,
        name: i.product.name,
        category: i.product.category,
        imageUrl: i.product.imageUrl,
      })),
      status: data.status,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/submit — Submit a review (public, uses token for auth)
reviewsRouter.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = submitSchema.parse(req.body);
    const result = await submitReview(body);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error && (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('already'))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/reviews/pending — List reviews pending moderation
reviewsRouter.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const where = { storeId: req.storeId!, status: 'PENDING_MODERATION' as const };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          product: { select: { id: true, name: true, category: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ reviews, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:id/moderate — Approve or reject a review
reviewsRouter.post('/:id/moderate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const body = moderateSchema.parse(req.body);
    const review = await moderateReview(id, req.storeId!, body.action, body.note);
    res.json(review);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/reviews/:id/publish — Publish a review to external platforms
reviewsRouter.post('/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const body = publishSchema.parse(req.body);
    const results = await publishReview(id, body.targets);
    res.json({ reviewId: id, publications: results });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/reviews/product/:productId — Get reviews for a product
reviewsRouter.get('/product/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await getProductReviews(productId, req.storeId!, limit, offset);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/stats — Get review stats for store or product
reviewsRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
    const stats = await getReviewStats(req.storeId!, productId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/requests — List review requests for the store
reviewsRouter.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const where: Record<string, unknown> = { storeId: req.storeId! };
    if (status && ['SCHEDULED', 'SENT', 'COMPLETED', 'EXPIRED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const [requests, total] = await Promise.all([
      prisma.reviewRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      prisma.reviewRequest.count({ where }),
    ]);

    res.json({ requests, total, limit, offset });
  } catch (err) {
    next(err);
  }
});
