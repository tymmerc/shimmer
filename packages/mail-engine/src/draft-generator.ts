/**
 * Draft Generator — AI-generated email response drafts.
 * Human validation required before sending.
 */

import { ClaudeClient, logger } from '@shimmer/core';
import type { ClaudeMessage } from '@shimmer/core';
import type { ClassificationResult } from './classifier.js';

export interface DraftResult {
  draft: string;
  tone: string;
  suggestedActions: string[];
}

const DRAFT_PROMPT = `Tu es un assistant de rédaction pour le service client d'un e-commerce. Génère un brouillon de réponse email professionnel en français.

Règles:
- Ton professionnel mais chaleureux
- Commence par "Bonjour [nom si disponible],"
- Reformule le problème pour montrer la compréhension
- Propose une solution concrète
- Termine par une formule de politesse
- Maximum 200 mots
- Ne promets JAMAIS un remboursement sans validation humaine
- Pour les retours, mentionne la procédure standard (14 jours, état d'origine)
- Pour les livraisons, propose un suivi proactif

Retourne un JSON:
{
  "draft": "le texte complet du brouillon",
  "tone": "empathique" | "formel" | "excuses" | "informatif",
  "suggestedActions": ["action1", "action2"]
}`;

const client = new ClaudeClient();

export async function generateDraft(
  fromAddr: string,
  subject: string,
  body: string,
  classification: ClassificationResult,
): Promise<DraftResult> {
  const t0 = performance.now();

  const context = `Classification: ${classification.category} | Urgence: ${classification.urgency} | Sentiment: ${classification.sentiment}
Données extraites: ${JSON.stringify(classification.extractedData)}
Résumé: ${classification.summary}`;

  const messages: ClaudeMessage[] = [{
    role: 'user',
    content: `${context}\n\n--- Email original ---\nDe: ${fromAddr}\nObjet: ${subject}\n\n${body}`,
  }];

  const result = await client.completeJson<DraftResult>(messages, {
    systemPrompt: DRAFT_PROMPT,
    temperature: 0.4,
    maxTokens: 2048,
  });

  logger.info({
    tone: result.tone,
    actionsCount: result.suggestedActions?.length || 0,
    durationMs: Math.round(performance.now() - t0),
  }, 'mail.draft.generated');

  return result;
}
