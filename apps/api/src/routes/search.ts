/**
 * Search routes — POST /api/search, POST /api/search/refine, GET /api/search/session/:id
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { search } from '@shimmer/smart-search';

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  searchType: z.enum(['EXACT', 'FUNCTIONAL', 'SIMILARITY', 'HYBRID']).optional(),
  sessionToken: z.string().optional(),
  filters: z.object({
    category: z.string().optional(),
    brand: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    inStock: z.boolean().optional(),
  }).optional(),
});

const refineSchema = z.object({
  sessionToken: z.string(),
  query: z.string().min(1).max(500),
  answer: z.record(z.string()).optional(),
});

export const searchRouter = Router();

// POST /api/search
searchRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = searchSchema.parse(req.body);
    const result = await search({
      ...body,
      storeId: req.storeId!,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/search/refine
searchRouter.post('/refine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refineSchema.parse(req.body);
    // Re-run search with session context
    const result = await search({
      query: body.query,
      sessionToken: body.sessionToken,
      storeId: req.storeId!,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/search/session/:id
searchRouter.get('/session/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const session = await prisma.searchSession.findFirst({
      where: {
        sessionToken: req.params.id,
        storeId: req.storeId!,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});
