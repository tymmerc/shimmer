/**
 * SAV Assistant — customer service chatbot.
 * "Où est ma commande ?" is answered by code (order-flow.ts), never by the LLM.
 * Everything else goes to the LLM with the store FAQ and, for a signed-in
 * customer, their orders as context.
 */

import { getPrisma, ClaudeClient, logger } from '@shimmer/core';
import type { ClaudeMessage, ClaudeStreamChunk } from '@shimmer/core';
import { buildChatContext, formatContextForPrompt, type ChatContext } from './context-builder.js';
import { checkEscalation, getEscalationSummary } from './escalation.js';
import { runOrderFlow, type OrderFlowResult } from './order-flow.js';
import { orderFlowDeps } from './order-lookup.js';
import { redactEmails, type TrackingLink } from './order-tracking.js';
import { randomUUID } from 'node:crypto';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /** Deterministic order-tracking turn (order_ask, order_status…). Absent on LLM turns. */
  kind?: string;
  orderNumber?: string;
}

export interface ChatResponse {
  message: string;
  sessionToken: string;
  escalated: boolean;
  escalationReason?: string;
  status: 'ACTIVE' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  kind?: OrderFlowResult['kind'];
  tracking?: TrackingLink[];
  /** The widget must send the visitor's next message back to the SAV. */
  awaitingOrderRef?: boolean;
}

const SYSTEM_PROMPT_BASE = `Tu es l'assistant SAV de la boutique en ligne. Tu aides les clients avec leurs commandes, livraisons, retours et questions sur les produits.

## Règles
1. Sois toujours poli, empathique et professionnel
2. Réponds en français
3. Si tu n'as pas l'information, dis-le honnêtement plutôt que d'inventer
4. Pour les remboursements > 100€, indique que la demande sera transmise à un responsable
5. Ne communique JAMAIS de données sensibles (numéros de CB, mots de passe)
6. Si le client semble très frustré, propose de le mettre en relation avec un conseiller humain
7. N'affirme jamais avoir fait une action (retour, remboursement, annulation) : tu ne peux pas en faire. Oriente le client vers la boutique, en répondant à son email de confirmation de commande
8. Ne donne un statut de commande, un transporteur ou un numéro de suivi que s'il figure dans le contexte ou plus haut dans la conversation. Sinon, demande le numéro de commande et l'adresse email utilisée pour la commande

## Capacités
- Répondre aux questions sur la livraison, les retours et les produits (FAQ de la boutique)
- Le statut des commandes est donné par le système une fois le client identifié`;

/** Order-tracking turn, or null when the message is not about an order. */
async function answerOrderQuestion(
  storeId: number,
  message: string,
  history: ChatMessage[],
  trustedEmail?: string,
): Promise<OrderFlowResult | null> {
  // A customer asking for a human, or clearly upset, keeps going to the
  // escalation path, as before order tracking existed.
  const withMessage = [...history, { role: 'user' as const, content: message, timestamp: '' }];
  if (checkEscalation(withMessage).shouldEscalate) return null;
  return runOrderFlow(
    { message, history, trustedEmail, throttleScope: String(storeId) },
    orderFlowDeps(storeId),
  );
}

/**
 * Session messages after an order-tracking turn. Once the check is over
 * (answered or locked), the emails the visitor typed are no longer needed:
 * they are masked instead of being kept in chat_sessions.
 */
function withOrderTurn(history: ChatMessage[], message: string, reply: OrderFlowResult): ChatMessage[] {
  const at = new Date().toISOString();
  const done = reply.kind === 'order_status' || reply.kind === 'order_locked';
  const clean = (m: ChatMessage): ChatMessage =>
    done && m.role === 'user' ? { ...m, content: redactEmails(m.content) } : m;
  return [
    ...history.map(clean),
    clean({ role: 'user', content: message, timestamp: at }),
    {
      role: 'assistant',
      content: reply.text,
      timestamp: at,
      kind: reply.kind,
      ...(reply.orderNumber ? { orderNumber: reply.orderNumber } : {}),
    },
  ];
}

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

  // "Où est ma commande ?" : answered by code, before any LLM call.
  const orderReply = await answerOrderQuestion(storeId, message, existingMessages, customerEmail);
  if (orderReply) {
    const messages = withOrderTurn(existingMessages, message, orderReply);
    if (session) {
      await prisma.chatSession.update({ where: { id: session.id }, data: { messages: messages as any } });
    } else {
      await prisma.chatSession.create({
        data: { storeId, sessionToken: token, messages: messages as any, status: 'ACTIVE' },
      });
    }
    // Never log the email or the order reference, only what happened.
    logger.info({ storeId, sessionToken: token, kind: orderReply.kind }, 'chatbot.order.handled');
    return {
      message: orderReply.text,
      sessionToken: token,
      escalated: false,
      status: 'ACTIVE',
      kind: orderReply.kind,
      tracking: orderReply.tracking,
      awaitingOrderRef: orderReply.awaitingOrderRef,
    };
  }

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
    storeId,
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

  const orderReply = await answerOrderQuestion(storeId, message, existingMessages, customerEmail);
  if (orderReply) {
    await upsertSession(prisma, session, storeId, token, withOrderTurn(existingMessages, message, orderReply), 'ACTIVE');
    logger.info({ storeId, sessionToken: token, kind: orderReply.kind }, 'chatbot.order.handled');
    // SSE carries plain text only: the tracking link goes in the text.
    const links = orderReply.tracking.map(t => t.url).filter((u): u is string => !!u);
    const text = links.length ? `${orderReply.text}\n${links.join('\n')}` : orderReply.text;
    yield { type: 'text', text, sessionToken: token };
    yield { type: 'done', sessionToken: token, escalated: false };
    return;
  }

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
  await prisma.chatSession.updateMany({
    where: { id: sessionId, storeId },
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
