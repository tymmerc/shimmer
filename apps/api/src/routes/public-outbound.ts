/**
 * Public outbound demo route — generation without API key for the public demo page.
 * Rate-limited by IP, store is fixed to a demo store. Read-only (no persistence).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getPrisma, getClaude, logger, ShimmerError } from '@shimmer/core';

export const publicOutboundRouter = Router();

const FORMATS = ['ads', 'newsletter', 'social'] as const;
type Format = (typeof FORMATS)[number];

const generateSchema = z.object({
  prompt: z.string().min(3).max(500),
  format: z.enum(FORMATS).optional(),
  storeKey: z.enum(['caves', 'atelier']).optional(),
});

// Map demo store keys to actual store IDs
const STORE_MAP: Record<'caves' | 'atelier', number> = {
  caves: 4,
  atelier: 5,
};

function detectFormat(prompt: string): Format {
  const q = prompt.toLowerCase();
  if (/(newsletter|email|mail|relance|réactivation|reactivation|envoyer un message)/.test(q)) {
    return 'newsletter';
  }
  if (/(post|insta|instagram|facebook|linkedin|social|tiktok|reel|story)/.test(q)) {
    return 'social';
  }
  return 'ads';
}

interface DemoContext {
  name: string;
  products: Array<{ name: string; brand: string | null; price: string | null }>;
}

async function buildDemoContext(storeId: number): Promise<DemoContext> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ShimmerError('Demo store not found', 'STORE_NOT_FOUND', 404);
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { name: true, brand: true, price: true },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  });
  return {
    name: store.name,
    products: products.map(p => ({
      name: p.name,
      brand: p.brand,
      price: p.price ? p.price.toString() : null,
    })),
  };
}

function systemPromptFor(format: Format, ctx: DemoContext): string {
  const productLines = ctx.products
    .map(p => `- ${p.name}${p.brand ? ` (${p.brand})` : ''}${p.price ? ` · ${p.price}€` : ''}`)
    .join('\n') || '(aucun produit)';

  const formatInstruction: Record<Format, string> = {
    ads: `Produis 3 visuels publicitaires (square, story, banner).
JSON STRICT :
{ "format": "ads", "items": [
  { "format": "square"|"story"|"banner", "headline": string (max 60 chars), "body": string (max 140 chars), "cta": string (max 24 chars), "tone": "doux"|"urgence"|"premium"|"jouif"|"sobre" }
]}`,

    newsletter: `Produis un email court.
JSON STRICT :
{ "format": "newsletter", "subject": string, "preheader": string, "intro": string (2 phrases), "picks": [ { "name": string, "price": string, "reason": string (1 phrase) } ], "cta": string }
2 ou 3 picks max.`,

    social: `Produis 3 posts (Instagram, Facebook, LinkedIn).
JSON STRICT :
{ "format": "social", "items": [ { "platform": "Instagram"|"Facebook"|"LinkedIn", "caption": string (50 à 180 mots), "hashtags": [string] (5 à 8) } ] }`,
  };

  return `Tu es Shimmer, assistant marketing pour "${ctx.name}".

Produits du catalogue :
${productLines}

${formatInstruction[format]}

Ne mentionne pas de produit absent de la liste. Réponds UNIQUEMENT avec l'objet JSON.`;
}

// Rate limit: 6 requests/minute per IP
const demoRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes pour la démo. Réessayez dans 1 minute.' },
});

publicOutboundRouter.post(
  '/generate',
  demoRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = generateSchema.parse(req.body);
      const storeId = STORE_MAP[body.storeKey ?? 'caves'];
      const format: Format = body.format ?? detectFormat(body.prompt);

      const ctx = await buildDemoContext(storeId);
      const system = systemPromptFor(format, ctx);

      const claude = getClaude();
      const start = Date.now();
      const content = await claude.completeJson<Record<string, unknown>>(
        [{ role: 'user', content: body.prompt }],
        {
          systemPrompt: system,
          maxTokens: 1200,
          temperature: 0.7,
          model: 'qwen2.5:3b',  // faster for demo
          timeout: 30_000,
        },
      );
      const durationMs = Date.now() - start;

      logger.info({ storeId, format, durationMs }, 'public.outbound.generated');
      res.json({
        store: ctx.name,
        format,
        content,
        meta: { durationMs },
      });
    } catch (err) {
      next(err);
    }
  },
);
