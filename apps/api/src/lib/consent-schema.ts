/**
 * L'accord marketing des clients vit dans customers.marketing_consent, ajouté
 * par sql/2026-10-01-customer-marketing-consent.sql. L'API tourne directement
 * depuis le dépôt (tsx) : un redémarrage avant le SQL ne doit rien casser.
 * Tant que la colonne manque, l'accord n'est pas enregistré et la newsletter
 * attend (jamais d'envoi à tout le monde faute de pouvoir filtrer) ; dès que
 * le SQL est passé, tout repart sans redémarrage (revérifié chaque minute).
 * Même principe que reminder-schema.ts.
 */

import { getPrisma, logger } from '@shimmer/core';

let ready = false;
let checkedAt = 0;
const RECHECK_MS = 60_000;

export async function consentSchemaReady(now = Date.now()): Promise<boolean> {
  if (ready) return true;
  if (now - checkedAt < RECHECK_MS && checkedAt !== 0) return false;
  checkedAt = now;
  try {
    const rows = await getPrisma().$queryRaw<Array<{ consent_col: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'customers'
          AND column_name = 'marketing_consent'
      ) AS consent_col`;
    ready = rows[0]?.consent_col === true;
    if (!ready) logger.warn('consent.schema-missing : appliquer sql/2026-10-01-customer-marketing-consent.sql');
  } catch (err) {
    logger.warn({ err }, 'consent.schema-check-failed');
  }
  return ready;
}

/** Pour les tests. */
export function resetConsentSchemaCache(value?: boolean): void {
  ready = value ?? false;
  checkedAt = 0;
}
