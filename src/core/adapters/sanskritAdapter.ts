/**
 * Sanskrit Language Adapter Implementation
 *
 * Implements the universal LanguageAdapter interface for Classical and Vedic Sanskrit.
 * Powered by Ambuda Vidyut (WASM), local morphological rules, and dictionary builders.
 */

import {
  LanguageAdapter,
  ScriptOption,
  UniversalWordAnalysis,
  VerseMeterResult,
  MeterSyllable
} from './languageAdapter.ts';
import {
  transliterateLipi,
  analyzeSanskritWordFull,
  derivePrakriyaTree,
  detectVerseMeter,
  splitSandhiWasm
} from '../lemmatizer/vidyutAdapter.ts';
import { devanagariToIast, iastToCzechPhonetic, normalizeSchemeId } from '../transliteration/engine.ts';
import { CzechPhoneticRules } from '../types/schema.ts';
import { getDictionaryUrl } from '../dictionaries/dictionaryBuilder.ts';

import { SupportedLanguage } from '../i18n/types.ts';

export class SanskritLanguageAdapter implements LanguageAdapter {
  readonly languageId = 'sanskrit';
  readonly displayName = 'Sanskrt (संस्कृतम्)';

  getAvailableScripts(): ScriptOption[] {
    return [
      { id: 'devanagari', label: 'Dévanágarí (देवनागरी)', isNative: true },
      { id: 'iast', label: 'IAST (mezinárodní vědecká abeceda)' },
      { id: 'cs_phonetic', label: 'Český fonetický přepis' },
      { id: 'slp1', label: 'SLP1 (ASCII kódování)' },
      { id: 'hk', label: 'Harvard-Kyoto' }
    ];
  }

  transliterate(
    text: string,
    fromScript: string,
    toScript: string,
    options?: { czechRules?: Partial<CzechPhoneticRules> }
  ): string {
    if (!text) return '';

    const from = normalizeSchemeId(fromScript) ?? fromScript.toLowerCase();
    const to = normalizeSchemeId(toScript) ?? toScript.toLowerCase();

    // 1. Direct match
    if (from === to) return text;

    // 2. Czech phonetic target – any source scheme is first brought to IAST
    if (to === 'cs_phonetic') {
      let iast = text;
      if (from === 'devanagari') iast = devanagariToIast(text);
      else if (from !== 'iast') iast = transliterateLipi(text, from, 'iast');
      return iastToCzechPhonetic(iast, options?.czechRules);
    }

    // 3. WebAssembly vidyut-lipi (with table fallback)
    return transliterateLipi(text, from, to);
  }

  async analyzeWord(word: string, context?: { sentence?: string; pos?: string; lang?: SupportedLanguage }): Promise<UniversalWordAnalysis> {
    const trimmed = word.trim();
    const lang = context?.lang || 'cs';
    const fullAnalysis = await analyzeSanskritWordFull(trimmed, lang);
    const first = fullAnalysis.analyses[0];

    // Determine lemma
    const lemma = first?.lemma || (trimmed.replace(/[।॥,;.!?]/g, ''));

    // Derivation tree
    let derivationTree = undefined;
    if (fullAnalysis.prakriyaTree) {
      derivationTree = {
        targetText: fullAnalysis.prakriyaTree.targetText,
        targetTranslit: fullAnalysis.prakriyaTree.targetIast,
        stemOrRoot: fullAnalysis.prakriyaTree.stemOrRoot,
        category: fullAnalysis.prakriyaTree.category,
        linguisticNotes: fullAnalysis.prakriyaTree.linguisticNotes as Record<string, string>,
        steps: fullAnalysis.prakriyaTree.steps.map((s) => ({
          stepNumber: s.stepNumber,
          ruleCode: s.ruleCode,
          ruleSource: s.ruleSource,
          ruleUrl: s.sutraUrl,
          termsDeva: s.termsDeva,
          termsIast: s.termsIast,
          termsText: s.termsText
        }))
      };
    } else if (first?.pos !== 'indeclinable') {
      // Fallback derivation attempt
      const derived = derivePrakriyaTree(lemma, {
        pos: first?.pos === 'verb' ? 'verb' : 'noun',
        gender: first?.gender,
        case: first?.case,
        number: first?.number,
        root: first?.dhatu || first?.root,
        gana: first?.gana,
        person: first?.person,
        voice: first?.voice,
        lang
      });
      if (derived) {
        derivationTree = {
          targetText: derived.targetText,
          targetTranslit: derived.targetIast,
          stemOrRoot: derived.stemOrRoot,
          category: derived.category,
          linguisticNotes: derived.linguisticNotes as Record<string, string>,
          steps: derived.steps.map((s) => ({
            stepNumber: s.stepNumber,
            ruleCode: s.ruleCode,
            ruleSource: s.ruleSource,
            ruleUrl: s.sutraUrl,
            termsDeva: s.termsDeva,
            termsIast: s.termsIast,
            termsText: s.termsText
          }))
        };
      }
    }

    // External dictionaries
    const dictLinks = [
      {
        providerId: 'learnsanskrit',
        label: 'LearnSanskrit.cc',
        url: getDictionaryUrl(lemma, 'learnsanskrit')
      },
      {
        providerId: 'ashtadhyayi',
        label: 'Aṣṭādhyāyī.com',
        url: getDictionaryUrl(lemma, 'ashtadhyayi')
      },
      {
        providerId: 'cologne_mw',
        label: 'Monier-Williams (Cologne)',
        url: getDictionaryUrl(lemma, 'cologne_mw')
      }
    ];

    // Sandhi splits
    const sandhiSplits = (fullAnalysis.sandhiSplits || []).map((s) => ({
      first: `${s.firstDeva} (${s.firstIast})`,
      second: `${s.secondDeva} (${s.secondIast})`,
      isValid: s.isValid
    }));

    const contextualCs = first?.label_cs || '—';
    const contextualEn = first?.label_en || first?.label_cs || '—';

    return {
      query: trimmed,
      lemma,
      grammar: first ? {
        pos: first.pos,
        root: first.root,
        stem: first.stem,
        case: first.case,
        number: first.number,
        gender: first.gender,
        labelCs: contextualCs,
        labelEn: contextualEn,
        label: lang === 'en' ? contextualEn : contextualCs
      } : undefined,
      meanings: {
        contextual: lang === 'en' ? contextualEn : contextualCs,
        alternatives: [],
        byLang: {
          cs: {
            contextual: contextualCs,
            alternatives: []
          },
          en: {
            contextual: contextualEn,
            alternatives: []
          }
        }
      },
      sandhiSplits,
      derivationTree,
      externalDictionaryLinks: dictLinks
    };
  }

  analyzeMeter(verseText: string, specifiedMeter?: string, lang: SupportedLanguage = 'cs'): VerseMeterResult {
    const analysis = detectVerseMeter(verseText, specifiedMeter, lang);

    return {
      meterName: analysis.meterName,
      totalSyllables: analysis.totalAksharas,
      isClassical: analysis.isClassicalAnushtubh,
      notes: analysis.notes,
      padas: analysis.padas.map((p) => ({
        padaIndex: p.padaIndex,
        syllableCount: p.syllableCount,
        pattern: p.pattern,
        syllables: p.aksharas.map((a): MeterSyllable => ({
          text: a.deva,
          translit: a.iast,
          weight: a.weight,
          weightLabel: a.weightLabel || a.weightLabelCs
        }))
      }))
    };
  }

  splitCompounds(phrase: string): Array<{ first: string; second: string; isValid: boolean }> {
    const splits = splitSandhiWasm(phrase);
    return splits.map((s) => ({
      first: s.firstIast,
      second: s.secondIast,
      isValid: s.isValid
    }));
  }
}

/** Global singleton instance */
export const defaultSanskritAdapter = new SanskritLanguageAdapter();
