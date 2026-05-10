/**
 * Store management routes:
 * - POST   /api/stores          (no auth — creates a new store and returns its api key)
 * - GET    /api/stores/:id      (no auth — public profile, never returns the api key)
 * - GET    /api/stores/me/config  (auth — current store's config)
 * - PATCH  /api/stores/me/config  (auth — merge update of tone/voice/universe_overrides)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';

export const storesRouter = Router();

const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()).optional(),
});

// One QualCriterion override entry: keep loose typing to accept whatever the
// search-assist runtime understands (validated at use-time by applyStoreOverrides).
const criterionShape = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  weight: z.number().optional(),
  required: z.boolean().optional(),
  type: z.enum(['closed', 'open', 'deduced']).optional(),
  values: z.array(z.string()).optional(),
  question: z.string().optional(),
  fallback: z.string().optional(),
}).passthrough();

const deductionShape = z.object({
  patterns: z.array(z.string()).min(1),
  criterion: z.string().min(1),
  value: z.string().min(1),
});

const overrideShape = z.object({
  criteria_replace: z.array(criterionShape).optional(),
  criteria_add: z.array(criterionShape).optional(),
  criteria_remove: z.array(z.string()).optional(),
  criteria_priority: z.array(z.string()).optional(),
  keywords_add: z.array(z.string()).optional(),
  deductions_add: z.array(deductionShape).optional(),
});

const voiceShape = z.object({
  intro_phrases: z.array(z.string()).optional(),
  signature: z.string().optional(),
  vocabulary: z.record(z.string()).optional(),
});

const configUpdateSchema = z.object({
  tone: z.enum(['tu', 'vous']).optional(),
  voice: voiceShape.nullable().optional(), // null = clear
  universe_overrides: z.record(overrideShape).nullable().optional(),
}).strict();

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

// GET /api/stores/me/config — current store's config (auth required, route before :id)
storesRouter.get('/me/config', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id: req.storeId! },
      select: { id: true, name: true, config: true, updatedAt: true },
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

// PATCH /api/stores/me/config — merge update of tone / voice / universe_overrides
storesRouter.patch('/me/config', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = configUpdateSchema.parse(req.body);
    const prisma = getPrisma();

    const current = await prisma.store.findUnique({
      where: { id: req.storeId! },
      select: { config: true },
    });
    if (!current) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const currentConfig = (current.config as Record<string, unknown>) || {};
    const nextConfig: Record<string, unknown> = { ...currentConfig };

    if (body.tone !== undefined) {
      nextConfig.tone = body.tone;
    }
    if (body.voice !== undefined) {
      if (body.voice === null) delete nextConfig.voice;
      else nextConfig.voice = body.voice;
    }
    if (body.universe_overrides !== undefined) {
      if (body.universe_overrides === null) delete nextConfig.universe_overrides;
      else nextConfig.universe_overrides = body.universe_overrides;
    }

    const updated = await prisma.store.update({
      where: { id: req.storeId! },
      data: { config: nextConfig },
      select: { id: true, name: true, config: true, updatedAt: true },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/stores/:id — keep last (catch-all numeric id, no auth, no api key in response)
storesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid store id' });
      return;
    }
    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id },
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
