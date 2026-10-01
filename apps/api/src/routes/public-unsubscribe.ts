/**
 * Lien de désinscription en pied des e-mails non transactionnels.
 *   GET  /api/public/unsubscribe?t=…  page avec un bouton
 *   POST /api/public/unsubscribe      le clic désinscrit (jeton dans le
 *                                     formulaire, ou dans l'URL pour le
 *                                     désabonnement en un clic RFC 8058)
 * Public : le jeton chiffré (lib/unsubscribe.ts) fait office d'autorisation.
 */

import express, { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { readUnsubscribeToken, suppressEmail } from '../lib/unsubscribe.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const publicUnsubscribeRouter = Router();

const limiter = createScopedRateLimiter('unsubscribe', 60_000, 20);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Page minimale ; `extra` est du HTML construit ici (jamais du texte venu d'ailleurs). */
function page(title: string, text: string, extra = ''): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>` +
    `<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#111;line-height:1.5}h1{font-size:1.4rem}</style></head>` +
    `<body><h1>${esc(title)}</h1><p>${esc(text)}</p>${extra}</body></html>`;
}

async function storeName(storeId: number): Promise<string> {
  const store = await getPrisma().store.findUnique({ where: { id: storeId }, select: { name: true } });
  return store?.name ?? 'la boutique';
}

// Page avec un bouton : les antivirus de messagerie ouvrent les liens tout
// seuls, un GET qui désinscrivait le ferait sans que la personne le veuille.
publicUnsubscribeRouter.get('/', limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const token = req.query.t;
    const data = readUnsubscribeToken(token);
    if (!data) {
      res.status(400).type('html').send(page('Lien invalide', 'Ce lien de désinscription est incomplet ou abîmé.'));
      return;
    }
    const name = await storeName(data.storeId);
    res.type('html').send(
      page('Se désinscrire', `Vous ne recevrez plus de rappels de panier, de newsletter ni de demandes d’avis de ${name}. Les e-mails liés à vos commandes continuent.`,
        `<form method="post" action=""><input type="hidden" name="t" value="${esc(String(token))}"><button type="submit" style="font:inherit;padding:.6rem 1.2rem;border-radius:999px;border:0;background:#111;color:#fff;cursor:pointer">Me désinscrire</button></form>`),
    );
  } catch (err) {
    next(err);
  }
});

publicUnsubscribeRouter.post('/', limiter, express.urlencoded({ extended: false, limit: '2kb' }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const token = (req.body as { t?: unknown } | undefined)?.t ?? req.query.t;
    const data = readUnsubscribeToken(token);
    if (!data) {
      res.status(400).type('html').send(page('Lien invalide', 'Ce lien de désinscription est incomplet ou abîmé.'));
      return;
    }
    try {
      await suppressEmail(data.storeId, data.email);
    } catch (err) {
      if ((err as Error).message !== 'reminder-schema-missing') throw err;
      res.status(503).type('html').send(page('Un instant', 'La désinscription est momentanément indisponible. Réessayez dans quelques minutes.'));
      return;
    }
    const name = await storeName(data.storeId);
    res.type('html').send(page('C’est fait', `Vous ne recevrez plus ces e-mails de ${name}.`));
  } catch (err) {
    next(err);
  }
});
