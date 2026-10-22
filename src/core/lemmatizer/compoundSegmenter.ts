/**
 * Dictionary-driven compound (samāsa) segmentation.
 *
 * Neither the Vidyut WebAssembly build nor vidyut-cheda splits compounds into members, and
 * compounds are mostly missing from dictionaries. This segmenter combines:
 *  - Vidyut's sandhi splitter (`splitAll`): every cut of a word with the sandhi reversed
 *    (yogeśvaraḥ → yoga + īśvaraḥ, mahātmā → mahā + ātmā);
 *  - the offline Vidyut lexicon (kosha, data-0.4.0.zip): 169 k dictionary stems for the
 *    non-final members (bare stems) and ~30 M inflected forms for the final member.
 * Words written with hyphens (dharma-kṣetre) are split at the hyphens first; a part that is
 * not in the lexicon is segmented again.
 *
 * Search: right-recursive DP over the cuts — member = stem, rest = compound — memoized per
 * substring, keeping the best few segmentations. Members are scored by length squared
 * (long, known members win over chains of short ones) with a cost per member.
 */

import type { Kosha, KoshaPada } from './kosha/kosha.ts';

export interface MemberAnalysis {
  /** Dictionary headword (SLP1) */
  lemma: string;
  /** Short grammatical label, e.g. "n. loc. sg." or "laṭ 3. sg." */
  label: string;
  /** Kṛdanta reading (root + suffix) rather than a dictionary stem */
  derived?: boolean;
}

export interface CompoundLexicon {
  /** Dictionary stems (SLP1) a non-final member can stand for ("rAja" → ["rAjan"]). */
  stemLemmas(slp1: string): string[];
  /** Analyses of an inflected form (SLP1, pausa: final visarga as "s"). */
  formAnalyses(slp1: string): MemberAnalysis[];
  /**
   * Optional corpus evidence for a member: larger = more frequent (e.g. log of the count
   * of the lemma as a compound member or as a word).
   */
  weight?(lemmas: string[], position: 'member' | 'final'): number;
  /**
   * Optional: the member is a lexicalized compound that the corpus analyses further
   * (vidyārambha → vidyā + ārambha), so a finer split is preferred.
   */
  isDivisible?(lemmas: string[]): boolean;
}

export interface ScoringOptions {
  /** Member score = length ** lengthExponent: long known members beat chains of short ones */
  lengthExponent: number;
  /** Cost per member */
  memberCost: number;
  /** Extra cost of a member of ≤ 3 letters */
  shortCost: number;
  /** Extra cost of a final member of ≤ 3 letters (mostly a stray ending: sthitaprajña + sya) */
  shortFinalCost: number;
  /** Multiplier of the lexicon's corpus weight */
  freqWeight: number;
  /** Cost of a member the lexicon marks as divisible */
  divisibleCost: number;
}

export const DEFAULT_SCORING: ScoringOptions = {
  lengthExponent: 2,
  memberCost: 4,
  shortCost: 12,
  shortFinalCost: 30,
  freqWeight: 0,
  divisibleCost: 0
};

export interface SandhiCut {
  first: string;
  second: string;
}

/** All two-way cuts of an SLP1 string with sandhi reversed. */
export type SandhiSplitter = (slp1: string) => SandhiCut[];

export interface SegmentMember {
  /** Member as split (SLP1) */
  slp1: string;
  /** 'stem' = bare stem (non-final), 'form' = inflected word, 'unknown' = not in the lexicon */
  role: 'stem' | 'form' | 'unknown';
  /** Dictionary headwords (SLP1), best first */
  lemmas: string[];
  /** Grammatical analyses of an inflected member */
  analyses: MemberAnalysis[];
}

export interface Segmentation {
  members: SegmentMember[];
  score: number;
}

export interface SegmentResult {
  /** The word itself is in the lexicon (lexicalized compound or simple word) */
  whole: MemberAnalysis[];
  /** Splits into ≥ 2 members, best first */
  splits: Segmentation[];
}

const MIN_MEMBER = 2;
/** Reversed vowel sandhi is ambiguous (yoga/yogā + īśvara); short vowels are more common */
const LONG_VOWEL_AT_CUT = 1;
const UNKNOWN_PENALTY = 30;
/** A stem in final position (compound cited in stem form, vocative-like) is less likely */
const FINAL_STEM_PENALTY = 3;
const KEEP_PER_SUBSTRING = 6;

/** Pausa variants of a final member: devaH → devas, Bavatam → Bavatam, rAmo → rAmas. */
export function finalFormVariants(slp1: string): string[] {
  const out = [slp1];
  if (/H$/.test(slp1)) out.push(slp1.slice(0, -1) + 's', slp1.slice(0, -1) + 'r');
  // Visarga before a following word (hetur, rāmaś, devās): the DCS rules are written with H
  if (/[rsSz]$/.test(slp1) && slp1.length > 2) out.push(slp1.slice(0, -1) + 'H');
  if (/M$/.test(slp1)) out.push(slp1.slice(0, -1) + 'm');
  if (/[^aA]o$/.test(slp1) || /^.o$/.test(slp1)) out.push(slp1.slice(0, -1) + 'as');
  // Sentence sandhi before a following word: duḥkheṣv → duḥkheṣu, tad → tat, vāg → vāk, rāmaś → rāmas
  const last = slp1.slice(-1);
  const stem = slp1.slice(0, -1);
  const reverse: Record<string, string[]> = { v: ['u', 'U'], y: ['i', 'I'], r: ['s'], S: ['s'], z: ['s'], d: ['t'], g: ['k'], b: ['p'], q: ['w'], N: ['m', 'n'], Y: ['n', 'm'] };
  if (stem.length >= 2) for (const v of reverse[last] || []) out.push(stem + v);
  return out;
}

/**
 * Segments one word (SLP1) without hyphens. `finalRole` is 'form' for the end of a word,
 * 'stem' for a hyphenated part that is followed by further members.
 */
export class CompoundSegmenter {
  private memo = new Map<string, Segmentation[]>();

  private readonly scoring: ScoringOptions;

  constructor(private lexicon: CompoundLexicon, private split: SandhiSplitter, scoring: Partial<ScoringOptions> = {}) {
    this.scoring = { ...DEFAULT_SCORING, ...scoring };
  }

  /** Score of a member of this length before lexicon evidence. */
  lengthScore(len: number, final = false): number {
    const o = this.scoring;
    return len ** o.lengthExponent - o.memberCost - (len <= 3 ? (final ? o.shortFinalCost : o.shortCost) : 0);
  }

  /** Score of a member missing from the lexicon (hyphenated parts are kept anyway). */
  unknownScore(len: number, final = false): number {
    return this.lengthScore(len, final) - UNKNOWN_PENALTY;
  }

  private single(slp1: string, finalRole: 'stem' | 'form'): SegmentMember | null {
    if (finalRole === 'form') {
      // All ending variants (hetur → hetur, hetus): dictionary-stem readings before kṛdanta ones
      const analyses = finalFormVariants(slp1)
        .flatMap((v) => this.lexicon.formAnalyses(v))
        .map((a, i) => ({ a, i }))
        .sort((x, y) => Number(Boolean(x.a.derived)) - Number(Boolean(y.a.derived)) || x.i - y.i)
        .map((x) => x.a);
      if (analyses.length) {
        return { slp1, role: 'form', lemmas: Array.from(new Set(analyses.map((a) => a.lemma))), analyses };
      }
    }
    const stems = this.lexicon.stemLemmas(slp1);
    if (stems.length) return { slp1, role: 'stem', lemmas: stems, analyses: [] };
    return null;
  }

  private scoreOf(m: SegmentMember, final: boolean, finalRole: 'stem' | 'form'): number {
    const isFinal = final && finalRole === 'form';
    let s = this.lengthScore(m.slp1.length, isFinal);
    if (isFinal && m.role === 'stem') s -= FINAL_STEM_PENALTY;
    if (m.role === 'unknown') s -= UNKNOWN_PENALTY;
    if (this.scoring.freqWeight && this.lexicon.weight && m.lemmas.length) {
      s += this.scoring.freqWeight * this.lexicon.weight(m.lemmas, isFinal ? 'final' : 'member');
    }
    if (this.scoring.divisibleCost && this.lexicon.isDivisible && m.lemmas.length && this.lexicon.isDivisible(m.lemmas)) {
      s -= this.scoring.divisibleCost;
    }
    return s;
  }

  /** Best segmentations of `slp1` (including the one-member reading). */
  segment(slp1: string, finalRole: 'stem' | 'form' = 'form'): Segmentation[] {
    const key = `${finalRole}:${slp1}`;
    const cached = this.memo.get(key);
    if (cached) return cached;
    this.memo.set(key, []); // guards against cycles through sandhi reversal

    const results: Segmentation[] = [];
    const whole = this.single(slp1, finalRole);
    if (whole) results.push({ members: [whole], score: this.scoreOf(whole, true, finalRole) });

    if (slp1.length >= 2 * MIN_MEMBER) {
      const seen = new Set<string>();
      for (const cut of this.split(slp1)) {
        if (cut.first.length < MIN_MEMBER || cut.second.length < MIN_MEMBER) continue;
        const k = `${cut.first}+${cut.second}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const stems = this.lexicon.stemLemmas(cut.first);
        if (!stems.length) continue;
        const head: SegmentMember = { slp1: cut.first, role: 'stem', lemmas: stems, analyses: [] };
        let headScore = this.scoreOf(head, false, finalRole);
        if (/[aAiIuUfF]$/.test(cut.first) && /^[aAiIuUfFeEoO]/.test(cut.second)) {
          if (/[AIUF]$/.test(cut.first)) headScore -= stems.includes('mahat') ? -LONG_VOWEL_AT_CUT : LONG_VOWEL_AT_CUT;
          if (/^[AIUFEO]/.test(cut.second)) headScore -= LONG_VOWEL_AT_CUT;
        }
        for (const rest of this.segment(cut.second, finalRole)) {
          results.push({ members: [head, ...rest.members], score: headScore + rest.score });
        }
      }
    }

    const best = dedupe(results).slice(0, KEEP_PER_SUBSTRING);
    this.memo.set(key, best);
    return best;
  }
}

/** Readings that differ only in a reversed vowel length (kṛṣṇa/kṛṣṇā + arjuna) count as one. */
function segKey(s: Segmentation) {
  return s.members.map((m) => m.slp1).join('+')
    .replace(/A/g, 'a').replace(/I/g, 'i').replace(/U/g, 'u').replace(/F/g, 'f');
}

function dedupe(list: Segmentation[]): Segmentation[] {
  const out = new Map<string, Segmentation>();
  for (const s of list.sort((a, b) => b.score - a.score)) {
    const k = segKey(s);
    if (!out.has(k)) out.set(k, s);
  }
  return Array.from(out.values());
}

/** Letters joined by a hyphen (ASCII hyphen, U+2010 hyphen, U+2011 non-breaking hyphen). */
const HYPHEN = /(?<=\p{L}|\p{M})[-‐‑](?=\p{L})/u;

export function hasCompoundHyphen(word: string): boolean {
  return HYPHEN.test(word);
}

export function splitAtHyphens(word: string): string[] {
  return word.split(new RegExp(HYPHEN.source, 'gu')).filter(Boolean);
}

/**
 * Segments a word given in SLP1. Hyphenated parts (passed separately in `parts`) are kept as
 * member boundaries; parts missing from the lexicon are segmented further.
 */
export function segmentWord(
  parts: string[],
  segmenter: CompoundSegmenter,
  options: { max?: number } = {}
): SegmentResult {
  const max = options.max ?? 6;
  if (parts.length === 1) {
    const all = segmenter.segment(parts[0], 'form');
    const whole = all.find((s) => s.members.length === 1);
    let splits = all.filter((s) => s.members.length > 1);
    // A known simple word (bhavati) only gets noise splits like bha + vati
    if (whole) splits = splits.filter((s) => s.members.every((m) => m.slp1.length > 3));
    return {
      whole: whole ? (whole.members[0].analyses.length ? whole.members[0].analyses : whole.members[0].lemmas.map((l) => ({ lemma: l, label: '' }))) : [],
      splits: splits.slice(0, max)
    };
  }

  // Hyphenated: combine the best readings of each part (each part may itself be a compound)
  let combos: Segmentation[] = [{ members: [], score: 0 }];
  parts.forEach((part, i) => {
    const role = i === parts.length - 1 ? 'form' : 'stem';
    let options = segmenter.segment(part, role).slice(0, 3);
    if (!options.length) {
      options = [{ members: [{ slp1: part, role: 'unknown', lemmas: [], analyses: [] }], score: segmenter.unknownScore(part.length, role === 'form') }];
    }
    const next: Segmentation[] = [];
    for (const c of combos) for (const o of options) next.push({ members: [...c.members, ...o.members], score: c.score + o.score });
    combos = next.sort((a, b) => b.score - a.score).slice(0, 12);
  });
  return { whole: [], splits: dedupe(combos).slice(0, max) };
}

// --- Kosha adapter -----------------------------------------------------------------------

const LINGA_ABBR: Record<string, string> = { Pum: 'm.', Stri: 'f.', Napumsaka: 'n.' };
const VIBHAKTI_ABBR: Record<string, string> = {
  Prathama: 'nom.', Dvitiya: 'acc.', Trtiya: 'instr.', Caturthi: 'dat.',
  Panchami: 'abl.', Sasthi: 'gen.', Saptami: 'loc.', Sambodhana: 'voc.'
};
const VACANA_ABBR: Record<string, string> = { Eka: 'sg.', Dvi: 'du.', Bahu: 'pl.' };
const PURUSHA_ABBR: Record<string, string> = { Prathama: '3.', Madhyama: '2.', Uttama: '1.' };
const LAKARA_IAST: Record<string, string> = {
  Lat: 'laṭ', Lit: 'liṭ', Lut: 'luṭ', Lrt: 'lṛṭ', Let: 'leṭ', Lot: 'loṭ', Lan: 'laṅ',
  VidhiLin: 'vidhiliṅ', AshirLin: 'āśīrliṅ', Lun: 'luṅ', Lrn: 'lṛṅ'
};

function padaToAnalysis(p: KoshaPada): MemberAnalysis {
  if (p.kind === 'tinanta') {
    const voice = p.prayoga === 'Karmani' ? ' pass.' : '';
    return { lemma: p.dhatu.cleanText, label: `${LAKARA_IAST[p.lakara] || p.lakara} ${PURUSHA_ABBR[p.purusha]} ${VACANA_ABBR[p.vacana]}${voice}` };
  }
  if (p.kind === 'avyaya') {
    return p.stem.kind === 'basic'
      ? { lemma: p.stem.text!, label: 'ind.' }
      : { lemma: p.stem.dhatu!.cleanText, label: `ind. (${p.stem.krt})`, derived: true };
  }
  const label = `${LINGA_ABBR[p.linga]} ${VIBHAKTI_ABBR[p.vibhakti]} ${VACANA_ABBR[p.vacana]}`;
  return p.stem.kind === 'basic'
    ? { lemma: p.stem.text!, label }
    : { lemma: p.stem.dhatu!.cleanText, label: `${label} (${p.stem.krt})`, derived: true };
}

/**
 * Lexicon over the offline Vidyut kosha. Dictionary stems come first: basic stems are
 * Monier-Williams-style headwords, kṛdanta analyses only name a root + suffix.
 */
export function koshaCompoundLexicon(kosha: Kosha): CompoundLexicon {
  const stemCache = new Map<string, string[]>();
  const formCache = new Map<string, MemberAnalysis[]>();
  return {
    stemLemmas(s) {
      let r = stemCache.get(s);
      if (r) return r;
      r = [];
      if (kosha.basicStems(s).length) r.push(s);
      // -an / -in stems drop the n in compounds (rāja-, karmi-); mahā- stands for mahat
      if (/[ai]$/.test(s) && kosha.basicStems(s + 'n').length) r.push(s + 'n');
      if (s === 'mahA') r.push('mahat');
      // Stems known only as kṛdanta (root + suffix) have no text in the registry; accept a
      // vowel stem when its nominative/accusative is a known form
      if (!r.length && /[aAiIuUf]$/.test(s) && s.length >= 3 && (kosha.has(s + 's') || kosha.has(s + 'm'))) r.push(s);
      stemCache.set(s, r);
      return r;
    },
    formAnalyses(s) {
      let r = formCache.get(s);
      if (r) return r;
      const all = kosha.getAll(s);
      const avyaya = all.filter((p) => p.kind === 'avyaya' && p.stem.kind === 'basic');
      const basic = all.filter((p) => p.kind === 'subanta' && p.stem.kind === 'basic');
      const verbs = all.filter((p) => p.kind === 'tinanta');
      const derived = all.filter((p) => p.kind !== 'tinanta' && p.stem.kind !== 'basic');
      const seen = new Set<string>();
      const list: MemberAnalysis[] = [];
      for (const p of [...avyaya, ...basic, ...verbs, ...derived]) {
        const a = padaToAnalysis(p);
        const k = `${a.lemma}|${a.label}`;
        if (!seen.has(k)) { seen.add(k); list.push(a); }
      }
      // Lemma order: indeclinables, then lemmas with a non-vocative singular reading
      // (hite → hita loc. sg. before hitā du., manāḥ → manas before mana pl.), then short-vowel stems
      const tier = new Map<string, number>();
      for (const x of list) {
        const t = x.label === 'ind.' ? 0 : /sg\.$|sg\. /.test(x.label) && !/voc\./.test(x.label) ? 1 : 2;
        tier.set(x.lemma, Math.min(tier.get(x.lemma) ?? 9, t));
      }
      const longEnd = (l: string) => Number(/[AIU]$/.test(l));
      const firstIndex = new Map<string, number>();
      list.forEach((x, i) => { if (!firstIndex.has(x.lemma)) firstIndex.set(x.lemma, i); });
      const lemmaRank = (l: string) => tier.get(l)! * 4 + longEnd(l);
      r = list
        .map((a, i) => ({ a, i }))
        .sort((x, y) => (lemmaRank(x.a.lemma) - lemmaRank(y.a.lemma))
          || (firstIndex.get(x.a.lemma)! - firstIndex.get(y.a.lemma)!)
          || x.i - y.i)
        .map((x) => x.a);
      formCache.set(s, r);
      return r;
    }
  };
}
