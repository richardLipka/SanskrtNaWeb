import { DEFAULT_BASE_CHARACTERS, VIRAMA } from './schemes.ts';
import { CzechPhoneticRules, ScriptItem } from '../types/schema.ts';
import { DEFAULT_CZECH_RULES } from './rules.ts';

const NUKTA = '\u093C';
const OM_SIGN = 'ॐ';
const AVAGRAHA = 'ऽ';
const CANDRABINDU_IAST = 'm\u0310'; // m\u0310
const ZERO_WIDTH_JOINERS = /[\u200C\u200D]/g;

// Lookup maps
const DEVA_VOWELS = new Map<string, string>();
const DEVA_MATRAS = new Map<string, string>();
const DEVA_CONSONANTS = new Map<string, string>();
const IAST_TO_DEV_VOWEL = new Map<string, { independent: string; matra: string }>();
const IAST_TO_DEV_CONSONANT = new Map<string, string>();
const DEV_SPECIAL = new Map<string, string>();
const IAST_SPECIAL = new Map<string, string>();
const DEV_NUMS = new Map<string, string>();
const STD_NUMS = new Map<string, string>();

// IAST <-> Harvard-Kyoto / SLP1 unit maps (vowels, consonants and signs; matras share vowel units)
const IAST_TO_HK = new Map<string, string>();
const IAST_TO_SLP1 = new Map<string, string>();
const HK_TO_IAST = new Map<string, string>();
const SLP1_TO_IAST = new Map<string, string>();

// Populate base maps
for (const item of DEFAULT_BASE_CHARACTERS) {
  if (item.category === 'vowel_independent') {
    DEVA_VOWELS.set(item.devanagari, item.iast);
    const existing = IAST_TO_DEV_VOWEL.get(item.iast) || { independent: '', matra: '' };
    existing.independent = item.devanagari;
    IAST_TO_DEV_VOWEL.set(item.iast, existing);
  } else if (item.category === 'vowel_matra') {
    DEVA_MATRAS.set(item.devanagari, item.iast);
    const existing = IAST_TO_DEV_VOWEL.get(item.iast) || { independent: '', matra: '' };
    existing.matra = item.devanagari;
    IAST_TO_DEV_VOWEL.set(item.iast, existing);
  } else if (item.category === 'consonant') {
    DEVA_CONSONANTS.set(item.devanagari, item.iast);
    IAST_TO_DEV_CONSONANT.set(item.iast, item.devanagari);
  } else if (item.category === 'special') {
    DEV_SPECIAL.set(item.devanagari, item.iast);
    IAST_SPECIAL.set(item.iast, item.devanagari);
  } else if (item.category === 'numeral') {
    DEV_NUMS.set(item.devanagari, item.iast);
    STD_NUMS.set(item.iast, item.devanagari);
  }

  if (item.category !== 'numeral' && item.category !== 'vowel_matra' && !/^\|+$/.test(item.iast)) {
    IAST_TO_HK.set(item.iast, item.hk);
    if (!HK_TO_IAST.has(item.hk)) HK_TO_IAST.set(item.hk, item.iast);
    if (item.slp1) {
      IAST_TO_SLP1.set(item.iast, item.slp1);
      if (!SLP1_TO_IAST.has(item.slp1)) SLP1_TO_IAST.set(item.slp1, item.iast);
    }
  }
}

// Vedic retroflex lateral (ळ) – not part of the classical table but common in Ṛgvedic texts
DEVA_CONSONANTS.set('ळ', 'ḻ');
IAST_TO_DEV_CONSONANT.set('ḻ', 'ळ');
// Alternative anusvāra spelling sometimes used in IAST sources
IAST_SPECIAL.set('ṁ', 'ं');

const byLengthDesc = (a: string, b: string) => b.length - a.length;
const SORTED_IAST_CONSONANTS = Array.from(IAST_TO_DEV_CONSONANT.keys()).sort(byLengthDesc);
const SORTED_IAST_VOWELS = Array.from(IAST_TO_DEV_VOWEL.keys()).sort(byLengthDesc);
const SORTED_IAST_SPECIALS = Array.from(IAST_SPECIAL.keys()).filter((k) => !/^\|+$/.test(k)).sort(byLengthDesc);

let customTranslitProvider: ((deva: string) => string) | null = null;

/**
 * Register high-performance vidyut-lipi transliterator (preferred over table)
 */
export function registerVidyutTransliterator(provider: ((deva: string) => string) | null): void {
  customTranslitProvider = provider;
}

/**
 * Lower-cases text character by character so that string offsets stay aligned
 * with the original (some exotic code points lower-case to two units).
 */
function lowerAligned(text: string): string {
  let out = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    out += lower.length === ch.length ? lower : ch;
  }
  return out;
}

function matchAt(text: string, index: number, candidates: string[]): string {
  for (const c of candidates) {
    if (text.startsWith(c, index)) return c;
  }
  return '';
}

/**
 * Convert Devanagari to IAST using the built-in character tables only.
 */
export function devanagariToIastTable(input: string): string {
  if (!input) return '';

  const text = input.normalize('NFC').replace(ZERO_WIDTH_JOINERS, '');
  let result = '';
  const len = text.length;
  let i = 0;

  while (i < len) {
    const ch = text[i];

    if (ch === OM_SIGN) {
      result += 'oṃ';
      i++;
      continue;
    }

    // Check special symbols
    if (DEV_SPECIAL.has(ch)) {
      result += DEV_SPECIAL.get(ch);
      i++;
      continue;
    }

    // Check numerals
    if (DEV_NUMS.has(ch)) {
      result += DEV_NUMS.get(ch);
      i++;
      continue;
    }

    // Check independent vowels
    if (DEVA_VOWELS.has(ch)) {
      result += DEVA_VOWELS.get(ch);
      i++;
      continue;
    }

    const baseIast = DEVA_CONSONANTS.get(ch);
    if (baseIast) {
      let next = i + 1;
      // Nukta modifies the consonant graphically; classical IAST has no notation for it
      if (text[next] === NUKTA) next++;
      const nextChar = next < len ? text[next] : '';

      if (nextChar === VIRAMA) {
        result += baseIast;
        i = next + 1;
      } else if (DEVA_MATRAS.has(nextChar)) {
        result += baseIast + DEVA_MATRAS.get(nextChar)!;
        i = next + 1;
      } else {
        result += baseIast + 'a';
        i = next;
      }
      continue;
    }

    // Passthrough spaces, punctuation, etc.
    result += ch;
    i++;
  }

  return result;
}

/**
 * Convert Devanagari to IAST (academic transliteration).
 * Prefers vidyut-lipi WebAssembly when registered, with full fallback to character tables.
 */
export function devanagariToIast(input: string): string {
  if (!input) return '';
  if (customTranslitProvider) {
    try {
      const res = customTranslitProvider(input);
      if (res) return res;
    } catch {
      // Fallback to table below
    }
  }
  return devanagariToIastTable(input);
}

/**
 * Convert IAST to Devanagari. Input is matched case-insensitively ("Kṛṣṇa" → कृष्ण).
 */
export function iastToDevanagari(input: string): string {
  if (!input) return '';
  const text = input.normalize('NFC');
  const lower = lowerAligned(text);
  let result = '';
  const len = text.length;
  let i = 0;

  while (i < len) {
    // Punctuation
    if (lower.startsWith('||', i)) {
      result += '॥';
      i += 2;
      continue;
    }
    if (lower[i] === '|') {
      result += '।';
      i++;
      continue;
    }

    // Avagraha (straight or typographic apostrophe)
    if (lower[i] === '\'' || lower[i] === '’') {
      result += AVAGRAHA;
      i++;
      continue;
    }

    // Candrabindu must be checked before the consonant "m"
    if (lower.startsWith(CANDRABINDU_IAST, i)) {
      result += 'ँ';
      i += CANDRABINDU_IAST.length;
      continue;
    }

    const special = matchAt(lower, i, SORTED_IAST_SPECIALS);
    if (special) {
      result += IAST_SPECIAL.get(special);
      i += special.length;
      continue;
    }

    if (STD_NUMS.has(lower[i])) {
      result += STD_NUMS.get(lower[i]);
      i++;
      continue;
    }

    const consonant = matchAt(lower, i, SORTED_IAST_CONSONANTS);
    if (consonant) {
      const devConsonant = IAST_TO_DEV_CONSONANT.get(consonant)!;
      const afterConsonant = i + consonant.length;
      const vowel = matchAt(lower, afterConsonant, SORTED_IAST_VOWELS);

      if (vowel) {
        result += vowel === 'a' ? devConsonant : devConsonant + IAST_TO_DEV_VOWEL.get(vowel)!.matra;
        i = afterConsonant + vowel.length;
      } else {
        result += devConsonant + VIRAMA;
        i = afterConsonant;
      }
      continue;
    }

    const vowel = matchAt(lower, i, SORTED_IAST_VOWELS);
    if (vowel) {
      result += IAST_TO_DEV_VOWEL.get(vowel)!.independent;
      i += vowel.length;
      continue;
    }

    // Passthrough
    result += text[i];
    i++;
  }

  return result;
}

function mapByUnits(text: string, map: Map<string, string>, sortedKeys: string[]): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const unit = matchAt(text, i, sortedKeys);
    if (unit) {
      out += map.get(unit);
      i += unit.length;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

const SORTED_IAST_UNITS_HK = Array.from(IAST_TO_HK.keys()).sort(byLengthDesc);
const SORTED_IAST_UNITS_SLP1 = Array.from(IAST_TO_SLP1.keys()).sort(byLengthDesc);
const SORTED_HK_UNITS = Array.from(HK_TO_IAST.keys()).sort(byLengthDesc);
const SORTED_SLP1_UNITS = Array.from(SLP1_TO_IAST.keys()).sort(byLengthDesc);

/** IAST → Harvard-Kyoto (table based, lower-cases the input first). */
export function iastToHarvardKyoto(input: string): string {
  if (!input) return '';
  return mapByUnits(lowerAligned(input.normalize('NFC')).replace(/ṁ/g, 'ṃ'), IAST_TO_HK, SORTED_IAST_UNITS_HK);
}

/** Harvard-Kyoto → IAST (table based, case-sensitive as HK requires). */
export function harvardKyotoToIast(input: string): string {
  if (!input) return '';
  return mapByUnits(input, HK_TO_IAST, SORTED_HK_UNITS);
}

/** IAST → SLP1 (table based, lower-cases the input first). */
export function iastToSlp1(input: string): string {
  if (!input) return '';
  return mapByUnits(lowerAligned(input.normalize('NFC')).replace(/ṁ/g, 'ṃ'), IAST_TO_SLP1, SORTED_IAST_UNITS_SLP1);
}

/** SLP1 → IAST (table based, case-sensitive as SLP1 requires). */
export function slp1ToIast(input: string): string {
  if (!input) return '';
  return mapByUnits(input, SLP1_TO_IAST, SORTED_SLP1_UNITS);
}

/**
 * Canonical scheme identifiers used across the library.
 */
export type SchemeId =
  | 'devanagari'
  | 'iast'
  | 'hk'
  | 'slp1'
  | 'iso15919'
  | 'itrans'
  | 'velthuis'
  | 'wx'
  | 'cs_phonetic';

const SCHEME_ALIASES: Record<string, SchemeId> = {
  devanagari: 'devanagari',
  deva: 'devanagari',
  iast: 'iast',
  iast_padaccheda: 'iast',
  hk: 'hk',
  harvard_kyoto: 'hk',
  harvardkyoto: 'hk',
  'harvard-kyoto': 'hk',
  slp1: 'slp1',
  iso15919: 'iso15919',
  iso: 'iso15919',
  iso_15919: 'iso15919',
  itrans: 'itrans',
  velthuis: 'velthuis',
  wx: 'wx',
  cs_phonetic: 'cs_phonetic',
  cs: 'cs_phonetic',
  czech: 'cs_phonetic'
};

/**
 * Normalizes user-facing scheme names ('Devanagari', 'harvard_kyoto', 'HK', 'Iast', ...)
 * to canonical identifiers. Returns null for unknown schemes.
 */
export function normalizeSchemeId(scheme: string): SchemeId | null {
  const key = String(scheme || '').trim().toLowerCase();
  return SCHEME_ALIASES[key] ?? null;
}

/**
 * Table-based transliteration between Devanagari, IAST, Harvard-Kyoto, SLP1 and Czech phonetic.
 * Used as an offline fallback when Vidyut WebAssembly is unavailable. Schemes the tables
 * cannot handle (ITRANS, Velthuis, WX, ISO 15919 output) are treated as IAST-like text.
 */
export function transliterateTable(
  text: string,
  fromScheme: string,
  toScheme: string,
  customRules?: Partial<CzechPhoneticRules>
): string {
  if (!text) return '';
  const from = normalizeSchemeId(fromScheme) ?? 'iast';
  const to = normalizeSchemeId(toScheme) ?? 'iast';
  if (from === to) return text;

  let iastText: string;
  switch (from) {
    case 'devanagari':
      iastText = devanagariToIastTable(text);
      break;
    case 'hk':
      iastText = harvardKyotoToIast(text);
      break;
    case 'slp1':
      iastText = slp1ToIast(text);
      break;
    default:
      iastText = text;
  }

  switch (to) {
    case 'devanagari':
      return iastToDevanagari(iastText);
    case 'hk':
      return iastToHarvardKyoto(iastText);
    case 'slp1':
      return iastToSlp1(iastText);
    case 'cs_phonetic':
      return iastToCzechPhonetic(iastText, customRules);
    default:
      return iastText;
  }
}

const IAST_VOWEL_UNITS = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'e', 'o'];
const ECHO_VOWEL: Record<string, string> = {
  a: 'a', ā: 'a', i: 'i', ī: 'i', u: 'u', ū: 'u', ṛ: 'i', ṝ: 'i', ḷ: 'i', ḹ: 'i', e: 'e', o: 'o', ai: 'i', au: 'u'
};

const CONSONANT_UNITS = [
  'kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh',
  'k', 'g', 'ṅ', 'c', 'j', 'ñ', 'ṭ', 'ḍ', 'ṇ', 't', 'd', 'n', 'p', 'b', 'm',
  'y', 'r', 'l', 'v', 'ś', 'ṣ', 's', 'h'
];

/** Homorganic nasal for anusvāra before a following consonant (Czech spelling). */
function homorganicNasal(nextUnit: string): string {
  if (/^(k|kh|g|gh|ṅ)$/.test(nextUnit)) return 'n';
  if (/^(c|ch|j|jh|ñ)$/.test(nextUnit)) return 'ň';
  if (/^(ṭ|ṭh|ḍ|ḍh|ṇ|t|th|d|dh|n)$/.test(nextUnit)) return 'n';
  return 'm'; // labials, semivowels, sibilants, h and word end
}

function capitalizeFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Phonetically convert a single word from IAST to Czech according to rules.
 * Single left-to-right pass, so the output of one rule is never re-processed by another
 * (e.g. `chAspirated: 'cch'` stays "cch" instead of turning into "ččh").
 */
function convertSingleWordToCzech(word: string, rules: CzechPhoneticRules): string {
  const text = word.normalize('NFC');
  const lower = lowerAligned(text);

  const long = rules.longVowels === 'czech_accents';
  const lSyllabicLong = rules.lSyllabic === 'ḷ' ? 'ḹ' : `${rules.lSyllabic.replace(/i$/, '')}í`;

  const units: Array<[string, string]> = [
    ['jñ', `${rules.jAffricate}ň`],
    ['jh', rules.jhAspirated],
    ['ch', rules.chAspirated],
    ['ṭh', 'th'],
    ['ḍh', 'dh'],
    ['j', rules.jAffricate],
    ['c', rules.cPalatal],
    ['ś', rules.sibilantPalatal],
    ['ṣ', rules.sibilantRetroflex],
    ['y', rules.ySemivowel],
    ['v', rules.vSemivowel],
    ['ṝ', rules.rSyllabicLong],
    ['ṛ', rules.rSyllabic],
    ['ḹ', lSyllabicLong],
    ['ḷ', rules.lSyllabic],
    ['ṭ', 't'],
    ['ḍ', 'd'],
    ['ṇ', 'n'],
    ['ṅ', 'n'],
    ['ñ', 'ň'],
    ['ā', long ? 'á' : 'ā'],
    ['ī', long ? 'í' : 'ī'],
    ['ū', long ? 'ú' : 'ū']
  ];
  const unitKeys = units.map(([k]) => k);
  const unitMap = new Map(units);

  let out = '';
  let i = 0;
  while (i < lower.length) {
    const isUpper = text[i] !== lower[i];

    // Anusvāra (ṃ, ṁ, m\u0310)
    const anusvara = lower.startsWith(CANDRABINDU_IAST, i)
      ? CANDRABINDU_IAST
      : (lower[i] === 'ṃ' || lower[i] === 'ṁ' ? lower[i] : '');
    if (anusvara) {
      let rep: string;
      if (rules.anusvaraMode === 'simple_n') rep = 'n';
      else if (rules.anusvaraMode === 'phonetic') rep = homorganicNasal(matchAt(lower, i + anusvara.length, CONSONANT_UNITS));
      else rep = 'm';
      out += isUpper ? rep.toUpperCase() : rep;
      i += anusvara.length;
      continue;
    }

    // Visarga (ḥ)
    if (lower[i] === 'ḥ') {
      if (rules.visargaMode === 'h') {
        out += isUpper ? 'H' : 'h';
      } else if (rules.visargaMode === 'ah') {
        // Echo vowel as in recitation: namaḥ → namaha, hariḥ → harihi, devaiḥ → devaihi
        let echo = '';
        for (let back = i - 1; back >= 0 && !echo; back--) {
          const pair = back > 0 ? lower.slice(back - 1, back + 1) : '';
          if (pair === 'ai' || pair === 'au') echo = ECHO_VOWEL[pair];
          else if (IAST_VOWEL_UNITS.includes(lower[back])) echo = ECHO_VOWEL[lower[back]];
        }
        out += (isUpper ? 'H' : 'h') + (echo || 'a');
      }
      i++;
      continue;
    }

    const unit = matchAt(lower, i, unitKeys);
    if (unit) {
      const rep = unitMap.get(unit)!;
      out += isUpper ? capitalizeFirst(rep) : rep;
      i += unit.length;
      continue;
    }

    out += text[i];
    i++;
  }

  return out;
}

const WORD_SEPARATORS = /([ \t\n\r\-–—.,!?:;()|॥।"„“”‚‘’']+)/;
const ONLY_SEPARATORS = /^[ \t\n\r\-–—.,!?:;()|॥।"„“”‚‘’']+$/;

/**
 * Convert IAST to Czech phonetic transliteration with configurable rules.
 */
export function iastToCzechPhonetic(input: string, customRules?: Partial<CzechPhoneticRules>): string {
  if (!input) return '';
  const rules = { ...DEFAULT_CZECH_RULES, ...customRules };
  const customOverrides = {
    ...DEFAULT_CZECH_RULES.customWordOverrides,
    ...(customRules?.customWordOverrides || {})
  };

  const chunks = input.normalize('NFC').split(WORD_SEPARATORS);

  const processed = chunks.map((chunk) => {
    if (!chunk || ONLY_SEPARATORS.test(chunk)) {
      return chunk;
    }

    const rep = customOverrides[chunk.toLowerCase()];
    if (rep) {
      return chunk[0] !== chunk[0].toLowerCase() ? capitalizeFirst(rep) : rep;
    }

    return convertSingleWordToCzech(chunk, rules);
  });

  return processed.join('');
}

/**
 * Direct conversion from Devanagari to Czech Phonetic.
 */
export function devanagariToCzechPhonetic(input: string, customRules?: Partial<CzechPhoneticRules>): string {
  const iast = devanagariToIast(input);
  return iastToCzechPhonetic(iast, customRules);
}

/**
 * Universal transliterator supporting multiple schemes
 * (Devanagari, IAST, Harvard-Kyoto, SLP1 and Czech phonetic as a target).
 */
export function transliterate(
  text: string,
  fromScheme: 'devanagari' | 'iast' | 'cs_phonetic' | 'hk' | 'slp1',
  toScheme: 'devanagari' | 'iast' | 'cs_phonetic' | 'hk' | 'slp1',
  customRules?: Partial<CzechPhoneticRules>
): string {
  if (!text) return '';
  if (fromScheme === toScheme) return text;
  if (fromScheme === 'devanagari') {
    // Prefer the registered Vidyut provider for the Devanagari → IAST step
    return transliterateTable(devanagariToIast(text), 'iast', toScheme, customRules);
  }
  return transliterateTable(text, fromScheme, toScheme, customRules);
}

/**
 * Safe script updater ensuring MANUAL entries are NEVER automatically overwritten.
 */
export function safeUpdateScript(
  currentEntry: ScriptItem | string | undefined,
  newAutoText: string,
  force = false
): ScriptItem {
  if (!currentEntry) {
    return {
      text: newAutoText,
      mode: 'auto',
      lastAutoText: newAutoText
    };
  }

  const item: ScriptItem = typeof currentEntry === 'string'
    ? { text: currentEntry, mode: 'auto', lastAutoText: currentEntry }
    : { ...currentEntry };

  if (force) {
    return {
      text: newAutoText,
      mode: 'auto',
      lastAutoText: newAutoText
    };
  }

  if (item.mode === 'manual') {
    return item;
  }

  if (item.lastAutoText && item.text !== item.lastAutoText) {
    return {
      ...item,
      mode: 'manual'
    };
  }

  return {
    text: newAutoText,
    mode: 'auto',
    lastAutoText: newAutoText
  };
}

export function getScriptText(entry: ScriptItem | string | undefined): string {
  if (!entry) return '';
  return typeof entry === 'string' ? entry : entry.text;
}

export function isScriptManual(entry: ScriptItem | string | undefined): boolean {
  if (!entry || typeof entry === 'string') return false;
  return entry.mode === 'manual';
}
