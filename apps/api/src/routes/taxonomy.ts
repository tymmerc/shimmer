/**
 * Taxonomy routes — GET /api/taxonomy, POST /api/taxonomy/:id/enrich
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { loadTaxonomy, invalidateTaxonomyCache } from '@shimmer/smart-search';

export const taxonomyRouter = Router();

// GET /api/taxonomy
taxonomyRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await loadTaxonomy();
    res.json({ entries, count: entries.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/taxonomy/:id/enrich — add keywords to a taxonomy entry
const enrichSchema = z.object({
  keywords: z.array(z.string()).min(1),
});

taxonomyRouter.post('/:id/enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = enrichSchema.parse(req.body);
    const id = Number(req.params.id);

    const prisma = getPrisma();
    const entry = await prisma.usageTaxonomy.findUnique({ where: { id } });
    if (!entry) {
      res.status(404).json({ error: 'Taxonomy entry not found' });
      return;
    }

    const updated = await prisma.usageTaxonomy.update({
      where: { id },
      data: {
        keywords: [...new Set([...entry.keywords, ...body.keywords])],
      },
    });

    invalidateTaxonomyCache();
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});
