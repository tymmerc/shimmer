/**
 * Auth middleware — validates store API key from Authorization header.
 */

import type { Request, Response, NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';

declare global {
  namespace Express {
    interface Request {
      storeId?: number;
      store?: { id: number; name: string; config: unknown };
    }
  }
}

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
    next();
  } catch (err) {
    next(err);
  }
}
