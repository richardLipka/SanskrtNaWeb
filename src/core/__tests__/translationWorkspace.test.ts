// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import { loadVidyutWasm, analyzeSanskritWordFull, ruleUrl, derivationMatchesWord } from '../lemmatizer/vidyutAdapter.ts';
import { rankSplits, proposeSplits, lexiconCandidates, LexiconLookup } from '../lemmatizer/compoundSplitter.ts';
import { lookupMonierWilliams, clearMonierWilliamsCache, mwXmlToText } from '../dictionaries/monierWilliams.ts';
import { splitToken, mergeCompound, parseManualSplit } from '../editor/tokenOps.ts';
import { splitTranslationWords } from '../editor/alignmentTool.ts';
import { createTokensFromIast } from '../corpus/bookManager.ts';
import { SanskritEditorElement, registerSanskritEditor } from '../../components/SanskritEditor.ts';
import { registerSanskritVerse } from '../../components/SanskritVerse.ts';
import { renderMorphologyHtml } from '../../components/morphologyView.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Offline stand-in for Monier-Williams with a handful of headwords. */
const LEXICON = new Set(['dharma', 'kṣetra', 'kuru', 'yoga', 'anuśāsana', 'citta', 'vṛtti', 'nirodha', 'dha', 'cittavṛtti']);
const fakeLookup: LexiconLookup = async (w) => ({
  found: LEXICON.has(w),
  senses: LEXICON.has(w) ? [{ headword: w, text: `${w} gloss` }] : []
});

beforeAll(async () => {
  await loadVidyutWasm();
  registerSanskritVerse();
  registerSanskritEditor();
});

describe('Compound and sandhi splitting', () => {
  it('proposes split points with sandhi reversed (Vidyut)', () => {
    const pairs = proposeSplits('yogānuśāsanam').map((p) => `${p.first}+${p.second}`);
    expect(pairs).toContain('yoga+anuśāsanam');
  });

  it('reduces inflected and visarga-final parts to dictionary forms', () => {
    expect(lexiconCandidates('kṣetre', true)).toContain('kṣetra');
    expect(lexiconCandidates('yogas', false)).toContain('yoga');
  });

  it('keeps only splits confirmed in both parts', async () => {
    const ranked = await rankSplits('dharmakṣetre', { lookup: fakeLookup });
    expect(ranked.length).toBe(1);
    expect(ranked[0].parts.map((p) => p.lemma)).toEqual(['dharma', 'kṣetra']);
    expect(ranked[0].parts.every((p) => p.found)).toBe(true);
  });

  it('parses manual split input', () => {
    expect(parseManualSplit('dharma + kṣetre').map((p) => p.iast)).toEqual(['dharma', 'kṣetre']);
    expect(parseManualSplit('citta-vṛtti-nirodhaḥ').map((p) => p.iast)).toEqual(['citta', 'vṛtti', 'nirodhaḥ']);
  });
});

describe('Monier-Williams lookup', () => {
  it('parses entries and treats HTTP 404 as "not found" (cached)', async () => {
    clearMonierWilliamsCache();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('key=kzetra')) {
        return { ok: true, status: 200, json: async () => ({ xml: ['<H1><h><key1>kṣetra</key1></h><body>kṣe\u0301tra <lex>n.</lex> land, soil</body></H1>'] }) } as any;
      }
      return { ok: false, status: 404, json: async () => ({ xml: [], status: 404 }) } as any;
    });
    const hit = await lookupMonierWilliams('kṣetra', { fetchImpl: fetchMock as unknown as typeof fetch });
    expect(hit.found).toBe(true);
    expect(hit.senses[0].text).toBe('kṣetra n. land, soil');
    const miss = await lookupMonierWilliams('kurukṣetre', { fetchImpl: fetchMock as unknown as typeof fetch });
    expect(miss.found).toBe(false);
    expect(miss.error).toBeUndefined();
    await lookupMonierWilliams('kurukṣetre', { fetchImpl: fetchMock as unknown as typeof fetch });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports network failures separately and retries later', async () => {
    clearMonierWilliamsCache();
    const failing = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const res = await lookupMonierWilliams('yoga', { fetchImpl: failing as unknown as typeof fetch });
    expect(res.found).toBe(false);
    expect(res.error).toBe(true);
    await lookupMonierWilliams('yoga', { fetchImpl: failing as unknown as typeof fetch });
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('strips markup and accents', () => {
    expect(mwXmlToText('<body>dha\u0301rma <lex>m.</lex> ( law )</body>')).toBe('dharma m. (law)');
  });
});

describe('Token split and merge', () => {
  it('splits a token into compound members and merges them back with their links', () => {
    const tokens = createTokensFromIast('dharmakṣetre kurukṣetre', 't');
    tokens[0].alignment.matched_words.cs_fluent = ['na posvátném poli'];
    const split = splitToken(tokens, 't_1', [{ iast: 'dharma' }, { iast: 'kṣetre', lemma: 'kṣetra' }]);
    expect(split.map((t) => t.id)).toEqual(['t_1_1', 't_1_2', 't_2']);
    expect(split[0].text.devanagari).toBe('धर्म');
    expect(split[0].compound).toMatchObject({ is_compound_member: true, position: 'prefix', analysis: 'dharmakṣetre' });
    expect(split[0].grammar?.case).toBe('stem_in_compound');
    expect(split[1].lemma).toBe('kṣetra');
    expect(split[1].alignment.matched_words.cs_fluent).toEqual(['na posvátném poli']);

    split[0].alignment.matched_words.cs_fluent = ['dharmy'];
    const merged = mergeCompound(split, 't_1_2');
    expect(merged.map((t) => t.id)).toEqual(['t_1', 't_2']);
    expect(merged[0].text.iast).toBe('dharmakṣetre');
    expect(merged[0].alignment.matched_words.cs_fluent.sort()).toEqual(['dharmy', 'na posvátném poli']);
  });
});

describe('Morphological derivation', () => {
  it('extracts root, stem suffix and ending from a verified derivation', async () => {
    const res = await analyzeSanskritWordFull('bhavati');
    const tree = res.prakriyaTree!;
    expect(tree.verified).toBe(true);
    expect(tree.morphemes!.map((m) => m.role)).toEqual(['root', 'vikarana', 'ending']);
    expect(tree.morphemes![0].forms[0]).toBe('bhū');
    expect(tree.morphemes![1].forms).toEqual(['śap', 'a']);
    expect(tree.morphemes![2].forms).toEqual(['laṭ', 'l', 'tip', 'ti']);
  });

  it('derives roots from their Dhātupāṭha form (gacchati, karoti)', async () => {
    expect((await analyzeSanskritWordFull('gacchati')).prakriyaTree?.targetIast).toBe('gacchati');
    const karoti = (await analyzeSanskritWordFull('karoti')).prakriyaTree!;
    expect(karoti.verified).toBe(true);
    expect(karoti.morphemes![0].upadesha).toBe('ḍukṛñ');
  });

  it('flags derivations that do not reproduce the word', async () => {
    expect(derivationMatchesWord('yogaḥ', 'yogaḥ')).toBe(true);
    expect(derivationMatchesWord('ganti', 'gacchanti')).toBe(false);
    const analysis = await defaultSanskritAdapter.analyzeWord('yoga');
    // a bare compound stem is not a finished word form
    expect(analysis.derivationTree?.verified).toBe(false);
    expect(renderMorphologyHtml(analysis.derivationTree, 'cs', { emptyMessage: false })).toBe('');
  });

  it('links only Aṣṭādhyāyī sūtras, in the format ashtadhyayi.com serves', () => {
    expect(ruleUrl('ashtadhyayi', '3.1.68')).toBe('https://ashtadhyayi.com/sutraani/3/1/68');
    expect(ruleUrl('dhatupatha', '01.0001')).toBe('');
    expect(ruleUrl('ashtadhyayi', '6.1.84.2')).toBe('');
  });
});

describe('Translation workspace (editor)', () => {
  it('maps translation words to offsets', () => {
    const words = splitTranslationWords('„Nyní“ začíná výklad.');
    expect(words.map((w) => w.word)).toEqual(['Nyní', 'začíná', 'výklad']);
    expect(words[0].start).toBe(1);
    expect(words[2].end).toBe(20);
  });

  function mountEditor(): SanskritEditorElement {
    const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
    const doc = clone(SAMPLE_DOCUMENT);
    editor.document = doc;
    editor.verse = doc.verses[0];
    document.body.appendChild(editor);
    return editor;
  }

  it('shows every word in Devanagari, IAST and translation rows with IAST in the Devanagari popup', () => {
    const editor = mountEditor();
    const deva = editor.querySelectorAll('.align-src[data-layer="deva"]');
    const iast = editor.querySelectorAll('.align-src[data-layer="iast"]');
    expect(deva.length).toBe(editor.verse!.tokens.length);
    expect(iast.length).toBe(editor.verse!.tokens.length);
    expect(deva[1].getAttribute('data-tip')).toContain('IAST: yoga');
    expect(iast[1].textContent).toContain('yoga');
    expect(editor.querySelectorAll('.align-word').length).toBeGreaterThan(3);
    // multi-word phrase "tradiční výklad" marks both words as linked
    const linked = Array.from(editor.querySelectorAll('.align-word.is-linked')).map((w) => w.textContent!.trim());
    expect(linked).toEqual(expect.arrayContaining(['tradiční', 'výklad']));
    document.body.removeChild(editor);
  });

  it('sets and removes links by clicking, and removes them from the links list', () => {
    const editor = mountEditor();
    const links = () => editor.verse!.tokens.find((t) => t.id === 't1_1')!.alignment.matched_words.cs_fluent;
    (editor.querySelector('.align-src[data-token-select="t1_1"][data-layer="iast"]') as HTMLButtonElement).click();
    const wordIdx = Array.from(editor.querySelectorAll('.align-word')).find((w) => w.textContent!.trim() === 'jógy')!.getAttribute('data-word-index');
    (editor.querySelector(`.align-word[data-word-index="${wordIdx}"]`) as HTMLButtonElement).click();
    expect(links()).toContain('jógy');
    (editor.querySelector(`.align-word[data-word-index="${wordIdx}"]`) as HTMLButtonElement).click();
    expect(links()).not.toContain('jógy');
    (editor.querySelector('[data-unlink-token="t1_1"][data-unlink-phrase="Nyní"]') as HTMLButtonElement).click();
    expect(links()).not.toContain('Nyní');
    document.body.removeChild(editor);
  });

  it('keeps the translation textarea when selecting words (partial re-render)', () => {
    const editor = mountEditor();
    const textarea = editor.querySelector('#edit-trans-text');
    (editor.querySelector('.align-src[data-token-select="t1_2"]') as HTMLButtonElement).click();
    expect(editor.querySelector('#edit-trans-text')).toBe(textarea);
    expect(editor.querySelector('.hint-token-iast')?.textContent).toBe('yoga');
    document.body.removeChild(editor);
  });
});
