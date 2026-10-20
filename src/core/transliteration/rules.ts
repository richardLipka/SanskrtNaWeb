import { CzechPhoneticRules, CzechPhoneticRulesSchema } from '../types/schema.ts';

/**
 * Standard default rules for Czech phonetic Sanskrit transcription
 * Based on Czech indological and yoga traditions (D. Zbavitel, I. Chmelař, V. Miltner).
 */
export const DEFAULT_CZECH_RULES: CzechPhoneticRules = {
  rSyllabic: 'r',           // ṛ -> r (e.g. vṛtti -> vrtti)
  rSyllabicLong: 'rí',       // ṝ -> rí
  lSyllabic: 'l',           // ḷ -> l
  sibilantPalatal: 'š',     // ś -> š (e.g. śiva -> šiva)
  sibilantRetroflex: 'š',   // ṣ -> š (e.g. kṛṣṇa -> kršna)
  cPalatal: 'č',            // c -> č (e.g. citta -> čitta)
  chAspirated: 'čh',        // ch -> čh
  jAffricate: 'dž',         // j -> dž (e.g. jñāna -> džňána / rājā -> rádžá)
  jhAspirated: 'džh',       // jh -> džh
  ySemivowel: 'j',          // y -> j (e.g. yoga -> jóga)
  vSemivowel: 'v',          // v -> v
  longVowels: 'czech_accents', // ā, ī, ū -> á, í, ú
  anusvaraMode: 'simple_m', // ṃ -> m
  visargaMode: 'h',         // ḥ -> h
  customWordOverrides: {
    // Curated standard Czech yoga dictionary entries
    'yoga': 'jóga',
    'yogaḥ': 'jógah',
    'yoge': 'józe',
    'yogin': 'jógín',
    'yogī': 'jógí',
    'āsana': 'ásana',
    'prāṇāyāma': 'pránájáma',
    'samādhi': 'samádhi',
    'samādhiḥ': 'samádhih',
    'patañjali': 'pataňdžali',
    'patañjaliḥ': 'pataňdžalih',
    'haṭha': 'hatha',
    'kuṇḍalinī': 'kundaliní',
    'om': 'óm',
    'oṃ': 'óm'
  }
};

/**
 * Validate and merge partial custom rules with defaults.
 */
export function createCzechRules(custom: Partial<CzechPhoneticRules> = {}): CzechPhoneticRules {
  const merged = {
    ...DEFAULT_CZECH_RULES,
    ...custom,
    customWordOverrides: {
      ...DEFAULT_CZECH_RULES.customWordOverrides,
      ...(custom.customWordOverrides || {})
    }
  };
  return CzechPhoneticRulesSchema.parse(merged);
}

/**
 * Serialize rules to formatted JSON for disk saving.
 */
export function exportRulesToJSON(rules: CzechPhoneticRules): string {
  return JSON.stringify(rules, null, 2);
}

/**
 * Parse and validate rules from JSON string loaded from disk.
 */
export function importRulesFromJSON(jsonString: string): CzechPhoneticRules {
  const parsed = JSON.parse(jsonString);
  return CzechPhoneticRulesSchema.parse(parsed);
}
