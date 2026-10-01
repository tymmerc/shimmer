/**
 * Demande d'audit gratuit envoyée par le formulaire de la landing.
 *   GET  /api/public/leads/ping  200 { ok: true } : le site n'affiche le
 *                                formulaire que si l'API répond ici (sinon
 *                                il garde l'adresse e-mail seule).
 *   POST /api/public/leads       { shopUrl, email, platform?, message?, website, elapsedMs }
 *
 * Public, appelé depuis le site (même origine, /shimmer/api/...). Corps JSON
 * limité à 16 ko (index.ts). Les robots (case piège remplie, envoi en moins de
 * 2,5 s) reçoivent le même 200 qu'un envoi réussi et rien n'est gardé.
 * Une demande n'est jamais perdue sans bruit : elle est écrite dans les logs,
 * gardée en base si la table existe, puis envoyée par e-mail au fondateur.
 * 200 si elle est gardée OU envoyée, 503 si ni l'un ni l'autre.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { logger } from '@shimmer/core';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';
import { cleanHeader, parseLead } from '../lib/lead-input.js';
import { insertLead, leadsTable, markLeadNotified, type NewLead } from '../lib/leads.js';
import { notifyLead } from '../lib/lead-notify.js';

export const publicLeadsRouter = Router();

// Les envois refusés (400, 503) ne comptent pas : une faute de frappe ne
// bloque personne. Les robots ignorés, eux, comptent dans la limite par client.
const perClientLimiter = createScopedRateLimiter('leads', 10 * 60_000, 5, undefined, { skipFailedRequests: true });
// Plafond de tout le formulaire, pour ne pas inonder la boîte du fondateur.
// Posé APRÈS le filtre à robots : leurs envois ne mangent pas ce quota.
const dailyLimiter = createScopedRateLimiter('leads-all', 24 * 3600_000, 200, () => 'all', { skipFailedRequests: true });

publicLeadsRouter.get('/ping', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
});

/** Valide la demande ; un robot reçoit 200 tout de suite, une demande invalide 400. */
function screenLead(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  const parsed = parseLead(req.body);
  if (parsed.kind === 'bot') {
    // Gardé dans les logs : si un humain pressé tombait dedans, on le retrouverait.
    const b = req.body as Record<string, unknown>;
    logger.info({
      reason: parsed.reason,
      elapsedMs: typeof b.elapsedMs === 'number' ? b.elapsedMs : undefined,
      shopUrl: typeof b.shopUrl === 'string' ? b.shopUrl.slice(0, 300) : undefined,
      email: typeof b.email === 'string' ? b.email.slice(0, 255) : undefined,
    }, 'leads.dropped');
    res.json({ ok: true });
    return;
  }
  if (parsed.kind === 'invalid') {
    res.status(400).json({ ok: false, error: 'invalid', fields: parsed.fields });
    return;
  }
  res.locals.lead = {
    ...parsed.lead,
    userAgent: cleanHeader(req.get('user-agent'), 300),
    referer: cleanHeader(req.get('referer'), 500),
  } satisfies NewLead;
  next();
}

async function storeLead(lead: NewLead): Promise<number | null> {
  if (!(await leadsTable.ready())) return null;
  try {
    return await insertLead(lead);
  } catch (err) {
    logger.error({ err }, 'leads.store-failed');
    return null;
  }
}

publicLeadsRouter.post('/', perClientLimiter, screenLead, dailyLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = res.locals.lead as NewLead;
    const receivedAt = new Date();
    // Première trace, avant tout le reste : les logs ne restent que sur le VPS.
    logger.info({ lead }, 'leads.received');

    const id = await storeLead(lead);
    const notice = await notifyLead({ ...lead, id, receivedAt });
    if (notice.sent && id !== null) {
      await markLeadNotified(id).catch((err) => logger.warn({ err, id }, 'leads.mark-notified-failed'));
    }

    if (id === null && !notice.sent) {
      logger.error({ lead, notify: notice.reason }, 'leads.not-saved');
      res.status(503).json({ ok: false, error: 'unavailable' });
      return;
    }
    logger.info({ id, notified: notice.sent }, 'leads.saved');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
