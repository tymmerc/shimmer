/**
 * Escalation engine — rules for when to escalate to human agent.
 * Triggers: negative sentiment, specific keywords, conversation loops, explicit request.
 */

import { logger } from '@shimmer/core';

export interface EscalationCheck {
  shouldEscalate: boolean;
  reason?: string;
  confidence: number; // 0-1
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Keywords that signal customer frustration
const FRUSTRATION_KEYWORDS = [
  'parler à un humain', 'parler a un humain', 'agent humain', 'vrai personne',
  'responsable', 'superviseur', 'manager', 'plainte', 'avocat', 'juridique',
  'inacceptable', 'scandaleux', 'honteux', 'arnaque', 'escroquerie',
  'remboursement immédiat', 'porter plainte', 'signalement',
  'ça fait des jours', 'ça fait des semaines', 'toujours pas',
  'jamais reçu', 'détruit', 'cassé', 'dangereux',
];

// Keywords requesting explicit escalation
const EXPLICIT_ESCALATION = [
  'parler à quelqu\'un', 'parler a quelqu\'un',
  'transfert', 'transférer', 'escalade',
  'un humain', 'une vraie personne', 'pas un robot', 'pas un bot',
  'service client', 'conseiller',
];

const MAX_TURNS_BEFORE_LOOP_DETECTION = 6;
const MAX_REPEATED_QUESTIONS = 2;

/**
 * Check if the conversation should be escalated.
 */
export function checkEscalation(messages: ChatMessage[]): EscalationCheck {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    return { shouldEscalate: false, confidence: 0 };
  }

  const lastUserMsg = userMessages.at(-1)!.content.toLowerCase();

  // 1. Explicit escalation request
  for (const keyword of EXPLICIT_ESCALATION) {
    if (lastUserMsg.includes(keyword)) {
      return {
        shouldEscalate: true,
        reason: `Demande explicite d'escalade: "${keyword}"`,
        confidence: 0.95,
      };
    }
  }

  // 2. Frustration keywords
  const frustrationMatches = FRUSTRATION_KEYWORDS.filter((k) => lastUserMsg.includes(k));
  if (frustrationMatches.length >= 2) {
    return {
      shouldEscalate: true,
      reason: `Frustration détectée: ${frustrationMatches.join(', ')}`,
      confidence: 0.85,
    };
  }

  // 3. Sentiment analysis (simple heuristic: caps, punctuation, negative words)
  const sentimentScore = analyzeSentiment(lastUserMsg);
  if (sentimentScore <= -0.7) {
    return {
      shouldEscalate: true,
      reason: `Sentiment très négatif (score: ${sentimentScore.toFixed(2)})`,
      confidence: 0.75,
    };
  }

  // 4. Conversation loop detection
  if (userMessages.length >= MAX_TURNS_BEFORE_LOOP_DETECTION) {
    const recentQueries = userMessages.slice(-MAX_TURNS_BEFORE_LOOP_DETECTION).map((m) => m.content.toLowerCase());
    const uniqueQueries = new Set(recentQueries);
    if (recentQueries.length - uniqueQueries.size >= MAX_REPEATED_QUESTIONS) {
      return {
        shouldEscalate: true,
        reason: 'Boucle de conversation détectée — le client répète les mêmes questions',
        confidence: 0.8,
      };
    }
  }

  // 5. Single frustration keyword in longer conversation
  if (frustrationMatches.length === 1 && userMessages.length > 4) {
    return {
      shouldEscalate: true,
      reason: `Frustration prolongée: "${frustrationMatches[0]}" après ${userMessages.length} échanges`,
      confidence: 0.65,
    };
  }

  return { shouldEscalate: false, confidence: 0 };
}

/**
 * Simple sentiment analysis — returns -1 (very negative) to +1 (very positive).
 */
function analyzeSentiment(text: string): number {
  let score = 0;

  // Caps ratio (shouting)
  const capsRatio = (text.replace(/[^A-Z]/g, '').length) / (text.length || 1);
  if (capsRatio > 0.5 && text.length > 10) score -= 0.3;

  // Exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations >= 3) score -= 0.2;

  // Negative words (FR)
  const negativeWords = [
    'nul', 'horrible', 'catastrophe', 'déçu', 'pire', 'jamais', 'aucun',
    'marre', 'ras le bol', 'inadmissible', 'honte', 'incapable', 'incompétent',
    'mensonge', 'voleur', 'arnaque', 'faux', 'paye', 'perdu', 'attends',
  ];
  const negCount = negativeWords.filter((w) => text.includes(w)).length;
  score -= negCount * 0.15;

  // Positive words
  const positiveWords = [
    'merci', 'super', 'parfait', 'excellent', 'bravo', 'génial', 'content',
    'satisfait', 'rapide', 'bien reçu', 'top',
  ];
  const posCount = positiveWords.filter((w) => text.includes(w)).length;
  score += posCount * 0.15;

  return Math.max(-1, Math.min(1, score));
}

/**
 * Get the escalation reason for display.
 */
export function getEscalationSummary(messages: ChatMessage[]): string {
  const check = checkEscalation(messages);
  if (!check.shouldEscalate) return '';

  const userMessages = messages.filter((m) => m.role === 'user');
  const lastMsg = userMessages.at(-1)?.content || '';

  return `Raison: ${check.reason}\nConfiance: ${(check.confidence * 100).toFixed(0)}%\nDernier message: "${lastMsg.slice(0, 200)}"`;
}
