/**
 * Global error handler middleware.
 */

import type { Request, Response, NextFunction } from 'express';
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

  logger.error({ err }, 'unhandled.error');
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
