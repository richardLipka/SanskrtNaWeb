/**
 * Measures compound splitting against compounds annotated in the Digital Corpus of Sanskrit
 * (gold file written by build-lexicon.ts --gold).
 *
 *   npx vite-node tools/lexicon/evaluate-segmenter.ts -- --lexicon public/lexicon --gold <gold-compounds.tsv>
 *     [--kosha data-0.4.0.zip] [--limit 3000] [--grid] [--attested]
 *
 * A split counts as correct when it has the gold number of members and every member matches
 * the gold member by lemma (or one of its alternatives) or by its unsandhied form.
 * The DCS lookup of attested splits is off unless --attested is given, so the numbers
 * describe the segmenter itself (the gold compounds are part of the corpus).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { loadVidyutWasm, transliterateLipi } from '../../src/core/lemmatizer/vidyutAdapter.ts';
import { StaticLexicon, pausaKey, useStaticLexicon } from '../../src/core/lemmatizer/staticLexicon.ts';
import { koshaFromZip } from '../../src/core/lemmatizer/kosha/kosha.ts';
import { useKosha } from '../../src/core/lemmatizer/kosha/koshaService.ts';
import { analyzeCompoundSync, AnalyzeOptions } from '../../src/core/lemmatizer/compoundService.ts';

const args = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);

await loadVidyutWasm();
const lexDir = opt('lexicon', 'public/lexicon')!;
const gz = (f: string) => gunzipSync(readFileSync(join(lexDir, f))).toString('utf8');
const optionalGz = (f: string) => { try { return gz(f); } catch { return ''; } };
const lexicon = new StaticLexicon(gz('stems.tsv.gz'), flag('attested') ? gz('compounds.tsv.gz') : '', optionalGz('endings.tsv.gz'), optionalGz('forms.tsv.gz'));
const koshaPath = opt('kosha');
const kosha = koshaPath ? await koshaFromZip(new Uint8Array(readFileSync(koshaPath))) : null;

const toIast = (s: string) => transliterateLipi(s, 'slp1', 'iast');
const toSlp1 = (s: string) => transliterateLipi(s, 'iast', 'slp1');
const limit = Number(opt('limit', '0'));
const rows = readFileSync(opt('gold')!, 'utf8').split('\n').filter(Boolean).map((l) => {
  const [set, surface, members] = l.split('\t');
  return { set, surface, members: members.split(' ').map((m) => { const [form, lemma] = m.split('/'); return { form, lemma: lemma || form }; }) };
});
// --offset picks a disjoint sample of the same size (tuning vs. validation)
const offset = Number(opt('offset', '0'));
const sample = limit ? rows.filter((_, i) => i % Math.ceil(rows.length / limit) === offset) : rows;

const showErrors = Number(opt('errors', '0'));
const errors: string[] = [];

/**
 * `whole` = the analysis recommends reading the word as one word; the gold words are
 * compounds, so that counts as a miss for top 1 (the splits still count for top 3)
 */
interface Result { top1: number; top3: number; count: number; none: number; whole: number; ms: number }

function evaluate(options: AnalyzeOptions, set?: string): Result {
  const r: Result = { top1: 0, top3: 0, count: 0, none: 0, whole: 0, ms: 0 };
  const t0 = performance.now();
  for (const g of sample) {
    if (set && g.set !== set) continue;
    r.count++;
    const res = analyzeCompoundSync(g.surface, { noAttested: !flag('attested'), max: 3, ...options });
    const splits = res?.splits || [];
    if (!splits.length) { r.none++; continue; }
    const ok = (i: number) => {
      const s = splits[i];
      if (!s || s.members.length !== g.members.length) return false;
      return s.members.every((m, k) => {
        const gold = g.members[k];
        const lemmas = [m.lemma, ...m.alternatives].map((x) => toSlp1(x));
        return lemmas.includes(gold.lemma) || pausaKey(toSlp1(m.iast)) === pausaKey(gold.form);
      });
    };
    const whole = res?.recommended === 'whole';
    if (whole) r.whole++;
    if (ok(0) && !whole) r.top1++;
    else if (errors.length < showErrors) errors.push(`${g.surface}: gold ${g.members.map((m) => toIast(m.lemma)).join(' + ')}  |  got ${splits[0].members.map((m) => m.lemma).join(' + ')}`);
    if (ok(0) || ok(1) || ok(2)) r.top3++;
  }
  r.ms = (performance.now() - t0) / Math.max(1, r.count);
  return r;
}

const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(1)} %`;
const report = (name: string, r: Result) =>
  console.log(`${name.padEnd(46)} n=${r.count}  top1 ${pct(r.top1, r.count)}  top3 ${pct(r.top3, r.count)}  no split ${pct(r.none, r.count)}  kept whole ${pct(r.whole, r.count)}  ${r.ms.toFixed(1)} ms/word`);

const configs: Array<[string, AnalyzeOptions, StaticLexicon | null, boolean]> = [];
if (!flag('grid') || flag('baseline')) {
  if (kosha) configs.push(['kosha only (previous version)', { scoring: { lengthExponent: 2, freqWeight: 0, memberCost: 4 }, mwBonus: 0 }, null, true]);
  configs.push(['static lexicon, length only', { scoring: { lengthExponent: 2, freqWeight: 0, memberCost: 4 }, mwBonus: 0 }, lexicon, false]);
}
if (flag('grid')) {
  const list = (name: string, def: string) => opt(name, def)!.split(',').map(Number);
  for (const exp of list('exps', '1.5,2')) for (const fw of list('freqs', '0,2,4')) for (const cost of list('costs', '4'))
    for (const mb of list('mws', '0,10')) for (const dc of list('divs', '0')) for (const wc of list('words', 'Infinity')) {
      configs.push([`exp=${exp} freq=${fw} cost=${cost} mw=${mb} div=${dc} word=${wc}`, { scoring: { lengthExponent: exp, freqWeight: fw, memberCost: cost, divisibleCost: dc, wordCost: wc }, mwBonus: mb }, lexicon, !!kosha]);
    }
} else {
  configs.push(['static lexicon, tuned', {}, lexicon, false]);
  if (kosha) configs.push(['static lexicon + kosha, tuned', {}, lexicon, true]);
}

for (const [name, options, lex, withKosha] of configs) {
  useStaticLexicon(lex);
  useKosha(withKosha ? kosha : null);
  report(name, evaluate(options));
  if (!flag('grid')) report(`  … Yogasūtra only`, evaluate(options, 'Yogasūtra'));
}
if (errors.length) console.log(`\nErrors (top 1):\n${errors.join('\n')}`);
