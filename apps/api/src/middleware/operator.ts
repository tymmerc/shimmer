/**
 * Routes d'exploitation (balayage de toutes les boutiques, file BullMQ
 * globale) : réservées aux boutiques de l'opérateur Shimmer. Par défaut la
 * boutique 1 (admin) ; SHIMMER_OPERATOR_STORES="1,7" pour en ajouter.
 * À poser APRÈS authMiddleware.
 */

import type { Request, Response, NextFunction } from 'express';

export function operatorStoreIds(raw = process.env.SHIMMER_OPERATOR_STORES ?? '1'): Set<number> {
  return new Set(raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0));
}

export function isOperator(storeId: number | undefined): boolean {
  return storeId !== undefined && operatorStoreIds().has(storeId);
}

export function operatorOnly(req: Request, res: Response, next: NextFunction): void {
  if (!isOperator(req.storeId)) {
    res.status(403).json({ error: 'Operator only' });
    return;
  }
  next();
}
