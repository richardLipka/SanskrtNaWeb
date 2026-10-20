/**
 * <sanskrit-reader> Web Component
 *
 * Standalone top-level Reader Web Component for Sanskrit and classical multilingual texts.
 * Features:
 * - Global 5-layer control panel (Dévanágarí, Transliterace, Překlad, Metrum, Komentáře)
 * - Section filter generated from the books contained in the document
 * - Embeds <sanskrit-verse> child components with synchronization
 * - Built-in interactive Word Details Popup with Pāṇinian Derivation Tree (vidyut-prakriya)
 * - Language-agnostic adapter pluggability via LanguageAdapter interface
 *
 * Attributes: src, theme, active-section, translation-filter, transliteration-version, readonly
 */

import { SanskritDocument, Verse, Token, CzechPhoneticRules, DocumentSchema } from '../core/types/schema.ts';
import { LanguageAdapter } from '../core/adapters/languageAdapter.ts';
import { defaultSanskritAdapter } from '../core/adapters/sanskritAdapter.ts';
import { SanskritVerseElement, VerseLayerVisibility } from './SanskritVerse.ts';
import { escapeHtml, safeUrl } from '../core/utils/html.ts';

interface ReaderSection {
  key: string;
  label: string;
  count: number;
}

/** Short, stable section keys for the canonical sample texts (kept for backward compatibility). */
const LEGACY_SECTIONS: Array<{ key: string; book: string; idPrefix: string; numberTag: string; icon: string }> = [
  { key: 'ys', book: 'Yogasūtra', idPrefix: 'pys_', numberTag: 'YS', icon: '🧘' },
  { key: 'bg', book: 'Bhagavadgītā', idPrefix: 'bg_', numberTag: 'BG', icon: '⚔️' },
  { key: 'mbh', book: 'Mahābhārata', idPrefix: 'mbh_', numberTag: 'MBh', icon: '📜' }
];

const UNASSIGNED_SECTION = '__none__';

export class SanskritReaderElement extends HTMLElement {
  private _document: SanskritDocument | null = null;
  private _adapter: LanguageAdapter = defaultSanskritAdapter;
  private _activeSection: string = 'all';
  private _globalLayers: VerseLayerVisibility = {
    devanagari: true,
    transliteration: true,
    translation: true,
    meter: true,
    commentary: true
  };
  private _transliterationVersion: string = 'iast';
  private _translationFilter: string = 'all';
  private _devanagariVersion: 'standard' | 'padaccheda' = 'standard';
  private _showMeterAksharas: boolean = true;
  private _czechRules: Partial<CzechPhoneticRules> | null = null;
  private _commentaryLangs: string[] | null = null;
  private _activeTheme: string = 'parchment';
  private _selectedToken: Token | null = null;
  private _selectedVerse: Verse | null = null;
  private _loadedSrc: string | null = null;
  private _modalRequestId = 0;
  private _lastFocused: HTMLElement | null = null;
  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.closeWordModal();
  };

  get selectedToken(): Token | null {
    return this._selectedToken;
  }

  get selectedVerse(): Verse | null {
    return this._selectedVerse;
  }

  constructor() {
    super();
    // Registered once per element (connectedCallback may run several times when the element is moved)
    this.addEventListener('word-select', (e: Event) => {
      const { token, verse } = (e as CustomEvent<{ token: Token; verse: Verse }>).detail;
      this._selectedToken = token;
      this._selectedVerse = verse;
      const origin = e.composedPath()[0];
      this._lastFocused = origin instanceof HTMLElement ? origin : null;
      void this.showWordModal(token, verse);
    });
  }

  static get observedAttributes() {
    return ['src', 'theme', 'active-section', 'translation-filter', 'transliteration-version', 'readonly'];
  }

  connectedCallback() {
    document.addEventListener('keydown', this._onKeyDown);
    const src = this.getAttribute('src');
    if (src && src !== this._loadedSrc) {
      void this.loadFromSrc(src);
    } else {
      this.render();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    switch (name) {
      case 'src':
        // Loading starts in connectedCallback for elements parsed from HTML
        if (newVal && this.isConnected && newVal !== this._loadedSrc) void this.loadFromSrc(newVal);
        break;
      case 'theme':
        if (newVal) {
          this._activeTheme = newVal;
          this.applyTheme();
        }
        break;
      case 'active-section':
        this._activeSection = newVal || 'all';
        if (this.isConnected) this.render();
        break;
      case 'translation-filter':
        this._translationFilter = newVal || 'all';
        if (this.isConnected) this.render();
        break;
      case 'transliteration-version':
        this._transliterationVersion = newVal || 'iast';
        if (this.isConnected) this.render();
        break;
      case 'readonly':
        if (this.isConnected) this.render();
        break;
    }
  }

  get document(): SanskritDocument | null {
    return this._document;
  }

  set document(doc: SanskritDocument | null) {
    this._document = doc;
    this.render();
  }

  get adapter(): LanguageAdapter {
    return this._adapter;
  }

  set adapter(a: LanguageAdapter) {
    this._adapter = a;
    this.render();
  }

  setGlobalLayers(layers: Partial<VerseLayerVisibility>) {
    this._globalLayers = { ...this._globalLayers, ...layers };
    this.render();
  }

  setOptions(opts: {
    transliterationVersion?: string;
    translationFilter?: string;
    devanagariVersion?: 'standard' | 'padaccheda';
    showMeterAksharas?: boolean;
    czechRules?: Partial<CzechPhoneticRules> | null;
    commentaryLangs?: string[] | null;
  }) {
    if (opts.transliterationVersion !== undefined) this._transliterationVersion = opts.transliterationVersion;
    if (opts.translationFilter !== undefined) this._translationFilter = opts.translationFilter;
    if (opts.devanagariVersion !== undefined) this._devanagariVersion = opts.devanagariVersion;
    if (opts.showMeterAksharas !== undefined) this._showMeterAksharas = opts.showMeterAksharas;
    if (opts.czechRules !== undefined) this._czechRules = opts.czechRules;
    if (opts.commentaryLangs !== undefined) this._commentaryLangs = opts.commentaryLangs;
    this.render();
  }

  private async loadFromSrc(url: string) {
    this._loadedSrc = url;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = DocumentSchema.safeParse(await res.json());
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new Error(`neplatný formát dokumentu (${issue.path.join('.')}: ${issue.message})`);
      }
      if (this._loadedSrc !== url) return; // a newer src replaced this one meanwhile
      this._document = parsed.data;
      this.render();
    } catch (err: any) {
      if (this._loadedSrc !== url) return;
      this.innerHTML = `<div class="reader-error" role="alert" style="color: var(--accent-terracotta); padding: 1rem;">Nelze načíst dokument z URL: ${escapeHtml(url)} (${escapeHtml(err?.message || String(err))})</div>`;
    }
  }

  private applyTheme() {
    this.setAttribute('data-theme', this._activeTheme);
  }

  /** Sections derived from the books in the document (legacy short keys for the sample texts). */
  private getSections(): ReaderSection[] {
    if (!this._document) return [];
    const verses = this._document.verses;
    const sections: ReaderSection[] = [];
    const seen = new Set<string>();

    for (const legacy of LEGACY_SECTIONS) {
      const count = verses.filter((v) => this.matchesSection(v, legacy.key)).length;
      if (count > 0) {
        sections.push({ key: legacy.key, label: `${legacy.icon} ${legacy.book}`, count });
        seen.add(legacy.book);
      }
    }

    for (const v of verses) {
      const book = v.book?.trim();
      if (!book || seen.has(book)) continue;
      seen.add(book);
      sections.push({ key: `book:${book}`, label: `📖 ${book}`, count: verses.filter((x) => x.book?.trim() === book).length });
    }

    const unassigned = verses.filter((v) => !v.book?.trim() && !LEGACY_SECTIONS.some((l) => this.matchesSection(v, l.key))).length;
    if (unassigned > 0 && sections.length > 0) {
      sections.push({ key: UNASSIGNED_SECTION, label: '📄 Bez knihy', count: unassigned });
    }
    return sections;
  }

  private matchesSection(v: Verse, key: string): boolean {
    const legacy = LEGACY_SECTIONS.find((l) => l.key === key);
    if (legacy) {
      return v.book?.trim() === legacy.book || v.id.startsWith(legacy.idPrefix) || v.number.includes(legacy.numberTag);
    }
    if (key.startsWith('book:')) return v.book?.trim() === key.slice(5);
    if (key === UNASSIGNED_SECTION) return !v.book?.trim();
    return true;
  }

  private getFilteredVerses(): Verse[] {
    if (!this._document) return [];
    const sec = this._activeSection;
    if (sec === 'all') return this._document.verses;
    return this._document.verses.filter((v) => this.matchesSection(v, sec));
  }

  private renderTranslationFilterOptions(): string {
    const langs = new Set<string>();
    for (const v of this._document?.verses || []) {
      for (const t of v.translations) langs.add(t.lang);
    }
    const base: Array<[string, string]> = [
      ['all', 'Všechny jazyky a verze'],
      ['cs', 'Čeština (vše)'],
      ['cs_fluent', 'Čeština (pouze plynulý)'],
      ['cs_literal', 'Čeština (pouze doslovný)'],
      ['en', 'Angličtina (English)']
    ];
    for (const lang of langs) {
      if (lang !== 'cs' && lang !== 'en') base.push([lang, `Jazyk: ${lang}`]);
    }
    if (!base.some(([v]) => v === this._translationFilter)) {
      base.push([this._translationFilter, this._translationFilter]);
    }
    return base
      .map(([value, label]) => `<option value="${escapeHtml(value)}" ${this._translationFilter === value ? 'selected' : ''}>${escapeHtml(label)}</option>`)
      .join('');
  }

  private render() {
    if (!this._document) {
      this.innerHTML = '<div class="reader-empty" style="padding: 2rem; text-align: center; color: var(--text-muted);">Žádný dokument k zobrazení.</div>';
      return;
    }

    const doc = this._document.document;
    const allVerses = this._document.verses;
    const sections = this.getSections();
    if (this._activeSection !== 'all' && !sections.some((s) => s.key === this._activeSection)) {
      this._activeSection = 'all';
    }

    const translitOptions: Array<[string, string]> = [
      ['iast', 'IAST (vědecká s diakritikou)'],
      ['iast_padaccheda', 'IAST padaccheda (oddělená slova)'],
      ['cs_phonetic', 'Český fonetický přepis'],
      ['harvard_kyoto', 'Harvard-Kyoto (ASCII)'],
      ['slp1', 'SLP1 (ASCII kódování)']
    ];

    this.innerHTML = `
      <div class="sanskrit-reader-root" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Reader Header -->
        <header class="reader-header" style="background: var(--bg-card); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md, 8px); padding: 1.25rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <h2 class="reader-title" style="margin: 0; font-size: 1.5rem; color: var(--text-primary); font-family: var(--font-deva, serif);">${escapeHtml(doc.title)}</h2>
            <span style="font-size: 0.8rem; background: var(--bg-secondary); border: 1px solid var(--accent-gold); color: var(--accent-gold); padding: 2px 8px; border-radius: 12px; font-weight: 600;">
              📖 ${allVerses.length} veršů
            </span>
          </div>
          <div class="reader-subtitle" style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
            ${escapeHtml(doc.section)} ${doc.author ? `• Autor: ${escapeHtml(doc.author)}` : ''} ${doc.tradition ? `(${escapeHtml(doc.tradition)})` : ''}
          </div>

          <!-- Section Filter Tabs -->
          ${sections.length > 0 ? `
          <div class="reader-section-tabs" role="tablist" style="display: flex; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.6rem; border-top: 1px dashed var(--bg-card-border);">
            <button class="btn btn-sm ${this._activeSection === 'all' ? 'btn-primary' : 'btn-outline'}" data-filter-section="all" role="tab" aria-selected="${this._activeSection === 'all'}">
              Vše (${allVerses.length})
            </button>
            ${sections.map((s) => `
            <button class="btn btn-sm ${this._activeSection === s.key ? 'btn-primary' : 'btn-outline'}" data-filter-section="${escapeHtml(s.key)}" role="tab" aria-selected="${this._activeSection === s.key}">
              ${escapeHtml(s.label)} (${s.count})
            </button>`).join('')}
          </div>` : ''}
        </header>

        <!-- Global Layers & Presentation Toolbar -->
        <div class="reader-layers-toolbar" style="background: var(--bg-card); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md, 8px); padding: 1rem;">
          <div style="font-size: 0.82rem; text-transform: uppercase; font-weight: 700; color: var(--accent-gold); margin-bottom: 0.75rem; letter-spacing: 0.05em;">
            ⚙️ Globální nastavení vrstev čtečky:
          </div>
          <div class="layers-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.85rem;">
            <!-- Devanagari Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-deva" ${this._globalLayers.devanagari ?? true ? 'checked' : ''}>
                1. Dévanágarí
              </label>
              <select id="reader-layer-deva-ver" aria-label="Verze dévanágarí" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="standard" ${this._devanagariVersion === 'standard' ? 'selected' : ''}>Souvislý text</option>
                <option value="padaccheda" ${this._devanagariVersion === 'padaccheda' ? 'selected' : ''}>Oddělená slova (padaccheda)</option>
              </select>
            </div>

            <!-- Transliteration Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-translit" ${this._globalLayers.transliteration ?? true ? 'checked' : ''}>
                2. Transliterace
              </label>
              <select id="reader-layer-translit-ver" aria-label="Verze transliterace" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                ${translitOptions.map(([value, label]) => `<option value="${value}" ${this._transliterationVersion === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>

            <!-- Translation Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-trans" ${this._globalLayers.translation ?? true ? 'checked' : ''}>
                3. Překlad
              </label>
              <select id="reader-layer-trans-filter" aria-label="Filtr překladů" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                ${this.renderTranslationFilterOptions()}
              </select>
            </div>

            <!-- Meter Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-meter" ${this._globalLayers.meter ?? true ? 'checked' : ''}>
                4. Metrum & Rytmus
              </label>
              <select id="reader-layer-meter-view" aria-label="Zobrazení metra" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="full" ${this._showMeterAksharas ? 'selected' : ''}>Plný rozklad slabik (∪ / —)</option>
                <option value="name_only" ${!this._showMeterAksharas ? 'selected' : ''}>Pouze název metra</option>
              </select>
            </div>

            <!-- Commentary Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-comm" ${this._globalLayers.commentary ?? true ? 'checked' : ''}>
                5. Komentáře & Výklady
              </label>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Současné zobrazení výkladů</span>
            </div>
          </div>
        </div>

        <!-- Verses Container -->
        <div class="reader-verses-container" id="verses-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Dynamically populated <sanskrit-verse> instances -->
        </div>

        <!-- Integrated Word Details Modal Popup -->
        <div class="reader-modal-overlay" id="reader-word-modal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); z-index: 9999; justify-content: center; align-items: center; padding: 1rem; backdrop-filter: blur(2px);">
          <div class="reader-modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-deva-title" style="background: var(--bg-card); border: 1px solid var(--bg-card-border); border-radius: 8px; width: 100%; max-width: 620px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--bg-card-border); padding-bottom: 0.75rem;">
              <div>
                <h3 id="modal-deva-title" lang="sa" style="margin: 0; font-size: 2rem; font-family: var(--font-deva, serif); color: var(--text-primary);">—</h3>
                <span id="modal-iast-subtitle" style="font-size: 1.1rem; color: var(--accent-gold); font-style: italic;">—</span>
              </div>
              <button id="modal-btn-close" aria-label="Zavřít (Esc)" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
            </div>

            <div id="modal-dynamic-body" aria-live="polite" style="font-size: 0.92rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <!-- Filled on word-select -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateVerseList();
    this.setupToolbarListeners();
  }

  private applyVerseOptions(vEl: SanskritVerseElement) {
    vEl.setGlobalLayers(this._globalLayers);
    vEl.setOptions({
      transliterationVersion: this._transliterationVersion,
      translationFilter: this._translationFilter,
      devanagariVersion: this._devanagariVersion,
      showMeterAksharas: this._showMeterAksharas,
      czechRules: this._czechRules,
      commentaryLangs: this._commentaryLangs
    });
  }

  private updateVerseList() {
    const container = this.querySelector('#verses-list');
    if (!container) return;

    container.innerHTML = '';
    const verses = this.getFilteredVerses();

    if (verses.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Žádné verše neodpovídají vybranému filtru.</div>';
      return;
    }

    const readonly = this.hasAttribute('readonly');
    verses.forEach((verse) => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      if (readonly) verseEl.setAttribute('readonly', '');
      verseEl.adapter = this._adapter;
      this.applyVerseOptions(verseEl);
      verseEl.verse = verse;
      container.appendChild(verseEl);
    });
  }

  private setupToolbarListeners() {
    // 1. Section filter tabs
    this.querySelectorAll('[data-filter-section]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const sec = (e.currentTarget as HTMLElement).getAttribute('data-filter-section');
        if (sec) {
          this._activeSection = sec;
          this.querySelectorAll('[data-filter-section]').forEach((b) => {
            b.classList.toggle('btn-primary', b === btn);
            b.classList.toggle('btn-outline', b !== btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          this.updateVerseList();
          this.dispatchEvent(new CustomEvent('section-change', { detail: { section: sec }, bubbles: true }));
        }
      });
    });

    // 2. Global Layer Checkboxes
    const devaCheck = this.querySelector('#reader-layer-deva') as HTMLInputElement;
    const devaVer = this.querySelector('#reader-layer-deva-ver') as HTMLSelectElement;
    const translitCheck = this.querySelector('#reader-layer-translit') as HTMLInputElement;
    const translitVer = this.querySelector('#reader-layer-translit-ver') as HTMLSelectElement;
    const transCheck = this.querySelector('#reader-layer-trans') as HTMLInputElement;
    const transFilter = this.querySelector('#reader-layer-trans-filter') as HTMLSelectElement;
    const meterCheck = this.querySelector('#reader-layer-meter') as HTMLInputElement;
    const meterView = this.querySelector('#reader-layer-meter-view') as HTMLSelectElement;
    const commCheck = this.querySelector('#reader-layer-comm') as HTMLInputElement;

    const onLayerConfigChange = () => {
      this._globalLayers = {
        devanagari: devaCheck?.checked ?? true,
        transliteration: translitCheck?.checked ?? true,
        translation: transCheck?.checked ?? true,
        meter: meterCheck?.checked ?? true,
        commentary: commCheck?.checked ?? true
      };
      this._devanagariVersion = devaVer?.value === 'padaccheda' ? 'padaccheda' : 'standard';
      this._transliterationVersion = translitVer?.value || 'iast';
      this._translationFilter = transFilter?.value || 'all';
      this._showMeterAksharas = meterView?.value === 'full';

      // Update all child <sanskrit-verse> instances
      this.querySelectorAll('sanskrit-verse').forEach((el) => this.applyVerseOptions(el as SanskritVerseElement));
      this.dispatchEvent(new CustomEvent('layers-change', {
        detail: {
          layers: { ...this._globalLayers },
          transliterationVersion: this._transliterationVersion,
          translationFilter: this._translationFilter,
          devanagariVersion: this._devanagariVersion,
          showMeterAksharas: this._showMeterAksharas
        },
        bubbles: true
      }));
    };

    [devaCheck, devaVer, translitCheck, translitVer, transCheck, transFilter, meterCheck, meterView, commCheck]
      .forEach((el) => el?.addEventListener('change', onLayerConfigChange));

    // Modal close button
    const closeBtn = this.querySelector('#modal-btn-close');
    const modal = this.querySelector('#reader-word-modal') as HTMLElement;
    closeBtn?.addEventListener('click', () => this.closeWordModal());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeWordModal();
    });
  }

  private closeWordModal() {
    const modal = this.querySelector('#reader-word-modal') as HTMLElement | null;
    if (!modal || modal.style.display === 'none') return;
    modal.style.display = 'none';
    this._modalRequestId++;
    this._lastFocused?.focus?.();
  }

  private async showWordModal(token: Token, _verse: Verse) {
    const modal = this.querySelector('#reader-word-modal') as HTMLElement;
    const title = this.querySelector('#modal-deva-title') as HTMLElement;
    const subtitle = this.querySelector('#modal-iast-subtitle') as HTMLElement;
    const body = this.querySelector('#modal-dynamic-body') as HTMLElement;

    if (!modal || !title || !subtitle || !body) return;

    const requestId = ++this._modalRequestId;
    title.textContent = token.text.devanagari;
    subtitle.textContent = `${token.text.iast}${token.text.cs_phonetic ? ` [česky: ${token.text.cs_phonetic}]` : ''}`;

    body.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Provádím hloubkovou morfologickou analýzu...</div>';
    modal.style.display = 'flex';
    (this.querySelector('#modal-btn-close') as HTMLElement | null)?.focus();

    let analysis;
    try {
      analysis = await this._adapter.analyzeWord(token.text.iast || token.text.devanagari);
    } catch (err: any) {
      if (requestId !== this._modalRequestId) return;
      body.innerHTML = `<div role="alert" style="color: var(--accent-terracotta);">Analýza slova selhala: ${escapeHtml(err?.message || String(err))}</div>`;
      return;
    }
    // A newer word was selected (or the modal was closed) while the analysis was running
    if (requestId !== this._modalRequestId) return;

    const grammarCs = token.grammar?.label_cs || analysis.grammar?.labelCs || '—';
    const meaningCs = token.vocabulary?.meanings_by_lang?.['cs']?.contextual || token.vocabulary?.contextual_meaning_cs || analysis.meanings.byLang?.['cs']?.contextual || '—';
    const altMeaningsCs = token.vocabulary?.meanings_by_lang?.['cs']?.alternatives?.join(', ') || analysis.meanings.byLang?.['cs']?.alternatives?.join(', ') || '';

    let modalHtml = `
      <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px;">
        <div style="color: var(--accent-gold); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Kontextový význam:</div>
        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${escapeHtml(meaningCs)}</div>
        ${altMeaningsCs ? `<div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px;">Další významy: ${escapeHtml(altMeaningsCs)}</div>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem;">
        <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: 6px;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Morfologický rozbor:</small>
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">${escapeHtml(grammarCs)}</div>
        </div>
        <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: 6px;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Kořen (Dhātu) / Kmen:</small>
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">${escapeHtml(token.grammar?.root || token.grammar?.stem || analysis.grammar?.root || analysis.lemma)}</div>
        </div>
      </div>
    `;

    // Derivation tree
    if (analysis.derivationTree && analysis.derivationTree.steps.length > 0) {
      modalHtml += `
        <div class="modal-derivation-section" style="border: 1px solid var(--accent-gold); border-radius: 6px; padding: 0.85rem; background: var(--bg-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
            <strong style="color: var(--accent-gold); font-size: 0.88rem;">📜 Pāṇiniovský derivační strom (vidyut-prakriya): ${escapeHtml(analysis.derivationTree.targetTranslit)}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(analysis.derivationTree.category)}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem; font-family: monospace; font-size: 0.82rem;">
            ${analysis.derivationTree.steps.map((s) => {
              const ruleUrl = safeUrl(s.ruleUrl);
              return `
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; padding: 3px 6px; background: var(--bg-secondary); border-radius: 4px;">
                <span>
                  <strong>${s.stepNumber}.</strong>
                  ${ruleUrl ? `<a href="${escapeHtml(ruleUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); font-weight: 700; text-decoration: underline;">sūtra ${escapeHtml(s.ruleCode)}</a>` : `sūtra ${escapeHtml(s.ruleCode)}`}
                  <span style="color: var(--text-muted);">(${escapeHtml(s.ruleSource)})</span>
                </span>
                <span style="color: var(--text-primary); font-weight: 600;">
                  ${escapeHtml(s.termsDeva || s.termsText)} ${s.termsIast ? `<small style="color: var(--text-muted); font-weight: 400;">(${escapeHtml(s.termsIast)})</small>` : ''}
                </span>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // External dictionaries
    const links = (analysis.externalDictionaryLinks || []).filter((d) => safeUrl(d.url));
    if (links.length > 0) {
      modalHtml += `
        <div style="margin-top: 0.4rem;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Externí sanskrtské slovníky:</small>
          <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.35rem;">
            ${links.map((d) => `
              <a href="${escapeHtml(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 2px 8px;">
                ${escapeHtml(d.label)} ↗
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    body.innerHTML = modalHtml;
  }
}

export function registerSanskritReader(): void {
  const reg = typeof window !== 'undefined' ? (window.customElements || (globalThis as any).customElements) : null;
  if (reg && !reg.get('sanskrit-reader')) {
    reg.define('sanskrit-reader', SanskritReaderElement);
  }
}

// Auto-register in browser/DOM environments
registerSanskritReader();
