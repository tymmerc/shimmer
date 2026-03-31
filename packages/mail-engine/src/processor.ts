/**
 * Mail Processor — Full pipeline: classify → extract → draft → queue.
 */

import { getPrisma, logger } from '@shimmer/core';
import { classifyEmail, type ClassificationResult } from './classifier.js';
import { generateDraft, type DraftResult } from './draft-generator.js';

export interface ProcessedEmail {
  id: number;
  category: string;
  urgency: string;
  sentiment: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  draftResponse: string;
  summary: string;
  suggestedActions: string[];
  status: string;
}

export async function processEmail(
  storeId: number,
  fromAddr: string,
  subject: string,
  body: string,
  externalId?: string,
): Promise<ProcessedEmail> {
  const t0 = performance.now();
  const prisma = getPrisma();

  // Step 1: Classify
  const classification = await classifyEmail(fromAddr, subject, body);

  // Step 2: Generate draft response
  const draft = await generateDraft(fromAddr, subject, body, classification);

  // Step 3: Save to queue (PENDING — human must approve)
  const mail = await prisma.mailQueue.create({
    data: {
      storeId,
      externalId: externalId || null,
      fromAddr,
      subject,
      body,
      category: classification.category,
      urgency: classification.urgency,
      sentiment: classification.sentiment,
      extractedData: classification.extractedData as Record<string, unknown>,
      draftResponse: draft.draft,
      confidence: classification.confidence,
      status: 'PENDING',
      processedAt: new Date(),
    },
  });

  logger.info({
    mailId: mail.id,
    category: classification.category,
    urgency: classification.urgency,
    durationMs: Math.round(performance.now() - t0),
  }, 'mail.processed');

  return {
    id: mail.id,
    category: classification.category,
    urgency: classification.urgency,
    sentiment: classification.sentiment,
    confidence: classification.confidence,
    extractedData: classification.extractedData,
    draftResponse: draft.draft,
    summary: classification.summary,
    suggestedActions: draft.suggestedActions,
    status: 'PENDING',
  };
}
