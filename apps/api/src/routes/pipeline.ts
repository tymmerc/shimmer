/**
 * Pipeline routes — product enrichment, usage extraction, scoring.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, ClaudeClient } from '@shimmer/core';
import { invalidateTaxonomyCache } from '@shimmer/smart-search';

export const pipelineRouter = Router();

// POST /api/pipeline/enrich/:productId — AI-enrich a product's description + usages
pipelineRouter.post('/enrich/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.productId);
    const prisma = getPrisma();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { usages: { include: { usage: true } } },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const claude = new ClaudeClient();
    const enrichment = await claude.completeJson<{
      suggestedUsages: { code: string; score: number; rationale: string }[];
      enrichedDescription: string;
    }>(
      [
        {
          role: 'user',
          content: `Analyse ce produit et suggère des usages pertinents.

Produit: ${product.name}
Description: ${product.description || 'Aucune'}
Catégorie: ${product.category}
Marque: ${product.brand}
Specs: ${JSON.stringify(product.specs)}

Retourne un JSON avec:
- suggestedUsages: array de {code, score (0-100), rationale}
- enrichedDescription: description améliorée du produit`,
        },
      ],
      { temperature: 0.3 },
    );

    res.json({ productId, enrichment });
  } catch (err) {
    next(err);
  }
});

// POST /api/pipeline/extract — extract usages from raw text
const extractSchema = z.object({
  text: z.string().min(1),
  category: z.string().optional(),
});

pipelineRouter.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = extractSchema.parse(req.body);
    const claude = new ClaudeClient();

    const result = await claude.completeJson<{
      usages: { code: string; label: string; confidence: number }[];
    }>(
      [
        {
          role: 'user',
          content: `Extrais les usages/besoins fonctionnels de ce texte.
${body.category ? `Catégorie: ${body.category}` : ''}

Texte: "${body.text}"

Retourne un JSON avec un array "usages" contenant {code, label, confidence (0-1)}.`,
        },
      ],
      { temperature: 0.2 },
    );

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/pipeline/score — score products for given usages
const scoreSchema = z.object({
  productIds: z.array(z.number()),
  usageCodes: z.array(z.string()),
});

pipelineRouter.post('/score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = scoreSchema.parse(req.body);
    const prisma = getPrisma();

    const products = await prisma.product.findMany({
      where: { id: { in: body.productIds } },
      include: {
        usages: {
          where: { usage: { code: { in: body.usageCodes } } },
          include: { usage: true },
        },
      },
    });

    const scored = products.map((p) => ({
      productId: p.id,
      name: p.name,
      usageScores: Object.fromEntries(
        p.usages.map((u) => [u.usage.code, u.score]),
      ),
    }));

    res.json({ products: scored });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/pipeline/status
pipelineRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const [productCount, usageCount, taxonomyCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.productUsage.count(),
      prisma.usageTaxonomy.count(),
    ]);

    res.json({
      products: productCount,
      usages: usageCount,
      taxonomyEntries: taxonomyCount,
    });
  } catch (err) {
    next(err);
  }
});
