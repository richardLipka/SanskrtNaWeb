/**
 * Compound splitting for the editor, entirely in the browser:
 *  1. splits attested in the Digital Corpus of Sanskrit for this written word;
 *  2. dictionary-driven segmentation (compoundSegmenter.ts) over the static lexicon
 *     (Monier-Williams headwords + DCS lemmas, public/lexicon/) and, when downloaded, the
 *     Vidyut kosha (inflected forms with grammar);
 *  3. member boundaries Monier-Williams gives for a lexicalized compound raise the
 *     segmentations that agree with them.
 */

import type { Kosha } from './kosha/kosha.ts';
import { getLoadedKosha, loadOfflineKosha } from './kosha/koshaService.ts';
import { StaticLexicon, getLoadedStaticLexicon, loadStaticLexicon, pausaKey } from './staticLexicon.ts';
import {
  CompoundLexicon,
  CompoundSegmenter,
  MemberAnalysis,
  ScoringOptions,
  SegmentMember,
  Segmentation,
  koshaCompoundLexicon,
  finalFormVariants,
  segmentWord,
  splitAtHyphens
} from './compoundSegmenter.ts';
import { isVidyutReady, loadVidyutWasm, splitSandhiSlp1, transliterateLipi } from './vidyutAdapter.ts';
import { analyzeSanskritWord } from './sanskritLemmatizer.ts';

/**
 * Tuned on DCS compounds with tools/lexicon/evaluate-segmenter.ts (sanskrit-splitter repository): corpus frequency of the
 * members, a high cost per member (it balances the frequency bonus every member brings) and
 * a cost for lexicalized compounds the corpus divides further (vidyārambha).
 */
export const TUNED_SCORING: Partial<ScoringOptions> = {
  lengthExponent: 2,
  freqWeight: 4,
  memberCost: 60,
  divisibleCost: 200,
  wordCost: 40
};
const MW_SPLIT_BONUS = 10;

/** Underlying final consonants of a member before the next one (SLP1) */
const FINAL_CONSONANT_SOURCES: Record<string, string[]> = {
  k: ['c', 'j', 'S', 'z'], g: ['j', 'c', 'S', 'k'], w: ['z', 'S', 'j'], q: ['z', 'S', 'w'],
  t: ['d', 's'], d: ['t', 's'], n: ['d', 't'], N: ['k', 'c'], Y: ['c', 'j', 't'], R: ['w', 'q'],
  b: ['p'], p: ['b'], r: ['s'], H: ['s'], o: ['as'], c: ['t', 'd'], j: ['t', 'd'], l: ['t', 'd'], S: ['s', 't'], z: ['s']
};

const toIast = (slp1: string) => transliterateLipi(slp1, 'slp1', 'iast');
const toSlp1 = (iast: string) => transliterateLipi(iast, 'iast', 'slp1');

function shortLabel(labelEn: string): string {
  return labelEn.replace(/\s*\(stem [^)]*\)/, '').replace(/^nominal stem \/ compound member$/, '');
}

/** Lexicon over whichever sources are loaded. */
export function buildCompoundLexicon(sources: { kosha?: Kosha | null; lexicon?: StaticLexicon | null }): CompoundLexicon {
  const { kosha, lexicon } = sources;
  const koshaLex = kosha ? koshaCompoundLexicon(kosha) : null;
  const stemCache = new Map<string, string[]>();
  const formCache = new Map<string, MemberAnalysis[]>();
  const known = (s: string) => (lexicon?.find(s).length ?? 0) > 0 || (kosha?.basicStems(s).length ?? 0) > 0;

  return {
    stemLemmas(s) {
      let r = stemCache.get(s);
      if (r) return r;
      const out = new Set<string>();
      for (const x of lexicon?.find(s) || []) out.add(x);
      if (kosha?.basicStems(s).length) out.add(s);
      // -an / -in stems drop the n in compounds (rāja-, karmi-); mahā- stands for mahat
      if (/[ai]$/.test(s) && known(s + 'n')) out.add(s + 'n');
      if (s === 'mahA') out.add('mahat');
      // A final consonant assimilated to the next member: tan-mocana → tad, tvak-prasāda → tvac
      const last = s.slice(-1);
      if (!out.size && s.length >= 3) {
        for (const c of FINAL_CONSONANT_SOURCES[last] || []) {
          const v = s.slice(0, -1) + c;
          if (known(v)) out.add(v);
        }
      }
      if (!out.size && koshaLex) for (const x of koshaLex.stemLemmas(s)) out.add(x);
      r = Array.from(out);
      stemCache.set(s, r);
      return r;
    },
    formAnalyses(s) {
      let r = formCache.get(s);
      if (r) return r;
      // Frequent forms as annotated in the DCS come first (me → mad, ucyate → vac)
      // (the forms are stored with m, not anusvāra: mām, not māṃ)
      const corpus: MemberAnalysis[] = lexicon
        ? [...lexicon.formLemmas(s), ...(/M$/.test(s) ? lexicon.formLemmas(s.slice(0, -1) + 'm') : [])].map((a) => ({ lemma: a.lemma, label: a.label }))
        : [];
      r = koshaLex ? koshaLex.formAnalyses(s) : [];
      if (corpus.length) {
        const known = new Set(corpus.map((a) => a.lemma));
        r = [...corpus, ...r.filter((a) => !known.has(a.lemma))];
      }
      if (!r.length && lexicon) {
        // Without the kosha: ending rules learned from the DCS, then the built-in lemmatizer,
        // the stems checked in the lexicon
        const seen = new Set<string>();
        r = [];
        if (lexicon.isIndeclinable(s)) {
          seen.add(s);
          r.push({ lemma: s, label: 'ind.' });
        }
        // Rule frequency and lemma frequency together: śaśī → śaśin before śaśī
        const byRule = lexicon.lemmatize(s)
          .map((a) => ({ a, w: Math.log2(1 + a.count) + 2 * Math.log2(1 + lexicon.wordCount(a.lemma) + lexicon.memberCount(a.lemma)) }))
          .sort((x, y) => y.w - x.w)
          .map((x) => x.a);
        for (const a of byRule.slice(0, 4)) {
          if (seen.has(a.lemma)) continue;
          seen.add(a.lemma);
          r.push({ lemma: a.lemma, label: a.label });
        }
        for (const a of analyzeSanskritWord(toIast(s))) {
          const lemmaIast = a.pos === 'verb' ? a.dhatu : a.stem;
          if (!lemmaIast) continue;
          const found = lexicon.find(toSlp1(lemmaIast).replace(/[^a-zA-Z]/g, ''));
          if (!found.length || seen.has(found[0])) continue;
          seen.add(found[0]);
          r.push({ lemma: found[0], label: shortLabel(a.label_en) });
        }
        // Indeclinables and words cited in stem form (ca, eva, iti)
        if (lexicon.wordCount(s) > 0 && !seen.has(s)) r.push({ lemma: s, label: '' });
      }
      formCache.set(s, r);
      return r;
    },
    isDivisible(lemmas) {
      if (!lexicon) return false;
      return lemmas.every((l) => lexicon.isMwCompound(l) && lexicon.memberCount(l) + lexicon.wordCount(l) === 0);
    },
    weight(lemmas, position) {
      if (!lexicon) return 0;
      let best = 0;
      for (const l of lemmas) {
        const n = position === 'member' ? lexicon.memberCount(l) + lexicon.wordCount(l) / 4 : lexicon.wordCount(l);
        best = Math.max(best, Math.log2(1 + n));
      }
      return best;
    }
  };
}

export interface CompoundMemberSuggestion {
  iast: string;
  role: SegmentMember['role'];
  /** Dictionary headword (IAST), for the dictionary lookup */
  lemma: string;
  /** Other possible headwords */
  alternatives: string[];
  /** Grammatical label of an inflected member, e.g. "n. loc. sg." */
  label?: string;
}

export interface CompoundSuggestion {
  members: CompoundMemberSuggestion[];
  score: number;
  /** 'corpus' = split attested in the DCS, 'dictionary' = found by the segmenter */
  source: 'corpus' | 'dictionary';
  /** DCS occurrences of an attested split */
  count?: number;
  /** The segmentation agrees with the member boundaries Monier-Williams gives */
  mw?: boolean;
}

export interface CompoundAnalysis {
  /** The word was written with hyphens, which were taken as member boundaries */
  hyphenated: boolean;
  /** Readings of the whole word when it is itself in the lexicon (lexicalized compound) */
  whole: Array<{ lemma: string; label: string }>;
  splits: CompoundSuggestion[];
  /**
   * 'whole' when the word reads better as one word (devānām, guṇebhyaḥ) than as any split;
   * the splits are then only alternatives
   */
  recommended: 'split' | 'whole' | 'none';
  /** Sources that were available */
  sources: { kosha: boolean; lexicon: boolean };
}

/**
 * Letters, combining marks, hyphens and the avagraha (loko'sti = lokaḥ asti; ’ and ऽ are
 * normalized to ') only; punctuation, daṇḍas and digits are removed.
 */
function cleanWord(word: string): string {
  return word.normalize('NFC').toLowerCase()
    .replace(/[’ऽ]/g, "'")
    .replace(/^'+/, '')
    .replace(/[^\p{L}\p{M}\-‐‑']/gu, '');
}

function memberSuggestion(m: SegmentMember): CompoundMemberSuggestion {
  const lemmas = m.lemmas.map(toIast);
  return {
    iast: toIast(m.slp1),
    role: m.role,
    lemma: lemmas[0] || toIast(m.slp1),
    alternatives: lemmas.slice(1, 4),
    label: m.analyses[0]?.label || (m.role === 'stem' ? 'stem' : undefined)
  };
}

/**
 * Do the member boundaries agree with a Monier-Williams split of the same word?
 * Sandhi reversal shifts each boundary by at most one letter.
 */
export function agreesWithSplit(members: string[], parts: string[]): boolean {
  if (members.length !== parts.length) return false;
  let a = 0;
  let b = 0;
  for (let i = 0; i < members.length - 1; i++) {
    a += members[i].length;
    b += parts[i].length;
    if (Math.abs(a - b) > i + 1) return false;
  }
  return true;
}

let segmenterFor: { kosha: Kosha | null; lexicon: StaticLexicon | null; seg: CompoundSegmenter; lex: CompoundLexicon } | null = null;

function currentSegmenter(scoring?: Partial<ScoringOptions>) {
  const kosha = getLoadedKosha();
  const lexicon = getLoadedStaticLexicon();
  if (scoring || !segmenterFor || segmenterFor.kosha !== kosha || segmenterFor.lexicon !== lexicon) {
    const lex = buildCompoundLexicon({ kosha, lexicon });
    const seg = new CompoundSegmenter(lex, splitSandhiSlp1, { ...TUNED_SCORING, ...scoring });
    if (scoring) return { kosha, lexicon, seg, lex };
    segmenterFor = { kosha, lexicon, seg, lex };
  }
  return segmenterFor;
}

export interface AnalyzeOptions {
  max?: number;
  /** Leave out the splits attested in the corpus (evaluation of the segmenter) */
  noAttested?: boolean;
  /** Override the scoring (evaluation) */
  scoring?: Partial<ScoringOptions>;
  mwBonus?: number;
}

/**
 * Splits an IAST word into compound members (synchronous; needs Vidyut and at least one
 * of the static lexicon or the kosha loaded, else null).
 */
export function analyzeCompoundSync(wordIast: string, options: AnalyzeOptions = {}): CompoundAnalysis | null {
  const { kosha, lexicon, seg, lex } = currentSegmenter(options.scoring);
  if (!isVidyutReady() || (!kosha && !lexicon)) return null;
  const max = options.max ?? 6;
  const word = cleanWord(wordIast);
  if (!word) return null;
  const partsIast = splitAtHyphens(word);
  // Letters without an SLP1 equivalent (stray marks, Vedic signs) would make Vidyut reject the word
  const parts = partsIast.map((p) => toSlp1(p).replace(/[^a-zA-Z']/g, '').replace(/'+$/, '')).filter(Boolean);
  if (!parts.length) return null;
  const res = segmentWord(parts, seg, { max: max + 4 });

  // Lexicalized whole word: its Monier-Williams member boundaries confirm segmentations
  const wholeLemmas = new Set<string>(res.whole.map((a) => a.lemma));
  if (parts.length === 1) for (const a of lex.formAnalyses(parts[0])) wholeLemmas.add(a.lemma);
  const mwSplits = lexicon ? Array.from(wholeLemmas).map((l) => lexicon.mwSplit(l)).filter((x): x is string[] => !!x) : [];
  const bonus = options.mwBonus ?? MW_SPLIT_BONUS;
  const scored = res.splits.map((s: Segmentation) => {
    const mw = mwSplits.some((p) => agreesWithSplit(s.members.map((m) => m.slp1), p));
    return { s, mw, score: s.score + (mw ? bonus : 0) };
  }).sort((a, b) => b.score - a.score);

  const dictionary: CompoundSuggestion[] = scored.map(({ s, mw, score }) => ({
    members: s.members.map(memberSuggestion),
    score,
    source: 'dictionary',
    mw
  }));

  // Splits attested in the DCS for this very spelling come first
  const attested: CompoundSuggestion[] = [];
  if (lexicon && !options.noAttested && parts.length === 1) {
    const byLemmas = new Map<string, CompoundSuggestion>();
    for (const a of lexicon.attestedSplits(parts[0])) {
      const members = a.members.map((m, i): CompoundMemberSuggestion => {
        const isStem = a.kind === 'c' && i < a.members.length - 1;
        // The DCS lemmatizes participles to their root (sthita → sthā); a non-final member
        // that is itself a headword is shown as such, with the root as an alternative
        const asStem = isStem && m.form !== m.lemma && lexicon.isMwHeadword(m.form);
        return {
          iast: toIast(m.form),
          role: isStem ? 'stem' : 'form',
          lemma: toIast(asStem ? m.form : lexicon.dictionaryForm(m.lemma)),
          alternatives: asStem ? [toIast(m.lemma)] : [],
          label: isStem ? 'stem' : (lexicon.isIndeclinable(m.lemma) ? 'ind.' : lex.formAnalyses(m.form)[0]?.label)
        };
      });
      const k = members.map((m) => m.lemma).join('+');
      const prev = byLemmas.get(k);
      if (prev) prev.count = (prev.count || 0) + a.count;
      else byLemmas.set(k, { members, score: Infinity, source: 'corpus', count: a.count });
    }
    attested.push(...Array.from(byLemmas.values()).sort((x, y) => (y.count || 0) - (x.count || 0)).slice(0, 3));
  }
  // A segmentation that repeats an attested split (by lemmas or by member forms) is dropped
  const lemmaKey = (s: CompoundSuggestion) => s.members.map((m) => m.lemma).join('+');
  const formKey = (s: CompoundSuggestion) => s.members.map((m) => pausaKey(toSlp1(m.iast)).toLowerCase()).join('+');
  const seen = new Set([...attested.map(lemmaKey), ...attested.map(formKey)]);
  const splits = [...attested, ...dictionary.filter((d) => !seen.has(lemmaKey(d)) && !seen.has(formKey(d)))].slice(0, max);

  // Attested and hyphenated words are split; otherwise the better scoring reading wins, but
  // only when the corpus uses the whole word's lemma as a word (devānām → deva,
  // dhārtarāṣṭra). A lexicalized compound the corpus divides (dharmakṣetra) stays split;
  // its own dictionary entry is listed in `whole`.
  let recommended: CompoundAnalysis['recommended'] = splits.length ? 'split' : (res.whole.length ? 'whole' : 'none');
  const wholeLemma = res.whole[0]?.lemma;
  const corpusWord = !lexicon || (!!wholeLemma && lexicon.wordCount(wholeLemma) + lexicon.memberCount(wholeLemma) >= 3);
  if (!attested.length && partsIast.length === 1 && res.whole.length && res.wholeScore !== undefined && corpusWord
    && (!dictionary.length || res.wholeScore >= dictionary[0].score)) {
    recommended = 'whole';
  }
  // A frequent word form beats a rare attested split of a similar spelling (yaḥ ≠ yā + u)
  if (attested.length && lexicon && parts.length === 1) {
    const asWord = finalFormVariants(parts[0]).reduce((n, v) => n + lexicon.formLemmas(v).reduce((m, a) => m + a.count, 0), 0);
    const asSplit = attested.reduce((n, a) => n + (a.count || 0), 0);
    if (asWord > asSplit && res.whole.length) recommended = 'whole';
  }

  return {
    hyphenated: partsIast.length > 1,
    whole: Array.from(new Map(res.whole.map((a) => [`${a.lemma}|${a.label}`, a])).values())
      .slice(0, 4)
      .map((a) => ({ lemma: toIast(a.lemma), label: a.label })),
    splits,
    recommended,
    sources: { kosha: !!kosha, lexicon: !!lexicon }
  };
}

/** Loads Vidyut, the static lexicon and (when downloaded) the kosha, then analyzes. */
export async function analyzeCompound(wordIast: string, options: AnalyzeOptions = {}): Promise<CompoundAnalysis | null> {
  await loadVidyutWasm();
  await Promise.all([loadStaticLexicon(), loadOfflineKosha()]);
  return analyzeCompoundSync(wordIast, options);
}
