/**
 * Review Request Manager — Schedule and send post-delivery review questionnaires.
 */

import { getPrisma, logger } from '@shimmer/core';
import { randomUUID } from 'node:crypto';

interface CreateRequestParams {
  storeId: number;
  orderId: number;
  customerId: number;
  delayHours?: number; // Delay after delivery before sending (default: 48h)
}

/**
 * Create a review request — typically triggered when order is delivered.
 */
export async function createReviewRequest(params: CreateRequestParams) {
  const { storeId, orderId, customerId, delayHours = 48 } = params;
  const prisma = getPrisma();

  // Check if request already exists for this order
  const existing = await prisma.reviewRequest.findFirst({
    where: { orderId, customerId },
  });

  if (existing) {
    logger.debug({ orderId, customerId }, 'review.request.exists');
    return existing;
  }

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  const expiresAt = new Date(scheduledAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days to respond

  const request = await prisma.reviewRequest.create({
    data: {
      storeId,
      orderId,
      customerId,
      token: randomUUID(),
      status: 'SCHEDULED',
      scheduledAt,
      expiresAt,
    },
  });

  logger.info({ requestId: request.id, orderId, scheduledAt: scheduledAt.toISOString() }, 'review.request.created');
  return request;
}

/**
 * Mark a review request as sent (called when email is actually sent).
 */
export async function sendReviewRequest(requestId: number) {
  const prisma = getPrisma();

  const request = await prisma.reviewRequest.update({
    where: { id: requestId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  logger.info({ requestId }, 'review.request.sent');
  return request;
}

/**
 * Get a review request by token (for the public questionnaire page).
 */
export async function getReviewRequest(token: string) {
  const prisma = getPrisma();

  const request = await prisma.reviewRequest.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
      customer: true,
    },
  });

  if (!request) return null;

  // Check expiration
  if (request.status === 'EXPIRED' || new Date() > request.expiresAt) {
    if (request.status !== 'EXPIRED') {
      await prisma.reviewRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
    }
    return { ...request, expired: true };
  }

  return { ...request, expired: false };
}

/**
 * Get pending review requests ready to be sent.
 */
export async function getPendingRequests(storeId: number) {
  const prisma = getPrisma();

  return prisma.reviewRequest.findMany({
    where: {
      storeId,
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
      expiresAt: { gt: new Date() },
    },
    include: {
      customer: true,
      order: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  });
}
