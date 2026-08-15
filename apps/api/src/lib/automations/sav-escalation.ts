/**
 * SAV stale ticket sweep.
 *
 * Tickets in 'open' status for > 24h with no merchant action are auto-escalated.
 * Tickets in 'in_progress' for > 72h get bumped to 'escalated' too — they've
 * stalled.
 *
 * No outbound mail is sent automatically. The merchant gets the signal via the
 * dashboard counters (escalated count). This is intentional: SAV mails are
 * relational and must stay human-authored. We only nudge the workflow state.
 */

import { getPrisma, logger } from '@shimmer/core';

interface SweepResult {
  staleOpen: number;
  staleInProgress: number;
  escalated: number;
}

/**
 * Per-ticket check invoked +24h after ticket creation. If still 'open' (no
 * merchant action), escalate. If 'in_progress' but still nothing after +72h
 * total, also escalate. Other terminal states are no-ops.
 */
export async function processSavEscalationJob({ ticketId }: { ticketId: number }): Promise<{ escalated: boolean; reason?: string }> {
  const prisma = getPrisma();
  const ticket = await prisma.savRequest.findUnique({ where: { id: ticketId } });
  if (!ticket) return { escalated: false, reason: 'not-found' };
  if (ticket.status === 'open') {
    await prisma.savRequest.update({ where: { id: ticketId }, data: { status: 'escalated' } });
    return { escalated: true };
  }
  if (ticket.status === 'in_progress') {
    const ageMs = Date.now() - ticket.createdAt.getTime();
    if (ageMs >= 72 * 60 * 60 * 1000) {
      await prisma.savRequest.update({ where: { id: ticketId }, data: { status: 'escalated' } });
      return { escalated: true };
    }
  }
  return { escalated: false, reason: ticket.status };
}

export async function sweepSavEscalation(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  const staleOpen = await prisma.savRequest.findMany({
    where: { status: 'open', createdAt: { lte: oneDayAgo } },
    select: { id: true },
    take: 200,
  });
  const staleInProgress = await prisma.savRequest.findMany({
    where: { status: 'in_progress', createdAt: { lte: threeDaysAgo } },
    select: { id: true },
    take: 200,
  });

  const ids = [...staleOpen, ...staleInProgress].map(t => t.id);
  if (ids.length === 0) {
    const result = { staleOpen: 0, staleInProgress: 0, escalated: 0 };
    logger.info({ ...result }, 'automation.sav-escalation.swept');
    return result;
  }

  const upd = await prisma.savRequest.updateMany({
    where: { id: { in: ids } },
    data: { status: 'escalated' },
  });

  const result = {
    staleOpen: staleOpen.length,
    staleInProgress: staleInProgress.length,
    escalated: upd.count,
  };
  logger.info({ ...result }, 'automation.sav-escalation.swept');
  return result;
}
