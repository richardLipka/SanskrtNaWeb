/**
 * Token operations for the translation editor: splitting a compound / sandhi group into
 * members and merging members back into one token.
 */

import { Token } from '../types/schema.ts';
import { transliterateLipi } from '../lemmatizer/vidyutAdapter.ts';
import { analyzeSanskritWord } from '../lemmatizer/sanskritLemmatizer.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';
import { hasCompoundHyphen, splitAtHyphens } from '../lemmatizer/compoundSegmenter.ts';
import { analyzeCompoundSync } from '../lemmatizer/compoundService.ts';

export interface SplitPartSpec {
  /** Member as it stands in the split (IAST) */
  iast: string;
  /** Dictionary form (e.g. confirmed by Monier-Williams); defaults to the lemmatizer guess */
  lemma?: string;
}

/**
 * Parses manual split input such as "dharma + kṣetre" or "dharma-kṣetre".
 */
export function parseManualSplit(input: string): SplitPartSpec[] {
  return input
    .split(/\s*[+|]\s*|\s+-\s+|(?<=\p{L})-(?=\p{L})/u)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((iast) => ({ iast }));
}

/**
 * Replaces `tokenId` by its members. Members are marked as compound members
 * (prefix / middle / final) and remember the original surface form so that they can be
 * merged back. Existing word alignments stay on the last member (the inflected head),
 * where they can be redistributed in the alignment board.
 */
export function splitToken(tokens: Token[], tokenId: string, parts: SplitPartSpec[]): Token[] {
  const idx = tokens.findIndex((t) => t.id === tokenId);
  if (idx < 0 || parts.length < 2) return tokens;
  const original = tokens[idx];
  const originalForm = original.compound?.analysis || original.text.iast;
  const existingIds = new Set(tokens.map((t) => t.id));

  const members: Token[] = parts.map((part, i) => {
    let id = `${original.id}_${i + 1}`;
    for (let n = 2; existingIds.has(id) && id !== original.id; n++) id = `${original.id}_${i + 1}_${n}`;
    existingIds.add(id);
    const morph = analyzeSanskritWord(part.iast)[0];
    const isLast = i === parts.length - 1;
    return {
      id,
      text: {
        devanagari: transliterateLipi(part.iast, 'iast', 'devanagari'),
        iast: part.iast,
        cs_phonetic: defaultSanskritAdapter.transliterate(part.iast, 'iast', 'cs_phonetic')
      },
      lemma: part.lemma || morph?.lemma || part.iast,
      // Non-final members of a compound are bare stems; the final member keeps the inflection
      grammar: isLast ? original.grammar : { pos: 'noun', case: 'stem_in_compound' },
      compound: {
        is_compound_member: true,
        position: i === 0 ? 'prefix' : (isLast ? 'final' : 'middle'),
        analysis: originalForm
      },
      vocabulary: isLast ? original.vocabulary : undefined,
      alignment: isLast ? original.alignment : { matched_words: {} }
    };
  });

  return [...tokens.slice(0, idx), ...members, ...tokens.slice(idx + 1)];
}

/**
 * Merges the run of compound members containing `tokenId` (same original form, adjacent)
 * back into one token, combining their alignments.
 */
export function mergeCompound(tokens: Token[], tokenId: string): Token[] {
  const idx = tokens.findIndex((t) => t.id === tokenId);
  const origin = tokens[idx]?.compound?.analysis;
  if (idx < 0 || !tokens[idx].compound?.is_compound_member || !origin) return tokens;

  let start = idx;
  while (start > 0 && tokens[start - 1].compound?.is_compound_member && tokens[start - 1].compound?.analysis === origin) start--;
  let end = idx;
  while (end < tokens.length - 1 && tokens[end + 1].compound?.is_compound_member && tokens[end + 1].compound?.analysis === origin) end++;
  const run = tokens.slice(start, end + 1);
  if (run.length < 2) return tokens;

  const matched: Record<string, string[]> = {};
  for (const t of run) {
    for (const [key, words] of Object.entries(t.alignment?.matched_words || {})) {
      matched[key] = Array.from(new Set([...(matched[key] || []), ...words]));
    }
  }
  const head = run[run.length - 1];
  // Members are created as `${originalId}_${n}` (see splitToken)
  const baseId = run[0].id.replace(/_\d+$/, '');
  const id = tokens.some((t, i) => (i < start || i > end) && t.id === baseId) ? run[0].id : baseId;
  const morph = analyzeSanskritWord(origin)[0];

  const merged: Token = {
    id,
    text: {
      devanagari: transliterateLipi(origin, 'iast', 'devanagari'),
      iast: origin,
      cs_phonetic: defaultSanskritAdapter.transliterate(origin, 'iast', 'cs_phonetic')
    },
    lemma: morph?.lemma || origin,
    grammar: head.grammar,
    vocabulary: head.vocabulary,
    alignment: { matched_words: matched }
  };
  return [...tokens.slice(0, start), merged, ...tokens.slice(end + 1)];
}

/**
 * Member specs for a word written with hyphens (dharma-kṣetre → dharma + kṣetre). Non-final
 * members are bare stems; with the offline kosha loaded, the dictionary forms come from it
 * (rāja-ṛṣiḥ → rājan + ṛṣi).
 */
export function hyphenSplitSpecs(wordIast: string): SplitPartSpec[] | null {
  if (!hasCompoundHyphen(wordIast)) return null;
  const parts = splitAtHyphens(wordIast);
  if (parts.length < 2) return null;
  const best = analyzeCompoundSync(wordIast, { max: 1 })?.splits[0];
  const byKosha = best && best.members.length === parts.length && best.members.every((m) => m.role !== 'unknown');
  return parts.map((iast, i) => ({
    iast,
    lemma: byKosha ? best!.members[i].lemma : (i < parts.length - 1 ? iast.toLowerCase() : undefined)
  }));
}

/** Splits every hyphenated token into compound members (see splitToken). */
export function splitHyphenatedTokens(tokens: Token[]): Token[] {
  let out = tokens;
  for (const tk of tokens) {
    if (tk.compound?.is_compound_member) continue;
    const specs = hyphenSplitSpecs(tk.text.iast);
    if (specs) out = splitToken(out, tk.id, specs);
  }
  return out;
}
