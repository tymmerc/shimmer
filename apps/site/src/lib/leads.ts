// Demande d'audit envoyée depuis la landing (POST /api/public/leads).
// Le serveur revalide tout (apps/api/src/lib/lead-input.ts) : ici on ne fait
// qu'un premier tri pour afficher les erreurs avant l'envoi, en français.

import { AUDIT_EMAIL } from '@/lib/audit';

export const LEADS_URL = '/shimmer/api/public/leads';
export const LEADS_PING_URL = '/shimmer/api/public/leads/ping';

const PING_TIMEOUT_MS = 5_000;
const SUBMIT_TIMEOUT_MS = 15_000;

export const SHOP_URL_MAX = 300;
export const EMAIL_MAX = 255;
export const MESSAGE_MAX = 2_000;

export type Platform = 'shopify' | 'woocommerce' | 'prestashop' | 'autre';

export const PLATFORMS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: 'shopify', label: 'Shopify' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'prestashop', label: 'PrestaShop' },
  { value: 'autre', label: 'Autre' },
];

export type LeadField = 'shopUrl' | 'email' | 'platform' | 'message';
/** Ordre d'affichage : sert à placer le focus sur le premier champ à corriger. */
export const FIELD_ORDER: readonly LeadField[] = ['shopUrl', 'email', 'platform', 'message'];

export type FieldErrors = Partial<Record<LeadField, string>>;

export interface LeadDraft {
  shopUrl: string;
  email: string;
  platform: Platform | null;
  message: string;
}

export interface LeadPayload {
  shopUrl: string;
  email: string;
  platform?: Platform;
  message?: string;
  website: string;
  elapsedMs: number;
}

export type SubmitResult = { kind: 'ok' } | { kind: 'invalid'; errors: FieldErrors } | { kind: 'failed' };

// Messages quand le serveur refuse un champ (il ne dit pas pourquoi).
const SERVER_MESSAGES: Record<LeadField, string> = {
  shopUrl: 'Cette adresse ne semble pas valide. Exemple : maboutique.fr',
  email: 'Cet e-mail ne semble pas valide.',
  platform: 'Choisissez une plateforme dans la liste.',
  message: `Votre message dépasse ${MESSAGE_MAX.toLocaleString('fr-FR')} caractères.`,
};

// Un domaine avec au moins un point, sans espace. Le serveur est plus strict.
const SHOP_URL_RE = /^(?:https?:\/\/)?[^\s/?#@]+\.[^\s/?#@.]{2,}(?:[/?#]\S*)?$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isLeadField(v: unknown): v is LeadField {
  return typeof v === 'string' && (FIELD_ORDER as readonly string[]).includes(v);
}

function isOkBody(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as { ok?: unknown }).ok === true;
}

/** Premier tri côté navigateur. Rend un objet vide si tout va bien. */
export function validateLead(draft: LeadDraft): FieldErrors {
  const shopUrl = draft.shopUrl.trim();
  const email = draft.email.trim();
  const errors: FieldErrors = {};

  if (!shopUrl) errors.shopUrl = 'Indiquez l’adresse de votre boutique.';
  else if (shopUrl.length < 4 || shopUrl.length > SHOP_URL_MAX || !SHOP_URL_RE.test(shopUrl)) {
    errors.shopUrl = SERVER_MESSAGES.shopUrl;
  }

  if (!email) errors.email = 'Indiquez votre e-mail, c’est là que je vous réponds.';
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.email = SERVER_MESSAGES.email;

  if (draft.message.trim().length > MESSAGE_MAX) errors.message = SERVER_MESSAGES.message;
  return errors;
}

export function firstInvalidField(errors: FieldErrors): LeadField | null {
  return FIELD_ORDER.find((f) => errors[f] !== undefined) ?? null;
}

export function buildPayload(draft: LeadDraft, website: string, elapsedMs: number): LeadPayload {
  const message = draft.message.trim();
  return {
    shopUrl: draft.shopUrl.trim(),
    email: draft.email.trim(),
    ...(draft.platform ? { platform: draft.platform } : {}),
    ...(message ? { message } : {}),
    website,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
  };
}

/** Le formulaire n'apparaît que si l'API connaît la route (sinon : e-mail seul). */
export async function pingLeads(signal?: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const res = await fetch(LEADS_PING_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    // nginx peut renvoyer 200 avec du HTML : on lit le corps, pas seulement le code.
    if (res.status !== 200) return false;
    return isOkBody(await res.json());
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function readServerErrors(data: unknown): FieldErrors {
  const fields = typeof data === 'object' && data !== null ? (data as { fields?: unknown }).fields : undefined;
  if (!Array.isArray(fields)) return {};
  return fields.filter(isLeadField).reduce<FieldErrors>((acc, f) => ({ ...acc, [f]: SERVER_MESSAGES[f] }), {});
}

export async function submitLead(payload: LeadPayload): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const res = await fetch(LEADS_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.status === 200 && isOkBody(data)) return { kind: 'ok' };
    if (res.status === 400) {
      const errors = readServerErrors(data);
      // Un refus sur un champ que la personne ne voit pas (elapsedMs, corps) : échec générique.
      if (firstInvalidField(errors)) return { kind: 'invalid', errors };
    }
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

const MAILTO_MESSAGE_MAX = 1_200;

/** Si l'envoi échoue, le mailto reprend ce qui a été saisi : rien n'est perdu. */
export function auditMailtoWith(draft: LeadDraft): string {
  const platform = PLATFORMS.find((p) => p.value === draft.platform)?.label ?? '';
  const message = draft.message.trim().slice(0, MAILTO_MESSAGE_MAX);
  const body = [
    'Bonjour,',
    '',
    'Je veux bien un audit gratuit de ma boutique.',
    '',
    `URL de la boutique : ${draft.shopUrl.trim()}`,
    `Plateforme : ${platform}`,
    ...(message ? ['', message] : []),
    '',
    'Merci !',
  ].join('\n');
  return `mailto:${AUDIT_EMAIL}?subject=${encodeURIComponent('Audit gratuit de ma boutique')}&body=${encodeURIComponent(body)}`;
}
