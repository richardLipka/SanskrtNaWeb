/**
 * <sanskrit-verse> Web Component
 *
 * Standalone, lightweight Custom Element representing a single Sanskrit verse/sūtra.
 * Features:
 * - Local layer toggles per verse (overriding global settings)
 * - Bidirectional cross-highlighting across Devanāgarī, Transliteration, and Translations
 * - Syllable-level metrical weight visualization (Laghu / Guru)
 * - Emits 'word-select' custom event on token click for dictionary/derivation popup
 * - Emits 'verse-meter-change' when the meter is edited (hidden with the `readonly` attribute)
 */

import { Verse, CzechPhoneticRules, getVerseCommentaries } from '../core/types/schema.ts';
import { LanguageAdapter, VerseMeterResult } from '../core/adapters/languageAdapter.ts';
import { defaultSanskritAdapter } from '../core/adapters/sanskritAdapter.ts';
import { getScriptText } from '../core/transliteration/engine.ts';
import { escapeHtml, safeUrl, cssEscape, renderAlignedHtml, AlignedPhrase } from '../core/utils/html.ts';

export interface VerseLayerVisibility {
  devanagari?: boolean;
  transliteration?: boolean;
  translation?: boolean;
  meter?: boolean;
  commentary?: boolean;
}

const TRANSLIT_LABELS: Record<string, string> = {
  iast: 'IAST',
  iast_padaccheda: 'IAST – padaccheda',
  cs_phonetic: 'český fonetický přepis',
  harvard_kyoto: 'Harvard-Kyoto',
  hk: 'Harvard-Kyoto',
  slp1: 'SLP1'
};

export class SanskritVerseElement extends HTMLElement {
  private _verse: Verse | null = null;
  private _adapter: LanguageAdapter = defaultSanskritAdapter;
  private _globalLayers: VerseLayerVisibility = {
    devanagari: true,
    transliteration: true,
    translation: true,
    meter: true,
    commentary: true
  };
  private _localOverrides: Partial<VerseLayerVisibility> = {};
  private _transliterationVersion: string = 'iast';
  private _translationFilter: string = 'all';
  private _devanagariVersion: 'standard' | 'padaccheda' = 'standard';
  private _showMeterAksharas: boolean = true;
  private _czechRules: Partial<CzechPhoneticRules> | null = null;
  private _commentaryLangs: string[] | null = null;
  private _meterCache: { key: string; result: VerseMeterResult | null } | null = null;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['verse-id', 'transliteration-version', 'translation-filter', 'devanagari-version', 'readonly'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'transliteration-version') {
      this._transliterationVersion = newVal || 'iast';
    } else if (name === 'translation-filter') {
      this._translationFilter = newVal || 'all';
    } else if (name === 'devanagari-version') {
      this._devanagariVersion = newVal === 'padaccheda' ? 'padaccheda' : 'standard';
    } else if (name !== 'readonly') {
      return;
    }
    this.render();
  }

  get verse(): Verse | null {
    return this._verse;
  }

  set verse(v: Verse | null) {
    this._verse = v;
    this._meterCache = null;
    this.render();
  }

  get adapter(): LanguageAdapter {
    return this._adapter;
  }

  set adapter(a: LanguageAdapter) {
    this._adapter = a;
    this._meterCache = null;
    this.render();
  }

  get readonly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readonly(value: boolean) {
    this.toggleAttribute('readonly', Boolean(value));
  }

  get layerVisibility(): VerseLayerVisibility {
    return { ...this._globalLayers, ...this._localOverrides };
  }

  set layerVisibility(layers: VerseLayerVisibility) {
    this.setGlobalLayers(layers);
  }

  setGlobalLayers(layers: VerseLayerVisibility) {
    this._globalLayers = { ...layers };
    this.render();
  }

  setOptions(opts: {
    transliterationVersion?: string;
    translationFilter?: string;
    devanagariVersion?: 'standard' | 'padaccheda';
    showMeterAksharas?: boolean;
    /** Czech phonetic rules; when set, the Czech transcription is computed live with them */
    czechRules?: Partial<CzechPhoneticRules> | null;
    /** Commentary languages to show (e.g. ['sa'] or ['cs', 'en']); null/empty shows all */
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

  private isLayerVisible(layer: keyof VerseLayerVisibility): boolean {
    if (this._localOverrides[layer] !== undefined) {
      return this._localOverrides[layer]!;
    }
    return this._globalLayers[layer] ?? true;
  }

  private toggleLocalLayer(layer: keyof VerseLayerVisibility) {
    const current = this.isLayerVisible(layer);
    this._localOverrides[layer] = !current;
    this.render();
  }

  private getMeterAnalysis(): VerseMeterResult | null {
    const v = this._verse;
    if (!v || !this._adapter.analyzeMeter) return null;
    const rawText = getScriptText(v.scripts.devanagari) || getScriptText(v.scripts.iast) || '';
    const key = `${rawText}\u0000${v.meter || ''}`;
    if (this._meterCache?.key === key) return this._meterCache.result;
    let result: VerseMeterResult | null = null;
    try {
      result = this._adapter.analyzeMeter(rawText, v.meter || undefined);
    } catch {
      result = null;
    }
    this._meterCache = { key, result };
    return result;
  }

  private getVisibleCommentaries() {
    if (!this._verse) return [];
    const all = getVerseCommentaries(this._verse);
    const langs = this._commentaryLangs;
    if (!langs || langs.length === 0) return all;
    return all.filter((c) => langs.includes(c.lang));
  }

  private render() {
    if (!this._verse) {
      this.innerHTML = '<div class="verse-loading">Načítám verš...</div>';
      return;
    }

    const v = this._verse;
    const isDevaVis = this.isLayerVisible('devanagari');
    const isTranslitVis = this.isLayerVisible('transliteration');
    const isTransVis = this.isLayerVisible('translation');
    const isMeterVis = this.isLayerVisible('meter');
    const isCommVis = this.isLayerVisible('commentary');
    const commentaries = this.getVisibleCommentaries();
    const sourceUrl = safeUrl(v.source?.url);
    const verseId = escapeHtml(v.id);

    // Build verse HTML
    let html = `
      <article class="verse-card" id="verse-${verseId}" data-verse-id="${verseId}">
        <!-- Verse Header & Local Controls -->
        <div class="verse-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div class="verse-badge" style="background: var(--bg-card); border: 1px solid var(--accent-gold); padding: 3px 10px; border-radius: 6px; font-weight: 700; color: var(--accent-gold); display: inline-flex; align-items: center; gap: 5px;">
              <span>॥</span>
              <span>${escapeHtml(v.number)}</span>
            </div>
            ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="verse-source-link" style="font-size: 0.8rem; color: var(--text-muted); text-decoration: underline;">${escapeHtml(v.source?.title || 'Zdroj')} ↗</a>` : ''}
          </div>

          <!-- Local layer pills for this verse -->
          <div class="verse-local-controls" style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: 2px;">Vrstvy:</span>
            ${this.renderPill('devanagari', isDevaVis, 'Déva', 'Přepnout Dévanágarí pro tento verš')}
            ${this.renderPill('transliteration', isTranslitVis, 'Translit', 'Přepnout transliteraci pro tento verš')}
            ${this.renderPill('translation', isTransVis, 'Překlad', 'Přepnout překlad pro tento verš')}
            ${this.renderPill('meter', isMeterVis, 'Metrum', 'Přepnout metrum pro tento verš')}
            ${this.renderPill('commentary', isCommVis, `Výklady (${commentaries.length})`, 'Přepnout zobrazení komentářů pro tento verš')}
          </div>
        </div>
    `;

    // 1. LAYER: DEVANAGARI
    if (isDevaVis) {
      html += `
        <div class="layer-box layer-deva-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            1. Dévanágarí ${this._devanagariVersion === 'padaccheda' ? '(oddělená slova / padaccheda)' : ''}:
          </div>
          <div class="layer-content layer-deva-content" lang="sa" style="font-family: var(--font-deva, serif); font-size: 1.55rem; line-height: 1.6; color: var(--text-primary);">
            ${this.renderDevanagariContent()}
          </div>
        </div>
      `;
    }

    // 2. LAYER: TRANSLITERATION
    if (isTranslitVis) {
      const label = TRANSLIT_LABELS[this._transliterationVersion] || this._transliterationVersion;
      html += `
        <div class="layer-box layer-translit-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            2. Transliterace (${escapeHtml(label)}):
          </div>
          <div class="layer-content layer-translit-content" style="font-size: 1.05rem; line-height: 1.55; color: var(--text-secondary); font-style: italic;">
            ${this.renderTransliterationContent()}
          </div>
        </div>
      `;
    }

    // 3. LAYER: TRANSLATION
    if (isTransVis && v.translations && v.translations.length > 0) {
      const filtered = this.getFilteredTranslations();
      html += `
        <div class="layer-box layer-trans-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            3. Překlad:
          </div>
          <div class="layer-content layer-translation-content">
            ${filtered.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Pro vybraný filtr není překlad k dispozici.</div>' : ''}
            ${filtered.map((tr) => `
              <div class="trans-item" style="margin-bottom: 0.45rem;" lang="${escapeHtml(tr.lang || 'cs')}">
                <span class="trans-tag" style="font-size: 0.72rem; background: var(--bg-secondary); border-radius: 4px; padding: 1px 6px; font-weight: 600; color: var(--accent-gold); margin-right: 0.4rem;">
                  [${escapeHtml((tr.lang || 'cs').toUpperCase())}] ${escapeHtml(tr.label || tr.type || '')}
                </span>
                <span class="trans-text ${tr.type === 'fluent' ? 'trans-fluent-text' : 'trans-literal-text'}" style="font-size: 0.95rem; line-height: 1.45;">
                  ${this.renderAlignedTranslation(tr.text, tr.id)}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 4. LAYER: METER (CHANDAS)
    if (isMeterVis) {
      const meterRes = this.getMeterAnalysis();
      const meterName = meterRes?.meterName || v.meter || 'Metrum neurčeno';

      html += `
        <div class="layer-box layer-meter-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            <span>4. Metrum & Rytmus (Chandas): <strong style="color: var(--accent-gold);">${escapeHtml(meterName)}</strong> (${meterRes?.totalSyllables || 0} slabik)</span>
            ${this.readonly ? '' : `
            <button class="btn btn-sm btn-outline btn-edit-meter" data-verse-id="${verseId}" style="font-size: 0.7rem; padding: 1px 6px;">
              ✏️ Upravit metrum
            </button>`}
          </div>
          ${this._showMeterAksharas && meterRes && meterRes.padas.length > 0 ? `
            <div class="meter-padas-container" style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem;">
              ${meterRes.padas.map((p) => `
                <div class="meter-pada-row" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: var(--bg-secondary); border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.82rem;">
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; min-width: 60px;">Pāda ${p.padaIndex} (${p.syllableCount}):</span>
                  <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; align-items: center;">
                    ${p.syllables.map((s) => `
                      <span class="akshara-pill ${s.weight === 'G' ? 'guru' : 'laghu'}" title="${escapeHtml(s.text)} (${escapeHtml(s.translit)}) — ${escapeHtml(s.weightLabel)}" style="
                        padding: 1px 5px;
                        border-radius: 3px;
                        font-size: 0.82rem;
                        background: var(--bg-card);
                        border: 1px solid ${s.weight === 'G' ? 'var(--accent-gold)' : 'var(--bg-card-border)'};
                        color: var(--text-primary);
                        display: inline-flex;
                        align-items: baseline;
                        gap: 2px;
                      ">
                        <strong>${escapeHtml(s.text)}</strong>
                        <small style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(s.translit)}</small>
                        <sub style="font-weight: 700; color: ${s.weight === 'G' ? 'var(--accent-terracotta)' : 'var(--text-muted)'};">${s.weight === 'G' ? '—' : '∪'}</sub>
                      </span>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // 5. LAYER: COMMENTARIES & EXEGESIS (Simultaneous multi-author, multi-language display)
    if (isCommVis && commentaries.length > 0) {
      html += `
        <div class="layer-box layer-commentary-box verse-commentaries" style="margin-top: 0.85rem; padding-top: 0.65rem; border-top: 1px dashed var(--bg-card-border);">
          <div class="layer-box-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 4px;">
            <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">
              📜 5. Komentáře & Tradiční výklady (${commentaries.length}):
            </span>
            <span class="badge" style="font-size: 0.7rem; background: var(--bg-secondary); border-radius: 4px; padding: 2px 6px; color: var(--accent-gold); font-weight: 600;">
              Současné zobrazení
            </span>
          </div>
          <div class="commentaries-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
            ${commentaries.map((comm) => {
              const isSa = comm.isOriginalSanskrit || comm.lang === 'sa';
              return `
              <div class="commentary-card" style="background: var(--bg-card); border-left: 3px solid ${isSa ? 'var(--accent-terracotta)' : 'var(--accent-gold)'}; border-radius: 6px; padding: 0.6rem 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div class="comm-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="color: var(--accent-gold); font-size: 0.9rem;">${escapeHtml(comm.author)}</strong>
                    ${comm.tradition ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">(${escapeHtml(comm.tradition)})</span>` : ''}
                  </div>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-size: 0.68rem; font-weight: 700; background: var(--bg-secondary); border-radius: 3px; padding: 1px 4px; text-transform: uppercase;">
                      ${escapeHtml(comm.lang)}
                    </span>
                    ${comm.title ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(comm.title)}</span>` : ''}
                  </div>
                </div>
                <div class="comm-card-body" lang="${escapeHtml(comm.lang)}" style="font-size: 0.88rem; line-height: 1.5; color: var(--text-primary); white-space: pre-line; ${isSa ? 'font-family: var(--font-deva, serif); font-size: 0.98rem;' : ''}">${escapeHtml(comm.text)}</div>
                ${comm.source ? `
                  <div class="comm-card-source" style="margin-top: 0.35rem; font-size: 0.72rem; color: var(--text-muted); font-style: italic; text-align: right;">
                    📖 ${escapeHtml(comm.source)}
                  </div>
                ` : ''}
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    html += `</article>`;
    this.innerHTML = html;
    this.setupInteractions();
  }

  private renderPill(layer: keyof VerseLayerVisibility, active: boolean, label: string, title: string): string {
    return `
      <button class="layer-pill ${active ? 'active' : ''}" data-toggle-layer="${layer}" title="${escapeHtml(title)}" aria-pressed="${active}">
        ${active ? '✓' : '✗'} ${escapeHtml(label)}
      </button>`;
  }

  private renderToken(tokenId: string, text: string): string {
    const v = this._verse!;
    return `<span class="token" data-token-id="${escapeHtml(tokenId)}" data-verse-id="${escapeHtml(v.id)}" tabindex="0" role="button" style="cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s ease;">${escapeHtml(text)}</span>`;
  }

  private renderDevanagariContent(): string {
    if (!this._verse) return '';
    const v = this._verse;

    if (this._devanagariVersion === 'padaccheda' && v.scripts.devanagari_padaccheda) {
      return escapeHtml(getScriptText(v.scripts.devanagari_padaccheda));
    }

    if (v.tokens && v.tokens.length > 0) {
      return v.tokens.map((tok) => this.renderToken(tok.id, tok.text.devanagari)).join(' ');
    }

    return escapeHtml(getScriptText(v.scripts.devanagari));
  }

  /** Converts IAST into the selected transliteration version. */
  private convertIast(iast: string, storedCsPhonetic?: string): string {
    const ver = this._transliterationVersion;
    if (!iast) return '';
    switch (ver) {
      case 'cs_phonetic':
        if (!this._czechRules && storedCsPhonetic) return storedCsPhonetic;
        return this._adapter.transliterate(iast, 'iast', 'cs_phonetic', this._czechRules ? { czechRules: this._czechRules } : undefined);
      case 'harvard_kyoto':
      case 'hk':
        return this._adapter.transliterate(iast, 'iast', 'hk');
      case 'slp1':
        return this._adapter.transliterate(iast, 'iast', 'slp1');
      default:
        return iast;
    }
  }

  private renderTransliterationContent(): string {
    if (!this._verse) return '';
    const v = this._verse;
    const ver = this._transliterationVersion;

    if (v.tokens && v.tokens.length > 0) {
      return v.tokens
        .map((tok) => this.renderToken(tok.id, this.convertIast(tok.text.iast, tok.text.cs_phonetic)))
        .join(' ');
    }

    if (ver === 'iast_padaccheda' && v.scripts.iast_padaccheda) {
      return escapeHtml(getScriptText(v.scripts.iast_padaccheda));
    }
    if (ver === 'cs_phonetic' && v.scripts.cs_phonetic && !this._czechRules) {
      return escapeHtml(getScriptText(v.scripts.cs_phonetic));
    }
    return escapeHtml(this.convertIast(getScriptText(v.scripts.iast)));
  }

  private getFilteredTranslations(): Verse['translations'] {
    if (!this._verse?.translations) return [];
    const filter = this._translationFilter;
    const all = this._verse.translations;
    if (filter === 'all') return all;
    const typed = filter.match(/^([a-z]{2,3})_(fluent|literal|scholarly|poetic|commentary)$/);
    if (typed) return all.filter((t) => t.lang === typed[1] && t.type === typed[2]);
    return all.filter((t) => t.lang === filter);
  }

  private renderAlignedTranslation(text: string, translationId: string): string {
    const alignments: AlignedPhrase[] = [];
    for (const token of this._verse?.tokens || []) {
      for (const phrase of token.alignment?.matched_words?.[translationId] || []) {
        alignments.push({ phrase, tokenId: token.id });
      }
    }

    return renderAlignedHtml(text, alignments, (escapedPhrase, tokenId) =>
      `<span class="aligned-phrase" data-aligned-token="${escapeHtml(tokenId)}" style="cursor: pointer; border-bottom: 1px dotted var(--accent-gold); padding: 0 1px; transition: background 0.15s ease;">${escapedPhrase}</span>`
    );
  }

  private emitWordSelect(tokenId: string) {
    const token = this._verse?.tokens?.find((t) => t.id === tokenId);
    if (token && this._verse) {
      this.dispatchEvent(new CustomEvent('word-select', {
        detail: { token, verse: this._verse },
        bubbles: true,
        composed: true
      }));
    }
  }

  private setupInteractions() {
    // 1. Local layer toggle pills
    this.querySelectorAll('[data-toggle-layer]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layer = btn.getAttribute('data-toggle-layer') as keyof VerseLayerVisibility;
        if (layer) this.toggleLocalLayer(layer);
      });
    });

    // 2. Edit meter button
    const editMeterBtn = this.querySelector('.btn-edit-meter');
    if (editMeterBtn && this._verse) {
      editMeterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newMeter = prompt(
          `Zadejte druh metra pro verš ${this._verse?.number}:`,
          this._verse?.meter || ''
        );
        if (newMeter !== null && this._verse) {
          this._verse.meter = newMeter.trim();
          this._meterCache = null;
          this.render();
          this.dispatchEvent(new CustomEvent('verse-meter-change', {
            detail: { verse: this._verse, meter: this._verse.meter },
            bubbles: true,
            composed: true
          }));
        }
      });
    }

    // 3. Bidirectional Cross-Highlighting (tokens and aligned translation phrases)
    const bind = (el: Element, tokenId: string | null) => {
      if (!tokenId) return;
      el.addEventListener('mouseenter', () => this.setHighlight(tokenId, true));
      el.addEventListener('mouseleave', () => this.setHighlight(tokenId, false));
      el.addEventListener('focus', () => this.setHighlight(tokenId, true));
      el.addEventListener('blur', () => this.setHighlight(tokenId, false));
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emitWordSelect(tokenId);
      });
      el.addEventListener('keydown', (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          this.emitWordSelect(tokenId);
        }
      });
    };

    this.querySelectorAll('.token').forEach((el) => bind(el, el.getAttribute('data-token-id')));
    this.querySelectorAll('.aligned-phrase').forEach((el) => bind(el, el.getAttribute('data-aligned-token')));
  }

  private setHighlight(tokenId: string, isActive: boolean) {
    const id = cssEscape(tokenId);
    this.querySelectorAll(`[data-token-id="${id}"], [data-aligned-token="${id}"]`).forEach((el) => {
      const style = (el as HTMLElement).style;
      style.backgroundColor = isActive ? 'var(--token-highlight-bg, rgba(217, 119, 6, 0.28))' : '';
      style.boxShadow = isActive ? '0 0 0 2px var(--accent-gold)' : '';
    });
  }
}

export function registerSanskritVerse(): void {
  const reg = typeof window !== 'undefined' ? (window.customElements || (globalThis as any).customElements) : null;
  if (reg && !reg.get('sanskrit-verse')) {
    reg.define('sanskrit-verse', SanskritVerseElement);
  }
}

// Auto-register in browser/DOM environments
registerSanskritVerse();
