/**
 * Outbound campaign publishing sweep.
 *
 * When a campaign is approved + scheduled, this picks it up at scheduledAt and
 * flips it to 'published'. For newsletter format, it can also fan out the
 * email content to the audience (dormant customers, all customers, or a
 * segment). Ads/social formats only flip status — actual posting requires the
 * merchant to push the content to Meta/Mailchimp via the export endpoint.
 *
 * Newsletter fan-out is rate-limited (max FANOUT_LIMIT per campaign per tick)
 * to avoid blowing the email provider quota during a backlog catch-up.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { suppressedAmong, unsubscribeLink } from '../unsubscribe.js';

interface SweepResult {
  scanned: number;
  publishedNoFanout: number;
  publishedWithFanout: number;
  totalEmailsQueued: number;
  errors: number;
}

const FANOUT_LIMIT = 500;

/**
 * Publie une campagne. Elle est réservée (scheduled → publishing) AVANT tout
 * envoi : le job et le balayage de 15 min ne peuvent pas envoyer la même
 * newsletter deux fois (l'envoi dure plusieurs minutes). Un échec la laisse en
 * 'failed', jamais renvoyée d'office (une partie de l'audience l'a peut-être reçue).
 */
async function publishCampaign(
  campaign: { id: number; storeId: number; format: string; content: unknown; audience: string | null },
  now: Date,
): Promise<{ published: boolean; queued: number; reason?: string }> {
  const prisma = getPrisma();
  const claim = await prisma.outboundCampaign.updateMany({
    where: { id: campaign.id, status: 'scheduled' },
    data: { status: 'publishing' },
  });
  if (claim.count === 0) return { published: false, queued: 0, reason: 'already-claimed' };

  try {
    if (campaign.format !== 'newsletter') {
      await prisma.outboundCampaign.update({
        where: { id: campaign.id },
        data: { status: 'published', publishedAt: now },
      });
      return { published: true, queued: 0 };
    }
    const queued = await fanOutNewsletter(campaign.id, campaign.storeId, campaign.content, campaign.audience);
    await prisma.outboundCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'published',
        publishedAt: now,
        metrics: { audienceReached: queued } as unknown as Parameters<typeof prisma.outboundCampaign.update>[0]['data']['metrics'],
      },
    });
    return { published: true, queued };
  } catch (err) {
    await prisma.outboundCampaign.update({ where: { id: campaign.id }, data: { status: 'failed' } }).catch(() => undefined);
    throw err;
  }
}

/**
 * Per-campaign processor invoked at OutboundCampaign.scheduledAt.
 */
export async function processOutboundPublishJob({ campaignId }: { campaignId: number }): Promise<{ published: boolean; queued: number; reason?: string }> {
  const prisma = getPrisma();
  const campaign = await prisma.outboundCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { published: false, queued: 0, reason: 'not-found' };
  if (campaign.status !== 'scheduled') return { published: false, queued: 0, reason: `status-${campaign.status}` };
  return publishCampaign(campaign, new Date());
}

export async function sweepOutboundPublish(now: Date = new Date()): Promise<SweepResult> {
  const prisma = getPrisma();

  const due = await prisma.outboundCampaign.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
    take: 50,
  });

  const result: SweepResult = {
    scanned: due.length,
    publishedNoFanout: 0,
    publishedWithFanout: 0,
    totalEmailsQueued: 0,
    errors: 0,
  };

  for (const campaign of due) {
    try {
      const r = await publishCampaign(campaign, now);
      if (!r.published) continue;
      if (campaign.format === 'newsletter') {
        result.publishedWithFanout += 1;
        result.totalEmailsQueued += r.queued;
      } else {
        result.publishedNoFanout += 1;
      }
    } catch (err) {
      logger.warn({ err, campaignId: campaign.id }, 'automation.outbound-publish.failed');
      result.errors += 1;
    }
  }

  logger.info({ ...result }, 'automation.outbound-publish.swept');
  return result;
}

async function fanOutNewsletter(
  campaignId: number,
  storeId: number,
  content: unknown,
  audience: string | null,
): Promise<number> {
  const prisma = getPrisma();
  const nl = (content ?? {}) as {
    subject?: string;
    preheader?: string;
    intro?: string;
    picks?: Array<{ name?: string; price?: string; reason?: string }>;
    cta?: string;
  };
  if (!nl.subject || !nl.intro) return 0;

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000);
  let where: Parameters<typeof prisma.customer.findMany>[0] extends infer P
    ? P extends { where?: infer W } ? W & object : never
    : never = { storeId };
  if (audience === 'dormant') {
    where = {
      ...where,
      orders: {
        none: { orderedAt: { gte: sixtyDaysAgo } },
      },
    };
  }

  const recipients = await prisma.customer.findMany({
    where,
    select: { id: true, email: true, firstName: true },
    take: FANOUT_LIMIT,
  });

  const bodyText = renderNewsletterText(nl);
  // Désinscrits de la boutique (lien en pied de chaque envoi) : jamais relancés.
  const suppressed = await suppressedAmong(storeId, recipients.map((r) => r.email ?? ''));
  let queued = 0;
  for (const recipient of recipients) {
    if (!recipient.email || suppressed.has(recipient.email.trim().toLowerCase())) continue;
    const text = personalize(bodyText, recipient.firstName);
    const unsub = unsubscribeLink(storeId, recipient.email);
    try {
      await sendEmail({
        storeId,
        to: recipient.email,
        subject: nl.subject ?? 'Notre sélection du moment',
        bodyText: text + unsub.footer,
        unsubscribeUrl: unsub.url,
        storedBodyText: `${text}\n\n--\n[lien de désinscription]`,
        tag: 'outbound-newsletter',
        relatedEntity: 'campaign',
        relatedId: campaignId,
      });
      queued += 1;
    } catch (err) {
      logger.warn({ err, campaignId, to: recipient.email }, 'automation.outbound-publish.fanout-failed');
    }
  }
  return queued;
}

function renderNewsletterText(nl: {
  intro?: string;
  picks?: Array<{ name?: string; price?: string; reason?: string }>;
  cta?: string;
}): string {
  const lines: string[] = [];
  if (nl.intro) lines.push(nl.intro);
  if (nl.picks && nl.picks.length > 0) {
    lines.push('');
    for (const p of nl.picks) {
      const price = p.price ? ` — ${p.price}€` : '';
      lines.push(`• ${p.name ?? ''}${price}`);
      if (p.reason) lines.push(`  ${p.reason}`);
    }
  }
  if (nl.cta) {
    lines.push('');
    lines.push(nl.cta);
  }
  return lines.join('\n');
}

function personalize(body: string, firstName: string | null | undefined): string {
  if (!firstName) return body;
  return `Bonjour ${firstName},\n\n${body}`;
}
