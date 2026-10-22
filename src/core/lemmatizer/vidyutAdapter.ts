/**
 * Vidyut WebAssembly Adapter & Integration Layer
 *
 * Powered by Ambuda Vidyut (https://github.com/ambuda-org/vidyut)
 * Copyright (c) 2022 ambuda.org (Arun Prasad and Ambuda Project contributors)
 * Licensed under the MIT License.
 */

import {
  devanagariToIast,
  iastToCzechPhonetic,
  normalizeSchemeId,
  registerVidyutTransliterator,
  transliterateTable
} from '../transliteration/engine.ts';
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

export type MorphemeRole = 'prefix' | 'root' | 'stem' | 'vikarana' | 'ending' | 'suffix';

/**
 * One morpheme of a Pāṇinian derivation: its original teaching form (upadeśa),
 * the intermediate forms it passed through and its final surface form.
 */
export interface DerivationMorpheme {
  role: MorphemeRole;
  /** Localized role description, e.g. "kořen (dhātu)" */
  label: string;
  /** Upadeśa form in IAST without it-marker notation, e.g. "śap", "laṭ", "bhū" */
  upadesha: string;
  /** All distinct forms in order, e.g. ["laṭ", "l", "tip", "ti"] */
  forms: string[];
  /** Final surface form in IAST, e.g. "a", "ti" */
  surface: string;
  surfaceDeva: string;
  /** Code of the rule that introduced the morpheme */
  introducedBy: string;
}

export interface PrakriyaDerivationResult {
  /** Morphological structure (prefixes, root/stem, suffixes, ending) extracted from the derivation */
  morphemes?: DerivationMorpheme[];
  /** True when the derivation reproduces the analyzed word (set by analyzeSanskritWordFull) */
  verified?: boolean;
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

export interface MeterClassification {
  /** Meter name in IAST (e.g. "Śārdūlavikrīḍita"), null if unknown */
  name: string | null;
  /** Raw SLP1 name as returned by vidyut-chandas */
  rawName: string | null;
  matchType: 'none' | 'prefix' | 'pada' | 'full';
  aksharas: MeterAksharaInfo[];
}

/** Devanagari letters and signs – excludes daṇḍas (U+0964/5) and digits, which IAST texts use too. */
const DEVANAGARI_LETTER = /[\u0900-\u0963\u0971-\u097F]/;

// Vidyut WASM module instance and loaded state
let vidyutModule: any = null;
let vidyutLoadPromise: Promise<any> | null = null;
let vidyutLoadError: Error | null = null;

/**
 * Asynchronously initialize the Vidyut WebAssembly module.
 * Safe to call multiple times and concurrently; all callers share one load.
 */
export async function loadVidyutWasm(): Promise<any> {
  if (vidyutModule) return vidyutModule;
  if (vidyutLoadError) throw vidyutLoadError;
  if (vidyutLoadPromise) return vidyutLoadPromise;

  vidyutLoadPromise = (async () => {
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

      // Register high-performance vidyut-lipi transliterator as preferred engine.
      // Calls the module directly so a failure can fall back to the tables without recursion.
      registerVidyutTransliterator((deva: string) =>
        vidyut.transliterate(deva, vidyut.Scheme.Devanagari, vidyut.Scheme.Iast)
      );

      return vidyut;
    } catch (err: any) {
      vidyutLoadError = err instanceof Error ? err : new Error(String(err));
      console.warn('[Vidyut WASM] Failed to load WebAssembly, using local rule fallback:', err);
      throw vidyutLoadError;
    } finally {
      vidyutLoadPromise = null;
    }
  })();

  return vidyutLoadPromise;
}

/**
 * Check if Vidyut WebAssembly module is currently ready.
 */
export function isVidyutReady(): boolean {
  return vidyutModule !== null;
}

/**
 * Map friendly scheme string to Vidyut Scheme enum (null when unsupported).
 */
function toVidyutScheme(scheme: string): any {
  if (!vidyutModule) return null;
  const { Scheme } = vidyutModule;
  switch (normalizeSchemeId(scheme)) {
    case 'devanagari': return Scheme.Devanagari;
    case 'iast': return Scheme.Iast;
    case 'slp1': return Scheme.Slp1;
    case 'hk': return Scheme.HarvardKyoto;
    case 'iso15919': return Scheme.Iso15919;
    case 'itrans': return Scheme.Itrans;
    case 'velthuis': return Scheme.Velthuis;
    case 'wx': return Scheme.Wx;
    default: return null;
  }
}

/**
 * Fast WebAssembly transliteration using vidyut-lipi, with table-based fallback.
 * Accepts scheme names case-insensitively ('Devanagari', 'iast', 'hk', 'harvard_kyoto',
 * 'slp1', 'iso15919', 'itrans', 'velthuis', 'wx') and 'cs_phonetic' as a target.
 */
export function transliterateLipi(
  input: string,
  from: string,
  to: string
): string {
  if (!input) return '';

  if (normalizeSchemeId(to) === 'cs_phonetic') {
    return iastToCzechPhonetic(transliterateLipi(input, from, 'iast'));
  }

  const fromScheme = toVidyutScheme(from);
  const toScheme = toVidyutScheme(to);
  if (vidyutModule && fromScheme !== null && toScheme !== null) {
    try {
      return vidyutModule.transliterate(input, fromScheme, toScheme);
    } catch {
      // fall through to the table engine
    }
  }

  return transliterateTable(input, from, to);
}

function toSlp1ForChandas(input: string): string {
  const { Scheme, transliterate } = vidyutModule;
  const isDeva = DEVANAGARI_LETTER.test(input);
  const rawSlp1 = transliterate(input, isDeva ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);
  // Keep line breaks (pāda boundaries) but drop digits, dandas and punctuation
  return rawSlp1
    .split('\n')
    .map((line: string) => line.replace(/[^a-zA-Z~\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line: string) => line.length > 0)
    .join('\n');
}

function toAksharaInfo(ak: { text: string; weight: 'G' | 'L' }, lang: SupportedLanguage): MeterAksharaInfo {
  const { Scheme, transliterate } = vidyutModule;
  const deva = transliterate(ak.text, Scheme.Slp1, Scheme.Devanagari);
  return {
    text: ak.text,
    deva,
    iast: transliterate(ak.text, Scheme.Slp1, Scheme.Iast),
    devanagari: deva,
    weight: ak.weight,
    weightLabelCs: ak.weight === 'G' ? 'guru (dlouhá/těžká —)' : 'laghu (krátká/lehká ∪)',
    weightLabel: getMeterWeightLabel(ak.weight, lang)
  };
}

/**
 * Converts an SLP1 meter name from vidyut-chandas ("SArdUlavikrIqita") to capitalized IAST.
 */
export function formatMeterName(slp1Name: string | null | undefined): string | null {
  if (!slp1Name) return null;
  const iast = vidyutModule
    ? vidyutModule.transliterate(slp1Name, vidyutModule.Scheme.Slp1, vidyutModule.Scheme.Iast)
    : transliterateTable(slp1Name, 'slp1', 'iast');
  return iast.charAt(0).toUpperCase() + iast.slice(1);
}

/**
 * Akṣara segmentation and syllabification using vidyut-akshara / Chandas
 */
export function segmentAksharas(input: string, lang: SupportedLanguage = 'cs'): MeterAksharaInfo[] {
  if (!input || !vidyutModule) return [];

  try {
    const slp1 = toSlp1ForChandas(input);
    if (!slp1) return [];

    const chandas = new vidyutModule.Chandas();
    try {
      const res = chandas.classify(slp1);
      const aksharas: MeterAksharaInfo[] = [];
      for (const pada of res.aksharas || []) {
        for (const ak of pada) aksharas.push(toAksharaInfo(ak, lang));
      }
      return aksharas;
    } finally {
      chandas.free();
    }
  } catch {
    return [];
  }
}

let sharedSandhi: any = null;

/**
 * All two-way cuts of an SLP1 string with the sandhi reversed (raw Vidyut output, valid
 * splits only). Used by the compound segmenter, which calls it many times per word, so
 * one splitter instance is reused.
 */
export function splitSandhiSlp1(slp1: string): Array<{ first: string; second: string }> {
  if (!vidyutModule) return [];
  try {
    if (!sharedSandhi) sharedSandhi = new vidyutModule.Sandhi();
    const out: Array<{ first: string; second: string }> = [];
    for (const split of sharedSandhi.splitAll(slp1)) {
      if (split.isValid && split.first && split.second) out.push({ first: split.first, second: split.second });
    }
    return out;
  } catch (e) {
    console.warn('[Vidyut WASM] Sandhi split error:', e);
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
 * Classify metrical structure (Chandas) and akṣara weights using Vidyut WASM.
 * Line breaks in the input are treated as pāda boundaries.
 */
export function classifyMeterWasm(verseText: string, lang: SupportedLanguage = 'cs'): MeterClassification | null {
  if (!vidyutModule) return null;

  try {
    const slp1 = toSlp1ForChandas(verseText);
    if (!slp1) return null;

    const chandas = new vidyutModule.Chandas();
    try {
      const classification = chandas.classify(slp1);
      const flatAksharas: MeterAksharaInfo[] = [];
      for (const pada of classification.aksharas || []) {
        for (const ak of pada) flatAksharas.push(toAksharaInfo(ak, lang));
      }

      return {
        name: formatMeterName(classification.name),
        rawName: classification.name ?? null,
        matchType: classification.matchType || (classification.name ? 'full' : 'none'),
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

const SPEAKER_TAG = /(^|\s)(uvāca|uvācur|ūcuḥ|abravīt|उवाच|ऊचुः|अब्रवीत्)(\s|$)/i;

/**
 * Detect verse meter across pādas and analyze rhythmic structure.
 *
 * Order of evidence: user override → full Vidyut Chandas match of the whole verse →
 * Anuṣṭubh (śloka) heuristics → syllable-count families (Triṣṭubh, Jagatī, Gāyatrī) →
 * pāda-level Vidyut match → sūtra / free rhythm.
 */
export function detectVerseMeter(verseText: string, specifiedMeter?: string, lang: SupportedLanguage = 'cs'): VerseMeterAnalysis {
  // Split into pādas on the original text (by newline, danda, double-danda, semicolon) –
  // transliteration may turn dandas into periods. Segments without letters, such as verse
  // numbers between double dandas ("॥ 2.47 ॥"), are dropped.
  const lines = verseText
    .split(/[\n\r।॥|;]+/)
    .map((l) => l.trim())
    .map((l) => (DEVANAGARI_LETTER.test(l) ? devanagariToIast(l) : l))
    .filter((l) => /\p{L}/u.test(l));

  const rawPadas = lines.length > 0 ? lines : [verseText];
  const padasOutput: VerseMeterAnalysis['padas'] = [];
  let totalAksharas = 0;
  const allAksharas: MeterAksharaInfo[] = [];

  for (let idx = 0; idx < rawPadas.length; idx++) {
    const aksharas = segmentAksharas(rawPadas[idx], lang);
    totalAksharas += aksharas.length;
    allAksharas.push(...aksharas);

    padasOutput.push({
      padaIndex: idx + 1,
      aksharas,
      syllableCount: aksharas.length,
      pattern: aksharas.map((a) => (a.weight === 'G' ? '—' : '∪')).join(' ')
    });
  }

  const isSpeakerTagFirst = rawPadas.length > 1 && SPEAKER_TAG.test(rawPadas[0]);
  const metricalLines = isSpeakerTagFirst ? rawPadas.slice(1) : rawPadas;
  const metricalPadas = isSpeakerTagFirst ? padasOutput.slice(1) : padasOutput;
  const metricalAksharas = metricalPadas.reduce((sum, p) => sum + p.syllableCount, 0);
  const counts = metricalPadas.map((p) => p.syllableCount);
  const allNear = (target: number, tolerance: number) => counts.every((c) => Math.abs(c - target) <= tolerance);

  // Vidyut Chandas: whole verse first, then individual pādas
  let fullMatchName: string | null = null;
  let padaMatchName: string | null = null;
  if (vidyutModule && !specifiedMeter) {
    const whole = classifyMeterWasm(metricalLines.join('\n'), lang);
    if (whole?.name && whole.matchType === 'full') {
      fullMatchName = whole.name;
    } else if (whole?.name) {
      padaMatchName = whole.name;
    }
    for (let i = 0; !fullMatchName && !padaMatchName && i < metricalLines.length; i++) {
      const res = classifyMeterWasm(metricalLines[i], lang);
      if (res?.name) padaMatchName = res.name;
    }
  }

  const isAnushtubh =
    metricalAksharas === 32 ||
    (metricalPadas.length === 4 && allNear(8, 2)) ||
    (metricalPadas.length === 2 && allNear(16, 3));
  const isTristubh = metricalAksharas === 44 || (metricalPadas.length === 4 && allNear(11, 1)) || (metricalPadas.length === 2 && allNear(22, 1));
  const isJagati = metricalAksharas === 48 || (metricalPadas.length === 4 && allNear(12, 1)) || (metricalPadas.length === 2 && allNear(24, 1));
  const isGayatri = metricalAksharas === 24 || (metricalPadas.length === 3 && allNear(8, 1));

  const isEn = lang === 'en';
  let finalName = specifiedMeter;
  let notes = '';
  let matchType = 'free';

  if (specifiedMeter) {
    notes = isEn ? 'User specified' : 'Nastaveno uživatelem';
    matchType = 'user_override';
  } else if (fullMatchName) {
    finalName = fullMatchName;
    notes = isEn ? `Exact match from Vidyut Chandas: ${fullMatchName}` : `Přesná shoda z databáze Vidyut Chandas: ${fullMatchName}`;
    matchType = 'exact';
  } else if (isAnushtubh) {
    finalName = isEn ? 'Anuṣṭubh (Śloka – 4 × 8 syllables)' : 'Anuṣṭubh (Śloka – 4 × 8 slabik)';
    notes = isEn
      ? (isSpeakerTagFirst ? 'Introductory speech + classical epic Anuṣṭubh meter' : 'Detected classical epic Anuṣṭubh meter')
      : (isSpeakerTagFirst ? 'Uvedení mluvčího + klasické epické metrum Anuṣṭubh' : 'Detekováno klasické epické metrum Anuṣṭubh');
    matchType = 'heuristics';
  } else if (isTristubh) {
    finalName = isEn ? 'Triṣṭubh (4 × 11 syllables)' : 'Triṣṭubh (4 × 11 slabik)';
    notes = isEn ? 'Vedic / classical Triṣṭubh meter' : 'Védské / klasické metrum Triṣṭubh';
    if (padaMatchName) notes += isEn ? ` (pāda pattern: ${padaMatchName})` : ` (vzorec pády: ${padaMatchName})`;
    matchType = 'heuristics';
  } else if (isJagati) {
    finalName = isEn ? 'Jagatī (4 × 12 syllables)' : 'Jagatī (4 × 12 slabik)';
    notes = isEn ? 'Vedic / classical Jagatī meter' : 'Védské / klasické metrum Jagatī';
    if (padaMatchName) notes += isEn ? ` (pāda pattern: ${padaMatchName})` : ` (vzorec pády: ${padaMatchName})`;
    matchType = 'heuristics';
  } else if (isGayatri) {
    finalName = isEn ? 'Gāyatrī (3 × 8 syllables)' : 'Gāyatrī (3 × 8 slabik)';
    notes = isEn ? 'Vedic Gāyatrī meter' : 'Védské metrum Gāyatrī';
    matchType = 'heuristics';
  } else if (padaMatchName) {
    finalName = padaMatchName;
    notes = isEn ? `Pāda-level match from Vidyut Chandas: ${padaMatchName}` : `Shoda na úrovni pády z databáze Vidyut Chandas: ${padaMatchName}`;
    matchType = 'pada';
  } else if (metricalAksharas < 20) {
    finalName = isEn ? 'Sūtra (aphorism / prose meter)' : 'Sūtra (aforismus / prozaické metrum)';
    notes = isEn ? 'Aphoristic length (< 20 syllables)' : 'Aforistický rozsah (méně než 20 slabik)';
  } else {
    finalName = isEn ? `Rhythmic verse (${metricalAksharas} syllables)` : `Rytmický verš (${metricalAksharas} slabik)`;
    notes = isEn ? 'Free metrical structure' : 'Volná metrická struktura';
  }

  const unspecified = isEn ? 'Unspecified' : 'Nespecifikováno';

  return {
    meter: finalName || unspecified,
    meterName: finalName || unspecified,
    matchType,
    totalAksharas,
    aksharas: allAksharas,
    padas: padasOutput,
    isClassicalAnushtubh: !specifiedMeter && !fullMatchName && isAnushtubh,
    notes
  };
}

const GANA_BY_CLASS: Record<string, string> = {
  '1': 'Bhvadi', '2': 'Adadi', '3': 'Juhotyadi', '4': 'Divadi', '5': 'Svadi',
  '6': 'Tudadi', '7': 'Rudhadi', '8': 'Tanadi', '9': 'Kryadi', '10': 'Curadi'
};
const GANA_NAMES = new Set(Object.values(GANA_BY_CLASS).concat(['Kandvadi']));

const VIBHAKTI_MAP: Record<string, string> = {
  nominative: 'Prathama', '1': 'Prathama', prathama: 'Prathama',
  accusative: 'Dvitiya', '2': 'Dvitiya', dvitiya: 'Dvitiya',
  instrumental: 'Trtiya', '3': 'Trtiya', trtiya: 'Trtiya',
  dative: 'Caturthi', '4': 'Caturthi', caturthi: 'Caturthi',
  ablative: 'Panchami', '5': 'Panchami', panchami: 'Panchami',
  genitive: 'Sasthi', '6': 'Sasthi', sasthi: 'Sasthi',
  locative: 'Saptami', '7': 'Saptami', saptami: 'Saptami',
  vocative: 'Sambodhana', '8': 'Sambodhana', sambodhana: 'Sambodhana'
};

const NOTE_LABELS = {
  cs: {
    tinanta: 'slovesný tvar (tiṅanta)',
    subanta: 'jmenný tvar (subanta)',
    root: 'kořen',
    stem: 'kmen',
    gana: (g: string, n: string) => `${g} gaṇa${n ? ` (${n}. třída)` : ''}`,
    lat: 'Laṭ (prézens indikativ)',
    vacana: { Eka: 'jednotné číslo', Dvi: 'dvojné číslo', Bahu: 'množné číslo' } as Record<string, string>,
    purusha: { Prathama: '3. osoba', Madhyama: '2. osoba', Uttama: '1. osoba' } as Record<string, string>,
    prayoga: (pada?: string) => pada === 'Atmanepada' ? 'Kartari, ātmanepada (médium)' : 'Kartari (činný rod / aktivum)',
    vibhakti: {
      Prathama: '1. pád (nominativ)', Dvitiya: '4. pád (akuzativ)', Trtiya: '7. pád (instrumentál)',
      Caturthi: '3. pád (dativ)', Panchami: 'ablativ', Sasthi: '2. pád (genitiv)',
      Saptami: '6. pád (lokál)', Sambodhana: '5. pád (vokativ)'
    } as Record<string, string>,
    linga: { Pum: 'mužský rod', Stri: 'ženský rod', Napumsaka: 'střední rod' } as Record<string, string>
  },
  en: {
    tinanta: 'verbal form (tiṅanta)',
    subanta: 'nominal form (subanta)',
    root: 'root',
    stem: 'stem',
    gana: (g: string, n: string) => `${g} gaṇa${n ? ` (class ${n})` : ''}`,
    lat: 'Laṭ (present indicative)',
    vacana: { Eka: 'singular', Dvi: 'dual', Bahu: 'plural' } as Record<string, string>,
    purusha: { Prathama: '3rd person', Madhyama: '2nd person', Uttama: '1st person' } as Record<string, string>,
    prayoga: (pada?: string) => pada === 'Atmanepada' ? 'Kartari, ātmanepada (middle)' : 'Kartari (active)',
    vibhakti: {
      Prathama: 'nominative', Dvitiya: 'accusative', Trtiya: 'instrumental', Caturthi: 'dative',
      Panchami: 'ablative', Sasthi: 'genitive', Saptami: 'locative', Sambodhana: 'vocative'
    } as Record<string, string>,
    linga: { Pum: 'masculine', Stri: 'feminine', Napumsaka: 'neuter' } as Record<string, string>
  }
};

/**
 * Extracts a bare dhātu from display forms such as "√bhū (bhav)" or "bhū".
 */
export function cleanDhatu(root: string): string {
  return root.trim().replace(/^√/, '').split(/[\s(]/)[0].trim();
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
    gana?: string | number;
    /** Dhātupāṭha form in SLP1 (e.g. "ga\mx~"); without it the bare root is used */
    upadesha?: string;
    person?: string;
    voice?: string;
    /** Prefer the derived form equal to this word when several are produced (ātmanepada/parasmaipada) */
    matchWord?: string;
    lang?: SupportedLanguage;
  }
): PrakriyaDerivationResult | null {
  if (!vidyutModule) return null;
  const labels = NOTE_LABELS[options?.lang === 'en' ? 'en' : 'cs'];

  try {
    const { Vyakarana, Scheme, transliterate } = vidyutModule;
    const vyakarana = new Vyakarana();

    try {
      const cleanInput = wordOrLemma.trim().replace(/^√/, '');
      const isDeva = DEVANAGARI_LETTER.test(cleanInput);
      const slp1 = transliterate(cleanInput, isDeva ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);

      const n = String(options?.number || options?.vacana || '').toLowerCase();
      const vacana = (n === 'plural' || n === 'bahu') ? 'Bahu' : ((n === 'dual' || n === 'dvi') ? 'Dvi' : 'Eka');

      // Verbal derivation when a verb or root is given
      if (options?.pos === 'verb' || options?.root) {
        const dhatu = cleanDhatu(options?.root || cleanInput);
        const rootSlp1 = options?.upadesha
          || transliterate(dhatu, DEVANAGARI_LETTER.test(dhatu) ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);
        const ganaKey = String(options?.gana ?? '').trim();
        const gana = GANA_BY_CLASS[ganaKey] || (GANA_NAMES.has(ganaKey) ? ganaKey : 'Bhvadi');
        const classNumber = Object.entries(GANA_BY_CLASS).find(([, g]) => g === gana)?.[0] || '';
        const person = String(options?.person || '3rd');
        const purusha = person.startsWith('1') ? 'Uttama' : (person.startsWith('2') ? 'Madhyama' : 'Prathama');
        const pada = options?.voice === 'middle' ? 'Atmanepada' : (options?.voice === 'active' ? 'Parasmaipada' : undefined);

        const args: any = {
          dhatu: { aupadeshika: rootSlp1, gana, prefixes: [], sanadi: [] },
          lakara: 'Lat',
          prayoga: 'Kartari',
          purusha,
          vacana,
          skip_at_agama: false
        };
        if (pada) args.pada = pada;

        let tinantas = vyakarana.deriveTinantas(args);
        if ((!tinantas || tinantas.length === 0) && pada) {
          delete args.pada;
          tinantas = vyakarana.deriveTinantas(args);
        }

        if (tinantas && tinantas.length > 0) {
          const wanted = options?.matchWord
            ? tinantas.find((t: any) => derivationMatchesWord(transliterate(t.text, Scheme.Slp1, Scheme.Iast), options.matchWord!))
            : null;
          return formatPrakriyaOutput(wanted || tinantas[0], dhatu, 'tinanta', {
            type: labels.tinanta,
            pratipadikaOrDhatu: `${labels.root} √${dhatu}`,
            padaOrGana: labels.gana(gana, classNumber),
            caseOrLakara: labels.lat,
            numberOrVacana: `${vacana} (${labels.vacana[vacana]}), ${purusha} (${labels.purusha[purusha]})`,
            genderOrPrayoga: labels.prayoga(pada)
          }, rootSlp1, options?.lang === 'en' ? 'en' : 'cs');
        }
      }

      // Default: Subanta (nominal derivation)
      const g = String(options?.gender || options?.linga || '').toLowerCase();
      const linga = (g === 'feminine' || g === 'stri' || g === 'f')
        ? 'Stri'
        : ((g === 'neuter' || g === 'napumsaka' || g === 'n') ? 'Napumsaka' : 'Pum');

      const c = String(options?.case || options?.vibhakti || '').toLowerCase();
      const vibhakti = VIBHAKTI_MAP[c] || 'Prathama';

      const stemSlp1 = options?.stem ? transliterate(options.stem, Scheme.Iast, Scheme.Slp1) : slp1;
      const subantas = vyakarana.deriveSubantas({
        pratipadika: { basic: stemSlp1 },
        linga: linga as any,
        vibhakti: vibhakti as any,
        vacana: vacana as any
      });

      if (subantas && subantas.length > 0) {
        return formatPrakriyaOutput(subantas[0], options?.stem || cleanInput, 'subanta', {
          type: labels.subanta,
          pratipadikaOrDhatu: `${labels.stem} ${options?.stem || cleanInput}`,
          caseOrLakara: `${vibhakti} – ${labels.vibhakti[vibhakti]}`,
          numberOrVacana: `${vacana} – ${labels.vacana[vacana]}`,
          genderOrPrayoga: `${linga} – ${labels.linga[linga]}`
        }, null, options?.lang === 'en' ? 'en' : 'cs');
      }

      return null;
    } finally {
      vyakarana.free();
    }
  } catch {
    return null;
  }
}

const RULE_SOURCE_LABELS: Record<string, string> = {
  ashtadhyayi: 'Aṣṭādhyāyī',
  dhatupatha: 'Dhātupāṭha',
  kashika: 'Kāśikā',
  kaumudi: 'Siddhāntakaumudī',
  varttika: 'Vārttika',
  unadipatha: 'Uṇādipāṭha',
  linganushasanam: 'Liṅgānuśāsana',
  phit: 'Phiṭsūtra'
};

/**
 * Link to a rule on ashtadhyayi.com. Only Aṣṭādhyāyī sūtras ("a.b.c") have a stable
 * public URL (https://ashtadhyayi.com/sutraani/a/b/c); other rule sources get no link.
 */
export function ruleUrl(source: string | undefined, code: string): string {
  const m = /^(\d{1,2})\.(\d)\.(\d{1,3})$/.exec(code || '');
  if (!m || (source && source !== 'ashtadhyayi')) return '';
  return `https://ashtadhyayi.com/sutraani/${Number(m[1])}/${Number(m[2])}/${Number(m[3])}`;
}

const TIN_ENDINGS = new Set(['tip', 'tas', 'Ji', 'sip', 'Tas', 'Ta', 'mip', 'vas', 'mas', 'ta', 'AtAm', 'Ja', 'TAs', 'ATAm', 'Dvam', 'iw', 'vahi', 'mahiN']);
const LAKARAS = new Set(['la~w', 'li~w', 'lu~w', 'lf~w', 'le~w', 'lo~w', 'la~N', 'li~N', 'lu~N', 'lf~N']);
const SUP_ENDINGS = new Set(['su~', 'O', 'jas', 'am', 'Ow', 'Sas', 'wA', 'ByAm', 'Bis', 'Ne', 'Byas', 'Nasi~', 'Nas', 'os', 'Am', 'Ni', 'sup']);
const VIKARANAS = new Set(['Sap', 'Syan', 'Snu', 'Sa', 'Snam', 'u', 'SnA', 'yak', 'cli~', 'sic', 'sya', 'tAsi~']);

const MORPHEME_LABELS: Record<'cs' | 'en', Record<string, string>> = {
  cs: {
    prefix: 'předpona (upasarga)',
    root: 'kořen (dhātu)',
    stem: 'kmen (prātipadika)',
    vikarana: 'kmenotvorná přípona (vikaraṇa)',
    tin: 'osobní koncovka (tiṅ)',
    sup: 'pádová koncovka (sup)',
    suffix: 'přípona / augment (pratyaya / āgama)'
  },
  en: {
    prefix: 'prefix (upasarga)',
    root: 'root (dhātu)',
    stem: 'stem (prātipadika)',
    vikarana: 'stem suffix (vikaraṇa)',
    tin: 'personal ending (tiṅ)',
    sup: 'case ending (sup)',
    suffix: 'suffix / augment (pratyaya / āgama)'
  }
};

/** SLP1 upadeśa → readable IAST (drops it-marker notation such as "~" and accents). */
function upadeshaToIast(slp1: string): string {
  const clean = slp1.replace(/[~^\\/]/g, '');
  return clean ? vidyutModule.transliterate(clean, vidyutModule.Scheme.Slp1, vidyutModule.Scheme.Iast) : '';
}

/**
 * Follows every term (morpheme) through the derivation history and classifies it.
 * Terms keep their position unless a step inserts or removes one, which is detected by
 * aligning consecutive steps (unchanged terms keep their text, new ones are flagged).
 */
export function extractMorphemes(
  history: Array<{ rule?: { code?: string }; result?: Array<{ text: string; wasChanged?: boolean }> }>,
  category: 'subanta' | 'tinanta',
  rootSlp1: string | null,
  lang: SupportedLanguage = 'cs'
): DerivationMorpheme[] {
  type Rec = { forms: string[]; introducedBy: string };
  let records: Rec[] = [];
  let prev: Array<{ text: string; wasChanged?: boolean }> = [];

  for (const step of history || []) {
    const cur = step.result || [];
    const code = step.rule?.code || '';
    if (records.length === 0) {
      records = cur.map((t) => ({ forms: [t.text], introducedBy: code }));
    } else if (cur.length === prev.length) {
      // same structure – positions are stable
    } else {
      const next: Rec[] = [];
      let i = 0;
      let j = 0;
      while (i < cur.length || j < prev.length) {
        const extraCur = (cur.length - i) - (prev.length - j);
        if (i < cur.length && j < prev.length && cur[i].text === prev[j].text) {
          next.push(records[j]);
          i++; j++;
        } else if (i < cur.length && extraCur > 0 && (cur[i].wasChanged || j >= prev.length)) {
          next.push({ forms: [cur[i].text], introducedBy: code }); // inserted term
          i++;
        } else if (j < prev.length && extraCur < 0) {
          j++; // removed term
        } else {
          if (i < cur.length && j < prev.length) next.push(records[j]);
          i++; j++;
        }
      }
      records = next.slice(0, cur.length);
    }
    cur.forEach((t, idx) => {
      const rec = records[idx];
      if (rec && rec.forms[rec.forms.length - 1] !== t.text) rec.forms.push(t.text);
    });
    prev = cur;
  }

  const labels = MORPHEME_LABELS[lang === 'en' ? 'en' : 'cs'];
  const rootIndex = category === 'tinanta'
    ? Math.max(0, records.findIndex((r) => rootSlp1 !== null && r.forms[0] === rootSlp1))
    : 0;

  const out: DerivationMorpheme[] = [];
  records.forEach((rec, idx) => {
    const surfaceSlp1 = rec.forms[rec.forms.length - 1] || '';
    const formsIast = rec.forms.map(upadeshaToIast).filter((f, k, arr) => f && arr.indexOf(f) === k);
    let role: MorphemeRole;
    let label: string;
    if (idx < rootIndex) {
      role = 'prefix'; label = labels.prefix;
    } else if (idx === rootIndex) {
      role = category === 'tinanta' ? 'root' : 'stem';
      label = category === 'tinanta' ? labels.root : labels.stem;
    } else if (rec.forms.some((f) => TIN_ENDINGS.has(f) || LAKARAS.has(f))) {
      role = 'ending'; label = labels.tin;
    } else if (rec.forms.some((f) => SUP_ENDINGS.has(f))) {
      role = 'ending'; label = labels.sup;
    } else if (rec.forms.some((f) => VIKARANAS.has(f))) {
      role = 'vikarana'; label = labels.vikarana;
    } else {
      role = 'suffix'; label = labels.suffix;
    }
    // Morphemes that vanished completely (e.g. an unused augment) are not shown
    if (!surfaceSlp1 && role !== 'ending') return;
    out.push({
      role,
      label,
      upadesha: formsIast[0] || '',
      forms: formsIast,
      surface: surfaceSlp1 ? upadeshaToIast(surfaceSlp1) : '∅',
      surfaceDeva: surfaceSlp1 ? vidyutModule.transliterate(surfaceSlp1.replace(/[~^\\/]/g, ''), vidyutModule.Scheme.Slp1, vidyutModule.Scheme.Devanagari) : '∅',
      introducedBy: rec.introducedBy
    });
  });
  return out;
}

function formatPrakriyaOutput(
  prakriya: any,
  stemOrRoot: string,
  category: 'subanta' | 'tinanta',
  notes: PrakriyaDerivationResult['linguisticNotes'],
  rootSlp1: string | null = null,
  lang: SupportedLanguage = 'cs'
): PrakriyaDerivationResult {
  const { Scheme, transliterate } = vidyutModule;
  const targetText = prakriya.text;
  const targetIast = transliterate(targetText, Scheme.Slp1, Scheme.Iast);
  const targetDeva = transliterate(targetText, Scheme.Slp1, Scheme.Devanagari);

  const steps: PrakriyaStepInfo[] = (prakriya.history || []).map((step: any, idx: number) => {
    const termsJoined = (step.result || []).map((r: any) => r.text).join(' + ');
    const code = step.rule?.code || '';
    const source = step.rule?.source || 'ashtadhyayi';
    const url = ruleUrl(source, code);
    return {
      stepNumber: idx + 1,
      ruleCode: code,
      ruleSource: RULE_SOURCE_LABELS[source] || source,
      sutraUrl: url,
      url,
      termsText: termsJoined,
      termsDeva: transliterate(termsJoined.replace(/[~^\\/]/g, ''), Scheme.Slp1, Scheme.Devanagari),
      termsIast: transliterate(termsJoined.replace(/[~^\\/]/g, ''), Scheme.Slp1, Scheme.Iast)
    };
  });

  return {
    morphemes: extractMorphemes(prakriya.history || [], category, rootSlp1, lang),
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
 * True when a derived form is the analyzed word (ignoring case and the m/ṃ spelling of
 * final anusvāra). Only then does the derivation describe this word and not a guess.
 */
export function derivationMatchesWord(derivedIast: string, word: string): boolean {
  const norm = (w: string) => w.normalize('NFC').toLowerCase().trim().replace(/[ṃṁ]$/, 'm');
  return Boolean(derivedIast) && norm(derivedIast) === norm(word);
}

/**
 * Unified Sanskrit lemmatizer and morphological analysis.
 * Combines Vidyut WASM capabilities with local offline rule base.
 */
export async function analyzeSanskritWordFull(query: string, lang: SupportedLanguage = 'cs'): Promise<VidyutAnalysisResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      source: 'morph_rules',
      analyses: [],
      attribution: VIDYUT_METADATA
    };
  }

  // 1. Convert query to standard IAST
  const isDeva = DEVANAGARI_LETTER.test(trimmed);
  const iast = (isDeva ? devanagariToIast(trimmed) : trimmed).normalize('NFC').toLowerCase();

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
      const word = iast.replace(/[।॥|,;.!?]/g, '').trim();

      const splits = splitSandhiWasm(word);
      if (splits.length > 0) {
        sandhiSplits = splits.slice(0, 8); // Top 8 valid splits
      }

      const meter = classifyMeterWasm(word, lang);
      if (meter && meter.aksharas.length > 0) {
        meterInfo = { name: meter.name, aksharas: meter.aksharas };
      }

      const first = baseAnalyses[0];
      // Indeclinables (avyaya) have no subanta/tiṅanta derivation
      const derivation = first?.pos === 'indeclinable' ? null : derivePrakriyaTree(first?.stem || first?.lemma || word, {
        pos: first?.pos === 'verb' ? 'verb' : 'noun',
        gender: first?.gender,
        case: first?.case,
        number: first?.number,
        root: first?.dhatu || first?.root,
        gana: first?.gana,
        upadesha: first?.upadesha,
        person: first?.person,
        voice: first?.voice,
        matchWord: word,
        lang
      });

      if (derivation) {
        derivation.verified = derivationMatchesWord(derivation.targetIast, word);
        prakriyaTree = derivation;
      }
    }
  } catch {
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
