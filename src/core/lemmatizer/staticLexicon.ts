/**
 * Static compound lexicon served with the application (public/lexicon/, built by
 * tools/lexicon/build-lexicon.ts). Works without a server, database or online service:
 *  - stems.tsv.gz: Monier-Williams headwords (Cologne CDSL) and Digital Corpus of Sanskrit
 *    lemmas, with corpus counts as compound member / as word and MW member boundaries;
 *  - compounds.tsv.gz: compounds and sandhi groups attested in the DCS with their members;
 *  - endings.tsv.gz: ending rules learned from the DCS annotation (kṣetre → kṣetra, n. loc. sg.).
 * All keys are SLP1.
 */

export interface AttestedSplit {
  /** Members as written before sandhi, with their dictionary lemma */
  members: Array<{ form: string; lemma: string }>;
  count: number;
  /** 'c' = compound, 's' = words joined by sandhi */
  kind: 'c' | 's';
}

export interface EndingAnalysis {
  lemma: string;
  /** Short grammatical label, e.g. "n. loc. sg." */
  label: string;
  /** DCS count of the rule */
  count: number;
}

interface EndingRule { add: string; count: number; label: string }

const CASE_ABBR: Record<string, string> = {
  Nom: 'nom.', Acc: 'acc.', Ins: 'instr.', Dat: 'dat.', Abl: 'abl.', Gen: 'gen.', Loc: 'loc.', Voc: 'voc.'
};
const GENDER_ABBR: Record<string, string> = { Masc: 'm.', Fem: 'f.', Neut: 'n.' };
const NUMBER_ABBR: Record<string, string> = { Sing: 'sg.', Dual: 'du.', Plur: 'pl.' };

/** "Case=Loc|Gender=Neut|Number=Sing" → "n. loc. sg."; verbs → "3. sg. pres." */
export function featsLabel(feats: string): string {
  const f = Object.fromEntries(feats.split('|').filter(Boolean).map((x) => x.split('=')));
  if (f.Case) return [GENDER_ABBR[f.Gender], CASE_ABBR[f.Case], NUMBER_ABBR[f.Number]].filter(Boolean).join(' ');
  if (f.Person) return [`${f.Person}.`, NUMBER_ABBR[f.Number], f.Tense ? f.Tense.toLowerCase() + '.' : '', f.Mood && f.Mood !== 'Ind' ? f.Mood.toLowerCase() + '.' : ''].filter(Boolean).join(' ');
  return f.VerbForm ? f.VerbForm.toLowerCase() + '.' : '';
}

const STEM_MW = 1;
const STEM_DCS = 2;
const STEM_INDECLINABLE = 4;

/**
 * Normalized spelling used as a secondary key: texts and dictionaries differ in consonant
 * doubling (pattra / patra, sattva stays) and in homorganic nasal vs anusvāra
 * (saṅga / saṃga, sandhi / saṃdhi).
 */
export function orthographicKey(slp1: string): string {
  return slp1
    .replace(/ttr/g, 'tr')
    .replace(/([rh])([kKgGcCjJwWqQtTdDpPbBmnN])\2/g, '$1$2') // dharmma → dharma
    .replace(/[NYRnm](?=[kKgGcCjJwWqQtTdDpPbB])/g, 'M');
}

/** Final-sound key of a written word: karmaphalahetur / karmaphalahetuḥ → …hetuH. */
export function pausaKey(slp1: string): string {
  let w = slp1.replace(/^'+/, '');
  if (/[sSzr]$/.test(w) && w.length > 2) w = w.slice(0, -1) + 'H';
  else if (/[^aA]o$/.test(w)) w = w.slice(0, -1) + 'aH';
  else if (/m$/.test(w)) w = w.slice(0, -1) + 'M';
  else if (/d$/.test(w)) w = w.slice(0, -1) + 't';
  else if (/g$/.test(w)) w = w.slice(0, -1) + 'k';
  else if (/v$/.test(w)) w = w.slice(0, -1) + 'u';
  else if (/y$/.test(w)) w = w.slice(0, -1) + 'i';
  return orthographicKey(w);
}

export class StaticLexicon {
  private readonly index = new Map<string, number>();
  private readonly ortho = new Map<string, number[]>();
  private readonly keys: string[] = [];
  private readonly flags: Uint8Array;
  private readonly cpd: Uint32Array;
  private readonly fin: Uint32Array;
  private readonly splits = new Map<number, string>();
  private readonly attested = new Map<string, AttestedSplit[]>();
  /** Ending rules by the text they strip */
  private readonly endings = new Map<string, EndingRule[]>();
  private maxStrip = 0;
  /** Total DCS occurrences (for relative frequencies) */
  readonly totalCpd: number;
  readonly totalFin: number;

  constructor(stemsTsv: string, compoundsTsv = '', endingsTsv = '') {
    const lines = stemsTsv.split('\n');
    this.flags = new Uint8Array(lines.length);
    this.cpd = new Uint32Array(lines.length);
    this.fin = new Uint32Array(lines.length);
    let totalCpd = 0;
    let totalFin = 0;
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const [key, src, cpd, fin, split] = line.split('\t');
      const i = this.keys.length;
      this.keys.push(key);
      this.index.set(key, i);
      this.flags[i] = (src.includes('m') ? STEM_MW : 0) | (src.includes('d') ? STEM_DCS : 0) | (src.includes('i') ? STEM_INDECLINABLE : 0);
      this.cpd[i] = Number(cpd) || 0;
      this.fin[i] = Number(fin) || 0;
      totalCpd += this.cpd[i];
      totalFin += this.fin[i];
      if (split) this.splits.set(i, split);
      const o = orthographicKey(key);
      if (o !== key) {
        const list = this.ortho.get(o);
        if (list) list.push(i); else this.ortho.set(o, [i]);
      }
    }
    this.totalCpd = totalCpd;
    this.totalFin = totalFin;

    for (const line of compoundsTsv.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const [surface, members, count, kind] = line.split('\t');
      const key = pausaKey(surface);
      const entry: AttestedSplit = {
        members: members.split(' ').map((m) => {
          const [form, lemma] = m.split('/');
          return { form, lemma: lemma || form };
        }),
        count: Number(count) || 1,
        kind: kind === 's' ? 's' : 'c'
      };
      const list = this.attested.get(key);
      if (list) list.push(entry); else this.attested.set(key, [entry]);
    }

    for (const line of endingsTsv.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const [strip, add, count, feats] = line.split('\t');
      const top = (feats || '').split(' ')[0]?.replace(/:\d+$/, '') || '';
      const rule: EndingRule = { add: add || '', count: Number(count) || 0, label: featsLabel(top) };
      const list = this.endings.get(strip);
      if (list) list.push(rule); else this.endings.set(strip, [rule]);
      this.maxStrip = Math.max(this.maxStrip, strip.length);
    }
  }

  /**
   * Dictionary forms of an inflected word by the learned ending rules, checked against the
   * stems (kzetre → kzetra n. loc. sg.); most frequent rule first.
   */
  lemmatize(formSlp1: string): EndingAnalysis[] {
    const out = new Map<string, EndingAnalysis>();
    for (let l = Math.min(this.maxStrip, formSlp1.length - 1); l >= 1; l--) {
      const strip = formSlp1.slice(-l);
      for (const rule of this.endings.get(strip) || []) {
        const candidate = formSlp1.slice(0, -l) + rule.add;
        const lemma = this.index.has(candidate) ? candidate : this.find(candidate)[0];
        if (!lemma) continue;
        const prev = out.get(lemma);
        if (!prev || prev.count < rule.count) out.set(lemma, { lemma, label: rule.label, count: rule.count });
      }
    }
    return Array.from(out.values()).sort((a, b) => b.count - a.count);
  }

  get size(): number {
    return this.keys.length;
  }

  /** Stems with this text, or with the same normalized spelling (patra → pattra). */
  find(slp1: string): string[] {
    const i = this.index.get(slp1);
    const out = i !== undefined ? [slp1] : [];
    const o = orthographicKey(slp1);
    for (const j of this.ortho.get(o) || []) if (this.keys[j] !== slp1) out.push(this.keys[j]);
    if (o !== slp1 && this.index.has(o) && !out.includes(o)) out.push(o);
    return out;
  }

  has(slp1: string): boolean {
    return this.index.has(slp1);
  }

  /** DCS count of the lemma as a non-final compound member. */
  memberCount(slp1: string): number {
    const i = this.index.get(slp1);
    return i === undefined ? 0 : this.cpd[i];
  }

  /** DCS count of the lemma as a word or final member. */
  wordCount(slp1: string): number {
    const i = this.index.get(slp1);
    return i === undefined ? 0 : this.fin[i];
  }

  /** The corpus uses the word mostly without case or verb endings (ca, eva, tatra). */
  isIndeclinable(slp1: string): boolean {
    const i = this.index.get(slp1);
    return i !== undefined && (this.flags[i] & STEM_INDECLINABLE) !== 0;
  }

  isMwHeadword(slp1: string): boolean {
    const i = this.index.get(slp1);
    return i !== undefined && (this.flags[i] & STEM_MW) !== 0;
  }

  /** Member boundaries Monier-Williams gives for a compound headword (Darmakzetra → Darma, kzetra). */
  mwSplit(slp1: string): string[] | null {
    const i = this.index.get(slp1);
    const split = i === undefined ? undefined : this.splits.get(i);
    return split ? split.split(/[+-]/) : null;
  }

  /**
   * Monier-Williams lists the word as a compound (its own entry, "dharma—kṣetra"), not as a
   * prefixed or derived word (saṃ-vāda).
   */
  isMwCompound(slp1: string): boolean {
    const i = this.index.get(slp1);
    return i !== undefined && (this.splits.get(i)?.includes('+') ?? false);
  }

  /** Splits of this written word attested in the DCS, most frequent first. */
  attestedSplits(writtenSlp1: string): AttestedSplit[] {
    return (this.attested.get(pausaKey(writtenSlp1)) || []).slice().sort((a, b) => b.count - a.count);
  }
}

/** Decodes a gzip file when it is one (some hosts already send it decompressed). */
async function readMaybeGzip(res: Response): Promise<string> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  return new TextDecoder().decode(bytes);
}

let lexicon: StaticLexicon | null = null;
let loading: Promise<StaticLexicon | null> | null = null;

/** Base URL of the lexicon files (next to the application, e.g. "/lexicon/"). */
export function defaultLexiconBaseUrl(): string {
  const base = (import.meta as any).env?.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : base + '/'}lexicon/`;
}

export function getLoadedStaticLexicon(): StaticLexicon | null {
  return lexicon;
}

export function useStaticLexicon(l: StaticLexicon | null): void {
  lexicon = l;
}

/** Fetches and parses the static lexicon once; null when the files are not available. */
export async function loadStaticLexicon(baseUrl = defaultLexiconBaseUrl()): Promise<StaticLexicon | null> {
  if (lexicon) return lexicon;
  if (loading) return loading;
  loading = (async () => {
    try {
      const optional = (name: string) => fetch(`${baseUrl}${name}`).then((r) => (r.ok ? readMaybeGzip(r) : '')).catch(() => '');
      const [stems, compounds, endings] = await Promise.all([
        fetch(`${baseUrl}stems.tsv.gz`).then((r) => (r.ok ? readMaybeGzip(r) : Promise.reject(new Error(`stems: HTTP ${r.status}`)))),
        optional('compounds.tsv.gz'),
        optional('endings.tsv.gz')
      ]);
      lexicon = new StaticLexicon(stems, compounds, endings);
      return lexicon;
    } catch (err) {
      console.warn('[lexicon] Static compound lexicon not available:', err);
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
