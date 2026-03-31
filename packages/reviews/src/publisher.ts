/**
 * Review Publisher — Publish approved reviews to external platforms.
 * Supports: product page (internal), Google Reviews, Trustpilot.
 */

import { getPrisma, logger } from '@shimmer/core';

export type PublishTarget = 'PRODUCT_PAGE' | 'GOOGLE' | 'TRUSTPILOT';

/**
 * Publish a review to one or more platforms.
 * Creates publication records and handles each platform.
 */
export async function publishReview(
  reviewId: number,
  targets: PublishTarget[],
) {
  const prisma = getPrisma();

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { customer: true, product: true },
  });

  if (!review) throw new Error('Review not found');
  if (review.status !== 'APPROVED' && review.status !== 'PUBLISHED') {
    throw new Error('Review must be approved before publishing');
  }

  const results = [];

  for (const target of targets) {
    // Check if already published to this platform
    const existing = await prisma.reviewPublication.findFirst({
      where: { reviewId, platform: target, status: 'PUBLISHED' },
    });
    if (existing) {
      results.push({ platform: target, status: 'already_published', id: existing.id });
      continue;
    }

    try {
      const publication = await prisma.reviewPublication.create({
        data: {
          reviewId,
          platform: target,
          status: 'PENDING',
        },
      });

      // Platform-specific publishing
      switch (target) {
        case 'PRODUCT_PAGE':
          // Internal — just mark as published, the review is already in DB
          await prisma.reviewPublication.update({
            where: { id: publication.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
          });
          results.push({ platform: target, status: 'published', id: publication.id });
          break;

        case 'GOOGLE':
          // Google My Business API integration placeholder
          // In production: use Google Business Profile API to post the review
          await prisma.reviewPublication.update({
            where: { id: publication.id },
            data: {
              status: 'PENDING',
              error: 'Google API integration requires OAuth setup — review queued for manual publication',
            },
          });
          results.push({ platform: target, status: 'queued', id: publication.id });
          break;

        case 'TRUSTPILOT':
          // Trustpilot Business API integration placeholder
          // In production: use Trustpilot Invitation API to generate a review link
          await prisma.reviewPublication.update({
            where: { id: publication.id },
            data: {
              status: 'PENDING',
              error: 'Trustpilot API integration requires Business API key — review queued for manual publication',
            },
          });
          results.push({ platform: target, status: 'queued', id: publication.id });
          break;
      }
    } catch (err) {
      logger.error({ err, reviewId, platform: target }, 'review.publish.failed');
      results.push({ platform: target, status: 'error', error: (err as Error).message });
    }
  }

  // Update review status to PUBLISHED if at least one succeeded
  const anyPublished = results.some(r => r.status === 'published');
  if (anyPublished) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'PUBLISHED' },
    });
  }

  logger.info({ reviewId, targets, results }, 'review.published');
  return results;
}
