/**
 * Lien de confirmation d'une alerte de retour de stock (double opt-in).
 *   GET  /api/public/stock-alerts/confirm?token=…  page avec un bouton
 *   POST /api/public/stock-alerts/confirm          le clic confirme
 * Public : le jeton (192 bits, usage unique) fait office d'autorisation.
 * Répond une petite page HTML, lue par un humain depuis sa boîte mail.
 */

import express, { Router, type Request, type Response, type NextFunction } from 'express';
import { confirmStockAlert } from '../lib/stock-alerts.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const publicStockAlertsRouter = Router();

const confirmLimiter = createScopedRateLimiter('stock-alert-confirm', 60_000, 20);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Page minimale ; `extra` est du HTML construit ici (jamais du texte venu d'ailleurs). */
function page(title: string, text: string, extra = ''): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>` +
    `<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#111;line-height:1.5}h1{font-size:1.4rem}</style></head>` +
    `<body><h1>${esc(title)}</h1><p>${esc(text)}</p>${extra}</body></html>`;
}

const tokenOk = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(t);

// Le lien de l'e-mail ouvre une page avec un bouton : les antivirus de
// messagerie (Safe Links, Proofpoint…) ouvrent les liens tout seuls, un GET
// qui confirmait consommait le jeton sans clic humain.
publicStockAlertsRouter.get('/confirm', confirmLimiter, (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = req.query.token;
  if (!tokenOk(token)) {
    res.status(400).type('html').send(page('Lien invalide', 'Ce lien de confirmation est incomplet.'));
    return;
  }
  res.type('html').send(
    page('Confirmer l’alerte', 'Un clic, et la boutique vous prévient dès le retour du produit.',
      `<form method="post" action=""><input type="hidden" name="token" value="${esc(token)}"><button type="submit" style="font:inherit;padding:.6rem 1.2rem;border-radius:999px;border:0;background:#111;color:#fff;cursor:pointer">Confirmer</button></form>`),
  );
});

publicStockAlertsRouter.post('/confirm', confirmLimiter, express.urlencoded({ extended: false, limit: '2kb' }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const token = (req.body as { token?: unknown } | undefined)?.token;
    if (!tokenOk(token)) {
      res.status(400).type('html').send(page('Lien invalide', 'Ce lien de confirmation est incomplet.'));
      return;
    }
    const r = await confirmStockAlert(token);
    if (!r.confirmed) {
      res.status(404).type('html').send(page('Lien expiré', 'Ce lien a déjà servi ou n’est plus valable. Vous pouvez refaire la demande sur la boutique.'));
      return;
    }
    const what = r.label ? `« ${r.label} »` : 'ce produit';
    res.type('html').send(page('C’est confirmé', `${r.storeName ?? 'La boutique'} vous préviendra dès le retour de ${what}.`));
  } catch (err) {
    next(err);
  }
});
