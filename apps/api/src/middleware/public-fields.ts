/**
 * Réponses du widget (clé publique pk_, lisible par n'importe qui dans le
 * code d'une vitrine) : les produits ne sortent qu'avec leurs champs publics.
 * Avant le 30/09 la recherche renvoyait des lignes complètes : stock exact,
 * seuil d'alerte, identifiants internes, scores d'usage, dates.
 * Les outils internes (clé secrète) gardent tout.
 */

import type { Request, Response, NextFunction } from 'express';

const PRIVATE_PRODUCT_KEYS = [
  'storeId', 'store_id', 'stock', 'lowStockThreshold', 'low_stock_threshold', 'platformId', 'platform_id',
  'lastSync', 'last_sync', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'usages', 'isActive', 'is_active', 'specs',
];

const looksLikeProduct = (o: Record<string, unknown>) => 'name' in o && ('sku' in o || 'price' in o);

export function stripPrivateProductFields(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => stripPrivateProductFields(v, depth + 1));
  const out: Record<string, unknown> = {};
  const product = looksLikeProduct(value as Record<string, unknown>);
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (product && PRIVATE_PRODUCT_KEYS.includes(k)) continue;
    // Scores internes d'un résultat de recherche.
    if (k === 'usageScores') continue;
    out[k] = stripPrivateProductFields(v, depth + 1);
  }
  return out;
}

/** À monter devant les routeurs du widget : filtre au moment de répondre (l'auth a tourné). */
export function publicProductFields(req: Request, res: Response, next: NextFunction): void {
  const json = res.json.bind(res);
  res.json = ((body: unknown) => json(req.authScope === 'publishable' ? stripPrivateProductFields(body) : body)) as Response['json'];
  next();
}
