import { devanagariToIast } from '../transliteration/engine.ts';

export interface MorphAnalysis {
  lemma: string;
  pos: 'noun' | 'verb' | 'indeclinable' | 'pronoun' | 'participle';
  stem?: string;
  gender?: 'masculine' | 'feminine' | 'neuter';
  case?: 'nominative' | 'accusative' | 'instrumental' | 'dative' | 'ablative' | 'genitive' | 'locative' | 'vocative';
  number?: 'singular' | 'dual' | 'plural';
  root?: string;
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
  'vina': { desc_cs: 'bez', desc_en: 'without' },
  'saha': { desc_cs: 'spolu s (s instrumentálem)', desc_en: 'with, together' }
};

// Common verb patterns (Present active 3rd person)
const VERB_STEMS: Record<string, { root: string; class: number }> = {
  'bhav': { root: '√bhū (bhav)', class: 1 },
  'kar': { root: '√kṛ', class: 8 },
  'kurv': { root: '√kṛ', class: 8 },
  'gacch': { root: '√gam (gacch)', class: 1 },
  'paśy': { root: '√dṛś (paśy)', class: 1 },
  'tiṣṭh': { root: '√sthā (tiṣṭh)', class: 1 },
  'vad': { root: '√vad', class: 1 },
  'pat': { root: '√pat', class: 1 },
  'dhāv': { root: '√dhāv', class: 1 },
  'smar': { root: '√smṛ', class: 1 },
  'nay': { root: '√nī', class: 1 },
  'jay': { root: '√ji', class: 1 },
  'vas': { root: '√vas', class: 1 },
  'dhar': { root: '√dhṛ', class: 1 },
  'jñā': { root: '√jñā', class: 9 }
};

/**
 * Client-Side Sanskrit Lemmatizer & Morphological Analyzer.
 * Runs 100% in-browser with zero server dependency.
 */
export function analyzeSanskritWord(inputWord: string): MorphAnalysis[] {
  if (!inputWord) return [];

  // Convert to IAST if input is Devanagari
  const iast = /[\u0900-\u097F]/.test(inputWord)
    ? devanagariToIast(inputWord).trim().toLowerCase()
    : inputWord.trim().toLowerCase();

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

  // 2. Check Verbs (Present active/middle)
  for (const [stem, info] of Object.entries(VERB_STEMS)) {
    if (iast.startsWith(stem)) {
      const suffix = iast.slice(stem.length);

      // 3rd singular active (-ti)
      if (suffix === 'ati' || suffix === 'ti') {
        results.push({
          lemma: info.root,
          pos: 'verb',
          root: info.root,
          person: '3rd',
          number: 'singular',
          tense: 'present',
          voice: 'active',
          label_cs: `sloveso 3. os. sg. prézens akt. (${info.root})`,
          label_en: `verb 3rd sg. present active (${info.root})`,
          confidence: 0.95
        });
      }
      // 3rd plural active (-anti)
      if (suffix === 'anti') {
        results.push({
          lemma: info.root,
          pos: 'verb',
          root: info.root,
          person: '3rd',
          number: 'plural',
          tense: 'present',
          voice: 'active',
          label_cs: `sloveso 3. os. pl. prézens akt. (${info.root})`,
          label_en: `verb 3rd pl. present active (${info.root})`,
          confidence: 0.95
        });
      }
      // 3rd singular middle (-te)
      if (suffix === 'ate' || suffix === 'te') {
        results.push({
          lemma: info.root,
          pos: 'verb',
          root: info.root,
          person: '3rd',
          number: 'singular',
          tense: 'present',
          voice: 'middle',
          label_cs: `sloveso 3. os. sg. prézens méd. (${info.root})`,
          label_en: `verb 3rd sg. present middle (${info.root})`,
          confidence: 0.9
        });
      }
    }
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
