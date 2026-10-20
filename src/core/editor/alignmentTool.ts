import { Token } from '../types/schema.ts';

// Leading/trailing punctuation incl. Czech/German typographic quotes („“ ‚‘ »«) and ellipsis
const EDGE_PUNCTUATION = /^[.,;:!?()[\]"'\-–—„“”‚‘’»«›‹…]+|[.,;:!?()[\]"'\-–—„“”‚‘’»«›‹…]+$/g;

/**
 * Splits a translation string into clean words/tokens suitable for interactive alignment.
 * Preserves clean word representations while ignoring bracketed notes.
 */
export function tokenizeTranslation(translationText: string): string[] {
  if (!translationText || !translationText.trim()) {
    return [];
  }

  // Split on whitespace while stripping trailing/leading punctuation
  const rawWords = translationText.trim().split(/\s+/);
  return rawWords
    .map((w) => w.replace(EDGE_PUNCTUATION, '').trim())
    .filter((w) => w.length > 0);
}

/**
 * Binds a translation word or phrase to a Sanskrit token.
 */
export function bindTokenToWord(token: Token, translationId: string, word: string): void {
  if (!token.alignment) {
    token.alignment = { matched_words: {} };
  }
  if (!token.alignment.matched_words) {
    token.alignment.matched_words = {};
  }
  if (!token.alignment.matched_words[translationId]) {
    token.alignment.matched_words[translationId] = [];
  }

  const clean = word.trim();
  if (clean && !token.alignment.matched_words[translationId].includes(clean)) {
    token.alignment.matched_words[translationId].push(clean);
  }
}

/**
 * Unbinds a translation word from a Sanskrit token.
 */
export function unbindTokenWord(token: Token, translationId: string, word: string): void {
  if (!token.alignment?.matched_words?.[translationId]) {
    return;
  }

  const clean = word.trim();
  token.alignment.matched_words[translationId] = token.alignment.matched_words[translationId].filter(
    (w) => w.toLowerCase() !== clean.toLowerCase()
  );
}

/**
 * Toggles a binding between a token and a translation word.
 * Returns true if word is now bound, false if unbound.
 */
export function toggleWordBinding(token: Token, translationId: string, word: string): boolean {
  if (!token.alignment) {
    token.alignment = { matched_words: {} };
  }
  if (!token.alignment.matched_words) {
    token.alignment.matched_words = {};
  }
  if (!token.alignment.matched_words[translationId]) {
    token.alignment.matched_words[translationId] = [];
  }

  const clean = word.trim();
  const existingIdx = token.alignment.matched_words[translationId].findIndex(
    (w) => w.toLowerCase() === clean.toLowerCase()
  );

  if (existingIdx >= 0) {
    token.alignment.matched_words[translationId].splice(existingIdx, 1);
    return false;
  } else {
    token.alignment.matched_words[translationId].push(clean);
    return true;
  }
}

/**
 * Returns all tokens in a verse that are currently bound to a specific translation word.
 */
export function getBoundTokensForWord(
  tokens: Token[],
  translationId: string,
  word: string
): Token[] {
  const clean = word.trim().toLowerCase();
  return tokens.filter((tk) => {
    const words = tk.alignment?.matched_words?.[translationId] || [];
    return words.some((w) => w.toLowerCase() === clean);
  });
}

/**
 * Automatically suggests bindings between tokens and translation words
 * based on token vocabulary and contextual meanings.
 */
export function autoSuggestBindings(
  tokens: Token[],
  translationId: string,
  translationText: string,
  lang?: string
): void {
  const words = tokenizeTranslation(translationText);
  // Language of the translation: explicit, or the "<lang>_" prefix of the translation id
  const targetLang = lang || translationId.split('_')[0] || 'cs';

  for (const tk of tokens) {
    if (!tk.alignment) {
      tk.alignment = { matched_words: {} };
    }
    if (!tk.alignment.matched_words[translationId]) {
      tk.alignment.matched_words[translationId] = [];
    }

    const searchTerms: string[] = [];

    const entry = tk.vocabulary?.meanings_by_lang?.[targetLang];
    const legacyContext = targetLang === 'cs' ? tk.vocabulary?.contextual_meaning_cs
      : (targetLang === 'en' ? tk.vocabulary?.contextual_meaning_en : undefined);
    const legacyAlts = targetLang === 'cs' ? tk.vocabulary?.alternative_meanings_cs
      : (targetLang === 'en' ? tk.vocabulary?.alternative_meanings_en : undefined);

    // Contextual meaning
    const context = entry?.contextual || legacyContext;
    if (context) {
      searchTerms.push(...tokenizeTranslation(context));
    }

    // Alternative meanings
    for (const alt of entry?.alternatives || legacyAlts || []) {
      searchTerms.push(...tokenizeTranslation(alt));
    }

    // Check matches
    for (const tw of words) {
      const twLower = tw.toLowerCase();
      if (
        searchTerms.some((st) => {
          const stLower = st.toLowerCase();
          if (stLower === twLower) return true;
          // Stem overlap for Czech inflections (e.g. jóga / jógy, výklad / výkladu)
          if (stLower.length >= 4 && twLower.length >= 4 && stLower.slice(0, 4) === twLower.slice(0, 4)) {
            return true;
          }
          return false;
        })
      ) {
        bindTokenToWord(tk, translationId, tw);
      }
    }
  }
}
