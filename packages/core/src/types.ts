import type { Product, UsageTaxonomy, SearchSession, Store } from '@prisma/client';

// Re-export Prisma types
export type { Product, UsageTaxonomy, SearchSession, Store };

// ============================================================
// Search
// ============================================================

export interface SearchQuery {
  query: string;
  searchType?: 'EXACT' | 'FUNCTIONAL' | 'SIMILARITY' | 'HYBRID';
  sessionToken?: string;
  storeId: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface ScoredProduct {
  product: Product;
  score: number;
  matchType: 'exact' | 'usage' | 'similarity' | 'hybrid';
  explanation: string;
  usageScores?: Record<string, number>;
  confidence: ConfidenceLevel;
}

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

export interface SearchResult {
  products: ScoredProduct[];
  searchType: 'EXACT' | 'FUNCTIONAL' | 'SIMILARITY' | 'HYBRID';
  stageUsed: 1 | 2 | 3;
  sessionToken: string;
  qualification?: QualificationResult;
  totalMs: number;
}

export interface QualificationResult {
  score: number;
  questions?: QualificationQuestion[];
  deductions: Record<string, string>;
  missingCriteria: string[];
}

export interface QualificationQuestion {
  id: string;
  text: string;
  criterion: string;
  options: QuestionOption[];
  priority: number;
}

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

// ============================================================
// Budget
// ============================================================

export interface BudgetSignal {
  type: 'explicit' | 'qualitative' | 'anchor' | 'none';
  min?: number;
  max?: number;
  label?: string;
  anchor?: string;
}

// ============================================================
// State Machine
// ============================================================

export type ConversationStateType =
  | 'INIT'
  | 'DETECTION'
  | 'QUALIFICATION'
  | 'RECOMMENDATION'
  | 'OBJECTION'
  | 'PURCHASE'
  | 'CLOSURE';

export interface ConversationContext {
  searchType?: 'EXACT' | 'FUNCTIONAL' | 'SIMILARITY' | 'HYBRID';
  detectedUsages: string[];
  budget?: BudgetSignal;
  criteria: Record<string, string>;
  recommendedProducts: ScoredProduct[];
  previousStates: ConversationStateType[];
  turnCount: number;
}

export type TransitionSignal =
  | 'need_change'     // "en fait", "finalement"
  | 'backtrack'       // "reviens au", "le premier"
  | 'add_need'        // "et aussi", "j'ai aussi besoin"
  | 'objection'       // "trop cher", "pas convaincu"
  | 'accept'          // "je le prends", "OK"
  | 'close'           // "c'est bon", "merci"
  | 'query';          // new search query

// ============================================================
// Similarity
// ============================================================

export interface SimilarityRequest {
  referenceProductId?: number;
  referenceText?: string;
  subCase: 'like' | 'budget_alt' | 'replacement' | 'discovery' | 'competitor_equiv';
  maxDistance?: number;
}

export interface AttributeWeight {
  name: string;
  weight: number;
  type: 'categorical_exact' | 'categorical_close' | 'numerical' | 'list' | 'boolean';
  proximityMatrix?: Record<string, Record<string, number>>;
  maxRange?: number;
}

// ============================================================
// Embedding
// ============================================================

export interface EmbeddingResponse {
  embeddings: number[][];
}

// ============================================================
// Universe Config
// ============================================================

export interface UniverseConfig {
  id: string;
  name: string;
  scoring: {
    usageWeight: number;
    criteriaWeight: number;
    historyWeight: number;
  };
  maxQuestions: number;
  tone: string;
  mandatoryCriteria?: string[];
  deductionRules: DeductionRule[];
  budgetPercentiles: Record<string, number>;
  attributeWeights: AttributeWeight[];
}

export interface DeductionRule {
  signal: string;
  patterns: string[];
  deduction: { key: string; value: string };
}

// ============================================================
// Claude
// ============================================================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
  timeout?: number;
  maxRetries?: number;
}

export interface ClaudeStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}
