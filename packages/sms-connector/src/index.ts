/**
 * SMS connector — Twilio in prod, mock in dev. Every send is logged in `sent_sms`.
 */

import { getPrisma, logger } from '@shimmer/core';

export type SmsProvider = 'twilio' | 'mock';

/** A send is "real" only when status is `sent`. `mock` means nothing left the building. */
export type SmsStatus = 'sent' | 'queued' | 'failed' | 'mock';

export interface SendSmsInput {
  storeId: number;
  to: string;
  body: string;
  tag?: string;
  relatedEntity?: 'cart' | 'order' | 'review_request' | 'sav' | 'campaign' | 'other';
  relatedId?: number;
  fromNumber?: string;
}

export interface SendSmsResult {
  id: number;
  status: SmsStatus;
  provider: SmsProvider;
  providerMessageId?: string;
  error?: string;
}

function pickProvider(): SmsProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return 'twilio';
  }
  return 'mock';
}

/** True when a real SMS provider is configured. Used by the startup config check. */
export function isSmsConfigured(): boolean {
  return pickProvider() !== 'mock';
}

async function sendViaTwilio(
  toNumber: string,
  fromNumber: string,
  body: string,
): Promise<{ providerMessageId?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return { error: 'twilio_not_configured' };

  const form = new URLSearchParams();
  form.set('To', toNumber);
  form.set('From', fromNumber);
  form.set('Body', body);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `twilio_http_${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { sid?: string };
    return { providerMessageId: data.sid };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const prisma = getPrisma();
  const provider = pickProvider();
  const fromNumber = input.fromNumber ?? process.env.TWILIO_FROM_NUMBER ?? '+33600000000';

  const row = await prisma.sentSms.create({
    data: {
      storeId: input.storeId,
      toNumber: input.to,
      fromNumber,
      body: input.body,
      tag: input.tag ?? null,
      relatedEntity: input.relatedEntity ?? null,
      relatedId: input.relatedId ?? null,
      provider,
      status: 'queued',
    },
  });

  if (provider === 'mock') {
    logger.warn(
      {
        smsId: row.id,
        to: input.to,
        body: input.body.slice(0, 80),
        tag: input.tag,
        storeId: input.storeId,
      },
      'sms.mock.not-sent (no provider configured — set TWILIO_* env)',
    );
    await prisma.sentSms.update({
      where: { id: row.id },
      data: { status: 'mock', providerMessageId: `mock-sms-${row.id}` },
    });
    return { id: row.id, status: 'mock', provider: 'mock', providerMessageId: `mock-sms-${row.id}` };
  }

  const result = await sendViaTwilio(input.to, fromNumber, input.body);
  if (result.error) {
    await prisma.sentSms.update({ where: { id: row.id }, data: { status: 'failed', error: result.error } });
    logger.warn({ smsId: row.id, error: result.error }, 'sms.twilio.failed');
    return { id: row.id, status: 'failed', provider: 'twilio', error: result.error };
  }
  await prisma.sentSms.update({
    where: { id: row.id },
    data: { status: 'sent', sentAt: new Date(), providerMessageId: result.providerMessageId ?? null },
  });
  return { id: row.id, status: 'sent', provider: 'twilio', providerMessageId: result.providerMessageId };
}

export async function listSentSms(storeId: number, opts: { tag?: string; limit?: number } = {}) {
  const prisma = getPrisma();
  return prisma.sentSms.findMany({
    where: { storeId, ...(opts.tag ? { tag: opts.tag } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 50,
  });
}
