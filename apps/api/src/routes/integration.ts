/**
 * Integration status — surfaces, for the admin UI, the current state of
 * external connectors (email, sms, llm, shopify, woocommerce). Reads env
 * vars + store config to decide whether each is in demo/mock or production.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPrisma } from '@shimmer/core';
import { derivePublishableKey } from '../lib/publishable-key.js';

export const integrationRouter = Router();

function publicBase(req: Request): string {
  const env = process.env.PUBLIC_API_BASE;
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.get('host') ?? 'tymmerc.eu';
  return `${proto}://${host}`;
}

integrationRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const storeId = req.storeId!;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, config: true },
    });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const cfg = (store.config ?? {}) as {
      shopify?: { shop?: string; webhookSecret?: string };
      woocommerce?: { siteUrl?: string; webhookSecret?: string };
    };

    const emailProvider = process.env.RESEND_API_KEY ? 'Resend'
      : (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) ? 'Mailgun'
      : null;
    const emailConfigured = emailProvider !== null;
    const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
    const llmProvider = process.env.LLM_PROVIDER ?? 'ollama';
    const llmConfigured = llmProvider === 'claude'
      ? !!process.env.CLAUDE_API_KEY
      : true;

    res.json({
      store: { id: store.id, name: store.name },
      publishableKey: derivePublishableKey(store.id),
      base: publicBase(req),
      email: { provider: emailProvider ?? 'Démo (mock)', configured: emailConfigured },
      sms: { provider: smsConfigured ? 'Twilio' : 'Démo (mock)', configured: smsConfigured },
      llm: { provider: llmProvider === 'claude' ? 'Claude' : 'Ollama (local)', configured: llmConfigured },
      shopify: {
        configured: !!cfg.shopify?.shop,
        secretSet: !!cfg.shopify?.webhookSecret,
      },
      woocommerce: {
        configured: !!cfg.woocommerce?.siteUrl,
        siteUrl: cfg.woocommerce?.siteUrl ?? null,
        secretSet: !!cfg.woocommerce?.webhookSecret,
      },
    });
  } catch (err) {
    next(err);
  }
});
