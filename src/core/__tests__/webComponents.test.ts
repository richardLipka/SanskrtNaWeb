// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import { SanskritVerseElement, registerSanskritVerse } from '../../components/SanskritVerse.ts';
import { SanskritReaderElement, registerSanskritReader } from '../../components/SanskritReader.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';
import { loadVidyutWasm } from '../lemmatizer/vidyutAdapter.ts';

describe('Phase 2: Sanskrit Web Components & Adapters', () => {
  beforeAll(async () => {
    registerSanskritVerse();
    registerSanskritReader();
    await loadVidyutWasm();
  });

  describe('SanskritLanguageAdapter (Language-agnostic abstraction)', () => {
    it('implements language identification and available scripts', () => {
      expect(defaultSanskritAdapter.languageId).toBe('sanskrit');
      expect(defaultSanskritAdapter.displayName).toContain('Sanskrt');
      const scripts = defaultSanskritAdapter.getAvailableScripts();
      expect(scripts.some((s) => s.id === 'devanagari')).toBe(true);
      expect(scripts.some((s) => s.id === 'iast')).toBe(true);
      expect(scripts.some((s) => s.id === 'cs_phonetic')).toBe(true);
    });

    it('transliterates between scripts with precision', () => {
      const deva = defaultSanskritAdapter.transliterate('yogaḥ', 'iast', 'devanagari');
      expect(deva).toBe('योगः');

      const cz = defaultSanskritAdapter.transliterate('योगश्चित्तवृत्तिनिरोधः', 'devanagari', 'cs_phonetic');
      expect(cz.toLowerCase()).toContain('joga');
    });

    it('analyzes metrical structure and akṣara weights via Chandas', () => {
      const sloka = 'karmaṇyevādhikāraste mā phaleṣu kadācana । mā karmaphalaheturbhūrmā te saṅgo\'stvakarmaṇi ॥';
      const meter = defaultSanskritAdapter.analyzeMeter(sloka);
      expect(meter.meterName).toContain('Anuṣṭubh');
      expect(meter.totalSyllables).toBeGreaterThanOrEqual(30);
      expect(meter.padas.length).toBeGreaterThan(0);
      expect(meter.padas[0].syllables.some((s) => s.weight === 'G')).toBe(true);
    });
  });

  describe('<sanskrit-verse> Custom Element', () => {
    it('is registered in customElements registry', () => {
      expect(customElements.get('sanskrit-verse')).toBeDefined();
    });

    it('instantiates and renders verse content with local layer controls', () => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = SAMPLE_DOCUMENT.verses[0]; // YS 1.1
      document.body.appendChild(verseEl);

      // Verify verse header and badge
      expect(verseEl.innerHTML).toContain('1.1');
      expect(verseEl.innerHTML).toContain('Dévanágarí');
      expect(verseEl.innerHTML).toContain('Transliterace');
      expect(verseEl.innerHTML).toContain('Překlad');
      expect(verseEl.innerHTML).toContain('Metrum');

      // Verify token markup with data-token-id for cross-highlighting
      const tokens = verseEl.querySelectorAll('.token');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].getAttribute('data-token-id')).toBe('t1_1');

      // Verify local layer toggle pills (Devanagari, IAST, Prepis, Preklad, Vyklady)
      const pills = verseEl.querySelectorAll('.layer-pill');
      expect(pills.length).toBe(5);
      expect(verseEl.innerHTML).toContain('Výklady');

      document.body.removeChild(verseEl);
    });

    it('supports local layer visibility overrides on individual verse', () => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = SAMPLE_DOCUMENT.verses[1]; // YS 1.2
      document.body.appendChild(verseEl);

      // Initially Devanagari is visible
      expect(verseEl.querySelector('.layer-deva-box')).not.toBeNull();

      // Click local pill to turn off Devanagari for this verse only
      const devaPill = verseEl.querySelector('[data-toggle-layer="devanagari"]') as HTMLButtonElement;
      devaPill?.click();

      // Now Devanagari layer is hidden locally
      expect(verseEl.querySelector('.layer-deva-box')).toBeNull();
      // But Transliteration remains visible
      expect(verseEl.querySelector('.layer-translit-box')).not.toBeNull();

      document.body.removeChild(verseEl);
    });

    it('renders aligned translation phrases for bidirectional cross-highlighting', () => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(verseEl);

      const aligned = verseEl.querySelectorAll('.aligned-phrase');
      expect(aligned.length).toBeGreaterThan(0);
      expect(aligned[0].getAttribute('data-aligned-token')).toBe('t1_1');

      document.body.removeChild(verseEl);
    });
  });

  describe('<sanskrit-reader> Custom Element', () => {
    it('is registered in customElements registry', () => {
      expect(customElements.get('sanskrit-reader')).toBeDefined();
    });

    it('renders complete standalone reader with 8 canon verses', () => {
      const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
      reader.document = SAMPLE_DOCUMENT;
      document.body.appendChild(reader);

      // Verify title
      expect(reader.innerHTML).toContain('Kanonické sanskrtské texty');

      // Verify section filter buttons
      const sectionButtons = reader.querySelectorAll('[data-filter-section]');
      expect(sectionButtons.length).toBe(4); // Vše, YS, BG, MBh

      // Verify child <sanskrit-verse> instances
      const verseElements = reader.querySelectorAll('sanskrit-verse');
      expect(verseElements.length).toBe(8);

      document.body.removeChild(reader);
    });

    it('filters verses by literary tradition (Yogasūtra, Bhagavadgītā, Mahābhārata)', () => {
      const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
      reader.document = SAMPLE_DOCUMENT;
      document.body.appendChild(reader);

      // Filter to Yogasūtra (3 verses)
      const ysBtn = reader.querySelector('[data-filter-section="ys"]') as HTMLButtonElement;
      ysBtn?.click();
      expect(reader.querySelectorAll('sanskrit-verse').length).toBe(3);

      // Filter to Bhagavadgītā (3 verses)
      const bgBtn = reader.querySelector('[data-filter-section="bg"]') as HTMLButtonElement;
      bgBtn?.click();
      expect(reader.querySelectorAll('sanskrit-verse').length).toBe(3);

      // Filter to Mahābhārata (2 verses)
      const mbhBtn = reader.querySelector('[data-filter-section="mbh"]') as HTMLButtonElement;
      mbhBtn?.click();
      expect(reader.querySelectorAll('sanskrit-verse').length).toBe(2);

      // Filter back to all (8 verses)
      const allBtn = reader.querySelector('[data-filter-section="all"]') as HTMLButtonElement;
      allBtn?.click();
      expect(reader.querySelectorAll('sanskrit-verse').length).toBe(8);

      document.body.removeChild(reader);
    });

    it('propagates global layer settings to all child verses', () => {
      const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
      reader.document = SAMPLE_DOCUMENT;
      document.body.appendChild(reader);

      // Uncheck global translation layer
      const transCheck = reader.querySelector('#reader-layer-trans') as HTMLInputElement;
      transCheck.checked = false;
      transCheck.dispatchEvent(new Event('change'));

      // Check child verse translation visibility
      const firstVerse = reader.querySelector('sanskrit-verse') as SanskritVerseElement;
      expect(firstVerse.querySelector('.layer-trans-box')).toBeNull();

      document.body.removeChild(reader);
    });
  });
}, 20000);
