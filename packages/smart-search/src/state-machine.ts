/**
 * Conversation FSM — 7 states with persistence.
 * INIT → DETECTION → QUALIFICATION → RECOMMENDATION → OBJECTION → PURCHASE → CLOSURE
 */

import { getPrisma, logger } from '@shimmer/core';
import type {
  ConversationStateType,
  ConversationContext,
  TransitionSignal,
} from '@shimmer/core';

interface StateMachineConfig {
  sessionId: number;
}

const TRANSITIONS: Record<ConversationStateType, Partial<Record<TransitionSignal, ConversationStateType>>> = {
  INIT: {
    query: 'DETECTION',
  },
  DETECTION: {
    query: 'QUALIFICATION',
    accept: 'RECOMMENDATION',
  },
  QUALIFICATION: {
    query: 'RECOMMENDATION',
    accept: 'RECOMMENDATION',
    need_change: 'DETECTION',
  },
  RECOMMENDATION: {
    objection: 'OBJECTION',
    accept: 'PURCHASE',
    need_change: 'DETECTION',
    backtrack: 'RECOMMENDATION',
    add_need: 'DETECTION',
    close: 'CLOSURE',
  },
  OBJECTION: {
    accept: 'PURCHASE',
    query: 'RECOMMENDATION',
    need_change: 'DETECTION',
    close: 'CLOSURE',
  },
  PURCHASE: {
    close: 'CLOSURE',
    add_need: 'DETECTION',
  },
  CLOSURE: {
    query: 'DETECTION', // allow new search from closure
  },
};

export class ConversationStateMachine {
  private state: ConversationStateType = 'INIT';
  private context: ConversationContext = {
    detectedUsages: [],
    criteria: {},
    recommendedProducts: [],
    previousStates: [],
    turnCount: 0,
  };
  private sessionId: number;

  constructor(config: StateMachineConfig) {
    this.sessionId = config.sessionId;
  }

  /**
   * Load state from DB. Returns false if no saved state exists.
   */
  async load(): Promise<boolean> {
    const prisma = getPrisma();
    const saved = await prisma.conversationState.findUnique({
      where: { sessionId: this.sessionId },
    });

    if (!saved) return false;

    this.state = saved.state as ConversationStateType;
    this.context = (saved.context as unknown as ConversationContext) || this.context;
    if (saved.budgetSignal) {
      this.context.budget = JSON.parse(saved.budgetSignal);
    }
    if (saved.detectedUsages) {
      this.context.detectedUsages = saved.detectedUsages;
    }

    return true;
  }

  /**
   * Transition to a new state based on a signal.
   */
  async transition(signal: TransitionSignal): Promise<ConversationStateType> {
    const allowed = TRANSITIONS[this.state];
    const nextState = allowed?.[signal];

    if (!nextState) {
      logger.warn(
        { currentState: this.state, signal },
        'state_machine.invalid_transition',
      );
      return this.state; // stay in current state
    }

    this.context.previousStates.push(this.state);
    this.context.turnCount++;
    this.state = nextState;

    await this.persist();

    logger.debug(
      { from: this.context.previousStates.at(-1), to: this.state, signal },
      'state_machine.transition',
    );

    return this.state;
  }

  /**
   * Update context without changing state.
   */
  async updateContext(updates: Partial<ConversationContext>): Promise<void> {
    Object.assign(this.context, updates);
    await this.persist();
  }

  /**
   * Persist current state to DB.
   */
  private async persist(): Promise<void> {
    const prisma = getPrisma();
    await prisma.conversationState.upsert({
      where: { sessionId: this.sessionId },
      create: {
        sessionId: this.sessionId,
        state: this.state,
        context: this.context as any,
        budgetSignal: this.context.budget ? JSON.stringify(this.context.budget) : null,
        detectedUsages: this.context.detectedUsages,
      },
      update: {
        state: this.state,
        context: this.context as any,
        budgetSignal: this.context.budget ? JSON.stringify(this.context.budget) : null,
        detectedUsages: this.context.detectedUsages,
      },
    });
  }

  getState(): ConversationStateType {
    return this.state;
  }

  getContext(): ConversationContext {
    return { ...this.context };
  }
}

/**
 * Detect transition signal from user message.
 */
export function detectSignal(message: string): TransitionSignal {
  const m = message.toLowerCase().trim();

  // Need change signals
  if (/en fait|finalement|plutôt|non pas|change/.test(m)) return 'need_change';

  // Backtrack signals
  if (/reviens? (au|à)|le premier|celui d'avant|précédent/.test(m)) return 'backtrack';

  // Add need signals
  if (/et aussi|j'ai aussi|en plus|également/.test(m)) return 'add_need';

  // Objection signals
  if (/trop cher|pas convaincu|hésite|pas sûr|cher/.test(m)) return 'objection';

  // Accept signals
  if (/je (le |la )?prends|ok|parfait|ça me va|d'accord|c'est bon/.test(m)) return 'accept';

  // Close signals
  if (/merci|au revoir|c'est tout|terminé|fini/.test(m)) return 'close';

  // Default to query
  return 'query';
}
