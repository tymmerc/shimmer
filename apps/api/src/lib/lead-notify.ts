/**
 * Prévient le fondateur par e-mail à chaque demande d'audit de la landing.
 *
 * Passe directement par l'API HTTP de Resend, PAS par @shimmer/email-connector :
 * sans RESEND_API_KEY le connecteur reste en mode simulé pour les e-mails des
 * boutiques, et il ne faut pas le basculer en réel juste pour ces alertes.
 * La clé utilisée ici (LEAD_NOTIFY_RESEND_API_KEY) ne sert qu'à envoyer, depuis
 * un domaine déjà vérifié chez Resend (LEAD_NOTIFY_FROM).
 *
 * Ne lève jamais d'erreur : la route décide quoi répondre selon le résultat.
 */

import { logger } from '@shimmer/core';
import { shopDomain, type LeadPlatform } from './lead-input.js';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;
const DEFAULT_TO = 'tym.mercier@gmail.com';

export interface LeadNotice {
  /** Numéro en base, ou null si la demande n'a pas pu y être gardée. */
  id: number | null;
  shopUrl: string;
  email: string;
  platform: LeadPlatform | null;
  message: string | null;
  receivedAt: Date;
  userAgent: string | null;
  referer: string | null;
}

export type NotifyResult =
  | { sent: true; providerId: string | null }
  | { sent: false; reason: 'not-configured' | 'http-error' | 'network-error' };

export interface LeadMailConfig {
  apiKey: string;
  from: string;
  to: string;
}

export interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  text: string;
  reply_to: string;
}

/** Valeur qui finit dans un en-tête : jamais de retour à la ligne (injection d'en-têtes). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

const PLATFORM_LABEL: Record<LeadPlatform, string> = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  prestashop: 'PrestaShop',
  autre: 'autre',
};

/** Réglages lus dans l'environnement, ou null s'il en manque. */
export function leadMailConfig(env: NodeJS.ProcessEnv = process.env): LeadMailConfig | null {
  const apiKey = env.LEAD_NOTIFY_RESEND_API_KEY?.trim();
  const from = oneLine(env.LEAD_NOTIFY_FROM ?? '');
  const to = oneLine(env.LEAD_NOTIFY_TO ?? '') || DEFAULT_TO;
  if (!apiKey || !from) return null;
  return { apiKey, from, to };
}

/** « mercredi 1 octobre 2026 à 14:32 », à l'heure de Paris quel que soit le fuseau du serveur. */
export function formatParisTime(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }).format(d);
}

export function buildLeadEmail(lead: LeadNotice, cfg: Pick<LeadMailConfig, 'from' | 'to'>): ResendPayload {
  const domain = oneLine(shopDomain(lead.shopUrl)).slice(0, 120);
  const stored = lead.id !== null
    ? `Demande n° ${lead.id}, gardée dans la table leads.`
    : 'Demande PAS gardée en base (table leads absente ou erreur) : cet e-mail et les logs de l’API sont les seules traces.';
  const text = [
    'Nouvelle demande d’audit gratuit envoyée depuis la landing Shimmer.',
    '',
    `Boutique : ${lead.shopUrl}`,
    `E-mail : ${lead.email}`,
    `Plateforme : ${lead.platform ? PLATFORM_LABEL[lead.platform] : 'non précisée'}`,
    `Reçue le ${formatParisTime(lead.receivedAt)} (heure de Paris)`,
    '',
    'Message :',
    lead.message ?? '(aucun)',
    '',
    `Navigateur : ${lead.userAgent ?? 'inconnu'}`,
    `Page d’origine : ${lead.referer ?? 'inconnue'}`,
    stored,
    '',
    `Répondre à cet e-mail écrit directement à ${lead.email}.`,
  ].join('\n');

  return {
    from: cfg.from,
    to: [cfg.to],
    subject: oneLine(`Nouvelle demande d'audit : ${domain}`),
    text,
    reply_to: oneLine(lead.email),
  };
}

export async function notifyLead(lead: LeadNotice, env: NodeJS.ProcessEnv = process.env): Promise<NotifyResult> {
  const cfg = leadMailConfig(env);
  if (!cfg) {
    logger.warn('leads.notify-not-configured : LEAD_NOTIFY_RESEND_API_KEY ou LEAD_NOTIFY_FROM manque dans .env');
    return { sent: false, reason: 'not-configured' };
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await globalThis.fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildLeadEmail(lead, cfg)),
      signal: ctl.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      logger.error({ status: res.status, detail }, 'leads.notify-failed');
      return { sent: false, reason: 'http-error' };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: unknown };
    return { sent: true, providerId: typeof data.id === 'string' ? data.id : null };
  } catch (err) {
    const e = err as Error;
    logger.error({ error: e?.name === 'AbortError' ? 'timeout' : e?.message }, 'leads.notify-failed');
    return { sent: false, reason: 'network-error' };
  } finally {
    clearTimeout(timer);
  }
}
