/**
 * Generic Language Adapter Interface
 *
 * Provides an abstraction layer for grammatical analysis, transliteration,
 * dictionary lookups, and metrical analysis. This allows the Reader architecture
 * to be reused for texts in any language (e.g. Classical Sanskrit, Pali, Latin, Classical Greek)
 * simply by plugging in a different adapter implementation.
 */

import { SupportedLanguage } from '../i18n/types.ts';

export interface ScriptOption {
  id: string;
  label: string;
  direction?: 'ltr' | 'rtl';
  isNative?: boolean;
}

export interface WordGrammarInfo {
  pos: string;
  root?: string;
  stem?: string;
  case?: string;
  number?: string;
  gender?: string;
  tenseOrMood?: string;
  voice?: string;
  person?: string;
  labelCs: string;
  labelEn?: string;
  label?: string;
}

export interface WordDerivationStep {
  stepNumber: number;
  ruleCode: string;
  ruleSource: string;
  ruleUrl?: string;
  termsDeva?: string;
  termsIast?: string;
  termsText: string;
}

export interface WordDerivationTree {
  targetText: string;
  targetTranslit: string;
  stemOrRoot: string;
  category: string;
  linguisticNotes: Record<string, string>;
  steps: WordDerivationStep[];
}

export interface UniversalWordAnalysis {
  query: string;
  lemma: string;
  grammar?: WordGrammarInfo;
  meanings: {
    contextual: string;
    alternatives: string[];
    byLang?: Record<string, { contextual: string; alternatives: string[] }>;
  };
  sandhiSplits?: Array<{
    first: string;
    second: string;
    isValid: boolean;
  }>;
  derivationTree?: WordDerivationTree;
  externalDictionaryLinks?: Array<{
    providerId: string;
    label: string;
    url: string;
  }>;
}

export interface MeterSyllable {
  text: string;
  translit: string;
  weight: 'L' | 'G'; // Light (Laghu / ∪) or Heavy (Guru / —)
  weightLabel: string;
}

export interface VerseMeterResult {
  meterName: string;
  totalSyllables: number;
  isClassical: boolean;
  notes?: string;
  padas: Array<{
    padaIndex: number;
    syllableCount: number;
    pattern: string;
    syllables: MeterSyllable[];
  }>;
}

export interface LanguageAdapter {
  /** Identifier of the language (e.g. 'sanskrit', 'pali', 'latin') */
  readonly languageId: string;
  /** Human-readable language name */
  readonly displayName: string;

  /** Available scripts / transcriptions for this language */
  getAvailableScripts(): ScriptOption[];

  /** Transliterate text from one script/scheme to another (options may carry e.g. Czech phonetic rules) */
  transliterate(text: string, fromScript: string, toScript: string, options?: Record<string, any>): string;

  /** Morphologically analyze a word or phrase with optional localization */
  analyzeWord(word: string, context?: { sentence?: string; pos?: string; lang?: SupportedLanguage }): Promise<UniversalWordAnalysis>;

  /** Analyze meter and rhythm of a verse with optional localization */
  analyzeMeter?(verseText: string, specifiedMeter?: string, lang?: SupportedLanguage): VerseMeterResult;

  /** Split compound or fused words (Sandhi / Padaccheda) */
  splitCompounds?(phrase: string): Array<{ first: string; second: string; isValid: boolean }>;
}
