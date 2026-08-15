/**
 * Internal review-tool endpoints. Powers the interactive Shimmer validator
 * app served at /shimmer/review-tool/. No auth (internal tool, rate-limited by
 * the global limiter). Three endpoints:
 *
 *   POST /api/review-tool/vendeur — run the live sales vendeur on the demo
 *                                   store (Caves Forty-Two) so the reviewer can
 *                                   judge real recommendation quality.
 *   POST /api/review-tool/submit  — persist the reviewer's verdicts to a JSON
 *                                   file the operator can read back.
 *   GET  /api/review-tool/latest  — return the last submitted review.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@shimmer/core';
import { handleSalesMessage } from '@shimmer/chatbot';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createScopedRateLimiter } from '../middleware/rate-limiter.js';

export const reviewToolRouter = Router();

// Public demo tooling: tight per-IP caps. The vendeur endpoint triggers an
// LLM call, submit writes to disk — both abusable if left on the global 100/min.
const vendeurLimiter = createScopedRateLimiter('review-vendeur', 60_000, 6);
const submitLimiter = createScopedRateLimiter('review-submit', 60 * 60_000, 10);

const DEMO_STORE_ID = Number(process.env.REVIEW_TOOL_STORE_ID ?? 4); // Caves Forty-Two
const RESPONSES_DIR = '/opt/shimmer/apps/review-tool';
const RESPONSES_FILE = path.join(RESPONSES_DIR, 'responses.json');

const vendeurSchema = z.object({
  message: z.string().min(1).max(500),
  sessionToken: z.string().max(100).optional(),
});

reviewToolRouter.post('/vendeur', vendeurLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = vendeurSchema.parse(req.body);
    const result = await handleSalesMessage(DEMO_STORE_ID, body.message, body.sessionToken);
    res.json({
      message: result.message,
      sessionToken: result.sessionToken,
      products: result.recommendedProducts,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// Shape matches what apps/review-tool/index.html actually sends: three
// keyed records (verdicts/choices/comments). Bounded keys and values so a
// crafted payload can't balloon the file.
const boundedRecord = z.record(z.string().max(80), z.string().max(2000));
const submitSchema = z.object({
  verdicts: boundedRecord.optional(),
  choices: boundedRecord.optional(),
  comments: boundedRecord.optional(),
}).strict()
  .refine(o => Object.values(o).every(r => !r || Object.keys(r).length <= 100), {
    message: 'Too many entries',
  });

// Cap the on-disk history so an attacker (or a long demo life) can't grow the
// file unbounded. Oldest entries roll off.
const MAX_HISTORY = 200;

reviewToolRouter.post('/submit', submitLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = submitSchema.parse(req.body);
    const payload = {
      submittedAt: new Date().toISOString(),
      review,
    };
    await fs.mkdir(RESPONSES_DIR, { recursive: true });
    // Append to a history array so nothing is overwritten.
    let history: unknown[] = [];
    try {
      const existing = await fs.readFile(RESPONSES_FILE, 'utf-8');
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      history = [];
    }
    history.push(payload);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    await fs.writeFile(RESPONSES_FILE, JSON.stringify(history, null, 2));
    logger.info('review-tool.submitted');
    res.json({ ok: true, count: history.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

reviewToolRouter.get('/latest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = await fs.readFile(RESPONSES_FILE, 'utf-8').catch(() => '[]');
    const history = JSON.parse(raw);
    const latest = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
    res.json({ latest, total: Array.isArray(history) ? history.length : 0 });
  } catch (err) {
    next(err);
  }
});
