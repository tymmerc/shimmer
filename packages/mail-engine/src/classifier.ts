/**
 * Mail Classifier — AI-powered email classification, urgency, sentiment, data extraction.
 */

import { ClaudeClient, logger } from '@shimmer/core';
import type { ClaudeMessage } from '@shimmer/core';

export interface ClassificationResult {
  category: 'ORDER_STATUS' | 'RETURN_REQUEST' | 'PRODUCT_QUESTION' | 'COMPLAINT' | 'DELIVERY_ISSUE' | 'PAYMENT_ISSUE' | 'SPAM' | 'OTHER';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'negative' | 'angry';
  confidence: number;
  extractedData: {
    orderNumber?: string;
    productName?: string;
    customerName?: string;
    issue?: string;
    requestedAction?: string;
  };
  summary: string;
}

const CLASSIFICATION_PROMPT = `Tu es un système de classification d'emails pour un e-commerce. Analyse l'email et retourne un JSON avec:

{
  "category": "ORDER_STATUS" | "RETURN_REQUEST" | "PRODUCT_QUESTION" | "COMPLAINT" | "DELIVERY_ISSUE" | "PAYMENT_ISSUE" | "SPAM" | "OTHER",
  "urgency": "low" | "medium" | "high" | "critical",
  "sentiment": "positive" | "neutral" | "negative" | "angry",
  "confidence": 0.0 à 1.0,
  "extractedData": {
    "orderNumber": string ou null,
    "productName": string ou null,
    "customerName": string ou null,
    "issue": string court décrivant le problème,
    "requestedAction": string court décrivant ce que le client veut
  },
  "summary": "résumé en 1 phrase"
}

Règles:
- COMPLAINT + mots forts (scandaleux, honteux, inacceptable) = urgency "critical"
- RETURN_REQUEST avec délai mentionné = urgency "high"
- DELIVERY_ISSUE avec retard > 5 jours = urgency "high"
- SPAM = confidence élevée, urgency "low"
- Extrais toujours le numéro de commande s'il est présent (format #XXXX ou CMD-XXXX)`;

const client = new ClaudeClient();

export async function classifyEmail(
  fromAddr: string,
  subject: string,
  body: string,
): Promise<ClassificationResult> {
  const t0 = performance.now();

  const messages: ClaudeMessage[] = [{
    role: 'user',
    content: `De: ${fromAddr}\nObjet: ${subject}\n\n${body}`,
  }];

  const result = await client.completeJson<ClassificationResult>(messages, {
    systemPrompt: CLASSIFICATION_PROMPT,
    temperature: 0.1,
    maxTokens: 1024,
  });

  // Validate and clamp confidence
  result.confidence = Math.max(0, Math.min(1, result.confidence || 0));

  logger.info({
    category: result.category,
    urgency: result.urgency,
    confidence: result.confidence,
    durationMs: Math.round(performance.now() - t0),
  }, 'mail.classified');

  return result;
}
