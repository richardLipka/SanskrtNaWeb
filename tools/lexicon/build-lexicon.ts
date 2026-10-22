/**
 * Builds the static compound-splitting lexicon served with the app (public/lexicon/).
 *
 * Sources (downloaded by the developer, not at runtime):
 *  - Monier-Williams 1899, Cologne Digital Sanskrit Lexicon source text
 *    (github.com/sanskrit-lexicon/csl-orig, v02/mw/mw.txt, CC BY-SA 4.0):
 *    headwords (k1) and the member boundaries of compound headwords (k2, "Darma—kzetra");
 *  - Digital Corpus of Sanskrit, O. Hellwig (github.com/OliverHellwig/sanskrit,
 *    dcs/data/conllu, CC BY 4.0): how often a lemma occurs as a compound member or as a
 *    word, and the members of compounds attested in the corpus.
 *
 * Usage (vite-node, so that the project's Vidyut transliteration can be used):
 *   npx vite-node tools/lexicon/build-lexicon.ts -- --mw <mw.txt> --dcs-git <clone of OliverHellwig/sanskrit>
 *     [--dcs-dir <folder with .conllu files>] [--out public/lexicon] [--min-compound 2] [--gold <dir>]
 *
 * The DCS repository has file names that Windows cannot check out; --dcs-git reads the
 * files from the git object store instead (a sparse/partial clone with `git backfill` is enough).
 */

import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createInterface } from 'node:readline';
import { loadVidyutWasm, transliterateLipi } from '../../src/core/lemmatizer/vidyutAdapter.ts';

const args = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const MW = opt('mw');
const DCS_GIT = opt('dcs-git');
const DCS_DIR = opt('dcs-dir');
const OUT = opt('out', 'public/lexicon')!;
const MIN_COMPOUND = Number(opt('min-compound', '2'));
const GOLD = opt('gold');
const GOLD_TEXTS = ['Yogasūtra'];
/** Share of the other corpus compounds written to the evaluation sample (deterministic) */
const GOLD_SAMPLE = 0.02;

if (!MW && !DCS_GIT && !DCS_DIR) {
  console.error('Usage: build-lexicon.ts --mw <mw.txt> --dcs-git <repo> [--out public/lexicon]');
  process.exit(1);
}

await loadVidyutWasm();
const slp1Cache = new Map<string, string>();
const toSlp1 = (iast: string) => {
  let s = slp1Cache.get(iast);
  if (s === undefined) {
    s = transliterateLipi(iast.normalize('NFC').toLowerCase(), 'iast', 'slp1').replace(/[^a-zA-Z]/g, '');
    slp1Cache.set(iast, s);
  }
  return s;
};

/** `bare` = word occurrences without case or verb features (indeclinables: ca, eva, tatra) */
interface StemInfo { mw: boolean; dcs: boolean; cpd: number; fin: number; bare: number; split?: string }
const stems = new Map<string, StemInfo>();
const stem = (k: string) => {
  let s = stems.get(k);
  if (!s) { s = { mw: false, dcs: false, cpd: 0, fin: 0, bare: 0 }; stems.set(k, s); }
  return s;
};

// --- Monier-Williams ---------------------------------------------------------------------

if (MW) {
  const re = /^<L>[^<]*<pc>[^<]*<k1>([^<]*)<k2>([^<]*)/;
  let n = 0;
  let splits = 0;
  for await (const line of createInterface({ input: createReadStream(MW, 'utf8'), crlfDelay: Infinity })) {
    const m = re.exec(line);
    if (!m) continue;
    const k1 = m[1].replace(/[^a-zA-Z]/g, '');
    if (!k1) continue;
    const s = stem(k1);
    s.mw = true;
    n++;
    // k2 marks members with "—" (compound) and "-" (prefix/derivative); accents etc. dropped
    const k2 = m[2].replace(/[\/\^~'\s;|0-9]/g, '');
    if (!s.split && /[—-]/.test(k2)) {
      const parts = k2.split(/[—-]/).filter(Boolean);
      // Stored as "Darma+kzetra" (compound members) / "saM-vAda" (prefix, derivative)
      if (parts.join('') === k1 && parts.length > 1) { s.split = k2.replace(/—/g, '+').replace(/[+-]{2,}/g, (x) => x[0]).replace(/^[+-]|[+-]$/g, ''); splits++; }
    }
  }
  console.log(`MW: ${n} entries, ${[...stems.values()].filter((s) => s.mw).length} headwords, ${splits} with member boundaries`);
}

// --- DCS ---------------------------------------------------------------------------------

interface Compound { members: string; count: number; kind: 'c' | 's' }
const compounds = new Map<string, Compound>();
const gold: string[] = [];
let goldCounter = 0;
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Ending rules learned from the annotated words: form "kzetre", lemma "kzetra" →
// strip "e", add "a", Case=Loc|Gender=Neut|Number=Sing. One letter of the shared stem is
// kept in the rule as context, so that rules do not apply to any stem whatsoever.
interface EndingRule { count: number; feats: Map<string, number> }
const endingRules = new Map<string, EndingRule>();

function addEndingRule(form: string, lemma: string, feats: string) {
  if (!form || !lemma || form.length > 30) return;
  let p = 0;
  while (p < form.length && p < lemma.length && form[p] === lemma[p]) p++;
  if (p === 0) return; // suppletive forms (verbs: gacchati → gam) are not generalizable
  const ctx = Math.max(0, p - 1);
  const strip = form.slice(ctx);
  const add = lemma.slice(ctx);
  if (strip.length > 9) return;
  const f = feats.split('|').filter((x) => /^(Case|Number|Gender|Tense|Mood|Person|VerbForm)=/.test(x)).join('|');
  const key = `${strip}\t${add}`;
  let r = endingRules.get(key);
  if (!r) { r = { count: 0, feats: new Map() }; endingRules.set(key, r); }
  r.count++;
  r.feats.set(f, (r.feats.get(f) || 0) + 1);
}

// Frequent word forms with their lemmas: covers what ending rules cannot learn
// (pronouns me → mad, irregular verbs ucyate → vac, jāyate → jan).
const forms = new Map<string, Map<string, { count: number; feats: Map<string, number> }>>();

function addForm(form: string, lemma: string, feats: string) {
  if (!form || form.length > 25) return;
  let byLemma = forms.get(form);
  if (!byLemma) { byLemma = new Map(); forms.set(form, byLemma); }
  let e = byLemma.get(lemma);
  if (!e) { e = { count: 0, feats: new Map() }; byLemma.set(lemma, e); }
  e.count++;
  const f = feats.split('|').filter((x) => /^(Case|Number|Gender|Tense|Mood|Person|VerbForm)=/.test(x)).join('|');
  e.feats.set(f, (e.feats.get(f) || 0) + 1);
}

function processConllu(text: string) {
  let textName = '';
  let range: { end: number; surface: string; members: string[]; lemmas: string[]; cpd: boolean[] } | null = null;
  const flush = () => {
    if (!range) return;
    if (range.members.length > 1) {
      const surface = toSlp1(range.surface);
      const members = range.members.map((f, i) => (f === range!.lemmas[i] ? f : `${f}/${range!.lemmas[i]}`)).join(' ');
      // 'c' = compound (all members but the last are stems), 's' = words joined by sandhi
      const kind = range.cpd.slice(0, -1).every(Boolean) ? 'c' : 's';
      const key = `${surface}\t${members}`;
      const c = compounds.get(key);
      if (c) c.count++; else compounds.set(key, { members, count: 1, kind });
      if (GOLD && kind === 'c') {
        if (GOLD_TEXTS.includes(textName)) gold.push(`${textName}\t${range.surface}\t${members}`);
        else if (hash(`${textName}|${goldCounter++}`) % 10000 < GOLD_SAMPLE * 10000) gold.push(`sample\t${range.surface}\t${members}`);
      }
    }
    range = null;
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('## text:')) { textName = line.slice(8).trim(); continue; }
    if (!line || line.startsWith('#')) { if (!line) flush(); continue; }
    const cols = line.split('\t');
    const id = cols[0];
    if (id.includes('-')) {
      flush();
      const [, end] = id.split('-').map(Number);
      range = { end, surface: cols[1], members: [], lemmas: [], cpd: [] };
      continue;
    }
    const lemma = cols[2];
    if (!lemma || lemma === '_') continue;
    const lemmaSlp1 = toSlp1(lemma);
    if (!lemmaSlp1) continue;
    const isCpd = /(^|\|)Case=Cpd(\||$)/.test(cols[5] || '');
    const s = stem(lemmaSlp1);
    s.dcs = true;
    if (isCpd) s.cpd++; else s.fin++;
    if (!isCpd && !/(Case|Person|VerbForm)=/.test(cols[5] || '')) s.bare++;
    const unsandhied = /Unsandhied=([^|]*)/.exec(cols[9] || '')?.[1] || cols[1];
    if (!isCpd && cols[5] && cols[5] !== '_') addEndingRule(toSlp1(unsandhied), lemmaSlp1, cols[5]);
    if (!isCpd) addForm(toSlp1(unsandhied), lemmaSlp1, cols[5] || '');
    if (range && Number(id) <= range.end) {
      range.members.push(toSlp1(unsandhied));
      range.lemmas.push(lemmaSlp1);
      range.cpd.push(isCpd);
      if (Number(id) === range.end) flush();
    }
  }
  flush();
}

async function readDcsGit(repo: string) {
  const listing = execFileSync('git', ['-C', repo, 'ls-tree', '-r', '-z', 'HEAD', 'dcs/data/conllu/files'], { maxBuffer: 1 << 28 }).toString('utf8');
  // Only the annotated .conllu files (the tree also has .conllu_parsed copies)
  const shas = listing.split('\0').filter((e) => e.endsWith('.conllu')).map((e) => e.split(/\s+/)[2]).filter(Boolean);
  console.log(`DCS: ${shas.length} files`);
  const proc = spawn('git', ['-C', repo, 'cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'inherit'] });
  proc.stdin.end(shas.join('\n') + '\n');
  let buf = Buffer.alloc(0);
  let files = 0;
  for await (const chunk of proc.stdout) {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const nl = buf.indexOf(10);
      if (nl < 0) break;
      const size = Number(buf.subarray(0, nl).toString().split(' ')[2]);
      if (buf.length < nl + 1 + size + 1) break;
      processConllu(buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
      buf = buf.subarray(nl + 1 + size + 1);
      if (++files % 2000 === 0) console.log(`  … ${files}`);
    }
  }
}

function readDcsDir(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) readDcsDir(p);
    else if (name.endsWith('.conllu')) processConllu(readFileSync(p, 'utf8'));
  }
}

if (DCS_GIT) await readDcsGit(DCS_GIT);
if (DCS_DIR) readDcsDir(DCS_DIR);

// --- Output ------------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const write = (name: string, lines: string[], header: string) => {
  const text = `${header}\n${lines.join('\n')}\n`;
  const gz = gzipSync(Buffer.from(text, 'utf8'), { level: 9 });
  writeFileSync(join(OUT, `${name}.tsv.gz`), gz);
  console.log(`${name}: ${lines.length} rows, ${(text.length / 1e6).toFixed(1)} MB → ${(gz.length / 1e6).toFixed(2)} MB gzip`);
};

const stemRows = [...stems.entries()]
  .filter(([k]) => k.length > 0)
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([k, s]) => `${k}\t${s.mw ? 'm' : ''}${s.dcs ? 'd' : ''}${s.fin && s.bare > s.fin / 2 ? 'i' : ''}\t${s.cpd || ''}\t${s.fin || ''}\t${s.split || ''}`);
write('stems', stemRows, '# stem(SLP1)\tflags(m=Monier-Williams,d=DCS,i=indeclinable in the DCS)\tDCS count as compound member\tDCS count as word/final member\tMW member boundaries');

const compoundRows = [...compounds.entries()]
  .filter(([, c]) => c.count >= MIN_COMPOUND)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([key, c]) => `${key}\t${c.count}\t${c.kind}`);
write('compounds', compoundRows, `# compound as written(SLP1)\tmembers (form or form/lemma, SLP1)\tDCS occurrences (≥ ${MIN_COMPOUND})\tc = compound, s = words joined by sandhi`);

const MIN_FORM = Number(opt('min-form', '5'));
const formRows: string[] = [];
for (const [form, byLemma] of forms) {
  const total = [...byLemma.values()].reduce((n, e) => n + e.count, 0);
  if (total < MIN_FORM) continue;
  const lemmas = [...byLemma.entries()]
    .filter(([, e]) => e.count >= Math.max(2, total * 0.05))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([lemma, e]) => `${lemma}:${e.count}:${[...e.feats.entries()].sort((a, b) => b[1] - a[1])[0][0]}`);
  if (lemmas.length) formRows.push(`${form}\t${lemmas.join(' ')}`);
}
formRows.sort();
write('forms', formRows, `# word form (SLP1, before sandhi)\tlemma:count:most frequent features (≤ 3 lemmas; forms seen ≥ ${MIN_FORM}×)`);

const MIN_RULE = Number(opt('min-rule', '3'));
const ruleRows = [...endingRules.entries()]
  .filter(([, r]) => r.count >= MIN_RULE)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([key, r]) => {
    const feats = [...r.feats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, n]) => `${f}=${n}`.replace(/=(\d+)$/, ':$1')).join(' ');
    return `${key}\t${r.count}\t${feats}`;
  });
write('endings', ruleRows, `# strip (SLP1, incl. one stem letter)\tadd\tDCS count (≥ ${MIN_RULE})\tmost frequent features:count`);

writeFileSync(join(OUT, 'SOURCES.md'), `# Compound lexicon data

Generated by \`tools/lexicon/build-lexicon.ts\` on ${new Date().toISOString().slice(0, 10)}.

- **stems.tsv.gz** – headwords of Monier-Williams, *A Sanskrit-English Dictionary* (1899),
  from the Cologne Digital Sanskrit Lexicon source text (github.com/sanskrit-lexicon/csl-orig),
  licensed CC BY-SA 4.0, with lemma counts from the Digital Corpus of Sanskrit.
- **endings.tsv.gz** – ending rules (form → lemma with grammar) learned from the DCS annotation.
- **forms.tsv.gz** – frequent word forms of the DCS with their lemmas (pronouns, irregular verbs).
- **compounds.tsv.gz** – compounds attested in the Digital Corpus of Sanskrit (DCS),
  Oliver Hellwig 2010–2024 (github.com/OliverHellwig/sanskrit), licensed CC BY 4.0.

These data files are distributed under CC BY-SA 4.0 (the application code stays MIT).
`);

if (GOLD) {
  mkdirSync(GOLD, { recursive: true });
  writeFileSync(join(GOLD, 'gold-compounds.tsv'), gold.join('\n') + '\n');
  console.log(`gold: ${gold.length} compounds from ${GOLD_TEXTS.join(', ')}`);
}
