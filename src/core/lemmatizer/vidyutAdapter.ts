/**
 * Vidyut WebAssembly Adapter & Integration Layer
 * 
 * Powered by Ambuda Vidyut (https://github.com/ambuda-org/vidyut)
 * Copyright (c) 2022 ambuda.org (Arun Prasad and Ambuda Project contributors)
 * Licensed under the MIT License.
 */

import { devanagariToIast, iastToDevanagari, registerVidyutTransliterator } from '../transliteration/engine.ts';
import { analyzeSanskritWord, MorphAnalysis } from './sanskritLemmatizer.ts';
import { SupportedLanguage } from '../i18n/types.ts';
import { getMeterWeightLabel } from '../i18n/linguistics/index.ts';

export const VIDYUT_METADATA = {
  name: 'Vidyut (विद्युत्)',
  version: '0.3.0',
  license: 'MIT',
  author: 'Arun Prasad & Ambuda Project (https://ambuda.org)',
  repository: 'https://github.com/ambuda-org/vidyut',
  wasmPackage: '@siva-sh/vidyut',
  description: 'High-performance Sanskrit linguistic infrastructure in Rust compiled to WebAssembly (Pāṇinian derivation, sandhi splitting, metrical analysis, transliteration).'
};

export interface SandhiDecomposition {
  firstIast: string;
  secondIast: string;
  firstDeva: string;
  secondDeva: string;
  kind: 'prefix' | 'standard';
  isValid: boolean;
}

export interface MeterAksharaInfo {
  text: string;
  deva: string;
  iast: string;
  devanagari?: string;
  weight: 'G' | 'L'; // Guru (heavy) or Laghu (light)
  weightLabelCs: string;
  weightLabel?: string;
}

export interface VerseMeterAnalysis {
  meter?: string;
  meterName: string;
  matchType: string;
  totalAksharas: number;
  aksharas: MeterAksharaInfo[];
  notes?: string;
  padas: {
    padaIndex: number;
    aksharas: MeterAksharaInfo[];
    syllableCount: number;
    pattern: string; // e.g. "— — ∪ ∪ — ∪ ∪ —"
  }[];
  isClassicalAnushtubh: boolean;
}

export interface PrakriyaStepInfo {
  stepNumber: number;
  ruleCode: string;
  ruleSource: string;
  sutraUrl: string;
  url?: string;
  termsText: string;
  termsDeva: string;
  termsIast: string;
}

export interface PrakriyaDerivationResult {
  targetText: string;
  targetDeva: string;
  targetIast: string;
  targetTerm?: string;
  stemOrRoot: string;
  category: 'subanta' | 'tinanta';
  linguisticNotes: {
    type: string;
    pratipadikaOrDhatu: string;
    padaOrGana?: string;
    caseOrLakara?: string;
    numberOrVacana?: string;
    genderOrPrayoga?: string;
  };
  steps: PrakriyaStepInfo[];
  prakriyaSteps?: PrakriyaStepInfo[];
}

export interface VidyutAnalysisResult {
  source: 'vidyut_wasm' | 'morph_rules' | 'hybrid';
  analyses: MorphAnalysis[];
  sandhiSplits?: SandhiDecomposition[];
  meterInfo?: {
    name: string | null;
    aksharas: MeterAksharaInfo[];
  };
  prakriyaTree?: PrakriyaDerivationResult;
  attribution: typeof VIDYUT_METADATA;
}

// Vidyut WASM module instance and loaded state
let vidyutModule: any = null;
let isVidyutLoading = false;
let vidyutLoadError: Error | null = null;

/**
 * Asynchronously initialize the Vidyut WebAssembly module.
 * Safe to call multiple times; memoizes the promise.
 */
export async function loadVidyutWasm(): Promise<any> {
  if (vidyutModule) return vidyutModule;
  if (vidyutLoadError) throw vidyutLoadError;

  if (isVidyutLoading) {
    while (isVidyutLoading) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (vidyutModule) return vidyutModule;
    if (vidyutLoadError) throw vidyutLoadError;
  }

  isVidyutLoading = true;
  try {
    const vidyut = await import('@siva-sh/vidyut');
    
    const isNodeEnv = typeof process !== 'undefined' && Boolean(process.versions?.node);
    if (isNodeEnv) {
      const { readFile } = await import('node:fs/promises');
      const wasmUrl = (await import('@siva-sh/vidyut/wasm-url')).default;
      const wasmBuffer = await readFile(wasmUrl);
      await vidyut.default({ module_or_path: wasmBuffer });
    } else {
      await vidyut.default();
    }

    vidyutModule = vidyut;
    isVidyutLoading = false;

    // Register high-performance vidyut-lipi transliterator as preferred engine
    registerVidyutTransliterator((deva: string) => {
      return transliterateLipi(deva, 'devanagari', 'iast');
    });

    return vidyut;
  } catch (err: any) {
    vidyutLoadError = err;
    isVidyutLoading = false;
    console.warn('[Vidyut WASM] Failed to load WebAssembly, using local rule fallback:', err);
    throw err;
  }
}

/**
 * Check if Vidyut WebAssembly module is currently ready.
 */
export function isVidyutReady(): boolean {
  return vidyutModule !== null;
}

/**
 * Map friendly scheme string to Vidyut Scheme enum
 */
function toVidyutScheme(scheme: string): any {
  if (!vidyutModule) return null;
  const { Scheme } = vidyutModule;
  const s = String(scheme).toLowerCase();
  switch (s) {
    case 'devanagari':
    case 'deva': return Scheme.Devanagari;
    case 'iast': return Scheme.Iast;
    case 'slp1': return Scheme.Slp1;
    case 'hk':
    case 'harvardkyoto': return Scheme.HarvardKyoto;
    default: return Scheme.Iast;
  }
}

/**
 * Fast WebAssembly transliteration using vidyut-lipi
 */
export function transliterateLipi(
  input: string,
  from: string,
  to: string
): string {
  if (!input) return '';
  const toL = String(to).toLowerCase();

  if (!vidyutModule) {
    if (toL === 'devanagari' || toL === 'deva') {
      return iastToDevanagari(input);
    }
    return devanagariToIast(input);
  }

  try {
    const fromScheme = toVidyutScheme(from);
    const toScheme = toVidyutScheme(to);
    return vidyutModule.transliterate(input, fromScheme, toScheme);
  } catch (_e) {
    if (toL === 'devanagari' || toL === 'deva') {
      return iastToDevanagari(input);
    }
    return devanagariToIast(input);
  }
}

/**
 * Akṣara segmentation and syllabification using vidyut-akshara / Chandas
 */
export function segmentAksharas(input: string, lang: SupportedLanguage = 'cs'): MeterAksharaInfo[] {
  if (!input) return [];
  if (!vidyutModule) return [];

  try {
    const { Chandas, Scheme, transliterate } = vidyutModule;
    const isDeva = /[\u0900-\u097F]/.test(input);
    const rawSlp1 = transliterate(input, isDeva ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);
    const slp1 = rawSlp1.replace(/[^a-zA-Z~\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!slp1) return [];

    const chandas = new Chandas();
    try {
      const res = chandas.classify(slp1);
      const aksharas: MeterAksharaInfo[] = [];

      if (res.aksharas) {
        for (const pada of res.aksharas) {
          for (const ak of pada) {
            const deva = transliterate(ak.text, Scheme.Slp1, Scheme.Devanagari);
            const iast = transliterate(ak.text, Scheme.Slp1, Scheme.Iast);
            const weightLabel = getMeterWeightLabel(ak.weight, lang);
            aksharas.push({
              text: ak.text,
              deva,
              iast,
              devanagari: deva,
              weight: ak.weight,
              weightLabelCs: ak.weight === 'G' ? 'guru (dlouhá/těžká —)' : 'laghu (krátká/lehká ∪)',
              weightLabel
            });
          }
        }
      }
      return aksharas;
    } finally {
      chandas.free();
    }
  } catch (e) {
    return [];
  }
}

/**
 * Split Sandhi of a word or phrase using Vidyut WebAssembly
 */
export function splitSandhiWasm(wordIast: string): SandhiDecomposition[] {
  if (!vidyutModule) return [];

  try {
    const { Sandhi, Scheme, transliterate } = vidyutModule;
    const sandhi = new Sandhi();
    try {
      const slp1 = transliterate(wordIast, Scheme.Iast, Scheme.Slp1);
      const rawSplits = sandhi.splitAll(slp1);

      const results: SandhiDecomposition[] = [];
      const seen = new Set<string>();

      for (const split of rawSplits) {
        if (!split.isValid || !split.first || !split.second) continue;

        const firstIast = transliterate(split.first, Scheme.Slp1, Scheme.Iast);
        const secondIast = transliterate(split.second, Scheme.Slp1, Scheme.Iast);
        const key = `${firstIast}+${secondIast}`;

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            firstIast,
            secondIast,
            firstDeva: transliterate(split.first, Scheme.Slp1, Scheme.Devanagari),
            secondDeva: transliterate(split.second, Scheme.Slp1, Scheme.Devanagari),
            kind: split.kind,
            isValid: split.isValid
          });
        }
      }

      return results;
    } finally {
      sandhi.free();
    }
  } catch (e) {
    console.warn('[Vidyut WASM] Sandhi split error:', e);
    return [];
  }
}

/**
 * Classify metrical structure (Chandas) and akṣara weights using Vidyut WASM
 */
export function classifyMeterWasm(verseIast: string, lang: SupportedLanguage = 'cs'): { name: string | null; aksharas: MeterAksharaInfo[] } | null {
  if (!vidyutModule) return null;

  try {
    const { Chandas, Scheme, transliterate } = vidyutModule;
    const isDeva = /[\u0900-\u097F]/.test(verseIast);
    const rawSlp1 = transliterate(verseIast, isDeva ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);
    const slp1 = rawSlp1.replace(/[^a-zA-Z~\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!slp1) return null;

    const chandas = new Chandas();
    try {
      const classification = chandas.classify(slp1);

      const flatAksharas: MeterAksharaInfo[] = [];
      if (classification.aksharas) {
        for (const pada of classification.aksharas) {
          for (const ak of pada) {
            const deva = transliterate(ak.text, Scheme.Slp1, Scheme.Devanagari);
            const iast = transliterate(ak.text, Scheme.Slp1, Scheme.Iast);
            const weightLabel = getMeterWeightLabel(ak.weight, lang);
            flatAksharas.push({
              text: ak.text,
              deva,
              iast,
              devanagari: deva,
              weight: ak.weight,
              weightLabelCs: ak.weight === 'G' ? 'guru (dlouhá/těžká —)' : 'laghu (krátká/lehká ∪)',
              weightLabel
            });
          }
        }
      }

      return {
        name: classification.name,
        aksharas: flatAksharas
      };
    } finally {
      chandas.free();
    }
  } catch (e) {
    console.warn('[Vidyut WASM] Chandas classify error:', e);
    return null;
  }
}

/**
 * Detect verse meter across pādas and analyze rhythmic structure
 */
export function detectVerseMeter(verseText: string, specifiedMeter?: string, lang: SupportedLanguage = 'cs'): VerseMeterAnalysis {
  const isDeva = /[\u0900-\u097F]/.test(verseText);
  const cleanIast = isDeva ? devanagariToIast(verseText) : verseText;

  // Split into pādas (by newline, danda, double-danda, semicolon)
  const lines = cleanIast
    .split(/[\n\r।॥|;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawPadas = lines.length > 0 ? lines : [cleanIast];
  const padasOutput: VerseMeterAnalysis['padas'] = [];
  let totalAksharas = 0;
  let detectedName: string | null = null;
  const allAksharas: MeterAksharaInfo[] = [];

  for (let idx = 0; idx < rawPadas.length; idx++) {
    const padaLine = rawPadas[idx];
    const aksharas = segmentAksharas(padaLine, lang);
    totalAksharas += aksharas.length;
    allAksharas.push(...aksharas);

    const pattern = aksharas.map((a) => (a.weight === 'G' ? '—' : '∪')).join(' ');
    const isSpeakerTag = idx === 0 && /\b(uvāca|uvācur|ūcuḥ|abravīt|उवाच|ऊचुः|अब्रवीत्)\b/i.test(padaLine);

    if (!detectedName && vidyutModule && !isSpeakerTag) {
      const meterRes = classifyMeterWasm(padaLine, lang);
      if (meterRes?.name) detectedName = meterRes.name;
    }

    padasOutput.push({
      padaIndex: idx + 1,
      aksharas,
      syllableCount: aksharas.length,
      pattern
    });
  }

  const isSpeakerTagFirst = rawPadas.length > 1 && /\b(uvāca|uvācur|ūcuḥ|abravīt|उवाच|ऊचुः|अब्रवीत्)\b/i.test(rawPadas[0]);
  const metricalPadas = isSpeakerTagFirst ? padasOutput.slice(1) : padasOutput;
  const metricalAksharas = metricalPadas.reduce((sum, p) => sum + p.syllableCount, 0);

  const isAnushtubh =
    metricalAksharas === 32 ||
    totalAksharas === 32 ||
    (metricalPadas.length === 4 && metricalPadas.every((p) => Math.abs(p.syllableCount - 8) <= 2)) ||
    (metricalPadas.length === 2 && metricalPadas.every((p) => Math.abs(p.syllableCount - 16) <= 3));

  let finalName = specifiedMeter;
  let notes = '';
  const isEn = lang === 'en';
  if (specifiedMeter) {
    notes = isEn ? 'User specified' : 'Nastaveno uživatelem';
  } else {
    if (isAnushtubh) {
      finalName = isEn ? 'Anuṣṭubh (Śloka – 4 × 8 syllables)' : 'Anuṣṭubh (Śloka – 4 × 8 slabik)';
      notes = isEn
        ? (isSpeakerTagFirst ? 'Introductory speech + classical epic Anuṣṭubh meter' : 'Detected classical epic Anuṣṭubh meter')
        : (isSpeakerTagFirst ? 'Uvedení mluvčího + klasické epické metrum Anuṣṭubh' : 'Detekováno klasické epické metrum Anuṣṭubh');
    } else if (detectedName) {
      finalName = `${detectedName}`;
      notes = isEn ? `Exact match from Vidyut Chandas: ${detectedName}` : `Přesná shoda z databáze Vidyut Chandas: ${detectedName}`;
    } else if (metricalAksharas === 44 || totalAksharas === 44) {
      finalName = isEn ? 'Triṣṭubh (4 × 11 syllables)' : 'Triṣṭubh (4 × 11 slabik)';
      notes = isEn ? 'Vedic / classical Triṣṭubh meter' : 'Védské / klasické metrum Triṣṭubh';
    } else if (metricalAksharas < 20 && totalAksharas < 20) {
      finalName = isEn ? 'Sūtra (aphorism / prose meter)' : 'Sūtra (aforismus / prozaické metrum)';
      notes = isEn ? 'Aphoristic length (< 20 syllables)' : 'Aforistický rozsah (méně než 20 slabik)';
    } else {
      finalName = isEn ? `Rhythmic verse (${metricalAksharas} syllables)` : `Rytmický verš (${metricalAksharas} slabik)`;
      notes = isEn ? 'Free metrical structure' : 'Volná metrická struktura';
    }
  }

  const unspecified = isEn ? 'Unspecified' : 'Nespecifikováno';

  return {
    meter: finalName || unspecified,
    meterName: finalName || unspecified,
    matchType: specifiedMeter ? 'user_override' : (detectedName ? 'exact' : (isAnushtubh ? 'heuristics' : 'free')),
    totalAksharas,
    aksharas: allAksharas,
    padas: padasOutput,
    isClassicalAnushtubh: isAnushtubh,
    notes
  };
}

/**
 * Pāṇinian derivation tree generator from vidyut-prakriya
 */
export function derivePrakriyaTree(
  wordOrLemma: string,
  options?: {
    pos?: 'noun' | 'verb';
    stem?: string;
    gender?: string;
    linga?: string;
    case?: string;
    vibhakti?: string;
    number?: string;
    vacana?: string;
    root?: string;
    gana?: string;
  }
): PrakriyaDerivationResult | null {
  if (!vidyutModule) return null;

  try {
    const { Vyakarana, Scheme, transliterate } = vidyutModule;
    const vyakarana = new Vyakarana();

    try {
      const cleanInput = wordOrLemma.trim().replace(/^√/, '');
      const isDeva = /[\u0900-\u097F]/.test(cleanInput);
      const slp1 = transliterate(cleanInput, isDeva ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);

      // Check verbal derivation first if specified or root starts with √
      if (options?.pos === 'verb' || options?.root) {
        const rootSlp1 = options.root ? transliterate(options.root.replace(/^√/, ''), Scheme.Iast, Scheme.Slp1) : slp1;
        const tinantas = vyakarana.deriveTinantas({
          dhatu: {
            aupadeshika: rootSlp1,
            gana: (options.gana as any) || 'Bhvadi',
            prefixes: [],
            sanadi: []
          },
          lakara: 'Lat',
          prayoga: 'Kartari',
          purusha: 'Prathama',
          vacana: 'Eka',
          skip_at_agama: false
        });

        if (tinantas && tinantas.length > 0) {
          const res = tinantas[0];
          return formatPrakriyaOutput(res, cleanInput, 'tinanta', {
            type: 'slovesný tvar (tiṅanta)',
            pratipadikaOrDhatu: `kořen √${cleanInput}`,
            padaOrGana: options.gana || 'Bhvadi gaṇa (1. třída)',
            caseOrLakara: 'Laṭ (prézens indikativ)',
            numberOrVacana: 'Eka (jednotné číslo)',
            genderOrPrayoga: 'Kartari (činný rod / aktívum)'
          });
        }
      }

      // Default: Subanta (nominal derivation)
      const g = (options?.gender || options?.linga || '').toLowerCase();
      const linga = (g === 'feminine' || g === 'stri') ? 'Stri' : ((g === 'neuter' || g === 'napumsaka') ? 'Napumsaka' : 'Pum');

      const c = (options?.case || options?.vibhakti || '').toLowerCase();
      const vibhaktiMap: Record<string, string> = {
        nominative: 'Prathama', '1': 'Prathama', prathama: 'Prathama',
        accusative: 'Dvitiya', '2': 'Dvitiya', dvitiya: 'Dvitiya',
        instrumental: 'Trtiya', '3': 'Trtiya', trtiya: 'Trtiya',
        dative: 'Caturthi', '4': 'Caturthi', caturthi: 'Caturthi',
        ablative: 'Panchami', '5': 'Panchami', panchami: 'Panchami',
        genitive: 'Sasthi', '6': 'Sasthi', sasthi: 'Sasthi',
        locative: 'Saptami', '7': 'Saptami', saptami: 'Saptami',
        vocative: 'Sambodhana', '8': 'Sambodhana', sambodhana: 'Sambodhana'
      };
      const vibhakti = (c && vibhaktiMap[c]) ? vibhaktiMap[c] : 'Sasthi';

      const n = (options?.number || options?.vacana || '').toLowerCase();
      const vacana = (n === 'plural' || n === 'bahu') ? 'Bahu' : ((n === 'dual' || n === 'dvi') ? 'Dvi' : 'Eka');

      const stemSlp1 = options?.stem ? transliterate(options.stem, Scheme.Iast, Scheme.Slp1) : slp1;
      const subantas = vyakarana.deriveSubantas({
        pratipadika: { basic: stemSlp1 },
        linga: linga as any,
        vibhakti: vibhakti as any,
        vacana: vacana as any
      });

      if (subantas && subantas.length > 0) {
        const res = subantas[0];
        return formatPrakriyaOutput(res, cleanInput, 'subanta', {
          type: 'jmenný tvar (subanta)',
          pratipadikaOrDhatu: `kmen ${cleanInput}`,
          caseOrLakara: `${vibhakti} (pád)`,
          numberOrVacana: `${vacana} (číslo)`,
          genderOrPrayoga: `${linga} (rod)`
        });
      }

      return null;
    } finally {
      vyakarana.free();
    }
  } catch (e) {
    return null;
  }
}

function formatPrakriyaOutput(
  prakriya: any,
  stemOrRoot: string,
  category: 'subanta' | 'tinanta',
  notes: any
): PrakriyaDerivationResult {
  const { Scheme, transliterate } = vidyutModule;
  const targetText = prakriya.text;
  const targetIast = transliterate(targetText, Scheme.Slp1, Scheme.Iast);
  const targetDeva = transliterate(targetText, Scheme.Slp1, Scheme.Devanagari);

  const steps: PrakriyaStepInfo[] = (prakriya.history || []).map((step: any, idx: number) => {
    const termsJoined = (step.result || []).map((r: any) => r.text).join(' + ');
    const code = step.rule?.code || 'sūtra';
    return {
      stepNumber: idx + 1,
      ruleCode: code,
      ruleSource: step.rule?.source || 'Aṣṭādhyāyī',
      sutraUrl: `https://ashtadhyayi.com/sutra/${encodeURIComponent(code)}`,
      url: `https://ashtadhyayi.com/sutra/${encodeURIComponent(code)}`,
      termsText: termsJoined,
      termsDeva: transliterate(termsJoined, Scheme.Slp1, Scheme.Devanagari),
      termsIast: transliterate(termsJoined, Scheme.Slp1, Scheme.Iast)
    };
  });

  return {
    targetText,
    targetDeva,
    targetIast,
    targetTerm: targetIast,
    stemOrRoot,
    category,
    linguisticNotes: notes,
    steps,
    prakriyaSteps: steps
  };
}

/**
 * Unified Sanskrit lemmatizer and morphological analysis.
 * Combines Vidyut WASM capabilities with local offline rule base.
 */
export async function analyzeSanskritWordFull(query: string): Promise<VidyutAnalysisResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      source: 'morph_rules',
      analyses: [],
      attribution: VIDYUT_METADATA
    };
  }

  // 1. Convert query to standard IAST
  const isDeva = /[\u0900-\u097F]/.test(trimmed);
  const iast = isDeva ? devanagariToIast(trimmed).toLowerCase() : trimmed.toLowerCase();

  // 2. Local rule-based morphological analysis
  const baseAnalyses = analyzeSanskritWord(iast);

  // 3. Try enriching with Vidyut WASM if available
  let sandhiSplits: SandhiDecomposition[] | undefined = undefined;
  let meterInfo: { name: string | null; aksharas: MeterAksharaInfo[] } | undefined = undefined;
  let prakriyaTree: PrakriyaDerivationResult | undefined = undefined;
  let source: 'vidyut_wasm' | 'morph_rules' | 'hybrid' = 'morph_rules';

  try {
    if (!vidyutModule) {
      await loadVidyutWasm();
    }

    if (vidyutModule) {
      source = 'hybrid';
      // Compute Sandhi splits
      const splits = splitSandhiWasm(iast);
      if (splits.length > 0) {
        sandhiSplits = splits.slice(0, 8); // Top 8 valid splits
      }

      // Compute Chandas akṣaras
      const meter = classifyMeterWasm(iast);
      if (meter && meter.aksharas.length > 0) {
        meterInfo = meter;
      }

      // Try deriving Paninian derivation tree for first analysis
      const first = baseAnalyses[0];
      const derivation = derivePrakriyaTree(first?.lemma || iast, {
        pos: first?.pos === 'verb' ? 'verb' : 'noun',
        gender: first?.gender,
        case: first?.case,
        number: first?.number,
        root: first?.root
      });

      if (derivation) {
        prakriyaTree = derivation;
      }
    }
  } catch (err) {
    source = 'morph_rules';
  }

  return {
    source,
    analyses: baseAnalyses,
    sandhiSplits,
    meterInfo,
    prakriyaTree,
    attribution: VIDYUT_METADATA
  };
}
