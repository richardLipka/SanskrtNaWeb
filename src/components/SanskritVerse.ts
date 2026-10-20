/**
 * <sanskrit-verse> Web Component
 *
 * Standalone, lightweight Custom Element representing a single Sanskrit verse/sūtra.
 * Features:
 * - Local layer toggles per verse (overriding global settings)
 * - Bidirectional cross-highlighting across Devanāgarī, Transliteration, and Translations
 * - Syllable-level metrical weight visualization (Laghu / Guru)
 * - Emits 'word-select' custom event on token click for dictionary/derivation popup
 */

import { Verse, getVerseCommentaries } from '../core/types/schema.ts';
import { LanguageAdapter } from '../core/adapters/languageAdapter.ts';
import { defaultSanskritAdapter } from '../core/adapters/sanskritAdapter.ts';
import { getScriptText } from '../core/transliteration/engine.ts';

export interface VerseLayerVisibility {
  devanagari?: boolean;
  transliteration?: boolean;
  translation?: boolean;
  meter?: boolean;
  commentary?: boolean;
}

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

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['verse-id', 'transliteration-version', 'translation-filter', 'devanagari-version'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'transliteration-version') {
      this._transliterationVersion = newVal || 'iast';
      this.render();
    } else if (name === 'translation-filter') {
      this._translationFilter = newVal || 'all';
      this.render();
    } else if (name === 'devanagari-version') {
      this._devanagariVersion = (newVal as any) || 'standard';
      this.render();
    }
  }

  get verse(): Verse | null {
    return this._verse;
  }

  set verse(v: Verse | null) {
    this._verse = v;
    this.render();
  }

  get adapter(): LanguageAdapter {
    return this._adapter;
  }

  set adapter(a: LanguageAdapter) {
    this._adapter = a;
    this.render();
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
  }) {
    if (opts.transliterationVersion !== undefined) this._transliterationVersion = opts.transliterationVersion;
    if (opts.translationFilter !== undefined) this._translationFilter = opts.translationFilter;
    if (opts.devanagariVersion !== undefined) this._devanagariVersion = opts.devanagariVersion;
    if (opts.showMeterAksharas !== undefined) this._showMeterAksharas = opts.showMeterAksharas;
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
    const commentaries = getVerseCommentaries(v);

    // Build verse HTML
    let html = `
      <article class="verse-card" id="verse-${v.id}" data-verse-id="${v.id}">
        <!-- Verse Header & Local Controls -->
        <div class="verse-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div class="verse-badge" style="background: var(--bg-card); border: 1px solid var(--accent-gold); padding: 3px 10px; border-radius: 6px; font-weight: 700; color: var(--accent-gold); display: inline-flex; align-items: center; gap: 5px;">
              <span>॥</span>
              <span>${this.escape(v.number)}</span>
            </div>
            ${v.source?.url ? `<a href="${v.source.url}" target="_blank" rel="noopener noreferrer" class="verse-source-link" style="font-size: 0.8rem; color: var(--text-muted); text-decoration: underline;">${this.escape(v.source.title || 'Zdroj')} ↗</a>` : ''}
          </div>

          <!-- Local layer pills for this verse -->
          <div class="verse-local-controls" style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: 2px;">Vrstvy:</span>
            <button class="layer-pill ${isDevaVis ? 'active' : ''}" data-toggle-layer="devanagari" title="Přepnout Dévanágarí pro tento verš">
              ${isDevaVis ? '✓' : '✗'} Déva
            </button>
            <button class="layer-pill ${isTranslitVis ? 'active' : ''}" data-toggle-layer="transliteration" title="Přepnout transliteraci pro tento verš">
              ${isTranslitVis ? '✓' : '✗'} Translit
            </button>
            <button class="layer-pill ${isTransVis ? 'active' : ''}" data-toggle-layer="translation" title="Přepnout překlad pro tento verš">
              ${isTransVis ? '✓' : '✗'} Překlad
            </button>
            <button class="layer-pill ${isMeterVis ? 'active' : ''}" data-toggle-layer="meter" title="Přepnout metrum pro tento verš">
              ${isMeterVis ? '✓' : '✗'} Metrum
            </button>
            <button class="layer-pill ${isCommVis ? 'active' : ''}" data-toggle-layer="commentary" title="Přepnout zobrazení komentářů pro tento verš">
              ${isCommVis ? '✓' : '✗'} Výklady (${commentaries.length})
            </button>
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
          <div class="layer-content layer-deva-content" style="font-family: var(--font-deva, serif); font-size: 1.55rem; line-height: 1.6; color: var(--text-primary);">
            ${this.renderDevanagariContent()}
          </div>
        </div>
      `;
    }

    // 2. LAYER: TRANSLITERATION
    if (isTranslitVis) {
      html += `
        <div class="layer-box layer-translit-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            2. Transliterace (${this._transliterationVersion.toUpperCase()}):
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
              <div class="trans-item" style="margin-bottom: 0.45rem;">
                <span class="trans-tag" style="font-size: 0.72rem; background: var(--bg-secondary); border-radius: 4px; padding: 1px 6px; font-weight: 600; color: var(--accent-gold); margin-right: 0.4rem;">
                  [${((tr.lang || (tr as any).language || 'cs') as string).toUpperCase()}] ${this.escape(tr.label || tr.type || '')}
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
      const rawText = getScriptText(v.scripts.devanagari) || getScriptText(v.scripts.iast) || '';
      const meterRes = this._adapter.analyzeMeter ? this._adapter.analyzeMeter(rawText, v.meter) : null;
      const meterName = meterRes?.meterName || v.meter || 'Detekuji metrum...';

      html += `
        <div class="layer-box layer-meter-box" style="margin-bottom: 0.75rem;">
          <div class="layer-box-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.35rem;">
            <span>4. Metrum & Rytmus (Chandas): <strong style="color: var(--accent-gold);">${this.escape(meterName)}</strong> (${meterRes?.totalSyllables || 0} slabik)</span>
            <button class="btn btn-sm btn-outline btn-edit-meter" data-verse-id="${v.id}" style="font-size: 0.7rem; padding: 1px 6px;">
              ✏️ Upravit metrum
            </button>
          </div>
          ${this._showMeterAksharas && meterRes && meterRes.padas.length > 0 ? `
            <div class="meter-padas-container" style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem;">
              ${meterRes.padas.map((p) => `
                <div class="meter-pada-row" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: var(--bg-secondary); border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.82rem;">
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; min-width: 60px;">Pāda ${p.padaIndex} (${p.syllableCount}):</span>
                  <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; align-items: center;">
                    ${p.syllables.map((s) => `
                      <span class="akshara-pill ${s.weight === 'G' ? 'guru' : 'laghu'}" title="${this.escape(s.text)} (${this.escape(s.translit)}) — ${this.escape(s.weightLabel)}" style="
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
                        <strong>${this.escape(s.text)}</strong>
                        <small style="font-size: 0.7rem; color: var(--text-muted);">${this.escape(s.translit)}</small>
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
            ${commentaries.map((comm) => `
              <div class="commentary-card" style="background: var(--bg-card); border-left: 3px solid ${comm.isOriginalSanskrit || comm.lang === 'sa' ? 'var(--accent-terracotta)' : 'var(--accent-gold)'}; border-radius: 6px; padding: 0.6rem 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div class="comm-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="color: var(--accent-gold); font-size: 0.9rem;">${this.escape(comm.author)}</strong>
                    ${comm.tradition ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">(${this.escape(comm.tradition)})</span>` : ''}
                  </div>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-size: 0.68rem; font-weight: 700; background: var(--bg-secondary); border-radius: 3px; padding: 1px 4px; text-transform: uppercase;">
                      ${this.escape(comm.lang)}
                    </span>
                    ${comm.title ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${this.escape(comm.title)}</span>` : ''}
                  </div>
                </div>
                <div class="comm-card-body" style="font-size: 0.88rem; line-height: 1.5; color: var(--text-primary); ${comm.isOriginalSanskrit || comm.lang === 'sa' ? 'font-family: var(--font-deva, serif); font-size: 0.98rem;' : ''}">
                  ${this.escape(comm.text)}
                </div>
                ${comm.source ? `
                  <div class="comm-card-source" style="margin-top: 0.35rem; font-size: 0.72rem; color: var(--text-muted); font-style: italic; text-align: right;">
                    📖 ${this.escape(comm.source)}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</article>`;
    this.innerHTML = html;
    this.setupInteractions();
  }

  private renderDevanagariContent(): string {
    if (!this._verse) return '';
    const v = this._verse;

    if (this._devanagariVersion === 'padaccheda' && v.scripts.devanagari_padaccheda) {
      return this.escape(getScriptText(v.scripts.devanagari_padaccheda));
    }

    if (v.tokens && v.tokens.length > 0) {
      return v.tokens.map((tok, i) => `
        <span class="token" data-token-id="${tok.id}" data-verse-id="${v.id}" style="cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s ease;">
          ${this.escape(tok.text.devanagari)}
        </span>${i < v.tokens.length - 1 ? ' ' : ''}
      `).join('');
    }

    return this.escape(getScriptText(v.scripts.devanagari));
  }

  private renderTransliterationContent(): string {
    if (!this._verse) return '';
    const v = this._verse;
    const ver = this._transliterationVersion;

    if (v.tokens && v.tokens.length > 0) {
      return v.tokens.map((tok, i) => {
        let text = tok.text.iast;
        if (ver === 'cs_phonetic' && tok.text.cs_phonetic) {
          text = tok.text.cs_phonetic;
        } else if (ver === 'slp1') {
          text = this._adapter.transliterate(tok.text.iast, 'iast', 'slp1');
        }

        return `
          <span class="token" data-token-id="${tok.id}" data-verse-id="${v.id}" style="cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s ease;">
            ${this.escape(text)}
          </span>${i < v.tokens.length - 1 ? ' ' : ''}
        `;
      }).join('');
    }

    if (ver === 'cs_phonetic' && v.scripts.cs_phonetic) {
      return this.escape(getScriptText(v.scripts.cs_phonetic));
    }
    return this.escape(getScriptText(v.scripts.iast));
  }

  private getFilteredTranslations(): Verse['translations'] {
    if (!this._verse?.translations) return [];
    const filter = this._translationFilter;
    if (filter === 'all') return this._verse.translations;
    if (filter === 'cs') return this._verse.translations.filter((t) => t.lang === 'cs');
    if (filter === 'cs_fluent') return this._verse.translations.filter((t) => t.lang === 'cs' && t.type === 'fluent');
    if (filter === 'cs_literal') return this._verse.translations.filter((t) => t.lang === 'cs' && t.type === 'literal');
    if (filter === 'en') return this._verse.translations.filter((t) => t.lang === 'en');
    return this._verse.translations.filter((t) => t.lang === filter);
  }

  private renderAlignedTranslation(text: string, translationId: string): string {
    if (!this._verse?.tokens || this._verse.tokens.length === 0) {
      return this.escape(text);
    }

    let result = text;
    // Map matched words to tokens
    const alignments: Array<{ phrase: string; tokenId: string }> = [];

    this._verse.tokens.forEach((token) => {
      const matches = token.alignment?.matched_words?.[translationId] || [];
      matches.forEach((phrase) => {
        if (phrase && phrase.trim().length > 0) {
          alignments.push({ phrase: phrase.trim(), tokenId: token.id });
        }
      });
    });

    // Sort by length descending to replace longer phrases first
    alignments.sort((a, b) => b.phrase.length - a.phrase.length);

    alignments.forEach(({ phrase, tokenId }) => {
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(\\b${escapedPhrase}\\b|${escapedPhrase})`, 'i');
      result = result.replace(regex, `<span class="aligned-phrase" data-aligned-token="${tokenId}" style="cursor: pointer; border-bottom: 1px dotted var(--accent-gold); padding: 0 1px; transition: background 0.15s ease;">$1</span>`);
    });

    return result;
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
        if (newMeter !== null) {
          this._verse!.meter = newMeter.trim();
          this.render();
        }
      });
    }

    // 3. Bidirectional Cross-Highlighting
    // Hover on Devanagari or IAST token -> highlights translation phrase
    this.querySelectorAll('.token').forEach((tokenEl) => {
      const tokenId = tokenEl.getAttribute('data-token-id');
      if (!tokenId) return;

      tokenEl.addEventListener('mouseenter', () => {
        this.setHighlight(tokenId, true);
      });
      tokenEl.addEventListener('mouseleave', () => {
        this.setHighlight(tokenId, false);
      });

      // Click to open word detail popup
      tokenEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const token = this._verse?.tokens?.find((t) => t.id === tokenId);
        if (token && this._verse) {
          this.dispatchEvent(new CustomEvent('word-select', {
            detail: { token, verse: this._verse },
            bubbles: true,
            composed: true
          }));
        }
      });
    });

    // Hover on aligned phrase in translation -> highlights Devanagari & IAST
    this.querySelectorAll('.aligned-phrase').forEach((phraseEl) => {
      const tokenId = phraseEl.getAttribute('data-aligned-token');
      if (!tokenId) return;

      phraseEl.addEventListener('mouseenter', () => {
        this.setHighlight(tokenId, true);
      });
      phraseEl.addEventListener('mouseleave', () => {
        this.setHighlight(tokenId, false);
      });
      phraseEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const token = this._verse?.tokens?.find((t) => t.id === tokenId);
        if (token && this._verse) {
          this.dispatchEvent(new CustomEvent('word-select', {
            detail: { token, verse: this._verse },
            bubbles: true,
            composed: true
          }));
        }
      });
    });
  }

  private setHighlight(tokenId: string, isActive: boolean) {
    const tokens = this.querySelectorAll(`[data-token-id="${tokenId}"]`);
    tokens.forEach((el) => {
      if (isActive) {
        (el as HTMLElement).style.backgroundColor = 'var(--token-highlight-bg, rgba(217, 119, 6, 0.28))';
        (el as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent-gold)';
      } else {
        (el as HTMLElement).style.backgroundColor = '';
        (el as HTMLElement).style.boxShadow = '';
      }
    });

    const phrases = this.querySelectorAll(`[data-aligned-token="${tokenId}"]`);
    phrases.forEach((el) => {
      if (isActive) {
        (el as HTMLElement).style.backgroundColor = 'var(--token-highlight-bg, rgba(217, 119, 6, 0.28))';
        (el as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent-gold)';
      } else {
        (el as HTMLElement).style.backgroundColor = '';
        (el as HTMLElement).style.boxShadow = '';
      }
    });
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

export function registerSanskritVerse(): void {
  const reg = typeof window !== 'undefined' ? (window.customElements || (globalThis as any).customElements) : null;
  if (reg && !reg.get('sanskrit-verse')) {
    reg.define('sanskrit-verse', SanskritVerseElement);
  }
}

// Auto-register in browser/DOM environments
registerSanskritVerse();
