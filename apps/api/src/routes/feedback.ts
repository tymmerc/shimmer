/**
 * Feedback routes — POST /api/feedback
 * Accepts client feedback (click, purchase, return, validation) and queues for processing.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { feedbackQueue, corpusEnrichQueue } from '../workers/index.js';

const feedbackSchema = z.object({
  searchSessionId: z.number(),
  type: z.enum(['click', 'purchase', 'return', 'validation']),
  productId: z.number().optional(),
  usageCode: z.string().optional(),
  validated: z.boolean().optional(),
  correction: z.string().optional(),
});

export const feedbackRouter = Router();

// POST /api/feedback
feedbackRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = feedbackSchema.parse(req.body);

    // Queue feedback processing
    await feedbackQueue.add('process', body, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    // If validated, also enrich corpus
    if (body.type === 'validation' && body.validated && body.usageCode) {
      await corpusEnrichQueue.add('enrich', {
        query: '', // will be loaded from session
        usageCode: body.usageCode,
        productId: body.productId || 0,
        storeId: req.storeId!,
      }, {
        removeOnComplete: 100,
      });
    }

    res.json({ status: 'queued' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});
