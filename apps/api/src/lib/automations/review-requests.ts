/**
 * Review request sweep.
 *
 * When an order is marked delivered, a ReviewRequest is created with
 * scheduledAt = +48h. This sweep picks up requests whose scheduledAt is due,
 * sends the ask email, and flips status SCHEDULED → SENT.
 *
 * Also flips SENT requests past expiresAt to EXPIRED.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';

interface SweepResult {
  scanned: number;
  sent: number;
  expired: number;
  skipped: number;
  errors: number;
}

type DueRequest = {
  id: number;
  storeId: number;
  token: string;
  customer: { email: string | null; firstName: string | null } | null;
  order: { orderNumber: string };
  store: { id: number; name: string };
};

const INCLUDE = {
  customer: { select: { email: true, firstName: true } },
  order: { select: { orderNumber: true } },
  store: { select: { id: true, name: true } },
} as const;

/**
 * Envoie une demande. Elle est réservée (SCHEDULED → SENT) AVANT l'e-mail :
 * le job et le balayage de 15 min ne peuvent jamais l'envoyer tous les deux.
 * Adresse de test bloquée : la demande expire (jamais délivrable). Erreur du
 * fournisseur : elle repasse en file, le balayage suivant réessaie.
 */
async function sendRequest(rr: DueRequest): Promise<'sent' | 'skipped' | 'failed'> {
  const prisma = getPrisma();
  if (!rr.customer?.email) return 'skipped';
  const claim = await prisma.reviewRequest.updateMany({
    where: { id: rr.id, status: 'SCHEDULED', sentAt: null },
    data: { status: 'SENT', sentAt: new Date() },
  });
  if (claim.count === 0) return 'skipped';

  const firstName = rr.customer.firstName ?? '';
  const r = await sendEmail({
    storeId: rr.storeId,
    to: rr.customer.email,
    subject: `Comment s'est passé votre achat ?`,
    bodyText:
      `Bonjour ${firstName},\n\n` +
      `Votre commande ${rr.order.orderNumber} vous est bien parvenue ? ` +
      `Un mot, deux étoiles, ça nous aide vraiment.\n\n` +
      `Lien : https://tymmerc.eu/shimmer/review/?token=${rr.token}\n\n` +
      `Merci, l'équipe ${rr.store.name}.`,
    tag: 'review-request',
    relatedEntity: 'review_request',
    relatedId: rr.id,
  });
  if (r.status === 'failed') {
    const blocked = (r.error ?? '').startsWith('blocked');
    await prisma.reviewRequest.update({
      where: { id: rr.id },
      data: blocked ? { status: 'EXPIRED' } : { status: 'SCHEDULED', sentAt: null },
    });
    logger.warn({ reviewRequestId: rr.id, error: r.error }, 'automation.review-requests.send-failed');
    return 'failed';
  }
  return 'sent';
}

/**
 * Per-request processor invoked by the BullMQ delayed job (fired at
 * ReviewRequest.scheduledAt, +48h after order delivered).
 */
export async function processReviewRequestJob({ reviewRequestId }: { reviewRequestId: number }): Promise<{ sent: boolean; reason?: string }> {
  const prisma = getPrisma();
  const rr = await prisma.reviewRequest.findUnique({ where: { id: reviewRequestId }, include: INCLUDE });
  if (!rr) return { sent: false, reason: 'not-found' };
  if (rr.status !== 'SCHEDULED') return { sent: false, reason: `already-${rr.status.toLowerCase()}` };
  if (rr.expiresAt.getTime() < Date.now()) {
    await prisma.reviewRequest.update({ where: { id: rr.id }, data: { status: 'EXPIRED' } });
    return { sent: false, reason: 'expired' };
  }
  if (!rr.customer?.email) {
    return { sent: false, reason: 'no-customer-email' };
  }
  const outcome = await sendRequest(rr);
  return outcome === 'sent' ? { sent: true } : { sent: false, reason: outcome === 'skipped' ? 'already-claimed' : 'send-failed' };
}

export async function sweepReviewRequests(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();

  const due = await prisma.reviewRequest.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
      sentAt: null,
      // Lien mort après une longue panne : on ne l'envoie pas.
      expiresAt: { gt: now },
    },
    include: INCLUDE,
    take: 200,
  });

  const result: SweepResult = { scanned: due.length, sent: 0, expired: 0, skipped: 0, errors: 0 };

  for (const rr of due) {
    try {
      const outcome = await sendRequest(rr);
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'skipped') result.skipped += 1;
      else result.errors += 1;
    } catch (err) {
      logger.warn({ err, reviewRequestId: rr.id }, 'automation.review-requests.send-failed');
      result.errors += 1;
    }
  }

  // Expire stale SENT requests
  const expired = await prisma.reviewRequest.updateMany({
    where: {
      status: { in: ['SCHEDULED', 'SENT'] },
      expiresAt: { lte: now },
      completedAt: null,
    },
    data: { status: 'EXPIRED' },
  });
  result.expired = expired.count;

  logger.info({ ...result }, 'automation.review-requests.swept');
  return result;
}
