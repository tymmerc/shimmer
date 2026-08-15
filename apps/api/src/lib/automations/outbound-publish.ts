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

interface SweepResult {
  scanned: number;
  publishedNoFanout: number;
  publishedWithFanout: number;
  totalEmailsQueued: number;
  errors: number;
}

const FANOUT_LIMIT = 500;

/**
 * Per-campaign processor invoked at OutboundCampaign.scheduledAt.
 */
export async function processOutboundPublishJob({ campaignId }: { campaignId: number }): Promise<{ published: boolean; queued: number; reason?: string }> {
  const prisma = getPrisma();
  const campaign = await prisma.outboundCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { published: false, queued: 0, reason: 'not-found' };
  if (campaign.status !== 'scheduled') return { published: false, queued: 0, reason: `status-${campaign.status}` };

  const now = new Date();
  if (campaign.format !== 'newsletter') {
    await prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'published', publishedAt: now },
    });
    return { published: true, queued: 0 };
  }

  const queued = await fanOutNewsletter(campaign.id, campaign.storeId, campaign.content, campaign.audience);
  await prisma.outboundCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'published',
      publishedAt: now,
      metrics: { audienceReached: queued } as unknown as Parameters<typeof prisma.outboundCampaign.update>[0]['data']['metrics'],
    },
  });
  return { published: true, queued };
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
      if (campaign.format !== 'newsletter') {
        await prisma.outboundCampaign.update({
          where: { id: campaign.id },
          data: { status: 'published', publishedAt: now },
        });
        result.publishedNoFanout += 1;
        continue;
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
      result.publishedWithFanout += 1;
      result.totalEmailsQueued += queued;
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
  let queued = 0;
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    try {
      await sendEmail({
        storeId,
        to: recipient.email,
        subject: nl.subject ?? 'Notre sélection du moment',
        bodyText: personalize(bodyText, recipient.firstName),
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
