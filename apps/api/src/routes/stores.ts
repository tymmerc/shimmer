/**
 * Store management routes — POST /api/stores, GET /api/stores/:id
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { randomUUID } from 'node:crypto';

export const storesRouter = Router();

const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()).optional(),
});

// POST /api/stores — create a new store (admin, no auth required)
storesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createStoreSchema.parse(req.body);
    const prisma = getPrisma();

    const store = await prisma.store.create({
      data: {
        name: body.name,
        apiKey: `sk_${randomUUID().replace(/-/g, '')}`,
        config: body.config || {},
      },
    });

    res.status(201).json({
      id: store.id,
      name: store.name,
      apiKey: store.apiKey,
      config: store.config,
      createdAt: store.createdAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/stores/:id
storesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        name: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json(store);
  } catch (err) {
    next(err);
  }
});
