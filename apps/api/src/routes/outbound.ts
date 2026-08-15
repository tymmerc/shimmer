/**
 * Outbound routes — generate ads, newsletters and social posts from a free prompt.
 * Uses the configured LLM (Claude or Ollama) to produce campaign content per format.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma, getClaude, logger, ShimmerError } from '@shimmer/core';
import { enqueueOutboundPublish } from '../lib/automations/queue.js';

export const outboundRouter = Router();

const FORMATS = ['ads', 'newsletter', 'social'] as const;
type Format = (typeof FORMATS)[number];

const generateSchema = z.object({
  prompt: z.string().min(3).max(2000),
  format: z.enum(FORMATS).optional(),
  audience: z.string().max(100).optional(),
});

const updateSchema = z.object({
  status: z.enum(['draft', 'approved', 'scheduled', 'published', 'archived']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ─────────────────────────────────────────────────────────────
// Format detection from free text (when caller does not pass it)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Build the system prompt for the LLM based on store + format
// ─────────────────────────────────────────────────────────────
interface StoreContext {
  name: string;
  tone?: string;
  voice?: string;
  topProducts: Array<{ name: string; price: string | null; category: string | null; brand: string | null }>;
}

async function buildStoreContext(storeId: number): Promise<StoreContext> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ShimmerError('Store not found', 'STORE_NOT_FOUND', 404);

  const config = (store.config ?? {}) as Record<string, unknown>;
  const tone = typeof config.tone === 'string' ? config.tone : undefined;
  const voice = typeof config.voice === 'string' ? config.voice : undefined;

  // Take 8 top products by recent activity (proxy: most recently updated)
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { name: true, price: true, category: true, brand: true },
    orderBy: { updatedAt: 'desc' },
    take: 8,
  });

  const topProducts = products.map(p => ({
    name: p.name,
    price: p.price ? p.price.toString() : null,
    category: p.category,
    brand: p.brand,
  }));

  return { name: store.name, tone, voice, topProducts };
}

function systemPromptFor(format: Format, ctx: StoreContext): string {
  const productLines = ctx.topProducts
    .slice(0, 8)
    .map(p => `- ${p.name}${p.brand ? ` (${p.brand})` : ''}${p.price ? ` · ${p.price}€` : ''}${p.category ? ` · ${p.category}` : ''}`)
    .join('\n');

  const toneLine = ctx.tone ? `Ton de la marque : ${ctx.tone}.` : '';
  const voiceLine = ctx.voice ? `Voix : ${ctx.voice}.` : '';

  const formatInstruction: Record<Format, string> = {
    ads: `Produis 3 à 5 visuels publicitaires variés (formats : square 1080x1080, story 1080x1920, banner 1200x628).
Schema JSON STRICT à retourner :
{
  "format": "ads",
  "items": [
    { "format": "square"|"story"|"banner", "headline": string (max 60 chars), "body": string (max 140 chars), "cta": string (max 24 chars), "tone": "doux"|"urgence"|"premium"|"jouif"|"sobre" }
  ]
}
Headlines distinctes les unes des autres. CTA actionnables ("Voir la sélection", "En profiter", etc.).`,

    newsletter: `Produis un email complet et chaleureux.
Schema JSON STRICT à retourner :
{
  "format": "newsletter",
  "subject": string (max 60 chars),
  "preheader": string (max 90 chars),
  "intro": string (2-3 phrases),
  "picks": [
    { "name": string, "price": string ou "offerte", "reason": string (1 phrase, raison d'inclure) }
  ],
  "cta": string (max 24 chars)
}
2 à 4 picks maximum. Reasons doivent référencer le produit, pas être génériques.`,

    social: `Produis 3 posts adaptés à 3 plateformes différentes (Instagram, Facebook, LinkedIn).
Schema JSON STRICT à retourner :
{
  "format": "social",
  "items": [
    { "platform": "Instagram"|"Facebook"|"LinkedIn", "caption": string (50 à 280 mots), "hashtags": [string] (5 à 8 hashtags sans le #) }
  ]
}
Insta = visuel + concis + hashtags lifestyle. Facebook = plus long, raconte. LinkedIn = pro, sobre.`,
  };

  return `Tu es Shimmer, un assistant marketing pour la boutique "${ctx.name}".
${toneLine}
${voiceLine}

Voici les produits du catalogue à exploiter :
${productLines}

Tâche : générer une campagne pour le format demandé.

${formatInstruction[format]}

Ne mentionne JAMAIS de produit qui n'est pas dans la liste ci-dessus.
Ne mets pas d'introduction hors JSON. Réponds avec UNIQUEMENT l'objet JSON.`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/outbound/generate — generate a new campaign
// ─────────────────────────────────────────────────────────────
outboundRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateSchema.parse(req.body);
    const storeId = req.storeId!;
    const format: Format = body.format ?? detectFormat(body.prompt);

    const ctx = await buildStoreContext(storeId);
    const system = systemPromptFor(format, ctx);

    const claude = getClaude();
    const start = Date.now();
    const generated = await claude.completeJson<Record<string, unknown>>(
      [{ role: 'user', content: body.prompt }],
      { systemPrompt: system, maxTokens: 1800, temperature: 0.7 },
    );
    const durationMs = Date.now() - start;

    // Persist (cast to Prisma's JsonValue contract)
    const prisma = getPrisma();
    const campaign = await prisma.outboundCampaign.create({
      data: {
        storeId,
        prompt: body.prompt,
        format,
        audience: body.audience ?? null,
        content: generated as unknown as Parameters<typeof prisma.outboundCampaign.create>[0]['data']['content'],
        status: 'draft',
        metrics: { generationMs: durationMs } as unknown as Parameters<typeof prisma.outboundCampaign.create>[0]['data']['metrics'],
      },
    });

    logger.info({ storeId, campaignId: campaign.id, format, durationMs }, 'outbound.generated');
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/outbound/campaigns — list campaigns for the store
// ─────────────────────────────────────────────────────────────
outboundRouter.get('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const format = typeof req.query.format === 'string' ? req.query.format : undefined;
    const prisma = getPrisma();
    const campaigns = await prisma.outboundCampaign.findMany({
      where: {
        storeId,
        ...(status ? { status } : {}),
        ...(format ? { format } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/outbound/campaigns/:id — get one campaign
// ─────────────────────────────────────────────────────────────
outboundRouter.get('/campaigns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const prisma = getPrisma();
    const campaign = await prisma.outboundCampaign.findFirst({ where: { id, storeId } });
    if (!campaign) throw new ShimmerError('Campaign not found', 'NOT_FOUND', 404);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/outbound/campaigns/:id — approve / schedule / publish / archive
// ─────────────────────────────────────────────────────────────
outboundRouter.patch('/campaigns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const body = updateSchema.parse(req.body);
    const prisma = getPrisma();
    const existing = await prisma.outboundCampaign.findFirst({ where: { id, storeId } });
    if (!existing) throw new ShimmerError('Campaign not found', 'NOT_FOUND', 404);

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
    if (body.status === 'published') data.publishedAt = new Date();

    const updated = await prisma.outboundCampaign.update({
      where: { id },
      data,
    });

    // If newly scheduled, post a delayed job to publish at scheduledAt.
    if (body.status === 'scheduled' && updated.scheduledAt) {
      try {
        await enqueueOutboundPublish(updated.id, updated.scheduledAt);
      } catch (err) {
        logger.warn({ err, campaignId: updated.id }, 'outbound.publish-enqueue-failed');
      }
    }

    res.json({ campaign: updated });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/outbound/campaigns/:id/export — Mailchimp / Meta Ads ready payload
// ─────────────────────────────────────────────────────────────
outboundRouter.get('/campaigns/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ShimmerError('Invalid id', 'BAD_REQUEST', 400);
    }
    const target = (typeof req.query.target === 'string' ? req.query.target : 'mailchimp').toLowerCase();
    const prisma = getPrisma();
    const campaign = await prisma.outboundCampaign.findFirst({ where: { id, storeId } });
    if (!campaign) throw new ShimmerError('Campaign not found', 'NOT_FOUND', 404);

    const content = (campaign.content ?? {}) as Record<string, unknown>;

    if (target === 'mailchimp') {
      // Mailchimp Marketing API · POST /campaigns + PUT /campaigns/{id}/content
      // We return the body of both calls.
      const nl = content as { subject?: string; preheader?: string; intro?: string; picks?: Array<{ name?: string; price?: string; reason?: string }>; cta?: string };
      if (campaign.format !== 'newsletter') {
        throw new ShimmerError('Mailchimp export only available for newsletter campaigns', 'BAD_REQUEST', 400);
      }
      const html = renderNewsletterHtml(nl);
      res.json({
        target: 'mailchimp',
        campaign: {
          type: 'regular',
          recipients: { list_id: '<REPLACE_WITH_MAILCHIMP_LIST_ID>' },
          settings: {
            subject_line: nl.subject ?? '',
            preview_text: nl.preheader ?? '',
            title: `Shimmer · ${campaign.prompt.slice(0, 60)}`,
            from_name: '<REPLACE_WITH_SENDER_NAME>',
            reply_to: '<REPLACE_WITH_REPLY_TO_EMAIL>',
          },
        },
        content: { html },
        notes: 'POST le payload `campaign` sur /3.0/campaigns, puis PUT `content` sur /3.0/campaigns/{id}/content.',
      });
      return;
    }

    if (target === 'meta' || target === 'meta_ads' || target === 'facebook') {
      // Meta Marketing API · creative payload for a paid ad
      if (campaign.format !== 'ads') {
        throw new ShimmerError('Meta export only available for ads campaigns', 'BAD_REQUEST', 400);
      }
      const ads = content as { items?: Array<{ format?: string; headline?: string; body?: string; cta?: string; tone?: string }> };
      const creatives = (ads.items ?? []).map((a, i) => ({
        name: `Shimmer ad ${i + 1} · ${a.format ?? 'square'}`,
        object_story_spec: {
          page_id: '<REPLACE_WITH_FACEBOOK_PAGE_ID>',
          link_data: {
            link: '<REPLACE_WITH_LANDING_URL>',
            message: a.body ?? '',
            name: a.headline ?? '',
            description: a.tone ?? '',
            call_to_action: {
              type: ctaTypeFor(a.cta),
              value: { link: '<REPLACE_WITH_LANDING_URL>' },
            },
          },
        },
        degrees_of_freedom_spec: { creative_features_spec: { standard_enhancements: { enroll_status: 'OPT_IN' } } },
      }));
      res.json({
        target: 'meta_ads',
        creatives,
        notes: 'POST chaque entrée sur /v18.0/act_<AD_ACCOUNT_ID>/adcreatives.',
      });
      return;
    }

    if (target === 'brevo') {
      // Brevo (ex Sendinblue) — POST /v3/emailCampaigns
      const nl = content as { subject?: string; preheader?: string; intro?: string; picks?: Array<{ name?: string; price?: string; reason?: string }>; cta?: string };
      if (campaign.format !== 'newsletter') {
        throw new ShimmerError('Brevo export only available for newsletter campaigns', 'BAD_REQUEST', 400);
      }
      const html = renderNewsletterHtml(nl);
      res.json({
        target: 'brevo',
        emailCampaign: {
          name: `Shimmer · ${campaign.prompt.slice(0, 60)}`,
          subject: nl.subject ?? '',
          previewText: nl.preheader ?? '',
          sender: { name: '<REPLACE_WITH_SENDER_NAME>', email: '<REPLACE_WITH_SENDER_EMAIL>' },
          htmlContent: html,
          recipients: { listIds: ['<REPLACE_WITH_BREVO_LIST_ID>'] },
        },
      });
      return;
    }

    throw new ShimmerError(`Unknown target ${target}. Use mailchimp, meta_ads or brevo.`, 'BAD_REQUEST', 400);
  } catch (err) {
    next(err);
  }
});

function renderNewsletterHtml(nl: { subject?: string; intro?: string; picks?: Array<{ name?: string; price?: string; reason?: string }>; cta?: string }): string {
  const picks = (nl.picks ?? []).map(p => `<tr><td style="padding:12px;border-bottom:1px solid #eee"><strong>${esc(p.name ?? '')}</strong> · ${esc(p.price ?? '')}<br><em style="color:#666">${esc(p.reason ?? '')}</em></td></tr>`).join('');
  return `<!doctype html><html><body style="font-family:Georgia,serif;background:#fbf9f4;color:#0d0b14;margin:0;padding:32px"><table cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden"><tr><td style="padding:32px"><h1 style="font-weight:400;letter-spacing:-0.02em;font-size:28px;margin:0 0 16px">${esc(nl.subject ?? '')}</h1><p style="line-height:1.6">${esc(nl.intro ?? '')}</p><table cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px">${picks}</table>${nl.cta ? `<p style="margin-top:32px"><a href="#" style="display:inline-block;background:#0d0b14;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.18em;text-transform:uppercase">${esc(nl.cta)} →</a></p>` : ''}</td></tr></table></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ctaTypeFor(label: string | undefined): string {
  if (!label) return 'SHOP_NOW';
  const l = label.toLowerCase();
  if (l.includes('voir') || l.includes('découvrir')) return 'LEARN_MORE';
  if (l.includes('réserver') || l.includes('reserver')) return 'BOOK_TRAVEL';
  if (l.includes('acheter') || l.includes('panier') || l.includes('commander')) return 'SHOP_NOW';
  if (l.includes('s\'inscrire') || l.includes('sinscrire')) return 'SIGN_UP';
  return 'SHOP_NOW';
}

// ─────────────────────────────────────────────────────────────
// GET /api/outbound/stats — summary for the dashboard
// ─────────────────────────────────────────────────────────────
outboundRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();
    const all = await prisma.outboundCampaign.findMany({
      where: { storeId },
      select: { format: true, status: true, createdAt: true, metrics: true },
    });
    const byFormat: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const c of all) {
      byFormat[c.format] = (byFormat[c.format] ?? 0) + 1;
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    }
    res.json({
      total: all.length,
      byFormat,
      byStatus,
      mostRecent: all.length > 0 ? all[0].createdAt : null,
    });
  } catch (err) {
    next(err);
  }
});
