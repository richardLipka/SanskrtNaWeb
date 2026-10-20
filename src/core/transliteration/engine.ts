import { DEFAULT_BASE_CHARACTERS, DEFAULT_LIGATURES, VIRAMA } from './schemes.ts';
import { CzechPhoneticRules, ScriptItem } from '../types/schema.ts';
import { DEFAULT_CZECH_RULES } from './rules.ts';

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
}

// Populate Ligature maps for fast matching
const LIGATURE_DEVA_TO_IAST = new Map<string, string>();
const LIGATURE_IAST_TO_DEVA = new Map<string, string>();
const LIGATURE_DEVA_TO_CS = new Map<string, string>();

for (const lig of DEFAULT_LIGATURES) {
  // Strip inherent 'a' for root consonant cluster mapping
  const iastStem = lig.iast.replace(/a$/, '');
  const csStem = lig.cs_phonetic.replace(/a$/, '');
  LIGATURE_DEVA_TO_IAST.set(lig.devanagari, iastStem);
  LIGATURE_DEVA_TO_CS.set(lig.devanagari, csStem);
  LIGATURE_IAST_TO_DEVA.set(iastStem, lig.devanagari);
}

const SORTED_IAST_LIGATURES = Array.from(LIGATURE_IAST_TO_DEVA.keys()).sort((a, b) => b.length - a.length);

const SORTED_IAST_CONSONANTS = Array.from(IAST_TO_DEV_CONSONANT.keys()).sort((a, b) => b.length - a.length);
const SORTED_IAST_VOWELS = Array.from(IAST_TO_DEV_VOWEL.keys()).sort((a, b) => b.length - a.length);

let customTranslitProvider: ((deva: string) => string) | null = null;

/**
 * Register high-performance vidyut-lipi transliterator (preferred over table)
 */
export function registerVidyutTransliterator(provider: (deva: string) => string): void {
  customTranslitProvider = provider;
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

  const text = input.normalize('NFC');
  let result = '';
  const len = text.length;
  let i = 0;

  while (i < len) {
    const ch = text[i];

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

    // Check consonants or registered ligatures
    let baseIast = '';
    let matchLen = 1;

    if (LIGATURE_DEVA_TO_IAST.has(ch)) {
      baseIast = LIGATURE_DEVA_TO_IAST.get(ch)!;
    } else if (DEVA_CONSONANTS.has(ch)) {
      baseIast = DEVA_CONSONANTS.get(ch)!;
    }

    if (baseIast) {
      const nextChar = i + matchLen < len ? text[i + matchLen] : '';

      if (nextChar === VIRAMA) {
        // Virama (halant): no vowel follows
        result += baseIast;
        i += matchLen + 1;
        continue;
      } else if (DEVA_MATRAS.has(nextChar)) {
        // Matra attached
        const matraIast = DEVA_MATRAS.get(nextChar)!;
        result += baseIast + matraIast;
        i += matchLen + 1;
        continue;
      } else {
        // Default inherent 'a'
        result += baseIast + 'a';
        i += matchLen;
        continue;
      }
    }

    // Passthrough spaces, punctuation, etc.
    result += ch;
    i++;
  }

  return result;
}

/**
 * Convert IAST to Devanagari.
 */
export function iastToDevanagari(input: string): string {
  if (!input) return '';
  const text = input.normalize('NFC');
  let result = '';
  const len = text.length;
  let i = 0;

  while (i < len) {
    // Check punctuation
    if (text.startsWith('||', i)) {
      result += '॥';
      i += 2;
      continue;
    }
    if (text[i] === '|') {
      result += '।';
      i++;
      continue;
    }

    // Check specials
    const specialKey = text[i];
    if (IAST_SPECIAL.has(specialKey)) {
      result += IAST_SPECIAL.get(specialKey);
      i++;
      continue;
    }

    // Check numerals
    if (STD_NUMS.has(specialKey)) {
      result += STD_NUMS.get(specialKey);
      i++;
      continue;
    }

    // Check ligatures first
    let matchedLig = '';
    for (const lig of SORTED_IAST_LIGATURES) {
      if (text.startsWith(lig, i)) {
        matchedLig = lig;
        break;
      }
    }

    if (matchedLig) {
      const devLig = LIGATURE_IAST_TO_DEVA.get(matchedLig)!;
      const afterLig = i + matchedLig.length;

      // Lookahead for vowel
      let followedVowel = '';
      for (const vKey of SORTED_IAST_VOWELS) {
        if (text.startsWith(vKey, afterLig)) {
          followedVowel = vKey;
          break;
        }
      }

      if (followedVowel) {
        if (followedVowel === 'a') {
          result += devLig;
        } else {
          const matra = IAST_TO_DEV_VOWEL.get(followedVowel)!.matra;
          result += devLig + matra;
        }
        i += matchedLig.length + followedVowel.length;
        continue;
      } else {
        result += devLig + VIRAMA;
        i += matchedLig.length;
        continue;
      }
    }

    // Check consonants
    let matchedConsonant = '';
    for (const key of SORTED_IAST_CONSONANTS) {
      if (text.startsWith(key, i)) {
        matchedConsonant = key;
        break;
      }
    }

    if (matchedConsonant) {
      const devConsonant = IAST_TO_DEV_CONSONANT.get(matchedConsonant)!;
      const afterConsonant = i + matchedConsonant.length;

      let followedVowel = '';
      for (const vKey of SORTED_IAST_VOWELS) {
        if (text.startsWith(vKey, afterConsonant)) {
          followedVowel = vKey;
          break;
        }
      }

      if (followedVowel) {
        if (followedVowel === 'a') {
          result += devConsonant;
        } else {
          const matra = IAST_TO_DEV_VOWEL.get(followedVowel)!.matra;
          result += devConsonant + matra;
        }
        i += matchedConsonant.length + followedVowel.length;
        continue;
      } else {
        result += devConsonant + VIRAMA;
        i += matchedConsonant.length;
        continue;
      }
    }

    // Check independent vowel
    let matchedVowel = '';
    for (const vKey of SORTED_IAST_VOWELS) {
      if (text.startsWith(vKey, i)) {
        matchedVowel = vKey;
        break;
      }
    }

    if (matchedVowel) {
      result += IAST_TO_DEV_VOWEL.get(matchedVowel)!.independent;
      i += matchedVowel.length;
      continue;
    }

    // Passthrough
    result += text[i];
    i++;
  }

  return result;
}

/**
 * Phonetically convert a single word from IAST to Czech according to rules.
 */
function convertSingleWordToCzech(word: string, rules: CzechPhoneticRules): string {
  let text = word;

  // 1. Double/compound consonants with 'j'
  text = text.replace(/jñ/g, `${rules.jAffricate}ň`);
  text = text.replace(/Jñ/g, `${rules.jAffricate.charAt(0).toUpperCase() + rules.jAffricate.slice(1)}ň`);

  // 2. Aspirated palatal affricate
  text = text.replace(/jh/g, rules.jhAspirated);
  text = text.replace(/Jh/g, rules.jhAspirated.charAt(0).toUpperCase() + rules.jhAspirated.slice(1));

  // 3. Palatal affricate j -> dž (BEFORE y -> j!)
  text = text.replace(/j/g, rules.jAffricate);
  text = text.replace(/J/g, rules.jAffricate.charAt(0).toUpperCase() + rules.jAffricate.slice(1));

  // 4. Palatal aspirate ch -> čh
  text = text.replace(/ch/g, rules.chAspirated);
  text = text.replace(/Ch/g, rules.chAspirated.charAt(0).toUpperCase() + rules.chAspirated.slice(1));

  // 5. Palatal tenuis c -> č
  text = text.replace(/c/g, rules.cPalatal);
  text = text.replace(/C/g, rules.cPalatal.toUpperCase());

  // 6. Palatal sibilant ś -> š
  text = text.replace(/ś/g, rules.sibilantPalatal);
  text = text.replace(/Ś/g, rules.sibilantPalatal.toUpperCase());

  // 7. Retroflex sibilant ṣ -> š
  text = text.replace(/ṣ/g, rules.sibilantRetroflex);
  text = text.replace(/Ṣ/g, rules.sibilantRetroflex.toUpperCase());

  // 8. Semivowel y -> j
  text = text.replace(/y/g, rules.ySemivowel);
  text = text.replace(/Y/g, rules.ySemivowel.toUpperCase());

  // 9. Syllabic vowels
  text = text.replace(/ṝ/g, rules.rSyllabicLong);
  text = text.replace(/ṛ/g, rules.rSyllabic);
  text = text.replace(/ḷ/g, rules.lSyllabic);

  // 10. Retroflex t, d, n -> t, d, n
  text = text.replace(/ṭ/g, 't');
  text = text.replace(/Ṭ/g, 'T');
  text = text.replace(/ḍ/g, 'd');
  text = text.replace(/Ḍ/g, 'D');
  text = text.replace(/ṇ/g, 'n');
  text = text.replace(/Ṇ/g, 'N');

  // 11. Nasals
  text = text.replace(/ṅ/g, 'n');
  text = text.replace(/ñ/g, 'ň');
  text = text.replace(/Ñ/g, 'Ň');

  // 12. Long vowels
  if (rules.longVowels === 'czech_accents') {
    text = text.replace(/ā/g, 'á');
    text = text.replace(/Ā/g, 'Á');
    text = text.replace(/ī/g, 'í');
    text = text.replace(/Ī/g, 'Í');
    text = text.replace(/ū/g, 'ú');
    text = text.replace(/Ū/g, 'Ú');
  }

  // 13. Visarga
  if (rules.visargaMode === 'h') {
    text = text.replace(/ḥ/g, 'h');
    text = text.replace(/Ḥ/g, 'H');
  } else if (rules.visargaMode === 'none') {
    text = text.replace(/ḥ/g, '');
    text = text.replace(/Ḥ/g, '');
  }

  // 14. Anusvara
  if (rules.anusvaraMode === 'simple_m') {
    text = text.replace(/ṃ/g, 'm');
    text = text.replace(/Ṃ/g, 'M');
  } else if (rules.anusvaraMode === 'simple_n') {
    text = text.replace(/ṃ/g, 'n');
    text = text.replace(/Ṃ/g, 'N');
  }

  return text;
}

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

  const chunks = input.split(/([ \t\n\r\-–—.,!?:;()|॥।]+)/);

  const processed = chunks.map((chunk) => {
    if (!chunk || /^[ \t\n\r\-–—.,!?:;()|॥।]+$/.test(chunk)) {
      return chunk;
    }

    const lower = chunk.toLowerCase();
    if (customOverrides[lower]) {
      const rep = customOverrides[lower];
      return chunk[0] === chunk[0].toUpperCase() && chunk[0] !== chunk[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep;
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
 * Universal transliterator supporting multiple schemes.
 */
export function transliterate(
  text: string,
  fromScheme: 'devanagari' | 'iast' | 'cs_phonetic',
  toScheme: 'devanagari' | 'iast' | 'cs_phonetic',
  customRules?: Partial<CzechPhoneticRules>
): string {
  if (!text) return '';
  if (fromScheme === toScheme) return text;

  let iastText = '';
  if (fromScheme === 'devanagari') {
    iastText = devanagariToIast(text);
  } else if (fromScheme === 'iast') {
    iastText = text;
  } else {
    iastText = text;
  }

  if (toScheme === 'iast') return iastText;
  if (toScheme === 'devanagari') return iastToDevanagari(iastText);
  if (toScheme === 'cs_phonetic') return iastToCzechPhonetic(iastText, customRules);

  return text;
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
