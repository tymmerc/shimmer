/**
 * Store management routes:
 * - POST   /api/stores          (no auth — creates a new store and returns its api key)
 * - GET    /api/stores/:id      (no auth, public profile: id + name only, never the config)
 * - GET    /api/stores/me/config  (auth — current store's config)
 * - PATCH  /api/stores/me/config  (auth — merge update of tone/voice/universe_overrides)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';
import { derivePublishableKey } from '../lib/publishable-key.js';
import { publicStoreProfile } from '../lib/public-store.js';
import { CRITERION_ID_RE } from '../lib/criterion-id.js';
import { patchStoreConfig } from '../lib/knowledge-ingest.js';
import { appearanceSchema } from '../lib/appearance.js';

export const storesRouter = Router();

// Store creation costs DB rows and grants an API key: 5 per hour per IP is
// plenty for a legitimate signup flow and kills bulk-creation abuse.
const signupLimiter = createScopedRateLimiter('store-create', 60 * 60_000, 5);
// Plafond global : une vague de créations (IPv6 tournantes, proxys) ne peut
// pas dépasser SIGNUPS_PER_DAY boutiques par jour, toutes IP confondues.
const SIGNUPS_PER_DAY = Number(process.env.SHIMMER_SIGNUPS_PER_DAY) || 20;
// Seules les créations réussies comptent : des requêtes invalides ne peuvent
// pas épuiser le plafond et bloquer les vraies inscriptions.
const signupDailyCap = createScopedRateLimiter('store-create-day', 24 * 60 * 60_000, SIGNUPS_PER_DAY, () => 'all', { skipFailedRequests: true });

// L'inscription ne pose que ce que le formulaire du site envoie. Avant le
// 30/09, le config était libre : un inconnu pouvait se mettre en phase 'live',
// fixer son propre tarif (billing), couper le témoin (holdout) ou planter un
// critère piégé (universe_overrides).
const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(100),
  config: z.object({
    ownerEmail: z.string().trim().email().max(254),
    vertical: z.enum(['wines', 'lighting', 'fashion', 'cosmetic', 'hifi', 'bricolage', 'other']).optional(),
    platform: z.enum(['shopify', 'woocommerce', 'prestashop', 'custom', 'unknown']).optional(),
    createdVia: z.string().max(40).optional(),
  }).strict(),
}).strict();

const criterionId = z.string().regex(CRITERION_ID_RE);
const shortText = z.string().max(500);

// One QualCriterion override entry: keep loose typing to accept whatever the
// search-assist runtime understands (validated at use-time by applyStoreOverrides).
const criterionShape = z.object({
  id: criterionId,
  label: shortText.optional(),
  weight: z.number().min(0).max(100).optional(),
  required: z.boolean().optional(),
  type: z.enum(['closed', 'open', 'deduced']).optional(),
  values: z.array(z.string().max(100)).max(30).optional(),
  question: shortText.optional(),
  fallback: z.string().max(200).optional(),
}).strict();

const deductionShape = z.object({
  patterns: z.array(z.string().min(1).max(60)).min(1).max(30),
  criterion: criterionId,
  value: z.string().min(1).max(200),
});

const overrideShape = z.object({
  criteria_replace: z.array(criterionShape).max(30).optional(),
  criteria_add: z.array(criterionShape).max(30).optional(),
  criteria_remove: z.array(criterionId).max(30).optional(),
  criteria_priority: z.array(criterionId).max(30).optional(),
  keywords_add: z.array(z.string().min(1).max(60)).max(100).optional(),
  deductions_add: z.array(deductionShape).max(50).optional(),
});

const voiceShape = z.object({
  intro_phrases: z.array(shortText).max(50).optional(),
  signature: shortText.optional(),
  vocabulary: z.record(z.string().max(300)).optional(),
});

const crossSellRulesShape = z.object({
  exclude: z.array(z.object({
    from_sku: z.string().optional(),
    to_sku: z.string().optional(),
  })).optional(),
  force: z.array(z.object({
    from_sku: z.string().optional(),
    from_category: z.string().optional(),
    to_sku: z.string().optional(),
    to_category: z.string().optional(),
    role: z.enum(['apero', 'repas', 'dessert', 'decouverte', 'cadeau', 'accessoire', 'complement']).optional(),
    reason: z.string().max(280).optional(),
  })).optional(),
  reason_overrides: z.record(z.string().max(280)).optional(),
});

const configUpdateSchema = z.object({
  // Les trois choix de la page Réglages. « neutre » : le vendeur évite les
  // pronoms (sales-assistant), les gabarits de la recherche guidée vouvoient.
  tone: z.enum(['tu', 'vous', 'neutre']).optional(),
  voice: voiceShape.nullable().optional(),
  universe_overrides: z.record(z.string().max(60), overrideShape).nullable().optional(),
  cross_sell_rules: crossSellRulesShape.nullable().optional(),
  // Objet entier remplacé ; {} = tout automatique, null = clé retirée.
  appearance: appearanceSchema.nullable().optional(),
}).strict();

// POST /api/stores — create a new store (admin, no auth required)
storesRouter.post('/', signupLimiter, signupDailyCap, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createStoreSchema.parse(req.body);
    const prisma = getPrisma();

    // Toujours en 'ingesting' : seules les portes d'onboarding (ingestion,
    // observation, validation) font passer une boutique en 'live'.
    const config = { ...body.config, shimmer_phase: 'ingesting' };

    const store = await prisma.store.create({
      data: {
        name: body.name,
        apiKey: `sk_${randomUUID().replace(/-/g, '')}`,
        config,
      },
    });

    res.status(201).json({
      id: store.id,
      name: store.name,
      apiKey: store.apiKey,
      publishableKey: derivePublishableKey(store.id),
      createdAt: store.createdAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors.map((e) => ({ path: e.path, message: e.message })) });
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
    res.json({ ...store, publishableKey: derivePublishableKey(store.id) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/stores/me/config — merge update of tone / voice / universe_overrides
storesRouter.patch('/me/config', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = configUpdateSchema.parse(req.body);
    const prisma = getPrisma();

    // Patch atomique (jsonb) : la relecture SAV de nuit écrit aussi dans le
    // config, un lire-modifier-réécrire effaçait ses clés.
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    for (const key of ['tone', 'voice', 'universe_overrides', 'cross_sell_rules', 'appearance'] as const) {
      const value = body[key];
      if (value === undefined) continue;
      if (value === null) unset.push(key);
      else set[key] = value;
    }
    await patchStoreConfig(prisma, req.storeId!, set, unset);

    const updated = await prisma.store.findUnique({
      where: { id: req.storeId! },
      select: { id: true, name: true, config: true, updatedAt: true },
    });
    if (!updated) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/stores/:id — keep last (catch-all numeric id, no auth).
// Public profile only (id, name): the config holds secrets (Shopify webhook
// secret, Woo keys, billing). Before 30/09/2026 it returned the whole config.
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
      select: { id: true, name: true },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json(publicStoreProfile(store));
  } catch (err) {
    next(err);
  }
});
