// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import {
  buildBookHierarchy,
  bulkImportText,
  filterCorpus,
  exportCorpusSubset
} from '../corpus/bookManager.ts';
import {
  getTranslationSuggestions,
  findWordConcordance,
  generateIndexVerborum
} from '../corpus/concordance.ts';
import {
  insertAtCursor,
  attachDevanagariIME,
  PANINIAN_SECTIONS,
  IAST_CHARS
} from '../editor/virtualKeyboard.ts';
import {
  tokenizeTranslation,
  bindTokenToWord,
  unbindTokenWord,
  toggleWordBinding,
  autoSuggestBindings
} from '../editor/alignmentTool.ts';
import {
  SanskritEditorElement,
  registerSanskritEditor
} from '../../components/SanskritEditor.ts';
import { registerSanskritVerse } from '../../components/SanskritVerse.ts';
import { loadVidyutWasm } from '../lemmatizer/vidyutAdapter.ts';
import {
  formatGrammarAnalysis,
  VIBHAKTI_TERMS,
  GENDER_TERMS
} from '../i18n/terminology.ts';
import {
  createWorkspaceBundle,
  exportWorkspaceBundleToJSON,
  importWorkspaceBundleFromFile
} from '../storage/workspaceBundle.ts';
import { createCzechRules } from '../transliteration/rules.ts';

describe('Phase 3: Editor Interface, Virtual Keyboard & Book Management', () => {
  beforeAll(async () => {
    registerSanskritVerse();
    registerSanskritEditor();
    await loadVidyutWasm();
  });

  describe('1. Book & Corpus Management (bookManager.ts)', () => {
    it('correctly constructs book and chapter hierarchy from verses', () => {
      const hierarchy = buildBookHierarchy(SAMPLE_DOCUMENT.verses);
      expect(hierarchy.totalVerses).toBe(8);
      expect(hierarchy.books.length).toBe(3);

      const ysBook = hierarchy.books.find((b) => b.book === 'Yogasūtra');
      expect(ysBook).toBeDefined();
      expect(ysBook?.totalVerses).toBe(3);
      expect(ysBook?.chapters[0].chapter).toBe('1. Samādhipāda');

      const bgBook = hierarchy.books.find((b) => b.book === 'Bhagavadgītā');
      expect(bgBook).toBeDefined();
      expect(bgBook?.totalVerses).toBe(3);

      const mbhBook = hierarchy.books.find((b) => b.book === 'Mahābhārata');
      expect(mbhBook).toBeDefined();
      expect(mbhBook?.totalVerses).toBe(2);
    });

    it('filters corpus by book, chapter and query', () => {
      // Filter by book
      const ysOnly = filterCorpus(SAMPLE_DOCUMENT.verses, { book: 'Yogasūtra' });
      expect(ysOnly.length).toBe(3);

      // Filter by text query
      const yogaMatches = filterCorpus(SAMPLE_DOCUMENT.verses, { query: 'yoga' });
      expect(yogaMatches.length).toBeGreaterThanOrEqual(2);

      // Filter by Devanagari query
      const devaMatches = filterCorpus(SAMPLE_DOCUMENT.verses, { query: 'योग' });
      expect(devaMatches.length).toBeGreaterThanOrEqual(2);

      // Filter by translation query
      const transMatches = filterCorpus(SAMPLE_DOCUMENT.verses, { query: 'výklad' });
      expect(transMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('performs bulk text import of multi-line verses with auto-transliteration & meter', () => {
      const rawEtext = `
dharmakṣetre kurukṣetre samavetā yuyutsavaḥ ।
māmakāḥ pāṇḍavāścaiva kimakurvata sañjaya ॥ 1.1 ॥

dṛṣṭvā tu pāṇḍavānīkaṁ vyūḍhaṁ duryodhanastadā ।
ācāryamupasaṅgamya rājā vacanamabravīt ॥ 1.2 ॥
      `;

      const imported = bulkImportText(rawEtext, {
        book: 'Bhagavadgītā',
        chapter: '1. Sainya-darśana',
        startNumber: 1
      });

      expect(imported.length).toBe(2);
      expect(imported[0].book).toBe('Bhagavadgītā');
      expect(imported[0].chapter).toBe('1. Sainya-darśana');
      expect(imported[0].number).toBe('1.1');
      expect(imported[1].number).toBe('1.2');

      // Verify Devanagari was auto-generated
      const deva0 = typeof imported[0].scripts.devanagari === 'string'
        ? imported[0].scripts.devanagari
        : imported[0].scripts.devanagari.text;
      expect(deva0).toContain('धर्मक्षेत्रे');

      // Verify tokens were generated
      expect(imported[0].tokens.length).toBeGreaterThan(4);
      expect(imported[0].tokens[0].text.devanagari).toBeDefined();

      // Verify meter was analyzed
      expect(imported[0].meter).toContain('Anuṣṭubh');
    });

    it('exports corpus subset to Standalone HTML, JSON and Markdown', () => {
      // JSON export
      const jsonExport = exportCorpusSubset(SAMPLE_DOCUMENT, { book: 'Yogasūtra' }, 'json');
      const parsed = JSON.parse(jsonExport);
      expect(parsed.verses.length).toBe(3);
      expect(parsed.document.title).toContain('Yogasūtra');

      // HTML export
      const htmlExport = exportCorpusSubset(SAMPLE_DOCUMENT, { book: 'Yogasūtra' }, 'html');
      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(htmlExport).toContain('<style>');
      expect(htmlExport).toContain('verse-card');
      expect(htmlExport).toContain('अथ योगानुशासनम्');

      // Markdown export
      const mdExport = exportCorpusSubset(SAMPLE_DOCUMENT, { book: 'Yogasūtra' }, 'markdown');
      expect(mdExport).toContain('### Verš 1.1');
      expect(mdExport).toContain('| Slovo | Lemma | Gramatika | Význam |');
    });
  });

  describe('2. Translation Memory, Concordance & Index Verborum (concordance.ts)', () => {
    it('retrieves translation suggestions across the book (Auto-Glossary)', () => {
      const suggestions = getTranslationSuggestions(SAMPLE_DOCUMENT.verses, 'yoga', 'cs');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].targetWord).toBeDefined();
      expect(suggestions.some((s) => s.translation.includes('jóga') || s.translation.includes('spojení'))).toBe(true);
    });

    it('finds word concordance occurrences across verses with context', () => {
      const occs = findWordConcordance(SAMPLE_DOCUMENT.verses, 'yoga');
      expect(occs.length).toBeGreaterThan(0);
      expect(occs[0].verseNumber).toBeDefined();
      expect(occs[0].contextDevanagari).toBeDefined();
      expect(occs[0].contextIast).toBeDefined();
    });

    it('generates a full Index Verborum (reverse dictionary) of the book', () => {
      const index = generateIndexVerborum(SAMPLE_DOCUMENT.verses, 'cs');
      expect(index.length).toBeGreaterThan(5);

      const yogaEntry = index.find((e) => e.lemma.toLowerCase() === 'yoga');
      expect(yogaEntry).toBeDefined();
      expect(yogaEntry?.occurrences.length).toBeGreaterThanOrEqual(1);
      expect(yogaEntry?.devanagari).toBeDefined();
    });
  });

  describe('3. Virtual Keyboard & Live IME (virtualKeyboard.ts)', () => {
    it('provides complete IAST diacritic set and Paninian phonetic sections', () => {
      expect(IAST_CHARS).toContain('ā');
      expect(IAST_CHARS).toContain('ṛ');
      expect(IAST_CHARS).toContain('ṅ');
      expect(IAST_CHARS).toContain('ṣ');
      expect(IAST_CHARS).toContain('ṃ');
      expect(IAST_CHARS).toContain('ḥ');

      // Paninian sections: Vowels, Matras, Ka, Ca, Ta, Ta, Pa vargas
      expect(PANINIAN_SECTIONS.some((s) => s.title.includes('Ka-varga'))).toBe(true);
      expect(PANINIAN_SECTIONS.some((s) => s.title.includes('Ca-varga'))).toBe(true);
      expect(PANINIAN_SECTIONS.some((s) => s.title.includes('Ṭa-varga'))).toBe(true);
      expect(PANINIAN_SECTIONS.some((s) => s.title.includes('Ta-varga'))).toBe(true);
      expect(PANINIAN_SECTIONS.some((s) => s.title.includes('Pa-varga'))).toBe(true);
    });

    it('inserts characters at cursor position in text inputs', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'yog';
      textarea.selectionStart = 3;
      textarea.selectionEnd = 3;
      document.body.appendChild(textarea);

      insertAtCursor(textarea, 'aḥ');
      expect(textarea.value).toBe('yogaḥ');

      document.body.removeChild(textarea);
    });

    it('attaches and toggles Latin -> Devanāgarī IME controller', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const ime = attachDevanagariIME(textarea, false);
      expect(ime.isEnabled()).toBe(false);

      ime.enable();
      expect(ime.isEnabled()).toBe(true);

      ime.toggle();
      expect(ime.isEnabled()).toBe(false);

      ime.destroy();
      document.body.removeChild(textarea);
    });
  });

  describe('4. Token-to-Translation Alignment Tool (alignmentTool.ts)', () => {
    it('splits translation into clean clickable words', () => {
      const words = tokenizeTranslation('Nyní začíná tradiční výklad jógy.');
      expect(words).toEqual(['Nyní', 'začíná', 'tradiční', 'výklad', 'jógy']);
    });

    it('binds, unbinds and toggles translation words for a token', () => {
      const sampleToken = JSON.parse(JSON.stringify(SAMPLE_DOCUMENT.verses[0].tokens[0])); // atha

      // Bind word
      bindTokenToWord(sampleToken, 'cs_fluent', 'Nyní');
      expect(sampleToken.alignment.matched_words['cs_fluent']).toContain('Nyní');

      // Toggle off
      const isNowBound = toggleWordBinding(sampleToken, 'cs_fluent', 'Nyní');
      expect(isNowBound).toBe(false);
      expect(sampleToken.alignment.matched_words['cs_fluent']).not.toContain('Nyní');

      // Toggle on
      const toggledOn = toggleWordBinding(sampleToken, 'cs_fluent', 'Nyní');
      expect(toggledOn).toBe(true);
      expect(sampleToken.alignment.matched_words['cs_fluent']).toContain('Nyní');

      // Unbind
      unbindTokenWord(sampleToken, 'cs_fluent', 'Nyní');
      expect(sampleToken.alignment.matched_words['cs_fluent']).not.toContain('Nyní');
    });

    it('heuristically auto-suggests bindings based on vocabulary meanings', () => {
      const tokens = JSON.parse(JSON.stringify(SAMPLE_DOCUMENT.verses[0].tokens));
      tokens.forEach((tk: any) => {
        tk.alignment = { matched_words: {} };
      });

      autoSuggestBindings(tokens, 'cs_fluent', 'Nyní začíná tradiční výklad jógy');
      // Token t1_2 is yoga, meaning is jóga
      const yogaTk = tokens.find((tk: any) => tk.lemma === 'yoga');
      expect(yogaTk.alignment.matched_words['cs_fluent']).toBeDefined();
    });
  });

  describe('5. <sanskrit-editor> Web Component (SanskritEditor.ts)', () => {
    it('is registered in customElements registry', () => {
      expect(customElements.get('sanskrit-editor')).toBeDefined();
    });

    it('instantiates and renders the workspace with an on-demand verse preview', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(editor);

      // Verify title & tabs
      expect(editor.innerHTML).toContain('Kniha');
      expect(editor.innerHTML).toContain('CAT Překladatelské okno');
      expect(editor.innerHTML).toContain('Správce knihy');
      expect(editor.innerHTML).toContain('Konkordance');

      // Preview is shown on demand in an overlay panel
      const preview = editor.querySelector('#editor-preview-mount');
      expect(preview).not.toBeNull();
      expect(preview?.querySelector('sanskrit-verse')).toBeNull();
      (editor.querySelector('#btn-toggle-preview') as HTMLButtonElement).click();
      expect((editor.querySelector('#editor-preview-overlay') as HTMLElement).hidden).toBe(false);
      expect(editor.querySelector('#editor-preview-mount sanskrit-verse')).not.toBeNull();
      (editor.querySelector('#btn-close-preview') as HTMLButtonElement).click();
      expect((editor.querySelector('#editor-preview-overlay') as HTMLElement).hidden).toBe(true);

      // Verify IAST toolbar
      expect(editor.querySelector('.iast-toolbar')).not.toBeNull();

      document.body.removeChild(editor);
    });

    it('switches between Edit, Corpus, and Index tabs', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(editor);

      // Switch to Corpus tab
      const corpusTabBtn = editor.querySelector('[data-editor-tab="corpus"]') as HTMLButtonElement;
      corpusTabBtn?.click();
      expect(editor.querySelector('.corpus-manager-container')).not.toBeNull();
      expect(editor.innerHTML).toContain('Hromadný import celých knih');

      // Switch to Index tab
      const indexTabBtn = editor.querySelector('[data-editor-tab="index"]') as HTMLButtonElement;
      indexTabBtn?.click();
      expect(editor.querySelector('.index-manager-container')).not.toBeNull();
      expect(editor.innerHTML).toContain('Vygenerovat kompletní rejstřík knihy');

      document.body.removeChild(editor);
    });

    it('dispatches verse-saved event when saving', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(editor);

      let savedFired = false;
      editor.addEventListener('verse-saved', () => {
        savedFired = true;
      });

      // Stub window.alert in happy-dom
      window.alert = () => {};

      const saveBtn = editor.querySelector('#btn-editor-save-verse') as HTMLButtonElement;
      saveBtn?.click();

      expect(savedFired).toBe(true);
      document.body.removeChild(editor);
    });

    it('renders CAT workstation features: translation status picker, context ribbons, and progress widget', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[1]; // Verse 2, so verse 1 is previous and verse 3 is next
      document.body.appendChild(editor);

      // Verify status picker
      const statusSelect = editor.querySelector('#edit-verse-status-select') as HTMLSelectElement;
      expect(statusSelect).not.toBeNull();
      expect(statusSelect.value).toBe('draft');

      // Verify progress bar
      const progressBar = editor.querySelector('.cat-progress-widget');
      expect(progressBar).not.toBeNull();

      // Verify context ribbons (previous and next verses)
      const prevRibbon = editor.querySelector('.cat-context-ribbon.prev-context');
      const nextRibbon = editor.querySelector('.cat-context-ribbon.next-context');
      expect(prevRibbon).not.toBeNull();
      expect(nextRibbon).not.toBeNull();
      expect(prevRibbon?.textContent).toContain('1.1');
      expect(nextRibbon?.textContent).toContain('1.3');

      // Test language toggle
      const langToggleBtn = editor.querySelector('#btn-toggle-ui-lang') as HTMLButtonElement;
      expect(langToggleBtn).not.toBeNull();
      langToggleBtn.click();
      // Should now be English
      expect(editor.innerHTML).toContain('English');

      document.body.removeChild(editor);
    });
  });

  describe('6. Bilingual Sanskrit Grammar Terminology & Formatting (terminology.ts)', () => {
    it('provides accurate Czech and English Pāṇinian and classical terms', () => {
      expect(VIBHAKTI_TERMS.nominative.cs).toContain('1. pád');
      expect(VIBHAKTI_TERMS.nominative.en).toContain('1st case');
      expect(VIBHAKTI_TERMS.nominative.sanskritDeva).toBe('प्रथमा');

      expect(VIBHAKTI_TERMS.genitive.cs).toContain('6. pád');
      expect(VIBHAKTI_TERMS.genitive.en).toContain('6th case');

      expect(GENDER_TERMS.masculine.cs).toContain('mužský');
      expect(GENDER_TERMS.masculine.en).toContain('masculine');
      expect(GENDER_TERMS.masculine.sanskrit).toContain('पुंलिङ्ग');
    });

    it('formats noun and verb grammar analyses with badges in Czech and English', () => {
      const nounAnalysisCs = formatGrammarAnalysis({
        pos: 'noun',
        case: 'genitive',
        number: 'singular',
        gender: 'masculine'
      }, 'cs');
      expect(nounAnalysisCs.shortBadge).toContain('6. p.');
      expect(nounAnalysisCs.fullLabel).toContain('genitiv');

      const nounAnalysisEn = formatGrammarAnalysis({
        pos: 'noun',
        case: 'genitive',
        number: 'singular',
        gender: 'masculine'
      }, 'en');
      expect(nounAnalysisEn.shortBadge).toContain('gen.');
      expect(nounAnalysisEn.fullLabel).toContain('genitive');

      const verbAnalysisCs = formatGrammarAnalysis({
        pos: 'verb',
        person: '3rd',
        number: 'singular',
        tense: 'present',
        voice: 'active'
      }, 'cs');
      expect(verbAnalysisCs.fullLabel).toContain('3. osoba');
      expect(verbAnalysisCs.fullLabel).toContain('parasmaipada');
    });
  });

  describe('7. Workspace Project Persistence & Recovery (workspaceBundle.ts)', () => {
    it('creates a valid workspace bundle with all documents, settings, glossary, and statuses', () => {
      const bundle = createWorkspaceBundle(
        SAMPLE_DOCUMENT,
        {
          version: '2.0.0',
          layers: {
            devanagari: { visible: true, version: 'standard' },
            transliteration: { visible: true, version: 'iast' },
            translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent'] },
            meter: { visible: true, showAksharas: true }
          },
          theme: 'parchment',
          uiLanguage: 'cs',
          czechRules: createCzechRules(),
          defaultDictionary: 'cologne_mw',
          preserveManualEdits: true,
          fontSizeDevanagari: 24,
          fontSizeTransliteration: 16,
          fontFamilyDevanagari: 'Tiro Devanagari Sanskrit',
          autoSaveToLocalStorage: true
        },
        SAMPLE_DOCUMENT.verses[0].id,
        {
          yoga: {
            stem: 'yoga',
            devanagari: 'योग',
            translationCs: 'jóga, spojení, sjednocení mysli',
            translationEn: 'yoga, union, meditative absorption',
            category: 'philosophical'
          }
        },
        {
          'ys_1_1': 'translated',
          'ys_1_2': 'draft'
        }
      );

      expect(bundle.format).toBe('sanskrit-web-workspace-bundle');
      expect(bundle.glossary.yoga.translationCs).toContain('sjednocení');
      expect(bundle.translationState.verseStatuses['ys_1_1']).toBe('translated');
      expect(bundle.document.verses.length).toBe(8);

      const jsonString = exportWorkspaceBundleToJSON(bundle);
      expect(typeof jsonString).toBe('string');
      expect(jsonString).toContain('sanskrit-web-workspace-bundle');
      expect(jsonString).toContain('yoga');
    });

    it('recovers project bundle from a File object', async () => {
      const mockBundle = createWorkspaceBundle(
        SAMPLE_DOCUMENT,
        {
          version: '2.0.0',
          layers: {
            devanagari: { visible: true, version: 'standard' },
            transliteration: { visible: true, version: 'iast' },
            translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent'] },
            meter: { visible: true, showAksharas: true }
          },
          theme: 'parchment',
          uiLanguage: 'en',
          czechRules: createCzechRules(),
          defaultDictionary: 'cologne_mw',
          preserveManualEdits: true,
          fontSizeDevanagari: 24,
          fontSizeTransliteration: 16,
          fontFamilyDevanagari: 'Tiro Devanagari Sanskrit',
          autoSaveToLocalStorage: true
        },
        SAMPLE_DOCUMENT.verses[1].id
      );

      const jsonContent = JSON.stringify(mockBundle);
      const file = new File([jsonContent], 'test.sanskrit-project.json', { type: 'application/json' });

      const loaded = await importWorkspaceBundleFromFile(file);
      expect(loaded.format).toBe('sanskrit-web-workspace-bundle');
      expect(loaded.document.document.title).toBe(SAMPLE_DOCUMENT.document.title);
      expect(loaded.translationState.activeVerseId).toBe(SAMPLE_DOCUMENT.verses[1].id);
    });
  });
});

