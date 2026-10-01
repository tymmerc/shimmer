/**
 * Demandes d'audit de la landing, gardées dans la table leads
 * (sql/2026-10-01-leads.sql). SQL brut : la base a dérivé de schema.prisma.
 * Tant que la table manque, rien n'est écrit (leadsTable.ready() dit non) et
 * la route se contente de l'e-mail et des logs.
 */

import { getPrisma } from '@shimmer/core';
import { createTableGuard } from './table-guard.js';
import type { LeadInput } from './lead-input.js';

export const leadsTable = createTableGuard('leads', 'sql/2026-10-01-leads.sql');

export const LEAD_SOURCE = 'landing-audit';
const LIST_LIMIT = 200;

export interface NewLead extends LeadInput {
  userAgent: string | null;
  referer: string | null;
}

export interface LeadRow {
  id: number;
  createdAt: Date;
  shopUrl: string;
  email: string;
  platform: string | null;
  message: string | null;
  source: string;
  notifiedAt: Date | null;
  userAgent: string | null;
  referer: string | null;
}

/** Garde la demande et rend son numéro. */
export async function insertLead(lead: NewLead): Promise<number> {
  const rows = await getPrisma().$queryRaw<Array<{ id: number }>>`
    INSERT INTO leads (shop_url, email, platform, message, source, user_agent, referer)
    VALUES (${lead.shopUrl}, ${lead.email}, ${lead.platform}, ${lead.message}, ${LEAD_SOURCE},
            ${lead.userAgent}, ${lead.referer})
    RETURNING id`;
  const id = rows[0]?.id;
  if (typeof id !== 'number') throw new Error('leads.insert-no-id');
  return id;
}

/** L'e-mail au fondateur est parti. */
export async function markLeadNotified(id: number): Promise<void> {
  await getPrisma().$executeRaw`UPDATE leads SET notified_at = now() WHERE id = ${id}`;
}

/** Les 200 dernières demandes, plus récentes d'abord (admin de l'opérateur). */
export async function listRecentLeads(): Promise<LeadRow[]> {
  return getPrisma().$queryRaw<LeadRow[]>`
    SELECT id, created_at AS "createdAt", shop_url AS "shopUrl", email, platform, message, source,
           notified_at AS "notifiedAt", user_agent AS "userAgent", referer
    FROM leads
    ORDER BY created_at DESC, id DESC
    LIMIT ${LIST_LIMIT}`;
}
