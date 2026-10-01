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
 *
 * Accord marketing (01/10/2026) : avant, la newsletter partait à tous les
 * clients de la boutique. Désormais seulement à ceux qui ont accepté le
 * marketing (customers.marketing_consent, voir marketing-consent.ts), sauf si
 * la boutique a choisi l'audience « all » (config.newsletter.audience, par
 * défaut « subscribers »), et jamais aux désinscrits. Tant que le SQL de ces
 * colonnes manque, la newsletter attend au lieu de partir à tout le monde.
 */

import { getPrisma, logger } from '@shimmer/core';
import { sendEmail } from '@shimmer/email-connector';
import { suppressedAmong, unsubscribeLink } from '../unsubscribe.js';
import { consentSchemaReady } from '../consent-schema.js';
import { reminderSchemaReady } from '../reminder-schema.js';

interface SweepResult {
  scanned: number;
  publishedNoFanout: number;
  publishedWithFanout: number;
  totalEmailsQueued: number;
  errors: number;
}

const FANOUT_LIMIT = 500;
const DORMANT_AFTER_MS = 60 * 24 * 3600 * 1000;

export interface NewsletterSettings {
  /** 'subscribers' : seulement les clients qui ont accepté le marketing. */
  audience: 'subscribers' | 'all';
}

/** Réglages newsletter de la boutique, lus prudemment (config jsonb libre). */
export function newsletterSettings(config: unknown): NewsletterSettings {
  const raw = (config && typeof config === 'object' ? (config as Record<string, unknown>).newsletter : null) as
    Record<string, unknown> | null | undefined;
  return { audience: raw?.audience === 'all' ? 'all' : 'subscribers' };
}

/**
 * La newsletter a besoin de l'accord des clients et de la table des
 * désinscrits (lien en pied de chaque envoi). Sans l'un des deux, elle attend.
 */
async function newsletterSchemaReady(): Promise<boolean> {
  return (await consentSchemaReady()) && (await reminderSchemaReady());
}

export interface NewsletterRecipient {
  id: number;
  email: string;
  firstName: string | null;
}

/**
 * Destinataires d'une newsletter : clients de la boutique qui ont accepté le
 * marketing (tous si `everyone`), jamais les désinscrits ; avec `dormantSince`,
 * seulement ceux sans commande depuis cette date. Le filtre passe en SQL, avant
 * la limite : les clients écartés ne prennent pas la place des autres.
 */
export async function newsletterRecipients(
  storeId: number,
  opts: { everyone: boolean; dormantSince: Date | null; limit: number },
): Promise<NewsletterRecipient[]> {
  const rows = await getPrisma().$queryRaw<Array<{ id: number; email: string; first_name: string | null }>>`
    SELECT c.id, c.email, c.first_name
    FROM customers c
    WHERE c.store_id = ${storeId}
      AND (${opts.everyone}::boolean OR c.marketing_consent IS TRUE)
      AND (${opts.dormantSince}::timestamp IS NULL OR NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.id AND o.ordered_at >= ${opts.dormantSince}::timestamp))
      AND NOT EXISTS (
        SELECT 1 FROM email_suppressions s
        WHERE s.store_id = c.store_id AND lower(s.email) = lower(trim(c.email)))
    ORDER BY c.id
    LIMIT ${opts.limit}`;
  return rows.map((r) => ({ id: r.id, email: r.email, firstName: r.first_name }));
}

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
  // Pas réservée : elle reste 'scheduled' et le balayage de 15 min la reprend
  // dès que le SQL est passé.
  if (campaign.format === 'newsletter' && !(await newsletterSchemaReady())) {
    logger.warn({ campaignId: campaign.id }, 'automation.outbound-publish.newsletter-paused');
    return { published: false, queued: 0, reason: 'newsletter-paused' };
  }
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
    const { queued, consentAudience } = await fanOutNewsletter(campaign.id, campaign.storeId, campaign.content, campaign.audience);
    await prisma.outboundCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'published',
        publishedAt: now,
        // consentAudience : la règle d'accord appliquée à cet envoi (trace).
        metrics: { audienceReached: queued, consentAudience } as unknown as Parameters<typeof prisma.outboundCampaign.update>[0]['data']['metrics'],
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

/**
 * `audience` est le ciblage de la campagne (tous, dormants) ; la règle
 * d'accord (consentAudience) vient des réglages de la boutique.
 */
async function fanOutNewsletter(
  campaignId: number,
  storeId: number,
  content: unknown,
  audience: string | null,
): Promise<{ queued: number; consentAudience: NewsletterSettings['audience'] }> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { config: true } });
  const consentAudience = newsletterSettings(store?.config).audience;
  const nl = (content ?? {}) as {
    subject?: string;
    preheader?: string;
    intro?: string;
    picks?: Array<{ name?: string; price?: string; reason?: string }>;
    cta?: string;
  };
  if (!nl.subject || !nl.intro) return { queued: 0, consentAudience };

  const recipients = await newsletterRecipients(storeId, {
    everyone: consentAudience === 'all',
    dormantSince: audience === 'dormant' ? new Date(Date.now() - DORMANT_AFTER_MS) : null,
    limit: FANOUT_LIMIT,
  });

  const bodyText = renderNewsletterText(nl);
  // Filet : trim() de Postgres ne retire que les espaces, les désinscrits
  // sont enregistrés avec le trim() de JS (tabulations, espaces insécables).
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
  logger.info({ campaignId, storeId, queued, consentAudience }, 'automation.outbound-publish.fanout');
  return { queued, consentAudience };
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
