/**
 * <sanskrit-reader> Web Component
 *
 * Standalone top-level Reader Web Component for Sanskrit and classical multilingual texts.
 * Features:
 * - Global 4-layer control panel (Dévanágarí, Transliterace, Překlad, Metrum)
 * - Section / text filter (Vše, Yogasūtra, Bhagavadgītā, Mahābhārata)
 * - Embeds <sanskrit-verse> child components with synchronization
 * - Built-in interactive Word Details Popup with Pāṇinian Derivation Tree (vidyut-prakriya)
 * - Language-agnostic adapter pluggability via LanguageAdapter interface
 */

import { SanskritDocument, Verse, Token } from '../core/types/schema.ts';
import { LanguageAdapter } from '../core/adapters/languageAdapter.ts';
import { defaultSanskritAdapter } from '../core/adapters/sanskritAdapter.ts';
import { SanskritVerseElement, VerseLayerVisibility } from './SanskritVerse.ts';

export class SanskritReaderElement extends HTMLElement {
  private _document: SanskritDocument | null = null;
  private _adapter: LanguageAdapter = defaultSanskritAdapter;
  private _activeSection: string = 'all';
  private _globalLayers: VerseLayerVisibility = {
    devanagari: true,
    transliteration: true,
    translation: true,
    meter: true
  };
  private _transliterationVersion: string = 'iast';
  private _translationFilter: string = 'all';
  private _devanagariVersion: 'standard' | 'padaccheda' = 'standard';
  private _showMeterAksharas: boolean = true;
  private _activeTheme: string = 'parchment';
  private _selectedToken: Token | null = null;
  private _selectedVerse: Verse | null = null;

  get selectedToken(): Token | null {
    return this._selectedToken;
  }

  get selectedVerse(): Verse | null {
    return this._selectedVerse;
  }

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['src', 'theme', 'active-section', 'translation-filter', 'transliteration-version'];
  }

  async connectedCallback() {
    const src = this.getAttribute('src');
    if (src && !this._document) {
      await this.loadFromSrc(src);
    }
    this.render();
    this.setupModalListener();
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'src' && newVal) {
      this.loadFromSrc(newVal);
    } else if (name === 'theme' && newVal) {
      this._activeTheme = newVal;
      this.applyTheme();
    } else if (name === 'active-section' && newVal) {
      this._activeSection = newVal;
      this.updateVerseList();
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
  }) {
    if (opts.transliterationVersion !== undefined) this._transliterationVersion = opts.transliterationVersion;
    if (opts.translationFilter !== undefined) this._translationFilter = opts.translationFilter;
    if (opts.devanagariVersion !== undefined) this._devanagariVersion = opts.devanagariVersion;
    if (opts.showMeterAksharas !== undefined) this._showMeterAksharas = opts.showMeterAksharas;
    this.render();
  }

  private async loadFromSrc(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._document = await res.json();
      this.render();
    } catch (err: any) {
      this.innerHTML = `<div class="reader-error" style="color: var(--accent-terracotta); padding: 1rem;">Nelze načíst dokument z URL: ${url} (${err.message})</div>`;
    }
  }

  private applyTheme() {
    this.setAttribute('data-theme', this._activeTheme);
  }

  private getFilteredVerses(): Verse[] {
    if (!this._document) return [];
    const sec = this._activeSection;
    if (sec === 'all') return this._document.verses;
    if (sec === 'ys') return this._document.verses.filter((v) => v.id.startsWith('pys_') || v.number.includes('YS'));
    if (sec === 'bg') return this._document.verses.filter((v) => v.id.startsWith('bg_') || v.number.includes('BG'));
    if (sec === 'mbh') return this._document.verses.filter((v) => v.id.startsWith('mbh_') || v.number.includes('MBh'));
    return this._document.verses;
  }

  private render() {
    if (!this._document) {
      this.innerHTML = '<div class="reader-empty" style="padding: 2rem; text-align: center; color: var(--text-muted);">Žádný dokument k zobrazení.</div>';
      return;
    }

    const doc = this._document.document;
    const allVerses = this._document.verses;
    const ysCount = allVerses.filter((v) => v.id.startsWith('pys_') || v.number.includes('YS')).length;
    const bgCount = allVerses.filter((v) => v.id.startsWith('bg_') || v.number.includes('BG')).length;
    const mbhCount = allVerses.filter((v) => v.id.startsWith('mbh_') || v.number.includes('MBh')).length;

    this.innerHTML = `
      <div class="sanskrit-reader-root" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Reader Header -->
        <header class="reader-header" style="background: var(--bg-card); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md, 8px); padding: 1.25rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <h2 class="reader-title" style="margin: 0; font-size: 1.5rem; color: var(--text-primary); font-family: var(--font-deva, serif);">${this.escape(doc.title)}</h2>
            <span style="font-size: 0.8rem; background: var(--bg-secondary); border: 1px solid var(--accent-gold); color: var(--accent-gold); padding: 2px 8px; border-radius: 12px; font-weight: 600;">
              📖 Standalone Web Component
            </span>
          </div>
          <div class="reader-subtitle" style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
            ${this.escape(doc.section)} ${doc.author ? `• Autor: ${this.escape(doc.author)}` : ''} ${doc.tradition ? `(${this.escape(doc.tradition)})` : ''}
          </div>

          <!-- Section Filter Tabs -->
          <div class="reader-section-tabs" style="display: flex; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.6rem; border-top: 1px dashed var(--bg-card-border);">
            <button class="btn btn-sm ${this._activeSection === 'all' ? 'btn-primary' : 'btn-outline'}" data-filter-section="all">
              Vše (${allVerses.length})
            </button>
            <button class="btn btn-sm ${this._activeSection === 'ys' ? 'btn-primary' : 'btn-outline'}" data-filter-section="ys">
              🧘 Yogasūtra (${ysCount})
            </button>
            <button class="btn btn-sm ${this._activeSection === 'bg' ? 'btn-primary' : 'btn-outline'}" data-filter-section="bg">
              ⚔️ Bhagavadgītā (${bgCount})
            </button>
            <button class="btn btn-sm ${this._activeSection === 'mbh' ? 'btn-primary' : 'btn-outline'}" data-filter-section="mbh">
              📜 Mahābhārata (${mbhCount})
            </button>
          </div>
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
                <input type="checkbox" id="reader-layer-deva" ${this._globalLayers.devanagari ? 'checked' : ''}>
                1. Dévanágarí
              </label>
              <select id="reader-layer-deva-ver" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="standard" ${this._devanagariVersion === 'standard' ? 'selected' : ''}>Souvislý text</option>
                <option value="padaccheda" ${this._devanagariVersion === 'padaccheda' ? 'selected' : ''}>Oddělená slova (padaccheda)</option>
              </select>
            </div>

            <!-- Transliteration Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-translit" ${this._globalLayers.transliteration ? 'checked' : ''}>
                2. Transliterace
              </label>
              <select id="reader-layer-translit-ver" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="iast" ${this._transliterationVersion === 'iast' ? 'selected' : ''}>IAST (vědecká s diakritikou)</option>
                <option value="cs_phonetic" ${this._transliterationVersion === 'cs_phonetic' ? 'selected' : ''}>Český fonetický přepis</option>
                <option value="slp1" ${this._transliterationVersion === 'slp1' ? 'selected' : ''}>SLP1 (ASCII kódování)</option>
              </select>
            </div>

            <!-- Translation Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-trans" ${this._globalLayers.translation ? 'checked' : ''}>
                3. Překlad
              </label>
              <select id="reader-layer-trans-filter" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="all" ${this._translationFilter === 'all' ? 'selected' : ''}>Všechny jazyky a verze</option>
                <option value="cs" ${this._translationFilter === 'cs' ? 'selected' : ''}>Čeština (vše)</option>
                <option value="cs_fluent" ${this._translationFilter === 'cs_fluent' ? 'selected' : ''}>Čeština (pouze plynulý)</option>
                <option value="cs_literal" ${this._translationFilter === 'cs_literal' ? 'selected' : ''}>Čeština (pouze doslovný)</option>
                <option value="en" ${this._translationFilter === 'en' ? 'selected' : ''}>Angličtina (English)</option>
              </select>
            </div>

            <!-- Meter Layer -->
            <div class="layer-control-card" style="background: var(--bg-secondary); border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="display: flex; align-items: center; gap: 0.45rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="reader-layer-meter" ${this._globalLayers.meter ? 'checked' : ''}>
                4. Metrum & Rytmus
              </label>
              <select id="reader-layer-meter-view" style="font-size: 0.8rem; padding: 0.25rem 0.45rem; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
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
          <div class="reader-modal-card" style="background: var(--bg-card); border: 1px solid var(--bg-card-border); border-radius: 8px; width: 100%; max-width: 620px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--bg-card-border); padding-bottom: 0.75rem;">
              <div>
                <h3 id="modal-deva-title" style="margin: 0; font-size: 2rem; font-family: var(--font-deva, serif); color: var(--text-primary);">—</h3>
                <span id="modal-iast-subtitle" style="font-size: 1.1rem; color: var(--accent-gold); font-style: italic;">—</span>
              </div>
              <button id="modal-btn-close" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
            </div>

            <div id="modal-dynamic-body" style="font-size: 0.92rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <!-- Filled on word-select -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateVerseList();
    this.setupToolbarListeners();
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

    verses.forEach((verse) => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = verse;
      verseEl.adapter = this._adapter;
      verseEl.setGlobalLayers(this._globalLayers);
      verseEl.setOptions({
        transliterationVersion: this._transliterationVersion,
        translationFilter: this._translationFilter,
        devanagariVersion: this._devanagariVersion,
        showMeterAksharas: this._showMeterAksharas
      });
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
          });
          this.updateVerseList();
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
      this._devanagariVersion = (devaVer?.value as any) || 'standard';
      this._transliterationVersion = translitVer?.value || 'iast';
      this._translationFilter = transFilter?.value || 'all';
      this._showMeterAksharas = meterView?.value === 'full';

      // Update all child <sanskrit-verse> instances
      this.querySelectorAll('sanskrit-verse').forEach((el) => {
        const vEl = el as SanskritVerseElement;
        vEl.setGlobalLayers(this._globalLayers);
        vEl.setOptions({
          transliterationVersion: this._transliterationVersion,
          translationFilter: this._translationFilter,
          devanagariVersion: this._devanagariVersion,
          showMeterAksharas: this._showMeterAksharas
        });
      });
    };

    devaCheck?.addEventListener('change', onLayerConfigChange);
    devaVer?.addEventListener('change', onLayerConfigChange);
    translitCheck?.addEventListener('change', onLayerConfigChange);
    translitVer?.addEventListener('change', onLayerConfigChange);
    transCheck?.addEventListener('change', onLayerConfigChange);
    transFilter?.addEventListener('change', onLayerConfigChange);
    meterCheck?.addEventListener('change', onLayerConfigChange);
    meterView?.addEventListener('change', onLayerConfigChange);
    commCheck?.addEventListener('change', onLayerConfigChange);

    // Modal close button
    const closeBtn = this.querySelector('#modal-btn-close');
    const modal = this.querySelector('#reader-word-modal') as HTMLElement;
    closeBtn?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  private setupModalListener() {
    this.addEventListener('word-select', async (e: Event) => {
      const customEvent = e as CustomEvent<{ token: Token; verse: Verse }>;
      const { token, verse } = customEvent.detail;
      this._selectedToken = token;
      this._selectedVerse = verse;
      await this.showWordModal(token, verse);
    });
  }

  private async showWordModal(token: Token, _verse: Verse) {
    const modal = this.querySelector('#reader-word-modal') as HTMLElement;
    const title = this.querySelector('#modal-deva-title') as HTMLElement;
    const subtitle = this.querySelector('#modal-iast-subtitle') as HTMLElement;
    const body = this.querySelector('#modal-dynamic-body') as HTMLElement;

    if (!modal || !title || !subtitle || !body) return;

    title.textContent = token.text.devanagari;
    subtitle.textContent = `${token.text.iast}${token.text.cs_phonetic ? ` [česky: ${token.text.cs_phonetic}]` : ''}`;

    body.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Provádím hloubkovou morfologickou analýzu...</div>';
    modal.style.display = 'flex';

    // Perform analysis via LanguageAdapter
    const analysis = await this._adapter.analyzeWord(token.text.iast || token.text.devanagari);

    const grammarCs = token.grammar?.label_cs || analysis.grammar?.labelCs || '—';
    const meaningCs = token.vocabulary?.meanings_by_lang?.['cs']?.contextual || analysis.meanings.byLang?.['cs']?.contextual || '—';
    const altMeaningsCs = token.vocabulary?.meanings_by_lang?.['cs']?.alternatives?.join(', ') || analysis.meanings.byLang?.['cs']?.alternatives?.join(', ') || '';

    let modalHtml = `
      <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px;">
        <div style="color: var(--accent-gold); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Kontextový význam:</div>
        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${this.escape(meaningCs)}</div>
        ${altMeaningsCs ? `<div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px;">Další významy: ${this.escape(altMeaningsCs)}</div>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem;">
        <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: 6px;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Morfologický rozbor:</small>
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">${this.escape(grammarCs)}</div>
        </div>
        <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: 6px;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Kořen (Dhātu) / Kmen:</small>
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary);">${this.escape(token.grammar?.root || token.grammar?.stem || analysis.grammar?.root || analysis.lemma)}</div>
        </div>
      </div>
    `;

    // Derivation tree
    if (analysis.derivationTree && analysis.derivationTree.steps.length > 0) {
      modalHtml += `
        <div class="modal-derivation-section" style="border: 1px solid var(--accent-gold); border-radius: 6px; padding: 0.85rem; background: var(--bg-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
            <strong style="color: var(--accent-gold); font-size: 0.88rem;">📜 Pāṇiniovský derivační strom (vidyut-prakriya):</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${analysis.derivationTree.category}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem; font-family: monospace; font-size: 0.82rem;">
            ${analysis.derivationTree.steps.map((s) => `
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; padding: 3px 6px; background: var(--bg-secondary); border-radius: 4px;">
                <span>
                  <strong>${s.stepNumber}.</strong>
                  ${s.ruleUrl ? `<a href="${s.ruleUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); font-weight: 700; text-decoration: underline;">sūtra ${s.ruleCode}</a>` : `sūtra ${s.ruleCode}`}
                  <span style="color: var(--text-muted);">(${s.ruleSource})</span>
                </span>
                <span style="color: var(--text-primary); font-weight: 600;">
                  ${this.escape(s.termsDeva || s.termsText)} ${s.termsIast ? `<small style="color: var(--text-muted); font-weight: 400;">(${s.termsIast})</small>` : ''}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // External dictionaries
    if (analysis.externalDictionaryLinks && analysis.externalDictionaryLinks.length > 0) {
      modalHtml += `
        <div style="margin-top: 0.4rem;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">Externí sanskrtské slovníky:</small>
          <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.35rem;">
            ${analysis.externalDictionaryLinks.map((d) => `
              <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 2px 8px;">
                ${d.label} ↗
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    body.innerHTML = modalHtml;
  }

  private escape(str?: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
