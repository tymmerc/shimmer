/**
 * Auth middleware — validates store API key from Authorization header.
 */

import type { Request, Response, NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { verifyPublishableKey } from '../lib/publishable-key.js';

declare global {
  namespace Express {
    interface Request {
      storeId?: number;
      store?: { id: number; name: string; config: unknown };
      /** 'secret' = full access (sk_ key). 'publishable' = widget-only (pk_ key). */
      authScope?: 'secret' | 'publishable';
    }
  }
}

/**
 * Strict auth: the secret API key only. Use on every management route
 * (catalog, config, analytics, onboarding, billing…).
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const apiKey = authHeader.slice(7);

  try {
    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { apiKey },
      select: { id: true, name: true, config: true },
    });

    if (!store) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    req.storeId = store.id;
    req.store = store;
    req.authScope = 'secret';
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Widget auth: accepts EITHER the secret key (full, back-compat for the admin
 * and internal tools) OR a publishable key (`pk_…`) scoped to a single store.
 * With a publishable key the store id must come from the request
 * (`X-Shimmer-Store` header, or `?store=` / body.store) and is verified against
 * the key. Mount this only on widget-facing routes (vendeur, recherche).
 */
export async function widgetAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const key = authHeader.slice(7);

  try {
    const prisma = getPrisma();

    if (key.startsWith('pk_')) {
      const headerStore = req.headers['x-shimmer-store'];
      const rawStore = (typeof headerStore === 'string' ? headerStore : undefined)
        ?? (typeof req.query.store === 'string' ? req.query.store : undefined)
        ?? (req.body && typeof req.body === 'object' ? (req.body as { store?: unknown }).store : undefined);
      const storeId = Number(rawStore);
      if (!Number.isInteger(storeId) || storeId <= 0 || !verifyPublishableKey(storeId, key)) {
        res.status(401).json({ error: 'Invalid publishable key' });
        return;
      }
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true, config: true },
      });
      if (!store) {
        res.status(401).json({ error: 'Invalid publishable key' });
        return;
      }
      req.storeId = store.id;
      req.store = store;
      req.authScope = 'publishable';
      next();
      return;
    }

    // Secret key path (same as authMiddleware).
    const store = await prisma.store.findUnique({
      where: { apiKey: key },
      select: { id: true, name: true, config: true },
    });
    if (!store) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    req.storeId = store.id;
    req.store = store;
    req.authScope = 'secret';
    next();
  } catch (err) {
    next(err);
  }
}
