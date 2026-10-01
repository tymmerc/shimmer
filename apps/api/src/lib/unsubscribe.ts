/**
 * Désinscription des e-mails non transactionnels d'une boutique (relances de
 * panier, newsletter, demandes d'avis).
 *
 * Le lien porte un jeton chiffré (AES-256-GCM) qui contient la boutique et
 * l'adresse : rien de lisible dans l'URL, rien à stocker à l'envoi, et un
 * jeton modifié ne se déchiffre pas. Les adresses désinscrites vont dans
 * email_suppressions (une ligne par boutique et par adresse, casse ignorée).
 *
 * Les e-mails demandés par le client lui-même (confirmation d'alerte de
 * stock, suivi de commande, réponse SAV) ne passent pas par ici.
 */

import crypto from 'crypto';
import { getPrisma, logger } from '@shimmer/core';
import { secretSubkey } from './publishable-key.js';
import { publicApiBase } from './public-url.js';
import { reminderSchemaReady } from './reminder-schema.js';

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = secretSubkey('unsubscribe:v1');
  return cachedKey;
}

export const UNSUBSCRIBE_TOKEN_RE = /^[A-Za-z0-9_-]{40,600}$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Jeton opaque pour (boutique, adresse). */
export function unsubscribeToken(storeId: number, email: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const plain = Buffer.from(JSON.stringify({ v: VERSION, s: storeId, e: normalizeEmail(email) }), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, enc, cipher.getAuthTag()]).toString('base64url');
}

/** Boutique et adresse du jeton, ou null s'il est invalide ou modifié. */
export function readUnsubscribeToken(token: unknown): { storeId: number; email: string } | null {
  if (typeof token !== 'string' || !UNSUBSCRIBE_TOKEN_RE.test(token)) return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(raw.length - TAG_BYTES);
    const enc = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    const data = JSON.parse(plain) as { v?: unknown; s?: unknown; e?: unknown };
    if (data.v !== VERSION || !Number.isInteger(data.s) || (data.s as number) <= 0) return null;
    if (typeof data.e !== 'string' || !data.e.includes('@') || data.e.length > 255) return null;
    return { storeId: data.s as number, email: data.e };
  } catch {
    return null;
  }
}

/** Lien à mettre en pied de chaque e-mail non transactionnel. */
export function unsubscribeUrl(storeId: number, email: string): string {
  return `${publicApiBase()}/api/public/unsubscribe?t=${unsubscribeToken(storeId, email)}`;
}

/** Pied de texte commun : une ligne, le lien en clair (e-mails texte). */
export function unsubscribeFooter(storeId: number, email: string): string {
  return footerFor(unsubscribeUrl(storeId, email));
}

const footerFor = (url: string) => `\n\n--\nVous ne souhaitez plus recevoir ces e-mails ? Désinscription en un clic : ${url}`;

/** Lien (pour l'en-tête List-Unsubscribe) et pied de texte, avec le même jeton. */
export function unsubscribeLink(storeId: number, email: string): { url: string; footer: string } {
  const url = unsubscribeUrl(storeId, email);
  return { url, footer: footerFor(url) };
}

/** L'adresse s'est désinscrite des e-mails de cette boutique. */
export async function isSuppressed(storeId: number, email: string): Promise<boolean> {
  // Table pas encore créée : personne n'a pu se désinscrire.
  if (!(await reminderSchemaReady())) return false;
  const rows = await getPrisma().$queryRaw<Array<{ one: number }>>`
    SELECT 1 AS one FROM email_suppressions
    WHERE store_id = ${storeId} AND lower(email) = ${normalizeEmail(email)}
    LIMIT 1`;
  return rows.length > 0;
}

/** Les adresses de `emails` désinscrites de cette boutique (en minuscules). */
export async function suppressedAmong(storeId: number, emails: string[]): Promise<Set<string>> {
  const list = [...new Set(emails.filter(Boolean).map(normalizeEmail))];
  if (list.length === 0 || !(await reminderSchemaReady())) return new Set();
  const rows = await getPrisma().$queryRaw<Array<{ email: string }>>`
    SELECT lower(email) AS email FROM email_suppressions
    WHERE store_id = ${storeId} AND lower(email) = ANY(${list}::text[])`;
  return new Set(rows.map((r) => r.email));
}

/** Désinscrit l'adresse (idempotent). */
export async function suppressEmail(storeId: number, email: string, reason = 'unsubscribe'): Promise<void> {
  if (!(await reminderSchemaReady())) throw new Error('reminder-schema-missing');
  await getPrisma().$executeRaw`
    INSERT INTO email_suppressions (store_id, email, reason)
    VALUES (${storeId}, ${normalizeEmail(email)}, ${reason.slice(0, 40)})
    ON CONFLICT (store_id, lower(email)) DO NOTHING`;
  logger.info({ storeId, reason }, 'email.suppressed');
}
