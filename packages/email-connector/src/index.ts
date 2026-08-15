/**
 * Email connector. Sends through the first configured provider (Resend, then
 * Mailgun) and persists every attempt in `sent_emails` for audit.
 *
 * When no provider is configured the connector runs in MOCK mode: the email is
 * logged and stored with status `mock` (never `sent`). This is deliberate. A
 * silent mock that marks rows as `sent` makes a merchant believe real mail went
 * out when nothing did, which is worse than an obvious failure. Callers and the
 * admin dashboard treat `mock` as "not actually delivered".
 */

import { getPrisma, logger } from '@shimmer/core';

export type EmailProvider = 'resend' | 'mailgun' | 'mock';

/** A send is "real" only when status is `sent`. `mock` means nothing left the building. */
export type EmailStatus = 'sent' | 'queued' | 'failed' | 'mock';

export interface SendEmailInput {
  storeId: number;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  tag?: string;
  relatedEntity?: 'cart' | 'order' | 'review_request' | 'sav' | 'campaign' | 'stock_alert' | 'other';
  relatedId?: number;
  fromAddr?: string;
}

export interface SendEmailResult {
  id: number;
  status: EmailStatus;
  provider: EmailProvider;
  providerMessageId?: string;
  error?: string;
}

interface ProviderSendResult {
  providerMessageId?: string;
  error?: string;
}

export function pickEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return 'mailgun';
  return 'mock';
}

/** True when a real outbound provider is configured. Used by the startup config check. */
export function isEmailConfigured(): boolean {
  return pickEmailProvider() !== 'mock';
}

function defaultFromDomain(): string {
  return process.env.EMAIL_FROM_DOMAIN ?? process.env.MAILGUN_DOMAIN ?? 'shimmer.eu';
}

function defaultFromAddr(storeName: string): string {
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'boutique';
  return `${slug} <no-reply@${defaultFromDomain()}>`;
}

async function sendViaResend(
  fromAddr: string,
  toAddr: string,
  subject: string,
  bodyText: string | undefined,
  bodyHtml: string | undefined,
): Promise<ProviderSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'resend_not_configured' };

  const payload: Record<string, unknown> = { from: fromAddr, to: [toAddr], subject };
  if (bodyText) payload.text = bodyText;
  if (bodyHtml) payload.html = bodyHtml;
  // Resend requires at least one of text/html.
  if (!bodyText && !bodyHtml) payload.text = subject;

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text();
      return { error: `resend_http_${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { providerMessageId: data.id };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function sendViaMailgun(
  fromAddr: string,
  toAddr: string,
  subject: string,
  bodyText: string | undefined,
  bodyHtml: string | undefined,
): Promise<ProviderSendResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) return { error: 'mailgun_not_configured' };

  const form = new URLSearchParams();
  form.set('from', fromAddr);
  form.set('to', toAddr);
  form.set('subject', subject);
  if (bodyText) form.set('text', bodyText);
  if (bodyHtml) form.set('html', bodyHtml);

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text();
      return { error: `mailgun_http_${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { providerMessageId: data.id };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Send an email through the configured provider, log it to the DB, return a
 * structured result. Never throws (except when the store itself is missing,
 * which is a programming error worth surfacing).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: input.storeId } });
  if (!store) {
    logger.warn({ storeId: input.storeId }, 'email.send: store not found');
    throw new Error(`Store ${input.storeId} not found`);
  }
  const fromAddr = input.fromAddr ?? defaultFromAddr(store.name);
  const provider = pickEmailProvider();

  // 1. Persist as queued first so an outbound row always exists.
  const row = await prisma.sentEmail.create({
    data: {
      storeId: input.storeId,
      toAddr: input.to,
      fromAddr,
      subject: input.subject,
      bodyText: input.bodyText ?? null,
      bodyHtml: input.bodyHtml ?? null,
      tag: input.tag ?? null,
      relatedEntity: input.relatedEntity ?? null,
      relatedId: input.relatedId ?? null,
      provider,
      status: 'queued',
    },
  });

  // 2. Mock mode: nothing is sent. Record it as `mock`, loudly, so it is never
  // mistaken for a delivered email.
  if (provider === 'mock') {
    logger.warn(
      { emailId: row.id, to: input.to, subject: input.subject, tag: input.tag, storeId: input.storeId },
      'email.mock.not-sent (no provider configured — set RESEND_API_KEY)',
    );
    await prisma.sentEmail.update({
      where: { id: row.id },
      data: { status: 'mock', providerMessageId: `mock-${row.id}` },
    });
    return { id: row.id, status: 'mock', provider: 'mock', providerMessageId: `mock-${row.id}` };
  }

  // 3. Real send through the chosen provider.
  const result = provider === 'resend'
    ? await sendViaResend(fromAddr, input.to, input.subject, input.bodyText, input.bodyHtml)
    : await sendViaMailgun(fromAddr, input.to, input.subject, input.bodyText, input.bodyHtml);

  if (result.error) {
    await prisma.sentEmail.update({
      where: { id: row.id },
      data: { status: 'failed', error: result.error },
    });
    logger.warn({ emailId: row.id, provider, error: result.error }, 'email.send.failed');
    return { id: row.id, status: 'failed', provider, error: result.error };
  }

  await prisma.sentEmail.update({
    where: { id: row.id },
    data: { status: 'sent', sentAt: new Date(), providerMessageId: result.providerMessageId ?? null },
  });
  logger.info({ emailId: row.id, provider, providerMessageId: result.providerMessageId }, 'email.send.ok');
  return { id: row.id, status: 'sent', provider, providerMessageId: result.providerMessageId };
}

/** Convenience: return the most recent emails for a store. */
export async function listSentEmails(storeId: number, opts: { tag?: string; limit?: number } = {}) {
  const prisma = getPrisma();
  return prisma.sentEmail.findMany({
    where: { storeId, ...(opts.tag ? { tag: opts.tag } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 50,
  });
}
