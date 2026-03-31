/**
 * SAV Assistant — Claude-powered customer service chatbot.
 * Dynamic system prompt, conversation memory, tool use (order lookup, return initiation).
 */

import { getPrisma, ClaudeClient, logger } from '@shimmer/core';
import type { ClaudeMessage, ClaudeStreamChunk } from '@shimmer/core';
import { buildChatContext, formatContextForPrompt, type ChatContext } from './context-builder.js';
import { checkEscalation, getEscalationSummary } from './escalation.js';
import { randomUUID } from 'node:crypto';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  sessionToken: string;
  escalated: boolean;
  escalationReason?: string;
  status: 'ACTIVE' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
}

const SYSTEM_PROMPT_BASE = `Tu es l'assistant SAV de la boutique en ligne. Tu aides les clients avec leurs commandes, livraisons, retours et questions sur les produits.

## Règles
1. Sois toujours poli, empathique et professionnel
2. Réponds en français
3. Si tu n'as pas l'information, dis-le honnêtement plutôt que d'inventer
4. Pour les remboursements > 100€, indique que la demande sera transmise à un responsable
5. Ne communique JAMAIS de données sensibles (numéros de CB, mots de passe)
6. Si le client semble très frustré, propose de le mettre en relation avec un conseiller humain
7. Résume les actions entreprises à la fin de chaque réponse
8. Pour le suivi de colis, donne toujours le numéro de tracking et le transporteur

## Capacités
- Consulter le statut des commandes
- Vérifier le suivi des colis
- Initier un retour ou échange
- Répondre aux questions sur les produits (via FAQ)
- Escalader vers un conseiller humain si nécessaire`;

/**
 * Handle a chat message — returns the assistant response.
 */
export async function handleChatMessage(
  storeId: number,
  message: string,
  sessionToken?: string,
  customerEmail?: string,
): Promise<ChatResponse> {
  const prisma = getPrisma();
  const token = sessionToken || randomUUID();

  // Load or create session
  let session = await prisma.chatSession.findFirst({
    where: { sessionToken: token, storeId },
  });

  const existingMessages: ChatMessage[] = session
    ? (session.messages as unknown as ChatMessage[])
    : [];

  // Add user message
  const now = new Date().toISOString();
  existingMessages.push({ role: 'user', content: message, timestamp: now });

  // Check escalation before responding
  const escalation = checkEscalation(existingMessages);

  if (escalation.shouldEscalate) {
    const reason = getEscalationSummary(existingMessages);
    const escalationMsg = "Je comprends votre frustration. Je vais vous mettre en relation avec un conseiller qui pourra mieux vous aider. Un instant s'il vous plaît.";

    existingMessages.push({
      role: 'assistant',
      content: escalationMsg,
      timestamp: new Date().toISOString(),
    });

    if (session) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          messages: existingMessages as any,
          status: 'ESCALATED',
          escalated: true,
          escalationReason: reason,
        },
      });
    } else {
      session = await prisma.chatSession.create({
        data: {
          storeId,
          sessionToken: token,
          messages: existingMessages as any,
          status: 'ESCALATED',
          escalated: true,
          escalationReason: reason,
        },
      });
    }

    return {
      message: escalationMsg,
      sessionToken: token,
      escalated: true,
      escalationReason: reason,
      status: 'ESCALATED',
    };
  }

  // Build context
  const chatContext = await buildChatContext(storeId, customerEmail);
  const systemPrompt = buildSystemPrompt(chatContext);

  // Prepare messages for Claude
  const claudeMessages: ClaudeMessage[] = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Call Claude
  const claude = new ClaudeClient();
  const response = await claude.complete(claudeMessages, {
    systemPrompt,
    temperature: 0.4,
    maxTokens: 1024,
  });

  // Add assistant response
  existingMessages.push({
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString(),
  });

  // Persist session
  if (session) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { messages: existingMessages as any },
    });
  } else {
    session = await prisma.chatSession.create({
      data: {
        storeId,
        sessionToken: token,
        messages: existingMessages as any,
        status: 'ACTIVE',
      },
    });
  }

  logger.info({
    sessionToken: token,
    messageCount: existingMessages.length,
    storeId,
  }, 'chatbot.message.handled');

  return {
    message: response,
    sessionToken: token,
    escalated: false,
    status: 'ACTIVE',
  };
}

/**
 * Stream a chat response.
 */
export async function* streamChatMessage(
  storeId: number,
  message: string,
  sessionToken?: string,
  customerEmail?: string,
): AsyncGenerator<ClaudeStreamChunk & { sessionToken?: string; escalated?: boolean }> {
  const prisma = getPrisma();
  const token = sessionToken || randomUUID();

  let session = await prisma.chatSession.findFirst({
    where: { sessionToken: token, storeId },
  });

  const existingMessages: ChatMessage[] = session
    ? (session.messages as unknown as ChatMessage[])
    : [];

  existingMessages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Check escalation
  const escalation = checkEscalation(existingMessages);
  if (escalation.shouldEscalate) {
    const reason = getEscalationSummary(existingMessages);
    const escalationMsg = "Je comprends votre frustration. Je vais vous mettre en relation avec un conseiller qui pourra mieux vous aider.";

    existingMessages.push({
      role: 'assistant',
      content: escalationMsg,
      timestamp: new Date().toISOString(),
    });

    await upsertSession(prisma, session, storeId, token, existingMessages, 'ESCALATED', reason);

    yield { type: 'text', text: escalationMsg, sessionToken: token, escalated: true };
    yield { type: 'done', sessionToken: token, escalated: true };
    return;
  }

  const chatContext = await buildChatContext(storeId, customerEmail);
  const systemPrompt = buildSystemPrompt(chatContext);

  const claudeMessages: ClaudeMessage[] = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const claude = new ClaudeClient();
  let fullResponse = '';

  yield { type: 'text', text: '', sessionToken: token };

  for await (const chunk of claude.stream(claudeMessages, {
    systemPrompt,
    temperature: 0.4,
    maxTokens: 1024,
  })) {
    if (chunk.type === 'text' && chunk.text) {
      fullResponse += chunk.text;
    }
    yield chunk;
  }

  // Save complete response
  existingMessages.push({
    role: 'assistant',
    content: fullResponse,
    timestamp: new Date().toISOString(),
  });

  await upsertSession(prisma, session, storeId, token, existingMessages, 'ACTIVE');
}

/**
 * Escalate a session manually.
 */
export async function escalateSession(
  sessionToken: string,
  storeId: number,
  reason: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chatSession.updateMany({
    where: { sessionToken, storeId },
    data: {
      status: 'ESCALATED',
      escalated: true,
      escalationReason: reason,
    },
  });
}

/**
 * Resolve a session.
 */
export async function resolveSession(
  sessionId: number,
  storeId: number,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });
}

function buildSystemPrompt(ctx: ChatContext): string {
  const contextSection = formatContextForPrompt(ctx);
  if (!contextSection) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\n---\n\n# Contexte client\n\n${contextSection}`;
}

async function upsertSession(
  prisma: any,
  session: any,
  storeId: number,
  token: string,
  messages: ChatMessage[],
  status: string,
  escalationReason?: string,
) {
  if (session) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        messages: messages as any,
        status,
        ...(escalationReason && { escalated: true, escalationReason }),
      },
    });
  } else {
    await prisma.chatSession.create({
      data: {
        storeId,
        sessionToken: token,
        messages: messages as any,
        status,
        ...(escalationReason && { escalated: true, escalationReason }),
      },
    });
  }
}
