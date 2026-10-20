import { Verse } from '../types/schema.ts';

export interface TranslationSuggestion {
  targetWord: string;
  translation: string;
  verseNumber: string;
  verseId: string;
  lang: string;
  frequency: number;
}

/**
 * Extracts a Sanskrit search stem by trimming final case/sandhi vowel/visarga/anusvara endings.
 * E.g. 'pāṇḍava' -> 'pāṇḍav', 'dharmasya' -> 'dharm', 'kurukṣetre' -> 'kurukṣetr'
 */
export function getSanskritSearchStem(word: string): string {
  if (!word) return '';
  const clean = word.trim().toLowerCase();
  // Remove case/gender endings or trailing vowels if length > 3
  const stem = clean.replace(/(?:asya|eṣu|eṇa|āya|āt|ena|ebhiḥ|aiḥ|ānām|īnam|au|am|ān|āḥ|aḥ|iḥ|uḥ|[aāiīuūeoṛṝḷḹḥmṁṃ])$/g, '');
  return stem.length >= 3 ? stem : clean;
}

/**
 * Decides whether an alignment key (normally a translation id such as "cs_fluent")
 * belongs to the target language. Without translation metadata only an exact
 * language code or a "<lang>_" prefix counts ("cs_fluent" is not English).
 */
function isAlignmentKeyForLang(transKey: string, verse: Verse, targetLang: string): boolean {
  const transMeta = verse.translations.find((t) => t.id === transKey);
  if (transMeta) return transMeta.lang === targetLang;
  return transKey === targetLang || transKey.startsWith(`${targetLang}_`);
}

/**
 * Fuzzy match between a query and a token form. Containment in either direction is only
 * accepted for forms of at least 3 letters, so particles like "na" or "ca" do not match
 * every query that happens to contain those letters.
 */
function formMatches(form: string, q: string, stemQ: string): boolean {
  if (!form) return false;
  if (form === q) return true;
  if (q.length >= 3 && form.includes(q)) return true;
  if (form.length >= 3 && q.includes(form)) return true;
  if (stemQ.length >= 3 && (form.includes(stemQ) || getSanskritSearchStem(form).includes(stemQ))) return true;
  return false;
}

const VARNAMALA = [
  'a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'e', 'ai', 'o', 'au', 'ṃ', 'ḥ',
  'k', 'kh', 'g', 'gh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 'ṇ',
  't', 'th', 'd', 'dh', 'n', 'p', 'ph', 'b', 'bh', 'm', 'y', 'r', 'l', 'v', 'ś', 'ṣ', 's', 'h'
];
const VARNA_RANK = new Map(VARNAMALA.map((v, i) => [v, i]));
const VARNA_UNITS = [...VARNAMALA].sort((a, b) => b.length - a.length);

function toVarnaKeys(word: string): number[] {
  const w = word.normalize('NFC').toLowerCase().replace(/^√/, '');
  const keys: number[] = [];
  let i = 0;
  while (i < w.length) {
    const unit = VARNA_UNITS.find((u) => w.startsWith(u, i));
    if (unit) {
      keys.push(VARNA_RANK.get(unit)!);
      i += unit.length;
    } else {
      keys.push(1000 + w.charCodeAt(i));
      i++;
    }
  }
  return keys;
}

/**
 * Compares two IAST words in traditional Sanskrit alphabetical order (varṇamālā):
 * a ā i ī … ṃ ḥ k kh g … ś ṣ s h.
 */
export function sanskritCompare(a: string, b: string): number {
  const ka = toVarnaKeys(a);
  const kb = toVarnaKeys(b);
  for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return ka.length - kb.length;
}

/**
 * Searches the entire book/corpus for prior translations of the given Sanskrit word or lemma.
 * This provides the editor with auto-glossary suggestions:
 * "V jiném verši v této knize jsi stejné slovo přeložil jako..."
 */
export function getTranslationSuggestions(
  verses: Verse[],
  queryWord: string,
  targetLang = 'cs'
): TranslationSuggestion[] {
  if (!queryWord || !queryWord.trim()) {
    return [];
  }

  const q = queryWord.trim().toLowerCase();
  const stemQ = getSanskritSearchStem(q);
  const suggestionsMap = new Map<string, TranslationSuggestion>();

  for (const v of verses) {
    for (const token of v.tokens) {
      const tokenIast = token.text.iast.toLowerCase();
      const tokenLemma = token.lemma ? token.lemma.toLowerCase() : '';

      const matchIast = formMatches(tokenIast, q, stemQ);

      const rawQuery = queryWord.trim();
      const matchDeva =
        token.text.devanagari === rawQuery ||
        (rawQuery.length >= 2 && token.text.devanagari.includes(rawQuery));

      const matchLemma = formMatches(tokenLemma, q, stemQ);

      if (matchIast || matchDeva || matchLemma) {
        // 1. Check aligned words in translations
        if (token.alignment && token.alignment.matched_words) {
          for (const [transKey, words] of Object.entries(token.alignment.matched_words)) {
            if (isAlignmentKeyForLang(transKey, v, targetLang)) {
              for (const word of words) {
                const cleanWord = word.replace(/[\[\]]/g, '').trim();
                if (cleanWord.length > 0) {
                  const key = cleanWord.toLowerCase();
                  if (suggestionsMap.has(key)) {
                    suggestionsMap.get(key)!.frequency += 10;
                  } else {
                    suggestionsMap.set(key, {
                      targetWord: token.text.iast,
                      translation: cleanWord,
                      verseNumber: v.number,
                      verseId: v.id,
                      lang: targetLang,
                      frequency: 10
                    });
                  }
                }
              }
            }
          }
        }

        // 2. Check token vocabulary definitions in target language
        const vocab = token.vocabulary;
        if (vocab) {
          const langEntry = vocab.meanings_by_lang?.[targetLang];
          if (langEntry && langEntry.contextual) {
            const cleanMeaning = langEntry.contextual.trim();
            const key = cleanMeaning.toLowerCase();
            if (suggestionsMap.has(key)) {
              suggestionsMap.get(key)!.frequency += 1;
            } else {
              suggestionsMap.set(key, {
                targetWord: token.text.iast,
                translation: cleanMeaning,
                verseNumber: v.number,
                verseId: v.id,
                lang: targetLang,
                frequency: 1
              });
            }
          } else if (targetLang === 'cs' && vocab.contextual_meaning_cs) {
            const cleanMeaning = vocab.contextual_meaning_cs.trim();
            const key = cleanMeaning.toLowerCase();
            if (suggestionsMap.has(key)) {
              suggestionsMap.get(key)!.frequency += 1;
            } else {
              suggestionsMap.set(key, {
                targetWord: token.text.iast,
                translation: cleanMeaning,
                verseNumber: v.number,
                verseId: v.id,
                lang: targetLang,
                frequency: 1
              });
            }
          }
        }
      }
    }
  }

  return Array.from(suggestionsMap.values()).sort((a, b) => b.frequency - a.frequency);
}

export interface WordConcordanceItem {
  verseId: string;
  verseNumber: string;
  book?: string;
  chapter?: string;
  token: {
    devanagari: string;
    iast: string;
    lemma?: string;
  };
  contextDevanagari: string;
  contextIast: string;
  translations: string[];
}

/**
 * Searches for all occurrences of a word or lemma across all verses in the corpus.
 * Returns rich contextual information for concordance display.
 */
export function findWordConcordance(verses: Verse[], query: string): WordConcordanceItem[] {
  if (!query || !query.trim()) {
    return [];
  }

  const q = query.trim().toLowerCase();
  const stemQ = getSanskritSearchStem(q);
  const results: WordConcordanceItem[] = [];

  for (const v of verses) {
    const matchingTokens = v.tokens.filter((tk) => {
      const iast = tk.text.iast.toLowerCase();
      const lemma = tk.lemma ? tk.lemma.toLowerCase() : '';
      const deva = tk.text.devanagari;
      const rawQuery = query.trim();
      return (
        iast === q ||
        (q.length >= 2 && iast.includes(q)) ||
        deva === rawQuery ||
        (rawQuery.length >= 2 && deva.includes(rawQuery)) ||
        (stemQ.length >= 3 && (iast.includes(stemQ) || getSanskritSearchStem(iast).includes(stemQ))) ||
        Boolean(lemma && (lemma === q || (q.length >= 2 && lemma.includes(q)) ||
          (stemQ.length >= 3 && (lemma.includes(stemQ) || getSanskritSearchStem(lemma).includes(stemQ)))))
      );
    });

    if (matchingTokens.length > 0) {
      const devaText = typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari.text;
      const iastText = typeof v.scripts.iast === 'string' ? v.scripts.iast : v.scripts.iast.text;

      for (const tk of matchingTokens) {
        results.push({
          verseId: v.id,
          verseNumber: v.number,
          book: v.book,
          chapter: v.chapter,
          token: {
            devanagari: tk.text.devanagari,
            iast: tk.text.iast,
            lemma: tk.lemma
          },
          contextDevanagari: devaText,
          contextIast: iastText,
          translations: v.translations.map((t) => `[${t.lang}] ${t.text}`)
        });
      }
    }
  }

  return results;
}

export interface IndexVerborumEntry {
  lemma: string;
  devanagari: string;
  occurrences: Array<{
    verseId: string;
    verseNumber: string;
    book?: string;
    chapter?: string;
  }>;
  meanings: string[];
  translationsUsed: string[];
}

/**
 * Generates an Index Verborum (reverse concordance index / dictionary of the entire book).
 * Groups all tokens by lemma/headword, lists every verse number where it appears,
 * and compiles all translations and meanings used.
 */
export function generateIndexVerborum(verses: Verse[], targetLang = 'cs'): IndexVerborumEntry[] {
  const indexMap = new Map<string, IndexVerborumEntry>();

  for (const v of verses) {
    for (const tk of v.tokens) {
      const key = (tk.lemma || tk.text.iast).toLowerCase().trim();
      if (!key) continue;

      if (!indexMap.has(key)) {
        indexMap.set(key, {
          lemma: tk.lemma || tk.text.iast,
          devanagari: tk.text.devanagari,
          occurrences: [],
          meanings: [],
          translationsUsed: []
        });
      }

      const entry = indexMap.get(key)!;

      // Add occurrence if not already recorded for this verse
      if (!entry.occurrences.some((occ) => occ.verseId === v.id)) {
        entry.occurrences.push({
          verseId: v.id,
          verseNumber: v.number,
          book: v.book,
          chapter: v.chapter
        });
      }

      // Add meanings
      const meaning =
        tk.vocabulary?.meanings_by_lang?.[targetLang]?.contextual ||
        (targetLang === 'cs' ? tk.vocabulary?.contextual_meaning_cs : '') ||
        '';
      if (meaning && !entry.meanings.includes(meaning)) {
        entry.meanings.push(meaning);
      }

      // Add matched translations
      if (tk.alignment && tk.alignment.matched_words) {
        for (const [tKey, words] of Object.entries(tk.alignment.matched_words)) {
          if (isAlignmentKeyForLang(tKey, v, targetLang)) {
            for (const w of words) {
              const clean = w.replace(/[\[\]]/g, '').trim();
              if (clean && !entry.translationsUsed.includes(clean)) {
                entry.translationsUsed.push(clean);
              }
            }
          }
        }
      }
    }
  }

  // Sort in Sanskrit alphabetical order (varṇamālā)
  return Array.from(indexMap.values()).sort((a, b) => sanskritCompare(a.lemma, b.lemma));
}
