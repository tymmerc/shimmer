/**
 * Identité du client connecté, pour le suivi de commande dans le chat.
 *
 * Le widget tourne dans le navigateur avec la clé publique (pk_) : tout ce
 * qu'il envoie peut être forgé. Un email "brut" ne prouve donc rien, et le
 * chat ne doit jamais lire les commandes d'un email non prouvé.
 *
 * Preuve retenue (même principe que la vérification d'identité d'Intercom) :
 * le thème de la boutique, rendu côté serveur, signe l'email du client
 * connecté ET l'heure du rendu avec un secret propre à la boutique :
 *
 *   {%- assign shimmer_ts = 'now' | date: '%s' -%}
 *   {%- capture shimmer_id -%}{{ customer.email }}|{{ shimmer_ts }}{%- endcapture -%}
 *   data-customer-ts="{{ shimmer_ts }}"
 *   data-customer-signature="{{ shimmer_id | hmac_sha256: 'sid_…' }}"
 *
 * Liquid est exécuté par Shopify, le secret n'apparaît jamais dans la page.
 * La signature expire (IDENTITY_MAX_AGE_S) : une page copiée ou volée ne
 * donne pas un accès permanent. Rotation : incrémenter
 * store.config.identityEpoch, puis recoller le snippet de l'admin.
 *
 * Le secret est dérivé de SHIMMER_PK_SECRET avec un libellé différent de la
 * clé publique : pas de colonne en base, et connaître la pk_ n'aide en rien.
 */

import crypto from 'crypto';

/** Durée de validité d'une signature (le rendu de la page par Shopify). */
export const IDENTITY_MAX_AGE_S = 24 * 3600;
/** Tolérance d'horloge entre Shopify et nous. */
const FUTURE_SKEW_S = 300;

function masterSecret(): string | null {
  const s = process.env.SHIMMER_PK_SECRET;
  if (s) return s;
  // Sans vrai secret, la signature serait calculable par n'importe qui : on
  // désactive, sauf opt-in explicite pour le développement local.
  return process.env.SHIMMER_ALLOW_DEV_IDENTITY_SECRET === 'true' ? 'shimmer-dev-identity-secret' : null;
}

/** Secret de signature d'une boutique, à coller dans son thème. Null si désactivé. */
export function deriveCustomerIdentitySecret(storeId: number, epoch = 0): string | null {
  const master = masterSecret();
  if (!master) return null;
  const h = crypto
    .createHmac('sha256', master)
    .update(`customer-identity:v1:store:${storeId}:epoch:${epoch}`)
    .digest('base64url');
  return `sid_${h.slice(0, 40)}`;
}

/** Signature hex attendue, exactement comme Liquid `hmac_sha256` sur "email|ts". */
export function signCustomerIdentity(storeId: number, email: string, ts: string, epoch = 0): string | null {
  const secret = deriveCustomerIdentitySecret(storeId, epoch);
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`${email}|${ts}`).digest('hex');
}

export function verifyCustomerSignature(input: {
  storeId: number;
  email: string;
  ts: string;
  signature: string;
  epoch?: number;
  nowS?: number;
}): boolean {
  const { storeId, email, ts, signature, epoch = 0 } = input;
  if (!email || !/^\d{9,11}$/.test(ts ?? '') || !/^[0-9a-fA-F]{64}$/.test(signature ?? '')) return false;
  const nowS = input.nowS ?? Math.floor(Date.now() / 1000);
  const age = nowS - Number(ts);
  if (age > IDENTITY_MAX_AGE_S || age < -FUTURE_SKEW_S) return false;
  const expected = signCustomerIdentity(storeId, email, ts, epoch);
  if (!expected) return false;
  return crypto.timingSafeEqual(Buffer.from(signature.toLowerCase(), 'utf8'), Buffer.from(expected, 'utf8'));
}

/**
 * L'email sur lequel le chat peut s'appuyer, ou null.
 *   - clé secrète (appel serveur du marchand) : on fait confiance ;
 *   - clé publique : seulement si la signature est valide et récente.
 * Toujours normalisé (trim + minuscules) pour la recherche en base.
 */
export function resolveTrustedEmail(input: {
  scope: 'secret' | 'publishable' | undefined;
  storeId: number;
  email?: string | null;
  signature?: string | null;
  ts?: string | null;
  epoch?: number;
  nowS?: number;
}): string | null {
  const { scope, storeId, email, signature, ts, epoch, nowS } = input;
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (scope === 'secret') return normalized;
  if (!signature || !ts) return null;
  return verifyCustomerSignature({ storeId, email, ts, signature, epoch, nowS }) ? normalized : null;
}

/** Époque de rotation du secret, lue dans la config de la boutique. */
export function identityEpoch(config: unknown): number {
  const e = (config as { identityEpoch?: unknown } | null)?.identityEpoch;
  return Number.isInteger(e) && (e as number) >= 0 ? (e as number) : 0;
}
