/**
 * Authentification des e-mails entrants. Avant le 30/09, les deux routes
 * étaient ouvertes : n'importe qui déposait un faux e-mail dans la file d'une
 * boutique, ouvrait un ticket SAV au nom d'un vrai client et faisait tourner
 * l'IA à nos frais.
 *
 * - Mailgun : signature HMAC-SHA256 de timestamp+token avec la clé de
 *   signature des webhooks (MAILGUN_WEBHOOK_SIGNING_KEY), fenêtre de 5 min,
 *   jeton à usage unique.
 * - Route générique : secret partagé (INBOUND_WEBHOOK_SECRET) dans l'en-tête
 *   X-Shimmer-Inbound-Secret.
 * Sans la variable, la route est fermée.
 */

import crypto from 'node:crypto';

export const MAILGUN_MAX_SKEW_S = 300;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function verifyMailgunSignature(
  key: string | undefined,
  fields: { timestamp?: unknown; token?: unknown; signature?: unknown },
  nowS: number = Math.floor(Date.now() / 1000),
): boolean {
  const { timestamp, token, signature } = fields;
  if (!key || typeof timestamp !== 'string' || typeof token !== 'string' || typeof signature !== 'string') return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowS - ts) > MAILGUN_MAX_SKEW_S) return false;
  const expected = crypto.createHmac('sha256', key).update(timestamp + token).digest('hex');
  return safeEqual(expected, signature.toLowerCase());
}

export function verifyInboundSecret(secret: string | undefined, provided: unknown): boolean {
  if (!secret || typeof provided !== 'string') return false;
  return safeEqual(secret, provided);
}
