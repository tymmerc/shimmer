/**
 * Lecture d'une demande d'audit envoyée par le formulaire de la landing
 * (POST /api/public/leads). Tout ce qui vient du navigateur est revalidé ici.
 */

import { z } from 'zod';

export const LEAD_PLATFORMS = ['shopify', 'woocommerce', 'prestashop', 'autre'] as const;
export type LeadPlatform = (typeof LEAD_PLATFORMS)[number];

/** En dessous, le formulaire a été rempli trop vite pour un humain. */
export const MIN_ELAPSED_MS = 2_500;

export interface LeadInput {
  shopUrl: string;
  email: string;
  platform: LeadPlatform | null;
  message: string | null;
}

export type LeadParse =
  | { kind: 'ok'; lead: LeadInput }
  | { kind: 'bot'; reason: 'honeypot' | 'too-fast' }
  | { kind: 'invalid'; fields: string[] };

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Adresse de boutique propre, ou null. Accepte « boutique.fr », « www.boutique.fr/x »
 * ou « https://boutique.fr/... » ; refuse javascript:, data:, mailto:, ftp:,
 * les identifiants dans l'URL, les adresses IP et les hôtes sans domaine.
 * Rend « https://boutique.fr » (hôte en minuscules, chemin gardé, ancre retirée).
 */
export function normalizeShopUrl(raw: string): string | null {
  const s = raw.trim();
  if (s.length < 4 || s.length > 300 || /[\s<>"'`\\\u0000-\u001f\u007f]/.test(s)) return null;

  let candidate: string;
  const scheme = SCHEME.exec(s);
  if (s.startsWith('//')) candidate = `https:${s}`;
  else if (scheme && /^https?$/i.test(scheme[1]!) && s.slice(scheme[0].length).startsWith('//')) candidate = s;
  // « boutique.fr:8080/... » ressemble à un schéma : un port en chiffres, c'est un domaine nu.
  else if (scheme && !/^\d{1,5}(?:[/?#]|$)/.test(s.slice(scheme[0].length))) return null;
  else candidate = `https://${s}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (!HOST.test(url.hostname)) return null;

  const path = url.pathname === '/' ? '' : url.pathname;
  const out = `${url.protocol}//${url.host}${path}${url.search}`;
  return out.length <= 300 ? out : null;
}

/** Domaine affiché (sujet de l'e-mail) : « boutique.fr » pour « https://www.boutique.fr/x ». */
export function shopDomain(shopUrl: string): string {
  try {
    return new URL(shopUrl).hostname.replace(/^www\./, '');
  } catch {
    return shopUrl.slice(0, 100);
  }
}

// Une case vide du formulaire arrive en '' : on la lit comme absente.
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const leadSchema = z.object({
  shopUrl: z.string().trim().min(4).max(300),
  email: z.string().trim().max(255).email(),
  platform: z.preprocess(emptyToUndefined, z.enum(LEAD_PLATFORMS).optional()),
  message: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  elapsedMs: z.number().finite(),
});

/** Corps de la requête → demande prête à garder, robot à ignorer, ou champs à corriger. */
export function parseLead(body: unknown): LeadParse {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { kind: 'invalid', fields: [] };
  const b = body as Record<string, unknown>;

  // Les robots d'abord : ils reçoivent la même réponse qu'un envoi réussi,
  // même si le reste du corps est faux.
  if (b.website !== undefined && b.website !== null && b.website !== '') return { kind: 'bot', reason: 'honeypot' };
  if (typeof b.elapsedMs === 'number' && b.elapsedMs < MIN_ELAPSED_MS) return { kind: 'bot', reason: 'too-fast' };

  const parsed = leadSchema.safeParse(b);
  const fields = new Set<string>();
  if (!parsed.success) for (const issue of parsed.error.issues) fields.add(String(issue.path[0] ?? 'body'));
  const shopUrl = typeof b.shopUrl === 'string' ? normalizeShopUrl(b.shopUrl) : null;
  if (!shopUrl) fields.add('shopUrl');
  if (!parsed.success || !shopUrl) return { kind: 'invalid', fields: [...fields] };

  return {
    kind: 'ok',
    lead: {
      shopUrl,
      email: parsed.data.email,
      platform: parsed.data.platform ?? null,
      message: parsed.data.message ?? null,
    },
  };
}

/** En-tête HTTP libre (navigateur, page d'origine) : sans caractères de contrôle, tronqué. */
export function cleanHeader(value: string | undefined, max: number): string | null {
  if (!value) return null;
  const s = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}
