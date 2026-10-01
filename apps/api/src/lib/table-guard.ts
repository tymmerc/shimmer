/**
 * Une table ajoutée par un fichier SQL à part existe-t-elle déjà ? L'API
 * tourne directement depuis le dépôt (tsx) : un redémarrage avant le SQL ne
 * doit rien casser. Même principe que reminder-schema.ts : « oui » est gardé
 * pour toujours, « non » est revérifié chaque minute, donc tout bascule dès
 * que le SQL est passé, sans redémarrage.
 */

import { getPrisma, logger } from '@shimmer/core';

const RECHECK_MS = 60_000;

export interface TableGuard {
  ready(now?: number): Promise<boolean>;
  /** Pour les tests. */
  reset(value?: boolean): void;
}

/** `table` : nom simple (schéma public), `sqlFile` : le fichier à appliquer, cité dans le log. */
export function createTableGuard(table: string, sqlFile: string): TableGuard {
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error(`nom de table invalide : ${table}`);
  const qualified = `public.${table}`;
  let isReady = false;
  let checkedAt = 0;

  return {
    async ready(now = Date.now()) {
      if (isReady) return true;
      if (checkedAt !== 0 && now - checkedAt < RECHECK_MS) return false;
      checkedAt = now;
      try {
        const rows = await getPrisma().$queryRaw<Array<{ tbl: boolean }>>`
          SELECT to_regclass(${qualified}) IS NOT NULL AS tbl`;
        isReady = rows[0]?.tbl === true;
        if (!isReady) logger.warn(`${table}.schema-missing : appliquer ${sqlFile}`);
      } catch (err) {
        logger.warn({ err }, `${table}.schema-check-failed`);
      }
      return isReady;
    },
    reset(value?: boolean) {
      isReady = value ?? false;
      checkedAt = 0;
    },
  };
}
