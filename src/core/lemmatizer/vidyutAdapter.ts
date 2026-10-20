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
    person?: string;
    voice?: string;
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
        const rootSlp1 = transliterate(dhatu, DEVANAGARI_LETTER.test(dhatu) ? Scheme.Devanagari : Scheme.Iast, Scheme.Slp1);
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
          return formatPrakriyaOutput(tinantas[0], dhatu, 'tinanta', {
            type: labels.tinanta,
            pratipadikaOrDhatu: `${labels.root} √${dhatu}`,
            padaOrGana: labels.gana(gana, classNumber),
            caseOrLakara: labels.lat,
            numberOrVacana: `${vacana} (${labels.vacana[vacana]}), ${purusha} (${labels.purusha[purusha]})`,
            genderOrPrayoga: labels.prayoga(pada)
          });
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
        });
      }

      return null;
    } finally {
      vyakarana.free();
    }
  } catch {
    return null;
  }
}

function formatPrakriyaOutput(
  prakriya: any,
  stemOrRoot: string,
  category: 'subanta' | 'tinanta',
  notes: PrakriyaDerivationResult['linguisticNotes']
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
        person: first?.person,
        voice: first?.voice,
        lang
      });

      if (derivation) {
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
