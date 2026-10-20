import { z } from 'zod';
import { Grammar, Verse } from '../types/schema.ts';
import { GlossaryTermEntry } from '../storage/workspaceBundle.ts';

export const LLMConfigSchema = z.object({
  endpoint: z.string().default('https://api.openai.com/v1'),
  apiKey: z.string().default(''),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.2),
  contextVersesCount: z.number().int().min(0).max(5).default(1),
  includeGlossary: z.boolean().default(true),
  targetLanguage: z.string().default('cs'),
  customSystemPrompt: z.string().default(''),
  providerPreset: z.enum([
    'openai',
    'gemini',
    'groq',
    'openrouter',
    'ollama',
    'lmstudio',
    'custom'
  ]).default('openai')
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export type LLMTaskType = 'translate' | 'align' | 'grammar_check' | 'critique' | 'custom';

export interface LLMTranslationResult {
  fluentTranslation: string;
  literalTranslation?: string;
  alternativeTranslations?: string[];
  commentary?: string;
  wordByWord?: Array<{
    tokenText: string;
    meaning: string;
    grammar?: string;
  }>;
}

export interface LLMAlignmentResult {
  alignments: Array<{
    tokenId: string;
    tokenIast: string;
    matchedWords: string[];
  }>;
  confidence?: number;
  notes?: string;
}

export interface LLMTokenGrammarCorrection {
  tokenId: string;
  tokenIast: string;
  suggestedIast?: string;
  suggestedLemma?: string;
  grammar?: Partial<Grammar>;
  explanation: string;
}

export interface LLMGrammarCheckResult {
  tokenCorrections: LLMTokenGrammarCorrection[];
  meterNotes?: string;
  sandhiNotes?: string;
  orthographyNotes?: string;
}

export interface LLMCritiqueResult {
  qualityScore?: number;
  strengths: string[];
  suggestions: string[];
  philosophicalContext?: string;
  meterAnalysis?: string;
}

export interface LLMPromptContext {
  verse: Verse;
  targetTranslationText?: string;
  targetLang?: string;
  previousVerses?: Verse[];
  followingVerses?: Verse[];
  glossary?: Record<string, GlossaryTermEntry>;
  bookTitle?: string;
  chapterTitle?: string;
  customInstruction?: string;
}

export interface LLMExecutionResult<T = any> {
  success: boolean;
  taskType: LLMTaskType;
  data?: T;
  rawResponse?: string;
  promptUsed?: string;
  error?: string;
  latencyMs?: number;
  modelUsed?: string;
}
