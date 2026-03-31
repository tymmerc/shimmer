/**
 * Chat routes — POST /api/chat/message, POST /api/chat/escalate,
 * GET /api/chat/session/:id, GET /api/chat/escalations, POST /api/chat/resolve/:id
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPrisma } from '@shimmer/core';
import {
  handleChatMessage,
  streamChatMessage,
  escalateSession,
  resolveSession,
} from '@shimmer/chatbot';

export const chatRouter = Router();

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionToken: z.string().optional(),
  customerEmail: z.string().email().optional(),
  stream: z.boolean().optional().default(false),
});

const escalateSchema = z.object({
  sessionToken: z.string(),
  reason: z.string().min(1).max(500),
});

// POST /api/chat/message
chatRouter.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = messageSchema.parse(req.body);

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
      // Non-streaming
      const result = await handleChatMessage(
        req.storeId!,
        body.message,
        body.sessionToken,
        body.customerEmail,
      );
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
