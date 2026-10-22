/**
 * Compound (samāsa) and sandhi splitting.
 *
 * The WebAssembly build of Vidyut exposes only the sandhi splitter (no vidyut-cheda segmenter
 * and no vidyut-kosha lexicon), so splitting works in two steps:
 *  1. `proposeSplits` asks Vidyut for every two-way split with sandhi reversed
 *     (yogānuśāsanam → yoga + anuśāsanam, yogaś… → yogas + …);
 *  2. `rankSplits` reduces each part to dictionary candidates with the built-in lemmatizer
 *     (kṣetre → kṣetra) and keeps the candidates confirmed by a lexicon (Monier-Williams by default).
 * Longer compounds are split step by step: split once, then split a member again.
 */

import { splitSandhiWasm } from './vidyutAdapter.ts';
import { analyzeSanskritWord } from './sanskritLemmatizer.ts';
import { lookupMonierWilliams, MwLookupResult } from '../dictionaries/monierWilliams.ts';

export interface SplitProposal {
  first: string;
  second: string;
  /** 'prefix' = plain cut without sandhi change, 'standard' = sandhi was reversed */
  kind: 'prefix' | 'standard';
}

export interface SplitPartCheck {
  /** Part as split (IAST) */
  form: string;
  /** Dictionary form that was confirmed (or the best guess when nothing was found) */
  lemma: string;
  found: boolean;
  /** Short gloss of the confirmed entry */
  gloss?: string;
}

export interface RankedSplit {
  parts: [SplitPartCheck, SplitPartCheck];
  kind: 'prefix' | 'standard';
  score: number;
}

export type LexiconLookup = (wordIast: string) => Promise<Pick<MwLookupResult, 'found' | 'senses'>>;

const MIN_PART = 2;

function letterCount(s: string): number {
  return Array.from(s.normalize('NFC')).filter((c) => /\p{L}/u.test(c)).length;
}

/** Two-way split candidates from Vidyut's sandhi splitter (deduplicated, trivial cuts removed). */
export function proposeSplits(wordIast: string): SplitProposal[] {
  const word = wordIast.normalize('NFC').trim();
  const seen = new Set<string>();
  const out: SplitProposal[] = [];
  for (const s of splitSandhiWasm(word)) {
    if (letterCount(s.firstIast) < MIN_PART || letterCount(s.secondIast) < MIN_PART) continue;
    const key = `${s.firstIast}+${s.secondIast}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ first: s.firstIast, second: s.secondIast, kind: s.kind });
  }
  return out;
}

/** Dictionary forms worth looking up for a split part, most likely first. */
export function lexiconCandidates(part: string, isFinal: boolean): string[] {
  const forms = new Set<string>();
  const p = part.toLowerCase();
  if (!isFinal) {
    // Non-final members of a compound are bare stems; sentence-level splits may end in
    // a visarga reflex (yogas / yogar → yoga).
    forms.add(p);
    if (/[sr]$/.test(p)) forms.add(p.slice(0, -1));
    if (/[ḥ]$/.test(p)) forms.add(p.slice(0, -1));
  }
  for (const a of analyzeSanskritWord(p)) {
    if (a.pos === 'verb' && a.dhatu) forms.add(a.dhatu);
    else if (a.stem) forms.add(a.stem.replace(/ḥ$/, ''));
    else if (a.lemma) forms.add(a.lemma.replace(/^√/, ''));
  }
  forms.add(p);
  return Array.from(forms).filter((f) => letterCount(f) >= MIN_PART);
}

function shortGloss(text: string, max = 140): string {
  const t = text.replace(/^\S+\s+/, ''); // drop the repeated headword
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

async function checkPart(form: string, isFinal: boolean, lookup: LexiconLookup): Promise<SplitPartCheck> {
  const candidates = lexiconCandidates(form, isFinal);
  for (const lemma of candidates) {
    const res = await lookup(lemma);
    if (res.found) {
      return { form, lemma, found: true, gloss: res.senses[0] ? shortGloss(res.senses[0].text) : undefined };
    }
  }
  return { form, lemma: candidates[0] || form, found: false };
}

/**
 * Ranks split proposals by checking both parts in a lexicon. Only proposals whose
 * first member is confirmed are checked further, which keeps the number of lookups low.
 */
export async function rankSplits(
  wordIast: string,
  options: { lookup?: LexiconLookup; max?: number; proposals?: SplitProposal[] } = {}
): Promise<RankedSplit[]> {
  const lookup: LexiconLookup = options.lookup || ((w) => lookupMonierWilliams(w));
  const proposals = options.proposals || proposeSplits(wordIast);
  const max = options.max ?? 6;

  // Phase 1: first members (deduplicated), all in parallel
  const firstChecks = new Map<string, Promise<SplitPartCheck>>();
  for (const p of proposals) {
    if (!firstChecks.has(p.first)) firstChecks.set(p.first, checkPart(p.first, false, lookup));
  }
  const firsts = new Map<string, SplitPartCheck>();
  await Promise.all(Array.from(firstChecks, async ([k, v]) => firsts.set(k, await v)));

  // Phase 2: second members of proposals with a confirmed first member
  const ranked: RankedSplit[] = [];
  await Promise.all(proposals.map(async (p) => {
    const first = firsts.get(p.first)!;
    if (!first.found) return;
    const second = await checkPart(p.second, true, lookup);
    const balance = Math.min(letterCount(p.first), letterCount(p.second));
    const score = (second.found ? 100 : 40) + Math.min(balance, 8) + (p.kind === 'standard' ? 1 : 0);
    ranked.push({ parts: [first, second], kind: p.kind, score });
  }));

  // Different sandhi readings can lead to the same dictionary parts – keep the best one
  const unique = new Map<string, RankedSplit>();
  for (const r of ranked.sort((a, b) => b.score - a.score)) {
    const key = `${r.parts[0].lemma}+${r.parts[1].lemma}`;
    if (!unique.has(key)) unique.set(key, r);
  }
  const all = Array.from(unique.values());
  // When some split is confirmed in both parts, half-confirmed ones are only noise
  const confirmed = all.filter((r) => r.parts[0].found && r.parts[1].found);
  return (confirmed.length > 0 ? confirmed : all.slice(0, 3)).slice(0, max);
}
