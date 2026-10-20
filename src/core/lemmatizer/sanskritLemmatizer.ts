import { devanagariToIast } from '../transliteration/engine.ts';

export interface MorphAnalysis {
  lemma: string;
  pos: 'noun' | 'verb' | 'indeclinable' | 'pronoun' | 'participle';
  stem?: string;
  gender?: 'masculine' | 'feminine' | 'neuter';
  case?: 'nominative' | 'accusative' | 'instrumental' | 'dative' | 'ablative' | 'genitive' | 'locative' | 'vocative';
  number?: 'singular' | 'dual' | 'plural';
  /** Display form of the root, e.g. "√bhū" */
  root?: string;
  /** Bare dhātu for derivation engines, e.g. "bhū" */
  dhatu?: string;
  /** Verbal class (gaṇa) number 1–10 */
  gana?: number;
  person?: '1st' | '2nd' | '3rd';
  tense?: string;
  voice?: 'active' | 'middle' | 'passive';
  label_cs: string;
  label_en: string;
  confidence: number;
}

// Common indeclinables
const INDECLINABLES: Record<string, { desc_cs: string; desc_en: string }> = {
  'atha': { desc_cs: 'iniciační částice, nyní', desc_en: 'inceptive particle, now' },
  'eva': { desc_cs: 'zdůrazňovací částice, právě, pouze', desc_en: 'emphatic particle, only, indeed' },
  'ca': { desc_cs: 'spojka a, i', desc_en: 'conjunction and' },
  'vā': { desc_cs: 'spojka nebo, anebo', desc_en: 'conjunction or' },
  'tu': { desc_cs: 'odpůrčí částice ale, avšak', desc_en: 'adversative particle but, however' },
  'api': { desc_cs: 'také, i, dokonce', desc_en: 'also, even' },
  'iti': { desc_cs: 'uvozovací částice přímé řeči', desc_en: 'quotative particle thus' },
  'iva': { desc_cs: 'přirovnávací částice jako', desc_en: 'comparative particle like, as' },
  'yathā': { desc_cs: 'jako, jakým způsobem', desc_en: 'just as, in which manner' },
  'tathā': { desc_cs: 'tak, tím způsobem', desc_en: 'so, in that manner' },
  'na': { desc_cs: 'záporka ne', desc_en: 'negative particle not' },
  'mā': { desc_cs: 'prohibitivní záporka ať ne, nikoliv', desc_en: 'prohibitive particle do not' },
  'punar': { desc_cs: 'znovu, opět', desc_en: 'again' },
  'yadā': { desc_cs: 'když, kdykoliv', desc_en: 'when' },
  'tadā': { desc_cs: 'tehdy', desc_en: 'then' },
  'sadā': { desc_cs: 'vždy, neustále', desc_en: 'always' },
  'vinā': { desc_cs: 'bez (s instrumentálem/akuzativem)', desc_en: 'without' },
  'saha': { desc_cs: 'spolu s (s instrumentálem)', desc_en: 'with, together' },
  'hi': { desc_cs: 'neboť, vždyť', desc_en: 'for, indeed' },
  'khalu': { desc_cs: 'věru, zajisté', desc_en: 'indeed, surely' },
  'nu': { desc_cs: 'tedy, nyní (tázací zesilovač)', desc_en: 'now, then (interrogative particle)' },
  'evam': { desc_cs: 'tak, takto', desc_en: 'thus, in this way' },
  'iha': { desc_cs: 'zde, na tomto světě', desc_en: 'here, in this world' },
  'atra': { desc_cs: 'zde, v tom', desc_en: 'here, in this' },
  'tatra': { desc_cs: 'tam, v tom', desc_en: 'there, therein' },
  'yatra': { desc_cs: 'kde, kam', desc_en: 'where' },
  'kva': { desc_cs: 'kde?', desc_en: 'where?' },
  'adya': { desc_cs: 'dnes, nyní', desc_en: 'today, now' },
  'yadi': { desc_cs: 'jestliže, pokud', desc_en: 'if' },
  'ced': { desc_cs: 'jestliže, pokud', desc_en: 'if' },
  'tathāpi': { desc_cs: 'přesto, nicméně', desc_en: 'nevertheless' },
  'kadācana': { desc_cs: 'kdykoli (se záporkou: nikdy)', desc_en: 'ever (with negation: never)' },
  'kadācit': { desc_cs: 'někdy, kdysi', desc_en: 'sometimes, once' },
  'sarvadā': { desc_cs: 'vždy, za všech okolností', desc_en: 'always' },
  'ataḥ': { desc_cs: 'proto, odtud', desc_en: 'therefore, hence' }
};

type VerbForm = { person: '1st' | '2nd' | '3rd'; number: 'singular' | 'dual' | 'plural'; voice: 'active' | 'middle' };

const THEMATIC_FORMS: Record<string, VerbForm> = {
  ati: { person: '3rd', number: 'singular', voice: 'active' },
  anti: { person: '3rd', number: 'plural', voice: 'active' },
  ate: { person: '3rd', number: 'singular', voice: 'middle' },
  ante: { person: '3rd', number: 'plural', voice: 'middle' },
  asi: { person: '2nd', number: 'singular', voice: 'active' },
  āmi: { person: '1st', number: 'singular', voice: 'active' },
  āmaḥ: { person: '1st', number: 'plural', voice: 'active' }
};

// Common present stems with their dhātu and gaṇa; `forms` overrides the thematic endings
const VERB_STEMS: Record<string, { dhatu: string; gana: number; forms?: Record<string, VerbForm> }> = {
  'bhav': { dhatu: 'bhū', gana: 1 },
  'gacch': { dhatu: 'gam', gana: 1 },
  'paśy': { dhatu: 'dṛś', gana: 1 },
  'tiṣṭh': { dhatu: 'sthā', gana: 1 },
  'vad': { dhatu: 'vad', gana: 1 },
  'pat': { dhatu: 'pat', gana: 1 },
  'dhāv': { dhatu: 'dhāv', gana: 1 },
  'smar': { dhatu: 'smṛ', gana: 1 },
  'nay': { dhatu: 'nī', gana: 1 },
  'jay': { dhatu: 'ji', gana: 1 },
  'vas': { dhatu: 'vas', gana: 1 },
  'dhar': { dhatu: 'dhṛ', gana: 1 },
  'kar': {
    dhatu: 'kṛ',
    gana: 8,
    forms: {
      oti: { person: '3rd', number: 'singular', voice: 'active' },
      oṣi: { person: '2nd', number: 'singular', voice: 'active' },
      omi: { person: '1st', number: 'singular', voice: 'active' }
    }
  },
  'kur': {
    dhatu: 'kṛ',
    gana: 8,
    forms: {
      vanti: { person: '3rd', number: 'plural', voice: 'active' },
      ute: { person: '3rd', number: 'singular', voice: 'middle' },
      vate: { person: '3rd', number: 'plural', voice: 'middle' }
    }
  },
  'jān': {
    dhatu: 'jñā',
    gana: 9,
    forms: {
      āti: { person: '3rd', number: 'singular', voice: 'active' },
      anti: { person: '3rd', number: 'plural', voice: 'active' },
      āsi: { person: '2nd', number: 'singular', voice: 'active' },
      āmi: { person: '1st', number: 'singular', voice: 'active' }
    }
  }
};

const PERSON_LABEL = { '1st': { cs: '1.', en: '1st' }, '2nd': { cs: '2.', en: '2nd' }, '3rd': { cs: '3.', en: '3rd' } };
const NUMBER_LABEL = { singular: 'sg.', dual: 'du.', plural: 'pl.' };

/**
 * Client-Side Sanskrit Lemmatizer & Morphological Analyzer.
 * Runs 100% in-browser with zero server dependency.
 */
export function analyzeSanskritWord(inputWord: string): MorphAnalysis[] {
  if (!inputWord) return [];

  // Convert to IAST if input is Devanagari; strip surrounding punctuation and verse numbers
  const raw = /[\u0900-\u097F]/.test(inputWord) ? devanagariToIast(inputWord) : inputWord;
  const iast = raw
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/^[\s"'„“”‚‘’()[\]|।॥.,;:!?0-9०-९-]+|[\s"„“”‚‘’()[\]|।॥.,;:!?0-9०-९-]+$/g, '');

  if (!iast) return [];

  const results: MorphAnalysis[] = [];

  // 1. Check Indeclinables
  if (INDECLINABLES[iast]) {
    results.push({
      lemma: iast,
      pos: 'indeclinable',
      label_cs: `nesklonné slovo (${INDECLINABLES[iast].desc_cs})`,
      label_en: `indeclinable (${INDECLINABLES[iast].desc_en})`,
      confidence: 1.0
    });
    return results;
  }

  // 2. Check Verbs (present indicative)
  for (const [stem, info] of Object.entries(VERB_STEMS)) {
    if (!iast.startsWith(stem)) continue;
    const suffix = iast.slice(stem.length);
    const form = (info.forms || THEMATIC_FORMS)[suffix];
    if (!form) continue;

    const root = `√${info.dhatu}`;
    const voiceCs = form.voice === 'middle' ? 'méd.' : 'akt.';
    const voiceEn = form.voice === 'middle' ? 'middle' : 'active';
    results.push({
      lemma: root,
      pos: 'verb',
      root,
      dhatu: info.dhatu,
      gana: info.gana,
      person: form.person,
      number: form.number,
      tense: 'present',
      voice: form.voice,
      label_cs: `sloveso ${PERSON_LABEL[form.person].cs} os. ${NUMBER_LABEL[form.number]} prézens ${voiceCs} (${root}, ${info.gana}. třída, kmen ${stem}-)`,
      label_en: `verb ${PERSON_LABEL[form.person].en} ${NUMBER_LABEL[form.number]} present ${voiceEn} (${root}, class ${info.gana}, stem ${stem}-)`,
      confidence: form.voice === 'middle' ? 0.9 : 0.95
    });
  }

  // 3. Check Masculine/Neuter -a stem nouns (e.g. yoga, citta, dharma, karma)
  // -asya -> genitive singular (e.g. yogasya -> yoga)
  if (iast.endsWith('asya') && iast.length > 4) {
    const stem = iast.slice(0, -4) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'genitive',
      number: 'singular',
      label_cs: `m./n. gen. sg. (kmen ${stem})`,
      label_en: `m./n. gen. sg. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // -eṇa / -ena -> instrumental singular (e.g. yogena -> yoga)
  if ((iast.endsWith('ena') || iast.endsWith('eṇa')) && iast.length > 3) {
    const stem = iast.slice(0, -3) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'instrumental',
      number: 'singular',
      label_cs: `m./n. instr. sg. (kmen ${stem})`,
      label_en: `m./n. instr. sg. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // -āt / -ād -> ablative singular (e.g. yogāt -> yoga)
  if ((iast.endsWith('āt') || iast.endsWith('ād')) && iast.length > 2) {
    const stem = iast.slice(0, -2) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'ablative',
      number: 'singular',
      label_cs: `m./n. abl. sg. (kmen ${stem})`,
      label_en: `m./n. abl. sg. (stem ${stem})`,
      confidence: 0.9
    });
  }

  // -āya -> dative singular (e.g. yogāya -> yoga)
  if (iast.endsWith('āya') && iast.length > 3) {
    const stem = iast.slice(0, -3) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'dative',
      number: 'singular',
      label_cs: `m./n. dat. sg. (kmen ${stem})`,
      label_en: `m./n. dat. sg. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // -e -> locative singular (e.g. yoge -> yoga)
  if (iast.endsWith('e') && iast.length > 2) {
    const stem = iast.slice(0, -1) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'locative',
      number: 'singular',
      label_cs: `m./n. lok. sg. (kmen ${stem})`,
      label_en: `m./n. loc. sg. (stem ${stem})`,
      confidence: 0.85
    });
  }

  // -aḥ -> nominative singular masculine (e.g. yogaḥ -> yoga)
  if (iast.endsWith('aḥ') && iast.length > 2) {
    const stem = iast.slice(0, -1);
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'nominative',
      number: 'singular',
      label_cs: `m. nom. sg. (kmen ${stem})`,
      label_en: `m. nom. sg. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // -am -> accusative singular masculine OR nominative/accusative singular neuter (e.g. yogam / cittatam)
  if (iast.endsWith('am') && iast.length > 2) {
    const stem = iast.slice(0, -1);
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'accusative',
      number: 'singular',
      label_cs: `m. akuz. sg. nebo n. nom./akuz. sg. (kmen ${stem})`,
      label_en: `m. acc. sg. or n. nom./acc. sg. (stem ${stem})`,
      confidence: 0.9
    });
  }

  // -āḥ -> nominative plural masculine
  if (iast.endsWith('āḥ') && iast.length > 2) {
    const stem = iast.slice(0, -2) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'masculine',
      case: 'nominative',
      number: 'plural',
      label_cs: `m. nom. pl. (kmen ${stem})`,
      label_en: `m. nom. pl. (stem ${stem})`,
      confidence: 0.88
    });
  }

  // -eṣu -> locative plural (e.g. phaleṣu -> phala)
  if (iast.endsWith('eṣu') && iast.length > 3) {
    const stem = iast.slice(0, -3) + 'a';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'neuter',
      case: 'locative',
      number: 'plural',
      label_cs: `m./n. lok. pl. (kmen ${stem})`,
      label_en: `m./n. loc. pl. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // 4. Check Feminine -ā stem (e.g. kanyā, vidyā, śraddhā)
  if (iast.endsWith('āyāḥ') && iast.length > 4) {
    const stem = iast.slice(0, -4) + 'ā';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'feminine',
      case: 'genitive',
      number: 'singular',
      label_cs: `f. gen./abl. sg. (kmen ${stem})`,
      label_en: `f. gen./abl. sg. (stem ${stem})`,
      confidence: 0.9
    });
  }
  if (iast.endsWith('ām') && iast.length > 2) {
    const stem = iast.slice(0, -1);
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'feminine',
      case: 'accusative',
      number: 'singular',
      label_cs: `f. akuz. sg. (kmen ${stem})`,
      label_en: `f. acc. sg. (stem ${stem})`,
      confidence: 0.85
    });
  }

  // 5. Check -i / -in / -an stems (e.g. karmaṇi -> karman, vṛtti -> vṛtti)
  if (iast.endsWith('aṇi') || iast.endsWith('ani')) {
    const stem = iast.slice(0, -3) + 'an';
    results.push({
      lemma: stem,
      pos: 'noun',
      stem,
      gender: 'neuter',
      case: 'locative',
      number: 'singular',
      label_cs: `n. lok. sg. (kmen na -an: ${stem})`,
      label_en: `n. loc. sg. (stem ${stem})`,
      confidence: 0.95
    });
  }

  // Fallback default: dictionary stem itself (e.g. citta, yoga, vṛtti, nirodha)
  if (results.length === 0) {
    results.push({
      lemma: iast.replace(/ḥ$/, ''),
      pos: 'noun',
      stem: iast,
      label_cs: `základní kmen / tvar ve složenině (samāsa)`,
      label_en: `nominal stem / compound member`,
      confidence: 0.7
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
