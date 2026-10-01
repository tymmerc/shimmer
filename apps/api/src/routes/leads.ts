/**
 * Demandes d'audit reçues par la landing, pour l'admin de l'opérateur.
 *   GET /api/leads  les 200 dernières, plus récentes d'abord
 * Monté derrière authMiddleware + operatorOnly (index.ts) : jamais visible
 * d'une boutique cliente.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { leadsTable, listRecentLeads } from '../lib/leads.js';

export const leadsRouter = Router();

leadsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!(await leadsTable.ready())) {
      res.json({ leads: [], schemaReady: false });
      return;
    }
    res.json({ leads: await listRecentLeads(), schemaReady: true });
  } catch (err) {
    next(err);
  }
});
