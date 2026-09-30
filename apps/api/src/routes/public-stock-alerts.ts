/**
 * Lien de confirmation d'une alerte de retour de stock (double opt-in).
 *   GET /api/public/stock-alerts/confirm?token=…
 * Public : le jeton (192 bits, usage unique) fait office d'autorisation.
 * Répond une petite page HTML, lue par un humain depuis sa boîte mail.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { confirmStockAlert } from '../lib/stock-alerts.js';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const publicStockAlertsRouter = Router();

const confirmLimiter = createScopedRateLimiter('stock-alert-confirm', 60_000, 20);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function page(title: string, text: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>` +
    `<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#111;line-height:1.5}h1{font-size:1.4rem}</style></head>` +
    `<body><h1>${esc(title)}</h1><p>${esc(text)}</p></body></html>`;
}

publicStockAlertsRouter.get('/confirm', confirmLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    res.setHeader('Cache-Control', 'no-store');
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
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
