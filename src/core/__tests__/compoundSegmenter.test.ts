// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { loadVidyutWasm, splitSandhiSlp1 } from '../lemmatizer/vidyutAdapter.ts';
import {
  CompoundSegmenter,
  CompoundLexicon,
  MemberAnalysis,
  segmentWord,
  splitAtHyphens,
  hasCompoundHyphen,
  finalFormVariants
} from '../lemmatizer/compoundSegmenter.ts';
import { MsgpackReader } from '../lemmatizer/kosha/msgpack.ts';
import { koshaFromZip } from '../lemmatizer/kosha/kosha.ts';
import { useKosha } from '../lemmatizer/kosha/koshaService.ts';
import { analyzeCompoundSync, agreesWithSplit } from '../lemmatizer/compoundService.ts';
import { StaticLexicon, useStaticLexicon, orthographicKey, pausaKey, featsLabel } from '../lemmatizer/staticLexicon.ts';
import { createTokensFromIast } from '../corpus/bookManager.ts';
import { mergeCompound } from '../editor/tokenOps.ts';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

/** Small stand-in for the kosha (SLP1). */
const STEMS = new Map<string, string[]>([
  ['Darma', ['Darma']], ['kuru', ['kuru']], ['yoga', ['yoga']], ['kfzRa', ['kfzRa']],
  ['arjuna', ['arjuna']], ['rAja', ['rAjan']], ['sarva', ['sarva']], ['BUta', ['BUta']]
]);
const FORMS = new Map<string, MemberAnalysis[]>([
  ['kzetre', [{ lemma: 'kzetra', label: 'n. loc. sg.' }]],
  ['ISvaras', [{ lemma: 'ISvara', label: 'm. nom. sg.' }]],
  ['saMvAdas', [{ lemma: 'saMvAda', label: 'm. nom. sg.' }]],
  ['fzis', [{ lemma: 'fzi', label: 'm. nom. sg.' }]],
  ['hite', [{ lemma: 'hita', label: 'n. loc. sg.' }]]
]);
const mockLexicon: CompoundLexicon = {
  stemLemmas: (s) => STEMS.get(s) || [],
  formAnalyses: (s) => FORMS.get(s) || []
};

const ZIP = process.env.VIDYUT_DATA_ZIP;
const hasZip = Boolean(ZIP && existsSync(ZIP));

beforeAll(async () => {
  await loadVidyutWasm();
});

afterEach(() => {
  useKosha(null);
  useStaticLexicon(null);
});

/** The lexicon served with the app (public/lexicon, built by tools/lexicon/build-lexicon.ts in the sanskrit-splitter repository) */
const LEXICON_DIR = join(process.cwd(), 'public', 'lexicon');
const hasLexicon = existsSync(join(LEXICON_DIR, 'stems.tsv.gz'));
let shippedLexicon: StaticLexicon | null = null;
function loadShippedLexicon(): StaticLexicon {
  if (!shippedLexicon) {
    const gz = (f: string) => gunzipSync(readFileSync(join(LEXICON_DIR, f))).toString('utf8');
    shippedLexicon = new StaticLexicon(gz('stems.tsv.gz'), gz('compounds.tsv.gz'), gz('endings.tsv.gz'), gz('forms.tsv.gz'));
  }
  return shippedLexicon;
}

describe('Compound segmenter', () => {
  const seg = () => new CompoundSegmenter(mockLexicon, splitSandhiSlp1);
  const best = (word: string) => segmentWord([word], seg()).splits[0]?.members.map((m) => m.slp1);

  it('splits two- and three-member compounds with sandhi reversed', () => {
    expect(best('Darmakzetre')).toEqual(['Darma', 'kzetre']);
    expect(best('yogeSvaraH')).toEqual(['yoga', 'ISvaraH']);
    expect(best('kfzRArjunasaMvAdaH')).toEqual(['kfzRa', 'arjuna', 'saMvAdaH']);
    expect(best('sarvaBUtahite')).toEqual(['sarva', 'BUta', 'hite']);
  });

  it('maps compound-form stems to dictionary stems and the final member to its analysis', () => {
    const [first, last] = segmentWord(['rAjarziH'], seg()).splits[0].members;
    expect(first).toMatchObject({ role: 'stem', lemmas: ['rAjan'] });
    expect(last).toMatchObject({ role: 'form', lemmas: ['fzi'] });
    expect(last.analyses[0].label).toBe('m. nom. sg.');
  });

  it('keeps hyphens as member boundaries and marks unknown parts', () => {
    const res = segmentWord(['Darma', 'kzetre'], seg());
    expect(res.splits[0].members.map((m) => m.slp1)).toEqual(['Darma', 'kzetre']);
    const unknown = segmentWord(['xyz', 'kzetre'], seg()).splits[0].members;
    expect(unknown.map((m) => m.role)).toEqual(['unknown', 'form']);
  });

  it('finds no split when the members are not in the lexicon', () => {
    expect(segmentWord(['abcdefgh'], seg()).splits).toEqual([]);
  });

  it('recognizes hyphens between letters only', () => {
    expect(hasCompoundHyphen('dharma-kṣetre')).toBe(true);
    expect(hasCompoundHyphen('-')).toBe(false);
    expect(splitAtHyphens('kṛṣṇa-arjuna-saṃvādaḥ')).toEqual(['kṛṣṇa', 'arjuna', 'saṃvādaḥ']);
  });

  it('reverts pausa and sentence-sandhi endings of the final member', () => {
    expect(finalFormVariants('devaH')).toContain('devas');
    expect(finalFormVariants('rAmo')).toContain('rAmas');
    expect(finalFormVariants('duHKezv')).toContain('duHKezu');
  });
});

describe('Segmenter scoring with corpus evidence', () => {
  // vidyArambha is a lexicalized compound the corpus divides; vidyA and Arambha are frequent
  const lexicon: CompoundLexicon = {
    stemLemmas: (s) => (['sarva', 'vidyA', 'vidyArambha'].includes(s) ? [s] : []),
    formAnalyses: (s) => (s === 'ArambhAH' ? [{ lemma: 'Arambha', label: 'm. nom. pl.' }]
      : s === 'vidyArambhAH' ? [{ lemma: 'vidyArambha', label: 'm. nom. pl.' }] : []),
    weight: (lemmas) => (lemmas.includes('vidyArambha') ? 0 : 8),
    isDivisible: (lemmas) => lemmas.includes('vidyArambha')
  };
  const top = (scoring: object) =>
    segmentWord(['sarvavidyArambhAH'], new CompoundSegmenter(lexicon, splitSandhiSlp1, scoring)).splits[0].members.map((m) => m.slp1);

  it('prefers long members by length alone', () => {
    expect(top({})).toEqual(['sarva', 'vidyArambhAH']);
  });

  it('divides lexicalized compounds when the corpus does', () => {
    expect(top({ freqWeight: 4, memberCost: 60, divisibleCost: 200 })).toEqual(['sarva', 'vidyA', 'ArambhAH']);
  });
});

describe('Static compound lexicon', () => {
  const stems = [
    '# header',
    'Darmakzetra\tmd\t\t2\tDarma+kzetra',
    'saMvAda\tmd\t15\t234\tsaM-vAda',
    'pattra\tmd\t826\t1373\t',
    'saNga\tmd\t10\t50\t',
    'kzetra\tmd\t271\t762\t',
    'hetu\tmd\t100\t900\t',
    'eva\tmdi\t15\t66827\t'
  ].join('\n');
  const compounds = '# header\nkarmaPalahetur\tkarma/karman Pala hetuH/hetu\t3\tc\n';
  const endings = '# header\ne\ta\t5000\tCase=Loc|Gender=Neut|Number=Sing:4000\nuH\tu\t20000\tCase=Nom|Gender=Masc|Number=Sing:19000\n';
  const lex = new StaticLexicon(stems, compounds, endings);

  it('finds stems across spelling variants', () => {
    expect(orthographicKey('pattra')).toBe('patra');
    expect(lex.find('patra')).toEqual(['pattra']);
    expect(lex.find('saMga')).toEqual(['saNga']);
  });

  it('tells compounds from prefixed words and knows indeclinables', () => {
    expect(lex.mwSplit('Darmakzetra')).toEqual(['Darma', 'kzetra']);
    expect(lex.isMwCompound('Darmakzetra')).toBe(true);
    expect(lex.isMwCompound('saMvAda')).toBe(false);
    expect(lex.isIndeclinable('eva')).toBe(true);
    expect(lex.memberCount('pattra')).toBe(826);
  });

  it('looks attested splits up regardless of the final sandhi', () => {
    expect(pausaKey('karmaPalahetur')).toBe(pausaKey('karmaPalahetuH'));
    const [split] = lex.attestedSplits('karmaPalahetuH');
    expect(split.members.map((m) => m.lemma)).toEqual(['karman', 'Pala', 'hetu']);
    expect(split).toMatchObject({ count: 3, kind: 'c' });
  });

  it('lemmatizes with the learned ending rules', () => {
    expect(lex.lemmatize('kzetre')[0]).toMatchObject({ lemma: 'kzetra', label: 'n. loc. sg.' });
    expect(lex.lemmatize('hetuH')[0].lemma).toBe('hetu');
    expect(featsLabel('Tense=Pres|Mood=Ind|Person=3|Number=Sing')).toBe('3. sg. pres.');
  });

  it('matches segmentations to Monier-Williams member boundaries despite sandhi', () => {
    expect(agreesWithSplit(['rAja', 'fziH'], ['rAja', 'rzi'])).toBe(true);
    expect(agreesWithSplit(['rA', 'jarziH'], ['rAja', 'rzi'])).toBe(false);
  });
});

describe.skipIf(!hasLexicon)('Compound splitting with the shipped lexicon', () => {
  const lemmas = (w: string, opts = {}) => analyzeCompoundSync(w, opts)!.splits[0].members.map((m) => m.lemma);

  it('splits compounds with the segmenter alone (no corpus lookup, no kosha)', () => {
    useStaticLexicon(loadShippedLexicon());
    expect(lemmas('kṛṣṇārjunasaṃvādaḥ', { noAttested: true })).toEqual(['kṛṣṇa', 'arjuna', 'saṃvāda']);
    expect(lemmas('karmaphalahetur', { noAttested: true })).toEqual(['karma', 'phala', 'hetu']);
    expect(lemmas('sarvabhūtahite', { noAttested: true })).toEqual(['sarva', 'bhūta', 'hita']);
    const patra = analyzeCompoundSync('nīlotpalapatrākṣaḥ', { noAttested: true })!.splits.map((s) => s.members.map((m) => m.lemma).join('+'));
    expect(patra).toContain('nīlotpala+pattra+akṣa');
  });

  it('offers splits attested in the corpus first', () => {
    useStaticLexicon(loadShippedLexicon());
    const [first] = analyzeCompoundSync('rājarṣiḥ')!.splits;
    expect(first.source).toBe('corpus');
    expect(first.count).toBeGreaterThan(10);
    // The corpus lemma of rāja- is rājan; rāja is a headword itself and is shown first
    expect(first.members.map((m) => m.lemma)).toEqual(['rāja', 'ṛṣi']);
    expect(first.members[0].alternatives).toEqual(['rājan']);
    const [tatra, eva] = analyzeCompoundSync('tatraiva')!.splits[0].members;
    expect([tatra.lemma, tatra.label, eva.lemma, eva.label]).toEqual(['tatra', 'ind.', 'eva', 'ind.']);
  });

  it('keeps simple words whole and resolves frequent forms (Bhagavadgītā cases)', () => {
    useStaticLexicon(loadShippedLexicon());
    const whole = (w: string) => {
      const r = analyzeCompoundSync(w)!;
      expect(r.recommended).toBe('whole');
      return r.whole[0].lemma;
    };
    expect(whole('devānāṃ')).toBe('deva');
    expect(whole('dhārtarāṣṭrān')).toBe('dhārtarāṣṭra');
    expect(whole('ucyate')).toBe('vac');
    expect(whole('me')).toBe('mad');
    expect(whole('yaḥ')).toBe('yad');
    expect(whole('jagat')).toBe('jagat');
  });

  it('splits sandhi groups of separate words, also across an avagraha', () => {
    useStaticLexicon(loadShippedLexicon());
    expect(lemmas("loko'sti", { noAttested: true })).toEqual(['loka', 'as']);
    expect(lemmas("buddhayo'vyavasāyinām", { noAttested: true })).toEqual(['buddhi', 'avyavasāyin']);
    expect(lemmas('vibhūtervistaro', { noAttested: true })).toEqual(['vibhūti', 'vistara']);
  });
});

describe('Hyphenated words in tokenization', () => {
  it('splits hyphenated words into compound members that merge back', () => {
    const tokens = createTokensFromIast('dharma-kṣetre kuru-kṣetre', 't');
    expect(tokens.map((t) => t.text.iast)).toEqual(['dharma', 'kṣetre', 'kuru', 'kṣetre']);
    expect(tokens[0]).toMatchObject({ id: 't_1_1', lemma: 'dharma', compound: { is_compound_member: true, position: 'prefix', analysis: 'dharma-kṣetre' } });
    expect(tokens[1].compound?.position).toBe('final');
    const merged = mergeCompound(tokens, 't_1_2');
    expect(merged.map((t) => t.text.iast)).toEqual(['dharma-kṣetre', 'kuru', 'kṣetre']);
  });
});

describe('MessagePack reader', () => {
  it('reads the registry subset (ints, strings, arrays, maps)', () => {
    // [5, "ab", {1: [true, null]}, -3, 300]
    const bytes = new Uint8Array([0x95, 0x05, 0xa2, 0x61, 0x62, 0x81, 0x01, 0x92, 0xc3, 0xc0, 0xfd, 0xcd, 0x01, 0x2c]);
    const r = new MsgpackReader(bytes);
    expect(r.readArrayHeader()).toBe(5);
    expect(r.read()).toBe(5);
    expect(r.read()).toBe('ab');
    expect(r.read()).toEqual(new Map([[1, [true, null]]]));
    expect(r.read()).toBe(-3);
    expect(r.read()).toBe(300);
  });
});

// Real data: set VIDYUT_DATA_ZIP to the path of data-0.4.0.zip
describe.skipIf(!hasZip)('Vidyut kosha (data-0.4.0.zip)', () => {
  it('reads inflected forms like vidyut-kosha', async () => {
    const kosha = await koshaFromZip(new Uint8Array(readFileSync(ZIP!)));
    const fmt = (w: string) => kosha.getAll(w).map((p) => (p.kind === 'subanta' ? `${p.stem.text}:${p.linga}:${p.vibhakti}:${p.vacana}` : p.kind));
    expect(fmt('Darmasya')).toEqual(['Darma:Pum:Sasthi:Eka', 'Darma:Napumsaka:Sasthi:Eka']);
    expect(fmt('rAjAnam')).toEqual(['rAjan:Pum:Dvitiya:Eka']);
    expect(kosha.getAll('kzetre')).toHaveLength(17);
    expect(kosha.getAll('Bavati').some((p) => p.kind === 'tinanta' && p.dhatu.cleanText === 'BU' && p.lakara === 'Lat')).toBe(true);

    useKosha(kosha);
    const res = analyzeCompoundSync('kṛṣṇārjunasaṃvādaḥ')!;
    expect(res.splits[0].members.map((m) => m.lemma)).toEqual(['kṛṣṇa', 'arjuna', 'saṃvāda']);
    // rāja is itself a headword ("in comp. for rājan"); the n-stem is offered as an alternative
    const [raja, rsi] = analyzeCompoundSync('rājarṣiḥ')!.splits[0].members;
    expect([raja.lemma, rsi.lemma]).toEqual(['rāja', 'ṛṣi']);
    expect(raja.alternatives).toContain('rājan');
    expect(analyzeCompoundSync('dharmakṣetre')!.whole[0].lemma).toBe('dharmakṣetra');
  }, 60000);
});
