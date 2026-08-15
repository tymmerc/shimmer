/**
 * Public review endpoints — token is the auth. Mounted under /api/public/reviews
 * so the consumer-facing review submission page can call them without an API key.
 *
 *   GET  /api/public/reviews/:token        — fetch questionnaire metadata
 *   POST /api/public/reviews/:token/submit — submit the filled-in review
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { getReviewRequest, submitReview } from '@shimmer/reviews';

export const publicReviewsRouter = Router();

const submitSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  productRatings: z.array(z.object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
  })).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().max(5000).optional(),
  wouldRecommend: z.boolean().optional(),
});

publicReviewsRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenRaw = req.params.token;
    const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
    if (!token || token.length < 5) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    const data = await getReviewRequest(token);
    if (!data) { res.status(404).json({ error: 'Invalid token' }); return; }
    if (data.expired) { res.status(410).json({ error: 'Review link expired' }); return; }

    const store = await getPrisma().store.findUnique({ where: { id: data.storeId }, select: { name: true } });

    res.json({
      token,
      customerName: data.customer.firstName,
      storeName: store?.name ?? 'la boutique',
      orderNumber: data.order.orderNumber,
      products: data.order.items.map(i => ({
        id: i.product.id,
        name: i.product.name,
        category: i.product.category,
        imageUrl: i.product.imageUrl,
      })),
      status: data.status,
      alreadySubmitted: data.status === 'COMPLETED',
    });
  } catch (err) {
    next(err);
  }
});

publicReviewsRouter.post('/:token/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenRaw = req.params.token;
    const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
    if (!token || token.length < 5) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    const body = submitSchema.parse(req.body);
    const result = await submitReview({ token, ...body });
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
