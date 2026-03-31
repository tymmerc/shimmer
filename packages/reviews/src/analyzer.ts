/**
 * Review Analyzer — AI-powered sentiment analysis and summarization.
 */

import { ClaudeClient, logger } from '@shimmer/core';
import type { ClaudeMessage } from '@shimmer/core';

export interface ReviewAnalysis {
  summary: string;
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  keyTopics: string[];
  actionable: boolean;
  suggestedImprovement?: string;
}

const ANALYSIS_PROMPT = `Tu analyses des avis clients e-commerce. Retourne un JSON:

{
  "summary": "résumé en 1 phrase",
  "sentiment": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
  "keyTopics": ["topic1", "topic2"],
  "actionable": true/false (l'avis contient-il un point d'amélioration concret ?),
  "suggestedImprovement": "suggestion si actionable, sinon null"
}

Sois objectif. Détecte les signaux forts (frustration, enthousiasme, ironie).`;

const client = new ClaudeClient();

export async function analyzeReview(
  comment: string,
  rating: number,
): Promise<ReviewAnalysis> {
  const messages: ClaudeMessage[] = [{
    role: 'user',
    content: `Note: ${rating}/5\nCommentaire: ${comment}`,
  }];

  try {
    const result = await client.completeJson<ReviewAnalysis>(messages, {
      systemPrompt: ANALYSIS_PROMPT,
      temperature: 0.1,
      maxTokens: 512,
    });

    logger.debug({ sentiment: result.sentiment, actionable: result.actionable }, 'review.analyzed');
    return result;
  } catch (err) {
    logger.warn({ err }, 'review.analysis.error');
    // Fallback: simple heuristic
    return {
      summary: comment.slice(0, 100),
      sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
      keyTopics: [],
      actionable: false,
    };
  }
}
