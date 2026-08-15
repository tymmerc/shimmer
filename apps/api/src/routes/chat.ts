/**
 * Chat routes — POST /api/chat/message, POST /api/chat/escalate,
 * GET /api/chat/session/:id, GET /api/chat/escalations, POST /api/chat/resolve/:id
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import { isControl, resolveHoldoutConfig } from '../lib/holdout/bucket.js';
import { isLive } from './onboarding.js';
import {
  handleChatMessage,
  streamChatMessage,
  escalateSession,
  resolveSession,
  handleSalesMessage,
} from '@shimmer/chatbot';

export const chatRouter = Router();

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionToken: z.string().optional(),
  customerEmail: z.string().email().optional(),
  // Default = sales. The primary surface is a storefront search bar, where
  // intent is always "find me a product". The client widget declares its
  // context: search bar / product vendeur sends 'sales' (or nothing); a SAV
  // surface sends 'sav'; a generic help bubble can send 'auto' to let the
  // keyword heuristic decide. We do NOT guess on the search bar, because a
  // sales query like "vin pour un retour de chasse" would be misrouted to SAV.
  mode: z.enum(['sales', 'sav', 'auto']).optional().default('sales'),
  visitorId: z.string().min(4).max(80).optional(),
  stream: z.boolean().optional().default(false),
});

// Only used when a client explicitly opts into 'auto' (e.g. a generic help
// chat bubble). Never runs for the default search-bar path.
const SAV_KEYWORDS = /\b(commande|livraison|colis|tracking|suivi|retour|rembours|défectu|cass[éeé]|d[ée]chir|abim[éeé]|tromp[éeé]|erreur|probl[èe]me|sav|service[ -]apr[èe]s|garantie|facture|annul)/i;

function detectMode(message: string, requested: 'sales' | 'sav' | 'auto'): 'sales' | 'sav' {
  if (requested !== 'auto') return requested;
  return SAV_KEYWORDS.test(message) ? 'sav' : 'sales';
}

const escalateSchema = z.object({
  sessionToken: z.string(),
  reason: z.string().min(1).max(500),
});

// POST /api/chat/message
chatRouter.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = messageSchema.parse(req.body);

    // Phase guard: the vendeur only answers when the store is in 'live'. During
    // ingestion / observation / validation, the widget is hidden and any direct
    // call is refused (the SDK or another widget shouldn't be calling us yet).
    if (!(await isLive(req.storeId!))) {
      res.json({ phase: 'not-live', message: null, sessionToken: null, recommendedProducts: [], mode: 'not-live' });
      return;
    }

    // Holdout guard: a control visitor must never be served the vendeur, or it
    // contaminates the experiment. The SDK already hides the widget for control,
    // this is the server-side safety net.
    if (body.visitorId) {
      const prisma = getPrisma();
      const store = await prisma.store.findUnique({ where: { id: req.storeId! } });
      const cfg = resolveHoldoutConfig(((store?.config ?? {}) as { holdout?: unknown }).holdout);
      if (isControl(body.visitorId, req.storeId!, cfg)) {
        res.json({ control: true, message: null, sessionToken: null, recommendedProducts: [], mode: 'control' });
        return;
      }
    }

    if (body.stream) {
      // SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const generator = streamChatMessage(
        req.storeId!,
        body.message,
        body.sessionToken,
        body.customerEmail,
      );

      for await (const chunk of generator) {
        if (chunk.type === 'text' && chunk.text) {
          res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({
            type: 'done',
            sessionToken: (chunk as any).sessionToken,
            escalated: (chunk as any).escalated || false,
          })}\n\n`);
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming — dispatch sales vs SAV
      const mode = detectMode(body.message, body.mode);
      const result = mode === 'sales'
        ? await handleSalesMessage(req.storeId!, body.message, body.sessionToken, body.customerEmail)
        : await handleChatMessage(req.storeId!, body.message, body.sessionToken, body.customerEmail);
      res.json(result);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// POST /api/chat/escalate
chatRouter.post('/escalate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = escalateSchema.parse(req.body);
    await escalateSession(body.sessionToken, req.storeId!, body.reason);
    res.json({ status: 'escalated', sessionToken: body.sessionToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    next(err);
  }
});

// GET /api/chat/session/:id
chatRouter.get('/session/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const session = await prisma.chatSession.findFirst({
      where: {
        sessionToken: req.params.id,
        storeId: req.storeId!,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/escalations
chatRouter.get('/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const escalations = await prisma.chatSession.findMany({
      where: {
        storeId: req.storeId!,
        status: 'ESCALATED',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ escalations, count: escalations.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/resolve/:id
chatRouter.post('/resolve/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = Number(req.params.id);
    await resolveSession(sessionId, req.storeId!);
    res.json({ status: 'resolved', sessionId });
  } catch (err) {
    next(err);
  }
});
