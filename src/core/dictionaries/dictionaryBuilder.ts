import { Token } from '../types/schema.ts';

export type DictionaryProviderId =
  | 'cologne_mw'
  | 'cologne_apte'
  | 'wisdomlib'
  | 'ambuda'
  | 'learnsanskrit'
  | 'ashtadhyayi';

export interface DictionaryProvider {
  id: DictionaryProviderId;
  name: string;
  category: 'dictionary' | 'grammar' | 'encyclopedia';
  description: string;
  getUrl: (wordOrLemma: string, token?: Token) => string;
}

/**
 * Clean root radical symbols, hyphens, and whitespace for dictionary search.
 */
export function sanitizeSearchLemma(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/^√/, '') // remove dhātu root radical symbol
    .replace(/[–—\-_]/g, '')
    .normalize('NFC');
}

/**
 * Convert IAST to Harvard-Kyoto for query parameters.
 */
export function iastToHk(iast: string): string {
  return iast
    .replace(/ā/g, 'A')
    .replace(/ī/g, 'I')
    .replace(/ū/g, 'U')
    .replace(/ṝ/g, 'RR')
    .replace(/ṛ/g, 'R')
    .replace(/ḹ/g, 'lRR')
    .replace(/ḷ/g, 'lR')
    .replace(/ṅ/g, 'G')
    .replace(/ñ/g, 'J')
    .replace(/ṭ/g, 'T')
    .replace(/ṭh/g, 'Th')
    .replace(/ḍ/g, 'D')
    .replace(/ḍh/g, 'Dh')
    .replace(/ṇ/g, 'N')
    .replace(/ś/g, 'z')
    .replace(/ṣ/g, 'S')
    .replace(/ṃ/g, 'M')
    .replace(/ḥ/g, 'H');
}

/**
 * Verified, active and working online Sanskrit reference tools
 */
export const DICTIONARY_PROVIDERS: Record<DictionaryProviderId, DictionaryProvider> = {
  cologne_mw: {
    id: 'cologne_mw',
    name: 'Cologne Monier-Williams',
    category: 'dictionary',
    description: 'Nejautoritativnější akademický sanskrtsko-anglický slovník (Cologne Digital Lexicon).',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      return `https://www.sanskrit-lexicon.uni-koeln.de/simple/mw/${encodeURIComponent(clean)}`;
    }
  },
  cologne_apte: {
    id: 'cologne_apte',
    name: 'Cologne Apte (AP90)',
    category: 'dictionary',
    description: 'Praktický sanskrtský slovník V. S. Apteho pro klasickou literaturu.',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      return `https://www.sanskrit-lexicon.uni-koeln.de/simple/ap90/${encodeURIComponent(clean)}`;
    }
  },
  wisdomlib: {
    id: 'wisdomlib',
    name: 'WisdomLib Sanskrit',
    category: 'encyclopedia',
    description: 'Rychlá a spolehlivá encyklopedie propojující Monier-Williams, jógové tradice i purány.',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      return `https://www.wisdomlib.org/definition/${encodeURIComponent(clean)}`;
    }
  },
  ambuda: {
    id: 'ambuda',
    name: 'Ambuda.org Dictionaries',
    category: 'dictionary',
    description: 'Moderní otevřený indologický projekt integrující MW, Apte, Shabda-Sagara i Vachaspatyam.',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      // The ?q= form redirects to the index page and drops the query; the path form searches
      return `https://ambuda.org/tools/dictionaries/mw/${encodeURIComponent(clean)}`;
    }
  },
  learnsanskrit: {
    id: 'learnsanskrit',
    name: 'LearnSanskrit.cc',
    category: 'dictionary',
    description: 'Přehledný moderní slovník s okamžitým vyhledáváním a podporou IAST i Dévanágarí.',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      return `https://www.learnsanskrit.cc/translate?search=${encodeURIComponent(clean)}&dir=se`;
    }
  },
  ashtadhyayi: {
    id: 'ashtadhyayi',
    name: 'Ashtadhyayi.com Kosha',
    category: 'grammar',
    description: 'Špičkový indický portál pro tradiční sanskrtskou gramatiku, kořeny (dhātus) a morfologii.',
    getUrl: (word) => {
      const clean = sanitizeSearchLemma(word);
      return `https://ashtadhyayi.com/kosha?search=${encodeURIComponent(clean)}`;
    }
  }
};

/**
 * Get dictionary or reference link for a token or word.
 */
export function getDictionaryUrl(
  tokenOrWord: Token | string,
  providerId: DictionaryProviderId = 'cologne_mw'
): string {
  const provider = DICTIONARY_PROVIDERS[providerId] || DICTIONARY_PROVIDERS.cologne_mw;

  let lookupWord = '';
  if (typeof tokenOrWord === 'string') {
    lookupWord = tokenOrWord;
  } else {
    lookupWord = tokenOrWord.dictionaryLookup || tokenOrWord.lemma || tokenOrWord.text.iast;
  }

  return provider.getUrl(lookupWord, typeof tokenOrWord === 'object' ? tokenOrWord : undefined);
}
