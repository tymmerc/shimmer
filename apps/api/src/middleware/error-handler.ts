/**
 * Global error handler middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@shimmer/core';
import { ShimmerError } from '@shimmer/core';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ShimmerError) {
    logger.warn({ code: err.code, message: err.message }, 'shimmer.error');
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // A Zod validation error reaching here (route used next(err) instead of a
  // local catch) is a client mistake, not a server fault. Return 400 with the
  // field-level issues so callers see exactly what's wrong instead of a 500.
  if (err instanceof ZodError) {
    logger.warn({ issues: err.errors }, 'validation.error');
    res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
    return;
  }

  logger.error({ err }, 'unhandled.error');
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
