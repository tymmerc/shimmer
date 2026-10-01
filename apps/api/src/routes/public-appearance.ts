/**
 * Apparence publique du widget :
 *   GET /api/public/appearance?store=<id>
 * Public, sans clé ni cookie : le SDK la lit au démarrage, depuis la vitrine.
 * Ne renvoie que les champs d'apparence revalidés (lib/appearance), jamais le
 * reste du config (secrets des plateformes, facturation, e-mail du marchand).
 * Une boutique inconnue reçoit {} comme une boutique sans réglage : la réponse
 * ne dit pas quels id existent.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';
import { publicAppearance } from '../lib/appearance.js';

export const publicAppearanceRouter = Router();

// Une lecture par page vue, mise en cache 5 min par le navigateur.
const appearanceLimiter = createScopedRateLimiter('public-appearance', 60_000, 120);

// Colonne id en int4 : au-delà, Prisma refuserait la requête (500).
const MAX_STORE_ID = 2_147_483_647;

/** Id de boutique en entier positif écrit en chiffres seulement, sinon null. */
export function parseStoreParam(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^[0-9]{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 && id <= MAX_STORE_ID ? id : null;
}

publicAppearanceRouter.get('/', appearanceLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseStoreParam(req.query.store);
    if (storeId === null) {
      res.status(400).json({ error: 'Invalid store id' });
      return;
    }
    const store = await getPrisma().store.findUnique({
      where: { id: storeId },
      select: { config: true },
    });
    // 1 min de fraîcheur puis revalidation en arrière-plan : un réglage de
    // l'admin se voit sur la vitrine en une à deux pages vues.
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
    res.json({ appearance: publicAppearance(store?.config) });
  } catch (err) {
    next(err);
  }
});
