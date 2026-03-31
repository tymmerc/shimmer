/**
 * Review Engine — Submit, moderate, query reviews.
 * Low ratings (< 3) trigger SAV alerts automatically.
 */

import { getPrisma, logger } from '@shimmer/core';
import { analyzeReview } from './analyzer.js';

interface SubmitReviewParams {
  token: string;
  overallRating: number; // 1-5
  productRatings?: { productId: number; rating: number }[];
  deliveryRating?: number;
  serviceRating?: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  wouldRecommend?: boolean;
}

/**
 * Submit a review from a customer questionnaire.
 */
export async function submitReview(params: SubmitReviewParams) {
  const prisma = getPrisma();

  // Load the review request
  const request = await prisma.reviewRequest.findUnique({
    where: { token: params.token },
    include: {
      order: { include: { items: { include: { product: true } } } },
    },
  });

  if (!request) throw new Error('Invalid review token');
  if (request.status === 'COMPLETED') throw new Error('Review already submitted');
  if (request.status === 'EXPIRED' || new Date() > request.expiresAt) throw new Error('Review link expired');

  const reviews = [];

  // Create overall order review
  const mainReview = await prisma.review.create({
    data: {
      storeId: request.storeId,
      reviewRequestId: request.id,
      customerId: request.customerId,
      orderId: request.orderId,
      overallRating: Math.max(1, Math.min(5, params.overallRating)),
      deliveryRating: params.deliveryRating ? Math.max(1, Math.min(5, params.deliveryRating)) : null,
      serviceRating: params.serviceRating ? Math.max(1, Math.min(5, params.serviceRating)) : null,
      title: params.title?.slice(0, 200),
      comment: params.comment?.slice(0, 5000),
      pros: params.pros?.slice(0, 2000),
      cons: params.cons?.slice(0, 2000),
      wouldRecommend: params.wouldRecommend,
      status: 'PENDING_MODERATION',
    },
  });
  reviews.push(mainReview);

  // Create per-product reviews if provided
  if (params.productRatings?.length) {
    for (const pr of params.productRatings) {
      // Verify product belongs to this order
      const orderItem = request.order.items.find(i => i.productId === pr.productId);
      if (!orderItem) continue;

      const productReview = await prisma.review.create({
        data: {
          storeId: request.storeId,
          reviewRequestId: request.id,
          customerId: request.customerId,
          productId: pr.productId,
          orderId: request.orderId,
          overallRating: Math.max(1, Math.min(5, pr.rating)),
          productRating: Math.max(1, Math.min(5, pr.rating)),
          title: params.title?.slice(0, 200),
          comment: params.comment?.slice(0, 5000),
          status: 'PENDING_MODERATION',
        },
      });
      reviews.push(productReview);
    }
  }

  // Mark request as completed
  await prisma.reviewRequest.update({
    where: { id: request.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // Trigger SAV alert for low ratings
  if (params.overallRating <= 2) {
    await triggerSavAlert(request.storeId, request.orderId, request.customerId, mainReview.id, params.overallRating, params.comment);
  }

  // Run AI analysis in background (non-blocking)
  analyzeAndUpdate(mainReview.id).catch(err =>
    logger.warn({ err, reviewId: mainReview.id }, 'review.analysis.failed')
  );

  logger.info({
    reviewCount: reviews.length,
    overallRating: params.overallRating,
    orderId: request.orderId,
    savTriggered: params.overallRating <= 2,
  }, 'review.submitted');

  return { reviews, savTriggered: params.overallRating <= 2 };
}

/**
 * Moderate a review — approve or reject.
 */
export async function moderateReview(
  reviewId: number,
  storeId: number,
  action: 'approve' | 'reject',
  note?: string,
) {
  const prisma = getPrisma();

  const review = await prisma.review.findFirst({
    where: { id: reviewId, storeId },
  });
  if (!review) throw new Error('Review not found');

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      moderatedAt: new Date(),
      moderationNote: note,
    },
  });

  logger.info({ reviewId, action }, 'review.moderated');
  return updated;
}

/**
 * Get published/approved reviews for a product.
 */
export async function getProductReviews(
  productId: number,
  storeId: number,
  limit = 20,
  offset = 0,
) {
  const prisma = getPrisma();

  const where = {
    productId,
    storeId,
    status: { in: ['APPROVED' as const, 'PUBLISHED' as const] },
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        publications: true,
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total };
}

/**
 * Get review stats for a product or store.
 */
export async function getReviewStats(storeId: number, productId?: number) {
  const prisma = getPrisma();

  const where: Record<string, unknown> = {
    storeId,
    status: { in: ['APPROVED', 'PUBLISHED'] },
  };
  if (productId) where.productId = productId;

  const reviews = await prisma.review.findMany({
    where,
    select: {
      overallRating: true,
      productRating: true,
      deliveryRating: true,
      serviceRating: true,
      wouldRecommend: true,
    },
  });

  if (!reviews.length) {
    return {
      count: 0,
      averageRating: 0,
      averageProductRating: 0,
      averageDeliveryRating: 0,
      averageServiceRating: 0,
      recommendRate: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  const ratings: number[] = [];
  const productRatings: number[] = [];
  const deliveryRatings: number[] = [];
  const serviceRatings: number[] = [];
  let recommendCount = 0;
  let recommendTotal = 0;

  for (const r of reviews) {
    ratings.push(r.overallRating);
    dist[r.overallRating] = (dist[r.overallRating] || 0) + 1;
    if (r.productRating) productRatings.push(r.productRating);
    if (r.deliveryRating) deliveryRatings.push(r.deliveryRating);
    if (r.serviceRating) serviceRatings.push(r.serviceRating);
    if (r.wouldRecommend !== null) {
      recommendTotal++;
      if (r.wouldRecommend) recommendCount++;
    }
  }

  return {
    count: reviews.length,
    averageRating: Math.round(avg(ratings) * 10) / 10,
    averageProductRating: Math.round(avg(productRatings) * 10) / 10,
    averageDeliveryRating: Math.round(avg(deliveryRatings) * 10) / 10,
    averageServiceRating: Math.round(avg(serviceRatings) * 10) / 10,
    recommendRate: recommendTotal ? Math.round((recommendCount / recommendTotal) * 100) : 0,
    distribution: dist,
  };
}

// ── Internal helpers ──

async function triggerSavAlert(
  storeId: number,
  orderId: number,
  customerId: number,
  reviewId: number,
  rating: number,
  comment?: string | null,
) {
  const prisma = getPrisma();

  await prisma.alert.create({
    data: {
      storeId,
      type: 'LOW_REVIEW_RATING',
      severity: rating === 1 ? 'critical' : 'warning',
      message: `Avis négatif (${rating}/5) pour commande #${orderId}. ${comment ? `Commentaire: "${comment.slice(0, 200)}"` : 'Pas de commentaire.'}`,
    },
  });

  await prisma.review.update({
    where: { id: reviewId },
    data: { savTriggered: true },
  });

  logger.warn({ reviewId, rating, orderId, customerId }, 'review.sav.triggered');
}

async function analyzeAndUpdate(reviewId: number) {
  const prisma = getPrisma();
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review?.comment) return;

  const analysis = await analyzeReview(review.comment, review.overallRating);

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      aiSummary: analysis.summary,
      aiSentiment: analysis.sentiment,
    },
  });
}
