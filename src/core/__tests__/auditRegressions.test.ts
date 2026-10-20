// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  iastToDevanagari,
  devanagariToIastTable,
  iastToCzechPhonetic,
  iastToHarvardKyoto,
  harvardKyotoToIast,
  iastToSlp1,
  slp1ToIast,
  transliterateTable
} from '../transliteration/engine.ts';
import { analyzeSanskritWord } from '../lemmatizer/sanskritLemmatizer.ts';
import {
  loadVidyutWasm,
  detectVerseMeter,
  derivePrakriyaTree,
  analyzeSanskritWordFull,
  transliterateLipi
} from '../lemmatizer/vidyutAdapter.ts';
import { getTranslationSuggestions, generateIndexVerborum, sanskritCompare } from '../corpus/concordance.ts';
import { bulkImportText, filterCorpus, exportCorpusSubset } from '../corpus/bookManager.ts';
import { tokenizeTranslation, autoSuggestBindings } from '../editor/alignmentTool.ts';
import {
  applyAlignmentsToVerse,
  applyTranslationToVerse,
  applyGrammarCorrectionsToVerse,
  executeLLMTask
} from '../llm/llmService.ts';
import { LLMConfigSchema } from '../llm/llmTypes.ts';
import { exportWorkspaceBundleToJSON, createWorkspaceBundle, projectFileSlug } from '../storage/workspaceBundle.ts';
import { inspectZipArchive } from '../lemmatizer/vidyutKoshaDownloader.ts';
import { renderAlignedHtml, safeUrl, escapeHtml } from '../utils/html.ts';
import { AppSettingsSchema, Verse, DocumentSchema } from '../types/schema.ts';
import { getDictionaryUrl } from '../dictionaries/dictionaryBuilder.ts';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import { SanskritVerseElement, registerSanskritVerse } from '../../components/SanskritVerse.ts';
import { SanskritReaderElement, registerSanskritReader } from '../../components/SanskritReader.ts';
import '../../components/SanskritEditor.ts';
import { attachDevanagariIME } from '../editor/virtualKeyboard.ts';
import { generateSargeantHtml } from '../sargeant/sargeantFormatter.ts';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

beforeAll(() => {
  registerSanskritVerse();
  registerSanskritReader();
});

describe('Audit regressions: transliteration engine', () => {
  it('does not split aspirates after conjuncts (uktha, utthāna)', () => {
    expect(iastToDevanagari('uktha')).toBe('उक्थ');
    expect(iastToDevanagari('utthāna')).toBe('उत्थान');
  });

  it('accepts capitalized and decomposed (NFD) IAST', () => {
    expect(iastToDevanagari('Kṛṣṇa')).toBe('कृष्ण');
    expect(iastToDevanagari('kṛṣṇa'.normalize('NFD'))).toBe('कृष्ण');
  });

  it('handles candrabindu, avagraha and the om sign', () => {
    expect(iastToDevanagari('am\u0310śa')).toBe('अँश');
    expect(iastToDevanagari("so'ham")).toBe('सोऽहम्');
    expect(devanagariToIastTable('ॐ नमः')).toBe('oṃ namaḥ');
  });

  it('converts Harvard-Kyoto and SLP1 without WebAssembly', () => {
    expect(iastToHarvardKyoto('kṛṣṇa')).toBe('kRSNa');
    expect(harvardKyotoToIast('kRSNa')).toBe('kṛṣṇa');
    expect(iastToSlp1('jñāna')).toBe('jYAna');
    expect(slp1ToIast('jYAna')).toBe('jñāna');
    expect(transliterateTable('kRSNa', 'harvard_kyoto', 'devanagari')).toBe('कृष्ण');
  });

  it('applies Czech rules in a single pass (no rule re-processes another rule\'s output)', () => {
    expect(iastToCzechPhonetic('chandas', { chAspirated: 'cch' })).toBe('cchandas');
    expect(iastToCzechPhonetic('jhaṣa', { jAffricate: 'dzh', jhAspirated: 'jh' })).toBe('jhaša');
    expect(iastToCzechPhonetic('vāyu', { vSemivowel: 'w' })).toBe('wáju');
  });

  it('implements the phonetic anusvāra and echo-vowel visarga modes', () => {
    expect(iastToCzechPhonetic('saṃgha', { anusvaraMode: 'phonetic' })).toBe('sangha');
    expect(iastToCzechPhonetic('saṃjaya', { anusvaraMode: 'phonetic' })).toBe('saňdžaja');
    expect(iastToCzechPhonetic('namaḥ', { visargaMode: 'ah' })).toBe('namaha');
    expect(iastToCzechPhonetic('hariḥ', { visargaMode: 'ah' })).toBe('harihi');
  });

  it('uses correct Czech overrides for yogin / yoge', () => {
    expect(iastToCzechPhonetic('yogin')).toBe('jógin');
    expect(iastToCzechPhonetic('yoge')).toBe('jóge');
  });
});

describe('Audit regressions: lemmatizer', () => {
  it('recognizes vinā and strips punctuation', () => {
    expect(analyzeSanskritWord('vinā')[0].pos).toBe('indeclinable');
    expect(analyzeSanskritWord('yogaḥ,')[0].lemma).toBe('yoga');
  });

  it('returns a clean dhātu and gaṇa for verbs (karoti, √kṛ class 8)', () => {
    const [karoti] = analyzeSanskritWord('karoti');
    expect(karoti.pos).toBe('verb');
    expect(karoti.root).toBe('√kṛ');
    expect(karoti.dhatu).toBe('kṛ');
    expect(karoti.gana).toBe(8);
    expect(analyzeSanskritWord('bhavanti')[0].number).toBe('plural');
  });
});

describe('Audit regressions: Vidyut adapter', () => {
  beforeAll(async () => {
    await loadVidyutWasm();
  });

  it('derives verbs in the right gaṇa and defaults nouns to the nominative', () => {
    expect(derivePrakriyaTree('karoti', { pos: 'verb', root: '√kṛ', gana: 8 })?.targetIast).toBe('karoti');
    expect(derivePrakriyaTree('bhavati', { pos: 'verb', root: '√bhū (bhav)' })?.targetIast).toBe('bhavati');
    expect(derivePrakriyaTree('deva', { pos: 'noun' })?.targetIast).toBe('devaḥ');
  });

  it('passes lemmatizer gaṇa to the derivation (karoti, not karati)', async () => {
    const full = await analyzeSanskritWordFull('karoti');
    expect(full.prakriyaTree?.targetIast).toBe('karoti');
    const en = await analyzeSanskritWordFull('karoti', 'en');
    expect(en.prakriyaTree?.linguisticNotes.type).toContain('verbal form');
  });

  it('reports full Chandas matches with IAST meter names', () => {
    const verse = 'yā kundendutuṣārahāradhavalā yā śubhravastrāvṛtā\nyā vīṇāvaradaṇḍamaṇḍitakarā yā śvetapadmāsanā\nyā brahmācyutaśaṅkaraprabhṛtibhir devaiḥ sadā vanditā\nsā māṃ pātu sarasvatī bhagavatī niḥśeṣajāḍyāpahā';
    const res = detectVerseMeter(verse);
    expect(res.matchType).toBe('exact');
    expect(res.meterName).toMatch(/^Śārd/);
    expect(res.meterName).not.toMatch(/[A-Z]{2}|q/); // no raw SLP1 spelling
  });

  it('does not count verse numbers between dandas as a pāda', () => {
    const res = detectVerseMeter('karmaṇyevādhikāraste mā phaleṣu kadācana । mā karmaphalaheturbhūrmā te saṅgo\'stvakarmaṇi ॥ 2.47 ॥');
    expect(res.padas.length).toBe(2);
    expect(res.isClassicalAnushtubh).toBe(true);
  });

  it('routes any scheme to Czech phonetic via IAST', () => {
    expect(transliterateLipi('kRSNa', 'hk', 'cs_phonetic')).toBe('kršna');
  });
});

describe('Audit regressions: corpus & concordance', () => {
  const verse = (overrides: Partial<Verse>): Verse => ({
    id: 'v1', number: '1', scripts: { devanagari: '', iast: '' }, translations: [], tokens: [], ...overrides
  } as Verse);

  it('does not treat "cs_fluent" alignments as English and ignores short-token noise', () => {
    const v = verse({
      translations: [{ id: 'x', lang: 'en', label: '', type: 'fluent', text: '' }],
      tokens: [{ id: 't', text: { devanagari: 'न', iast: 'na' }, lemma: 'na', alignment: { matched_words: { cs_fluent: ['ne'] } } }]
    });
    expect(getTranslationSuggestions([v], 'anena', 'en')).toEqual([]);
    expect(getTranslationSuggestions([v], 'na', 'cs').map((s) => s.translation)).toEqual(['ne']);
  });

  it('sorts the Index Verborum in varṇamālā order', () => {
    expect(['kṛṣṇa', 'ātman', 'agni', 'jñāna', 'ṛṣi', 'iti'].sort(sanskritCompare))
      .toEqual(['agni', 'ātman', 'iti', 'ṛṣi', 'kṛṣṇa', 'jñāna']);
    const index = generateIndexVerborum(SAMPLE_DOCUMENT.verses);
    const lemmas = index.map((e) => e.lemma);
    expect([...lemmas].sort(sanskritCompare)).toEqual(lemmas);
  });

  it('searches the corpus without diacritics', () => {
    const v = verse({ scripts: { devanagari: 'कृष्ण', iast: 'kṛṣṇa' } });
    expect(filterCorpus([v], { query: 'krsna' }).length).toBe(1);
  });

  it('strips leading number markers and keeps numbering continuous in bulk import', () => {
    const imported = bulkImportText("[12] yogaś cittavṛttinirodhaḥ\n\n13. tadā draṣṭuḥ svarūpe 'vasthānam\n\nvṛttisārūpyam itaratra");
    expect(imported.map((v) => v.number)).toEqual(['12', '13', '14']);
    const iast = imported[0].scripts.iast as { text: string };
    expect(iast.text.startsWith('yogaś')).toBe(true);
    // grammar labels are not copied into meanings
    const citta = imported[0].tokens.find((t) => t.text.iast.startsWith('citta'));
    expect(citta?.vocabulary).toBeUndefined();
  });

  it('exports commentaries and escapes Markdown table cells', () => {
    const doc = clone(SAMPLE_DOCUMENT);
    doc.verses[0].tokens[0].lemma = 'a|b';
    const md = exportCorpusSubset(doc, { query: '1.1' }, 'markdown');
    expect(md).toContain('a\\|b');
    const html = exportCorpusSubset(doc, {}, 'html');
    expect(html).toContain('class="commentary"');
  });
});

describe('Audit regressions: alignment tool', () => {
  it('strips Czech typographic quotes and ellipsis', () => {
    expect(tokenizeTranslation('„Jóga“ je… ‚klid‘ »mysli«')).toEqual(['Jóga', 'je', 'klid', 'mysli']);
  });

  it('auto-suggests bindings from meanings in the translation\'s language', () => {
    const tokens = clone(SAMPLE_DOCUMENT.verses[0].tokens);
    autoSuggestBindings(tokens, 'en_scholarly', 'Now, the exposition of Yoga.', 'en');
    const yoga = tokens.find((t) => t.id === 't1_2')!;
    expect(yoga.alignment.matched_words.en_scholarly).toContain('Yoga');
  });
});

describe('Audit regressions: LLM helpers', () => {
  const config = LLMConfigSchema.parse({ apiKey: 'sk-test' });

  it('keeps the translation id (and its alignments) when applying a translation', () => {
    const v = clone(SAMPLE_DOCUMENT.verses[0]);
    const updated = applyTranslationToVerse(v, { fluentTranslation: 'Nový text' }, 'cs');
    expect(updated.translations.filter((t) => t.id === 'cs_fluent').length).toBe(1);
    expect(updated.translations.find((t) => t.id === 'cs_fluent')?.label).toBe(v.translations[0].label);
  });

  it('keys LLM alignments by translation id', () => {
    const v = clone(SAMPLE_DOCUMENT.verses[0]);
    const updated = applyAlignmentsToVerse(v, { alignments: [{ tokenId: 't1_1', tokenIast: 'atha', matchedWords: ['Now'] }] }, 'en_scholarly');
    expect(updated.tokens[0].alignment.matched_words.en_scholarly).toEqual(['Now']);
  });

  it('drops invalid grammar values and keeps Devanagari in sync', () => {
    const v = clone(SAMPLE_DOCUMENT.verses[0]);
    const updated = applyGrammarCorrectionsToVerse(v, {
      tokenCorrections: [{ tokenId: 't1_2', tokenIast: 'yoga', suggestedIast: 'yogā', grammar: { pos: 'adverb' as any, case: 'genitive' }, explanation: 'x' }]
    });
    const tk = updated.tokens.find((t) => t.id === 't1_2')!;
    expect(tk.grammar?.pos).toBe(v.tokens[1].grammar?.pos);
    expect(tk.grammar?.case).toBe('genitive');
    expect(tk.text.devanagari).toBe('योगा');
    expect(() => DocumentSchema.parse({ document: SAMPLE_DOCUMENT.document, verses: [updated] })).not.toThrow();
  });

  it('retries without JSON mode when the server rejects response_format', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', text: async () => '{"error":{"message":"response_format type json_object is not supported"}}' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"fluentTranslation":"x"}' } }] }) });
    const res = await executeLLMTask('translate', { verse: SAMPLE_DOCUMENT.verses[0] }, config, fetchMock as unknown as typeof fetch);
    expect(res.success).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).response_format).toBeUndefined();
  });

  it('reports unparsable JSON as a parse error with the raw response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json at all' } }] }) });
    const res = await executeLLMTask('translate', { verse: SAMPLE_DOCUMENT.verses[0] }, config, fetchMock as unknown as typeof fetch);
    expect(res.success).toBe(false);
    expect(res.error).toContain('JSON');
    expect(res.rawResponse).toBe('not json at all');
  });
});

describe('Audit regressions: storage', () => {
  it('never writes the LLM API key into project files', () => {
    const settings = AppSettingsSchema.parse({ llmConfig: { apiKey: 'sk-secret' } });
    const json = exportWorkspaceBundleToJSON(createWorkspaceBundle(SAMPLE_DOCUMENT, settings, ''));
    expect(json).not.toContain('sk-secret');
    expect(projectFileSlug('Bhagavadgītā – 1. kapitola')).toBe('bhagavadgita_1_kapitola');
  });

  it('lists ZIP entries from the central directory', async () => {
    const enc = new TextEncoder();
    const name = enc.encode('data/kosha.fst');
    const body = enc.encode('PK\u0003\u0004 looks like a header but is data');
    const local = new Uint8Array(30 + name.length + body.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, body.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(body, 30 + name.length);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(28, name.length, true);
    central.set(name, 46);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, central.length, true);
    ev.setUint32(16, local.length, true);
    const zip = new Uint8Array(local.length + central.length + eocd.length);
    zip.set(local, 0);
    zip.set(central, local.length);
    zip.set(eocd, local.length + central.length);
    expect(await inspectZipArchive(zip.buffer)).toEqual(['data/kosha.fst']);
  });

  it('builds a working Ambuda dictionary URL', () => {
    expect(getDictionaryUrl('kṛṣṇa', 'ambuda')).toBe('https://ambuda.org/tools/dictionaries/mw/k%E1%B9%9B%E1%B9%A3%E1%B9%87a');
  });
});

describe('Audit regressions: HTML safety', () => {
  it('renders aligned phrases with Unicode word boundaries and escapes the rest', () => {
    const html = renderAlignedHtml('Jeho činnost je <b>klid</b>', [
      { phrase: 'je', tokenId: 't1' },
      { phrase: 'činnost', tokenId: 't2' }
    ], (p, id) => `<i data-t="${id}">${p}</i>`);
    expect(html).toBe('Jeho <i data-t="t2">činnost</i> <i data-t="t1">je</i> &lt;b&gt;klid&lt;/b&gt;');
  });

  it('blocks script URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl(' JaVa\tScript:alert(1)')).toBe('');
    expect(safeUrl('https://gretil.sub.uni-goettingen.de/')).toBe('https://gretil.sub.uni-goettingen.de/');
    expect(escapeHtml('"<x>')).toBe('&quot;&lt;x&gt;');
  });

  it('escapes document data in <sanskrit-verse> and the Sargeant view', () => {
    const v = clone(SAMPLE_DOCUMENT.verses[0]);
    v.translations[0].text = '<img src=x onerror=alert(1)>';
    v.source = { title: 'zdroj', url: 'javascript:alert(1)' };
    const el = document.createElement('sanskrit-verse') as SanskritVerseElement;
    el.verse = v;
    document.body.appendChild(el);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('a[href^="javascript"]')).toBeNull();
    expect(el.textContent).toContain('<img src=x');
    document.body.removeChild(el);

    const box = document.createElement('div');
    box.innerHTML = generateSargeantHtml(v, 'cs');
    expect(box.querySelector('img')).toBeNull();
    expect(box.querySelectorAll('.sargeant-commentary-item').length).toBeGreaterThan(0);
  });
});

describe('Audit regressions: components', () => {
  it('registers <sanskrit-editor> automatically', () => {
    expect(customElements.get('sanskrit-editor')).toBeDefined();
  });

  it('renders Harvard-Kyoto transliteration in <sanskrit-verse>', () => {
    const el = document.createElement('sanskrit-verse') as SanskritVerseElement;
    el.setOptions({ transliterationVersion: 'harvard_kyoto' });
    el.verse = SAMPLE_DOCUMENT.verses[0];
    document.body.appendChild(el);
    expect(el.querySelector('.layer-translit-content')?.textContent).toContain('anuzAsanam');
    document.body.removeChild(el);
  });

  it('builds section tabs from the books of any document', () => {
    const doc = clone(SAMPLE_DOCUMENT);
    doc.verses.slice(0, 2).forEach((v) => {
      v.book = 'Kathopaniṣad';
      v.id = `ka_${v.id}`;
    });
    const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
    reader.document = doc;
    document.body.appendChild(reader);
    const tab = reader.querySelector('[data-filter-section="book:Kathopaniṣad"]') as HTMLButtonElement;
    expect(tab).not.toBeNull();
    tab.click();
    expect(reader.querySelectorAll('sanskrit-verse').length).toBe(2);
    document.body.removeChild(reader);
  });

  it('honours the translation-filter attribute of <sanskrit-reader>', () => {
    const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
    reader.document = SAMPLE_DOCUMENT;
    document.body.appendChild(reader);
    reader.setAttribute('translation-filter', 'en');
    const langs = Array.from(reader.querySelectorAll('sanskrit-verse .trans-item')).map((el) => el.getAttribute('lang'));
    expect(langs.length).toBeGreaterThan(0);
    expect(langs.every((l) => l === 'en')).toBe(true);
    document.body.removeChild(reader);
  });

  it('composes whole words in the Devanāgarī IME', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    attachDevanagariIME(ta, true);
    const type = (ch: string) => {
      const p = ta.selectionStart;
      ta.value = ta.value.slice(0, p) + ch + ta.value.slice(ta.selectionEnd);
      ta.setSelectionRange(p + 1, p + 1);
      ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: ch }));
    };
    for (const ch of 'yoga') type(ch);
    expect(ta.value).toBe('योग');
    type('|');
    type('|');
    expect(ta.value).toBe('योग॥');
    document.body.removeChild(ta);
  });
});
