/**
 * Les relances refaites le 01/10 lisent des colonnes et une table ajoutées par
 * sql/2026-10-01-cart-reminders.sql. L'API tourne directement depuis le dépôt
 * (tsx) : un redémarrage avant le SQL ne doit rien casser. Tant que le schéma
 * manque, les paniers sont créés à l'ancienne et les relances attendent ; dès
 * que le SQL est passé, tout bascule sans redémarrage (revérifié chaque minute).
 */

import { getPrisma, logger } from '@shimmer/core';

let ready = false;
let checkedAt = 0;
const RECHECK_MS = 60_000;

export async function reminderSchemaReady(now = Date.now()): Promise<boolean> {
  if (ready) return true;
  if (now - checkedAt < RECHECK_MS && checkedAt !== 0) return false;
  checkedAt = now;
  try {
    const rows = await getPrisma().$queryRaw<Array<{ cols: number; tbl: boolean }>>`
      SELECT
        (SELECT count(*)::int FROM information_schema.columns
          WHERE table_name = 'abandoned_carts'
            AND column_name IN ('platform_ref', 'marketing_consent', 'checkout_url')) AS cols,
        to_regclass('public.email_suppressions') IS NOT NULL AS tbl`;
    ready = rows[0]?.cols === 3 && rows[0]?.tbl === true;
    if (!ready) logger.warn('reminders.schema-missing : appliquer sql/2026-10-01-cart-reminders.sql');
  } catch (err) {
    logger.warn({ err }, 'reminders.schema-check-failed');
  }
  return ready;
}

/** Pour les tests. */
export function resetReminderSchemaCache(value?: boolean): void {
  ready = value ?? false;
  checkedAt = 0;
}
