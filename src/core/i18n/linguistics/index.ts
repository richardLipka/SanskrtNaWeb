/**
 * Sanskrit Linguistic Dictionary System
 * 
 * Provides rigorous, multi-language philological terminology
 * (Pāṇinian Sanskrit, Czech indological tradition, English classical Indology).
 */

import { SupportedLanguage } from '../types.ts';
import { Grammar } from '../../types/schema.ts';
import {
  LinguisticDictionary,
  FormattedGrammarResult
} from './types.ts';
import { CZECH_LINGUISTICS } from './cs.ts';
import { ENGLISH_LINGUISTICS } from './en.ts';

export * from './types.ts';
export { CZECH_LINGUISTICS } from './cs.ts';
export { ENGLISH_LINGUISTICS } from './en.ts';

/**
 * Returns the linguistic dictionary for the requested language.
 * Defaults to Czech ('cs') with English fallback.
 */
export function getLinguisticDictionary(lang: SupportedLanguage = 'cs'): LinguisticDictionary {
  if (lang === 'en') {
    return ENGLISH_LINGUISTICS;
  }
  return CZECH_LINGUISTICS;
}

/**
 * Formats structured grammar metadata into rigorous bilingual human-readable philological labels.
 */
export function formatGrammarAnalysis(grammar?: Grammar, lang: SupportedLanguage = 'cs'): FormattedGrammarResult {
  const dict = getLinguisticDictionary(lang);

  if (!grammar) {
    return {
      fullLabel: dict.titles.unspecified,
      shortBadge: '—',
      categoryColor: '#94a3b8',
      details: []
    };
  }

  const details: Array<{ title: string; value: string }> = [];
  const parts: string[] = [];
  const shortParts: string[] = [];
  let categoryColor = '#94a3b8';

  // POS
  if (grammar.pos && dict.pos[grammar.pos]) {
    const pos = dict.pos[grammar.pos];
    details.push({
      title: dict.titles.pos,
      value: `${pos.label} (${pos.sanskrit})`
    });
    categoryColor = pos.color;
  }

  // Root or Stem
  if (grammar.root) {
    details.push({
      title: dict.titles.root,
      value: grammar.root
    });
  }
  if (grammar.stem) {
    details.push({
      title: dict.titles.stem,
      value: grammar.stem
    });
  }

  // Gender
  if (grammar.gender && dict.genders[grammar.gender]) {
    const g = dict.genders[grammar.gender];
    parts.push(g.label);
    shortParts.push(g.short);
    details.push({
      title: dict.titles.gender,
      value: `${g.label} (${g.sanskrit})`
    });
  }

  // Case
  if (grammar.case && dict.vibhaktis[grammar.case]) {
    const c = dict.vibhaktis[grammar.case];
    parts.push(c.label);
    shortParts.push(c.short);
    categoryColor = c.color;
    details.push({
      title: dict.titles.case,
      value: `${c.label} [${c.sanskritDeva} / ${c.sanskrit}]`
    });
  }

  // Number
  if (grammar.number && dict.numbers[grammar.number]) {
    const n = dict.numbers[grammar.number];
    parts.push(n.label);
    shortParts.push(n.short);
    details.push({
      title: dict.titles.number,
      value: `${n.label} (${n.sanskrit})`
    });
  }

  // Verb Person, Tense, Mood, Voice
  if (grammar.person && dict.verbPersons[grammar.person]) {
    const p = dict.verbPersons[grammar.person];
    parts.push(p.label);
    details.push({
      title: dict.titles.person,
      value: `${p.label} (${p.sanskrit})`
    });
  }

  if (grammar.voice && dict.verbVoices[grammar.voice]) {
    const v = dict.verbVoices[grammar.voice];
    parts.push(v.label);
    details.push({
      title: dict.titles.voice,
      value: `${v.label} (${v.sanskrit})`
    });
  }

  if (grammar.tense || grammar.mood) {
    const tm = [grammar.tense, grammar.mood].filter(Boolean).join(' ');
    parts.push(tm);
    details.push({
      title: dict.titles.tenseMood,
      value: tm
    });
  }

  // Fallback to pre-recorded label if available
  let fullLabel = parts.join(', ');
  if (!fullLabel) {
    fullLabel = lang === 'cs' ? (grammar.label_cs || grammar.label_en || '—') : (grammar.label_en || grammar.label_cs || '—');
  }

  const shortBadge = shortParts.length > 0 ? shortParts.join(' ') : (grammar.pos || '—');

  return {
    fullLabel,
    shortBadge,
    categoryColor,
    details
  };
}

/**
 * Returns the localized label for a metrical weight (Laghu/Guru).
 */
export function getMeterWeightLabel(weight: 'L' | 'G' | string, lang: SupportedLanguage = 'cs'): string {
  const dict = getLinguisticDictionary(lang);
  if (weight === 'L' || weight === 'G') {
    return dict.chandasWeights[weight].label;
  }
  return weight;
}

/**
 * Returns the localized label for a compound type (Samāsa).
 */
export function getCompoundTypeLabel(type: string, lang: SupportedLanguage = 'cs'): string {
  const dict = getLinguisticDictionary(lang);
  return dict.compoundTypes[type]?.label || type;
}

/**
 * Returns the localized label for a sandhi split type.
 */
export function getSandhiTypeLabel(type: string, lang: SupportedLanguage = 'cs'): string {
  const dict = getLinguisticDictionary(lang);
  return dict.sandhiTypes[type]?.label || type;
}

// ============================================================================
// Backward-compatibility exports matching original `terminology.ts` API
// ============================================================================

export const VIBHAKTI_TERMS: Record<string, {
  sanskrit: string;
  sanskritDeva: string;
  cs: string;
  en: string;
  shortCs: string;
  shortEn: string;
  color: string;
}> = {
  nominative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.nominative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.nominative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.nominative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.nominative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.nominative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.nominative.short,
    color: CZECH_LINGUISTICS.vibhaktis.nominative.color
  },
  accusative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.accusative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.accusative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.accusative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.accusative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.accusative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.accusative.short,
    color: CZECH_LINGUISTICS.vibhaktis.accusative.color
  },
  instrumental: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.instrumental.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.instrumental.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.instrumental.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.instrumental.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.instrumental.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.instrumental.short,
    color: CZECH_LINGUISTICS.vibhaktis.instrumental.color
  },
  dative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.dative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.dative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.dative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.dative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.dative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.dative.short,
    color: CZECH_LINGUISTICS.vibhaktis.dative.color
  },
  ablative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.ablative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.ablative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.ablative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.ablative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.ablative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.ablative.short,
    color: CZECH_LINGUISTICS.vibhaktis.ablative.color
  },
  genitive: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.genitive.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.genitive.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.genitive.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.genitive.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.genitive.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.genitive.short,
    color: CZECH_LINGUISTICS.vibhaktis.genitive.color
  },
  locative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.locative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.locative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.locative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.locative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.locative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.locative.short,
    color: CZECH_LINGUISTICS.vibhaktis.locative.color
  },
  vocative: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.vocative.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.vocative.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.vocative.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.vocative.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.vocative.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.vocative.short,
    color: CZECH_LINGUISTICS.vibhaktis.vocative.color
  },
  stem_in_compound: {
    sanskrit: CZECH_LINGUISTICS.vibhaktis.stem_in_compound.sanskrit,
    sanskritDeva: CZECH_LINGUISTICS.vibhaktis.stem_in_compound.sanskritDeva,
    cs: CZECH_LINGUISTICS.vibhaktis.stem_in_compound.label,
    en: ENGLISH_LINGUISTICS.vibhaktis.stem_in_compound.label,
    shortCs: CZECH_LINGUISTICS.vibhaktis.stem_in_compound.short,
    shortEn: ENGLISH_LINGUISTICS.vibhaktis.stem_in_compound.short,
    color: CZECH_LINGUISTICS.vibhaktis.stem_in_compound.color
  }
};

export const GENDER_TERMS: Record<string, { cs: string; en: string; shortCs: string; shortEn: string; sanskrit: string }> = {
  masculine: {
    cs: CZECH_LINGUISTICS.genders.masculine.label,
    en: ENGLISH_LINGUISTICS.genders.masculine.label,
    shortCs: CZECH_LINGUISTICS.genders.masculine.short,
    shortEn: ENGLISH_LINGUISTICS.genders.masculine.short,
    sanskrit: CZECH_LINGUISTICS.genders.masculine.sanskrit
  },
  feminine: {
    cs: CZECH_LINGUISTICS.genders.feminine.label,
    en: ENGLISH_LINGUISTICS.genders.feminine.label,
    shortCs: CZECH_LINGUISTICS.genders.feminine.short,
    shortEn: ENGLISH_LINGUISTICS.genders.feminine.short,
    sanskrit: CZECH_LINGUISTICS.genders.feminine.sanskrit
  },
  neuter: {
    cs: CZECH_LINGUISTICS.genders.neuter.label,
    en: ENGLISH_LINGUISTICS.genders.neuter.label,
    shortCs: CZECH_LINGUISTICS.genders.neuter.short,
    shortEn: ENGLISH_LINGUISTICS.genders.neuter.short,
    sanskrit: CZECH_LINGUISTICS.genders.neuter.sanskrit
  },
  any: {
    cs: CZECH_LINGUISTICS.genders.any.label,
    en: ENGLISH_LINGUISTICS.genders.any.label,
    shortCs: CZECH_LINGUISTICS.genders.any.short,
    shortEn: ENGLISH_LINGUISTICS.genders.any.short,
    sanskrit: CZECH_LINGUISTICS.genders.any.sanskrit
  }
};

export const NUMBER_TERMS: Record<string, { cs: string; en: string; shortCs: string; shortEn: string; sanskrit: string }> = {
  singular: {
    cs: CZECH_LINGUISTICS.numbers.singular.label,
    en: ENGLISH_LINGUISTICS.numbers.singular.label,
    shortCs: CZECH_LINGUISTICS.numbers.singular.short,
    shortEn: ENGLISH_LINGUISTICS.numbers.singular.short,
    sanskrit: CZECH_LINGUISTICS.numbers.singular.sanskrit
  },
  dual: {
    cs: CZECH_LINGUISTICS.numbers.dual.label,
    en: ENGLISH_LINGUISTICS.numbers.dual.label,
    shortCs: CZECH_LINGUISTICS.numbers.dual.short,
    shortEn: ENGLISH_LINGUISTICS.numbers.dual.short,
    sanskrit: CZECH_LINGUISTICS.numbers.dual.sanskrit
  },
  plural: {
    cs: CZECH_LINGUISTICS.numbers.plural.label,
    en: ENGLISH_LINGUISTICS.numbers.plural.label,
    shortCs: CZECH_LINGUISTICS.numbers.plural.short,
    shortEn: ENGLISH_LINGUISTICS.numbers.plural.short,
    sanskrit: CZECH_LINGUISTICS.numbers.plural.sanskrit
  }
};

export const POS_TERMS: Record<string, { cs: string; en: string; sanskrit: string; color: string }> = {
  noun: {
    cs: CZECH_LINGUISTICS.pos.noun.label,
    en: ENGLISH_LINGUISTICS.pos.noun.label,
    sanskrit: CZECH_LINGUISTICS.pos.noun.sanskrit,
    color: CZECH_LINGUISTICS.pos.noun.color
  },
  verb: {
    cs: CZECH_LINGUISTICS.pos.verb.label,
    en: ENGLISH_LINGUISTICS.pos.verb.label,
    sanskrit: CZECH_LINGUISTICS.pos.verb.sanskrit,
    color: CZECH_LINGUISTICS.pos.verb.color
  },
  adjective: {
    cs: CZECH_LINGUISTICS.pos.adjective.label,
    en: ENGLISH_LINGUISTICS.pos.adjective.label,
    sanskrit: CZECH_LINGUISTICS.pos.adjective.sanskrit,
    color: CZECH_LINGUISTICS.pos.adjective.color
  },
  indeclinable: {
    cs: CZECH_LINGUISTICS.pos.indeclinable.label,
    en: ENGLISH_LINGUISTICS.pos.indeclinable.label,
    sanskrit: CZECH_LINGUISTICS.pos.indeclinable.sanskrit,
    color: CZECH_LINGUISTICS.pos.indeclinable.color
  },
  pronoun: {
    cs: CZECH_LINGUISTICS.pos.pronoun.label,
    en: ENGLISH_LINGUISTICS.pos.pronoun.label,
    sanskrit: CZECH_LINGUISTICS.pos.pronoun.sanskrit,
    color: CZECH_LINGUISTICS.pos.pronoun.color
  },
  participle: {
    cs: CZECH_LINGUISTICS.pos.participle.label,
    en: ENGLISH_LINGUISTICS.pos.participle.label,
    sanskrit: CZECH_LINGUISTICS.pos.participle.sanskrit,
    color: CZECH_LINGUISTICS.pos.participle.color
  },
  prefix: {
    cs: CZECH_LINGUISTICS.pos.prefix.label,
    en: ENGLISH_LINGUISTICS.pos.prefix.label,
    sanskrit: CZECH_LINGUISTICS.pos.prefix.sanskrit,
    color: CZECH_LINGUISTICS.pos.prefix.color
  },
  particle: {
    cs: CZECH_LINGUISTICS.pos.particle.label,
    en: ENGLISH_LINGUISTICS.pos.particle.label,
    sanskrit: CZECH_LINGUISTICS.pos.particle.sanskrit,
    color: CZECH_LINGUISTICS.pos.particle.color
  }
};

export const VERB_PERSON_TERMS: Record<string, { cs: string; en: string; sanskrit: string }> = {
  '1st': {
    cs: CZECH_LINGUISTICS.verbPersons['1st'].label,
    en: ENGLISH_LINGUISTICS.verbPersons['1st'].label,
    sanskrit: CZECH_LINGUISTICS.verbPersons['1st'].sanskrit
  },
  '2nd': {
    cs: CZECH_LINGUISTICS.verbPersons['2nd'].label,
    en: ENGLISH_LINGUISTICS.verbPersons['2nd'].label,
    sanskrit: CZECH_LINGUISTICS.verbPersons['2nd'].sanskrit
  },
  '3rd': {
    cs: CZECH_LINGUISTICS.verbPersons['3rd'].label,
    en: ENGLISH_LINGUISTICS.verbPersons['3rd'].label,
    sanskrit: CZECH_LINGUISTICS.verbPersons['3rd'].sanskrit
  }
};

export const VERB_VOICE_TERMS: Record<string, { cs: string; en: string; sanskrit: string }> = {
  active: {
    cs: CZECH_LINGUISTICS.verbVoices.active.label,
    en: ENGLISH_LINGUISTICS.verbVoices.active.label,
    sanskrit: CZECH_LINGUISTICS.verbVoices.active.sanskrit
  },
  middle: {
    cs: CZECH_LINGUISTICS.verbVoices.middle.label,
    en: ENGLISH_LINGUISTICS.verbVoices.middle.label,
    sanskrit: CZECH_LINGUISTICS.verbVoices.middle.sanskrit
  },
  passive: {
    cs: CZECH_LINGUISTICS.verbVoices.passive.label,
    en: ENGLISH_LINGUISTICS.verbVoices.passive.label,
    sanskrit: CZECH_LINGUISTICS.verbVoices.passive.sanskrit
  }
};
