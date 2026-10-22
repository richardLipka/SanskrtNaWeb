import { Verse, SanskritDocument, Token, CommentaryItem, getVerseCommentaries, VerseSchema, AppSettingsSchema } from '../core/types/schema.ts';
import { SanskritVerseElement } from './SanskritVerse.ts';
import {
  insertAtCursor,
  IAST_CHARS,
  PANINIAN_SECTIONS,
  attachDevanagariIME,
  IMEController
} from '../core/editor/virtualKeyboard.ts';
import {
  autoSuggestBindings,
  splitTranslationWords,
  TranslationWord
} from '../core/editor/alignmentTool.ts';
import { splitToken, mergeCompound, parseManualSplit, SplitPartSpec } from '../core/editor/tokenOps.ts';
import { rankSplits } from '../core/lemmatizer/compoundSplitter.ts';
import { analyzeCompound } from '../core/lemmatizer/compoundService.ts';
import { lookupMonierWilliams, MwLookupResult } from '../core/dictionaries/monierWilliams.ts';
import { WordDerivationTree } from '../core/adapters/languageAdapter.ts';
import { renderMorphologyHtml } from './morphologyView.ts';
import {
  getTranslationSuggestions,
  findWordConcordance,
  generateIndexVerborum,
  TranslationSuggestion,
  WordConcordanceItem,
  IndexVerborumEntry
} from '../core/corpus/concordance.ts';
import {
  buildBookHierarchy,
  bulkImportText,
  createTokensFromIast,
  filterCorpus,
  exportCorpusSubset,
  BookHierarchy
} from '../core/corpus/bookManager.ts';
import { defaultSanskritAdapter } from '../core/adapters/sanskritAdapter.ts';
import { transliterateLipi, isVidyutReady, loadVidyutWasm } from '../core/lemmatizer/vidyutAdapter.ts';
import {
  SupportedLanguage,
  formatGrammarAnalysis
} from '../core/i18n/terminology.ts';
import { t } from '../core/i18n/translations.ts';
import {
  GlossaryTermEntry,
  VerseTranslationStatus,
  createWorkspaceBundle,
  downloadWorkspaceBundle,
  importWorkspaceBundleFromFile,
  saveWorkspaceBundleToCache
} from '../core/storage/workspaceBundle.ts';
import { getDictionaryUrl, sanitizeSearchLemma } from '../core/dictionaries/dictionaryBuilder.ts';
import { escapeHtml, cssEscape, findAlignedRanges } from '../core/utils/html.ts';
import {
  LLMConfig,
  LLMTaskType,
  LLMExecutionResult,
  LLMPromptContext
} from '../core/llm/llmTypes.ts';
import {
  LLM_PROVIDER_PRESETS,
  executeLLMTask,
  applyTranslationToVerse,
  applyAlignmentsToVerse,
  applyGrammarCorrectionsToVerse,
  buildUserPrompt
} from '../core/llm/llmService.ts';

export const COMMENTARY_PRESETS: Record<string, Partial<CommentaryItem>> = {
  shankara: {
    author: 'Śaṅkarācārya',
    tradition: 'Advaita Vedānta',
    title: 'Śāṅkarabhāṣya',
    lang: 'sa',
    isOriginalSanskrit: true
  },
  ramanuja: {
    author: 'Rāmānujācārya',
    tradition: 'Viśiṣṭādvaita',
    title: 'Gītābhāṣya',
    lang: 'sa',
    isOriginalSanskrit: true
  },
  sridhara: {
    author: 'Śrīdhara Svāmī',
    tradition: 'Advaita / Bhakti',
    title: 'Subodhinī',
    lang: 'sa',
    isOriginalSanskrit: true
  },
  madhva: {
    author: 'Madhvācārya',
    tradition: 'Dvaita Vedānta',
    title: 'Gītābhāṣya',
    lang: 'sa',
    isOriginalSanskrit: true
  },
  abhinava: {
    author: 'Abhinavagupta',
    tradition: 'Kaula-Śaiva',
    title: 'Gītārthasaṅgraha',
    lang: 'sa',
    isOriginalSanskrit: true
  },
  translator: {
    author: 'Překladatelský komentář',
    tradition: 'Vlastní výklad',
    title: 'Překladatelská glosa',
    lang: 'cs',
    isOriginalSanskrit: false
  },
  filipsky: {
    author: 'J. Filipský & J. Vacek',
    tradition: 'Česká indologie',
    title: 'Filologická poznámka',
    lang: 'cs',
    isOriginalSanskrit: false
  }
};

/** One proposed split, whichever source produced it */
interface SplitSuggestion {
  parts: Array<{ form: string; lemma: string; found: boolean; note?: string }>;
  /** Where the split comes from, shown as a badge (corpus attestation, Monier-Williams) */
  badges?: Array<{ text: string; title: string }>;
}

export class SanskritEditorElement extends HTMLElement {
  private _verse: Verse | null = null;
  private _document: SanskritDocument | null = null;
  private _activeTab: 'edit' | 'corpus' | 'index' = 'edit';
  private _selectedTokenId: string | null = null;
  private _activeTranslationId: string = 'cs_fluent';
  private _showPaninianKeyboard: boolean = false;
  private _showGrammarHighlights: boolean = true;
  private _uiLang: SupportedLanguage = 'cs';
  private _imeController: IMEController | null = null;
  private _lastFocusedInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private _concordanceResults: WordConcordanceItem[] = [];
  private _indexVerborum: IndexVerborumEntry[] = [];
  private _corpusFilterText: string = '';
  private _glossary: Record<string, GlossaryTermEntry> = {};
  private _verseStatuses: Record<string, VerseTranslationStatus> = {};
  private _onGlobalKeyDown: ((e: KeyboardEvent) => void) | null = null;

  // Commentary editing state
  private _showAddCommentaryForm: boolean = false;
  private _editingCommentaryId: string | null = null;
  private _commentaryFilterAuthor: string = 'all';

  // LLM Assistant State
  private _showLLMPanel: boolean = false;
  private _activeLLMTask: LLMTaskType = 'translate';
  private _llmConfig: LLMConfig = {
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    contextVersesCount: 1,
    includeGlossary: true,
    targetLanguage: 'cs',
    customSystemPrompt: '',
    providerPreset: 'openai'
  };
  private _llmLoading: boolean = false;
  private _llmLastResult: LLMExecutionResult | null = null;
  /** Verse the last LLM result belongs to – results are never applied to another verse */
  private _llmResultVerseId: string | null = null;
  private _llmAbort: AbortController | null = null;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _toastEl: HTMLElement | null = null;

  // Translation workspace state
  private _previewOpen = false;
  private _lastWordIndex: number | null = null;
  private _splitState: {
    tokenId: string;
    loading: boolean;
    items: SplitSuggestion[];
    /** 'offline' = lexicon served with the app / Vidyut kosha, 'mw' = Monier-Williams online check */
    source?: 'offline' | 'mw';
    /** Readings of the whole word when the dictionary knows it as one word */
    whole?: Array<{ lemma: string; label: string }>;
    error?: string;
  } | null = null;
  private _mwState: { key: string; loading: boolean; result: MwLookupResult | null } | null = null;
  private _morphState: { tokenId: string; loading: boolean; tree: WordDerivationTree | null | undefined } | null = null;
  private _llmError: string | null = null;
  private _showPromptPreview: boolean = false;
  private _showRawJsonResponse: boolean = false;
  private _llmCustomInstruction: string = '';

  constructor() {
    super();
  }

  connectedCallback() {
    this._llmConfig = this.loadLLMConfig();
    this.render();
    this.setupKeyboardShortcuts();
  }

  private loadLLMConfig(): LLMConfig {
    try {
      const stored = localStorage.getItem('sanskrt_llm_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          endpoint: parsed.endpoint || 'https://api.openai.com/v1',
          apiKey: parsed.apiKey || '',
          model: parsed.model || 'gpt-4o-mini',
          temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.2,
          contextVersesCount: typeof parsed.contextVersesCount === 'number' ? parsed.contextVersesCount : 1,
          includeGlossary: parsed.includeGlossary !== false,
          targetLanguage: parsed.targetLanguage || this._uiLang,
          customSystemPrompt: parsed.customSystemPrompt || '',
          providerPreset: parsed.providerPreset || 'openai'
        };
      }
    } catch {
      // ignore
    }
    return {
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      contextVersesCount: 1,
      includeGlossary: true,
      targetLanguage: this._uiLang,
      customSystemPrompt: '',
      providerPreset: 'openai'
    };
  }

  private saveLLMConfig(cfg: LLMConfig) {
    this._llmConfig = cfg;
    try {
      localStorage.setItem('sanskrt_llm_config', JSON.stringify(cfg));
    } catch {
      // ignore
    }
  }

  disconnectedCallback() {
    if (this._imeController) {
      this._imeController.destroy();
      this._imeController = null;
    }
    if (this._onGlobalKeyDown) {
      window.removeEventListener('keydown', this._onGlobalKeyDown);
      this._onGlobalKeyDown = null;
    }
    this._llmAbort?.abort();
    this._toastEl?.remove();
  }

  get verse(): Verse | null {
    return this._verse;
  }

  set verse(v: Verse | null) {
    this.adoptVerse(v);
    this.render();
  }

  /**
   * Makes a working copy of a verse the active one: materializes structured commentaries,
   * keeps the selected token only if it exists in this verse and drops per-verse UI state
   * (LLM result, commentary editing) when the verse changes.
   */
  private adoptVerse(v: Verse | null) {
    const previousId = this._verse?.id;
    this._verse = v ? JSON.parse(JSON.stringify(v)) : null;
    if (!this._verse) {
      this._selectedTokenId = null;
      return;
    }

    if (!this._verse.commentaries || this._verse.commentaries.length === 0) {
      this._verse.commentaries = getVerseCommentaries(this._verse);
    }
    // Structured commentaries are authoritative from now on; legacy fields would otherwise
    // resurrect deleted entries once the list becomes empty.
    this._verse.commentary_cs = undefined;
    this._verse.commentary_by_lang = undefined;

    if (!this._verse.tokens.some((t) => t.id === this._selectedTokenId)) {
      this._selectedTokenId = this._verse.tokens[0]?.id ?? null;
    }
    if (this._verse.translationStatus) {
      this._verseStatuses[this._verse.id] = this._verse.translationStatus as VerseTranslationStatus;
    }
    if (previousId !== this._verse.id) {
      this._llmLastResult = null;
      this._llmResultVerseId = null;
      this._llmError = null;
      this._editingCommentaryId = null;
      this._showAddCommentaryForm = false;
    }
  }

  get document(): SanskritDocument | null {
    return this._document;
  }

  set document(doc: SanskritDocument | null) {
    this._document = doc;
    if (doc && doc.verses.length > 0) {
      // Sync statuses
      doc.verses.forEach((v) => {
        if (!this._verseStatuses[v.id]) {
          this._verseStatuses[v.id] = (v.translationStatus as VerseTranslationStatus) || 'draft';
        }
      });
      const currentBelongs = this._verse && doc.verses.some((v) => v.id === this._verse!.id);
      if (!currentBelongs) {
        this.adoptVerse(doc.verses[0]);
      }
    } else {
      this.adoptVerse(null);
    }
    this.render();
  }

  get uiLanguage(): SupportedLanguage {
    return this._uiLang;
  }

  set uiLanguage(lang: SupportedLanguage) {
    this._uiLang = lang;
    this.render();
  }

  private setupKeyboardShortcuts() {
    if (this._onGlobalKeyDown) {
      window.removeEventListener('keydown', this._onGlobalKeyDown);
    }

    this._onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._previewOpen) {
        this.setPreviewOpen(false);
        return;
      }
      // Shortcuts apply only while the editor is visible and focus is not elsewhere on the page
      // (e.g. in the reader tab or another app input).
      const active = document.activeElement;
      const focusInside = active ? this.contains(active) : false;
      const focusNeutral = !active || active === document.body;
      const visible = this.isConnected && this.getClientRects().length > 0;
      if (!focusInside && !(focusNeutral && visible)) return;

      // If user presses Ctrl + Enter in translation area: save and go to next verse
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.saveCurrentVerseAndAdvance();
        return;
      }
      // Alt + ArrowDown: next verse
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateVerse(1);
        return;
      }
      // Alt + ArrowUp: prev verse
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateVerse(-1);
        return;
      }
      // Ctrl + S in editor: save project bundle
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveFullProjectBundle();
      }
    };

    window.addEventListener('keydown', this._onGlobalKeyDown);
  }

  private render() {
    const lang = this._uiLang;
    this.innerHTML = `
      <div class="sanskrit-editor-container cat-workstation">
        <!-- CAT Top Header -->
        <header class="editor-header">
          <div class="editor-header-left">
            <span class="editor-logo-badge">${t('editorTitle', lang)}</span>
            ${this.renderVerseSelector()}
            ${this.renderStatusPicker()}
            ${this.renderProgressBar()}
          </div>
          <div class="editor-header-right">
            <!-- Language Toggle CZ / EN -->
            <button class="btn btn-sm btn-outline" id="btn-toggle-ui-lang" title="${t('langToggle', lang)}">
              🌐 ${lang === 'cs' ? '🇨🇿 Čeština' : '🇬🇧 English'}
            </button>
            <button class="btn btn-outline" id="btn-editor-prev-verse" title="${t('btnPrevVerse', lang)}">◀</button>
            <button class="btn btn-outline" id="btn-editor-next-verse" title="${t('btnNextVerse', lang)}">▶</button>
            <button class="btn btn-primary" id="btn-editor-save-and-next" title="${t('btnSaveAndNext', lang)}">
              💾 ${t('btnSaveAndNext', lang)}
            </button>
            <button class="btn btn-outline" id="btn-editor-save-verse">💾 ${t('btnSaveVerse', lang)}</button>
            <button class="btn btn-outline" id="btn-editor-new-verse">➕ ${t('btnNewVerse', lang)}</button>
            <button class="btn btn-secondary" id="btn-save-project-bundle" title="Uložit všechna data, rozpracovaný překlad, glosář a nastavení do souboru">
              💾 ${t('btnSaveProject', lang)}
            </button>
            <label class="btn btn-outline" style="cursor: pointer; margin: 0;" title="Obnovit celý projekt ze souboru">
              📂 ${t('btnLoadProject', lang)}
              <input type="file" id="input-load-project-bundle" accept=".json,.sanskrit-project.json" style="display: none;">
            </label>
            <button class="btn btn-outline ${this._previewOpen ? 'active' : ''}" id="btn-toggle-preview" title="${this._uiLang === 'cs' ? 'Náhled verše v čtečce' : 'Verse preview in the reader'}">
              👁 ${this._uiLang === 'cs' ? 'Náhled' : 'Preview'}
            </button>
            <button class="btn btn-outline ${this._showLLMPanel ? 'active' : ''}" id="btn-toggle-llm-panel" title="${t('llmToggleBtn', lang)}" style="border-color: var(--accent-gold);">
              🤖 ${t('llmToggleBtn', lang)}
            </button>
            <button class="btn btn-outline" id="btn-editor-export-verse-json" title="${t('btnExportVerseJson', lang)}" style="display: none;">📤 Export JSON</button>
            <input type="file" id="input-editor-import-verse-json" accept=".json" style="display: none;">
          </div>
        </header>

        <!-- Optional LLM Assistant Panel -->
        ${this._showLLMPanel ? this.renderLLMPanel() : ''}

        <!-- Main Tab Navigation -->
        <div class="editor-tabs-bar">
          <button class="editor-tab-btn ${this._activeTab === 'edit' ? 'active' : ''}" data-editor-tab="edit">
            ${t('editorTabEdit', lang)}
          </button>
          <button class="editor-tab-btn ${this._activeTab === 'corpus' ? 'active' : ''}" data-editor-tab="corpus">
            ${t('editorTabCorpus', lang)}
          </button>
          <button class="editor-tab-btn ${this._activeTab === 'index' ? 'active' : ''}" data-editor-tab="index">
            ${t('editorTabIndex', lang)}
          </button>
        </div>

        <!-- Tab Body -->
        <div class="editor-body">
          ${this._activeTab === 'edit' ? this.renderEditTab() : ''}
          ${this._activeTab === 'corpus' ? this.renderCorpusTab() : ''}
          ${this._activeTab === 'index' ? this.renderIndexTab() : ''}
        </div>
        ${this.renderPreviewOverlay()}
      </div>
    `;

    this.attachEventListeners();
    this.updateLivePreview();
  }

  private renderLLMPanel(): string {
    const lang = this._uiLang;
    const cfg = this._llmConfig;

    return `
      <div class="cat-llm-panel">
        <div class="cat-llm-header">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--accent-gold); display: flex; align-items: center; gap: 0.35rem;">
              🤖 ${t('llmPanelTitle', lang)}
            </span>
            <span class="badge" style="font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--accent-gold); color: var(--text-secondary);">
              ${escapeHtml(cfg.providerPreset.toUpperCase())}: ${escapeHtml(cfg.model)}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <button class="btn btn-sm btn-outline" id="btn-close-llm-panel" title="Zavřít panel">✕</button>
          </div>
        </div>

        <!-- Task Selector Tabs -->
        <div class="cat-llm-tabs">
          <button class="cat-llm-tab-btn ${this._activeLLMTask === 'translate' ? 'active' : ''}" data-llm-task="translate">
            ${t('llmTabTranslate', lang)}
          </button>
          <button class="cat-llm-tab-btn ${this._activeLLMTask === 'align' ? 'active' : ''}" data-llm-task="align">
            ${t('llmTabAlign', lang)}
          </button>
          <button class="cat-llm-tab-btn ${this._activeLLMTask === 'grammar_check' ? 'active' : ''}" data-llm-task="grammar_check">
            ${t('llmTabGrammar', lang)}
          </button>
          <button class="cat-llm-tab-btn ${this._activeLLMTask === 'critique' ? 'active' : ''}" data-llm-task="critique">
            ${t('llmTabCritique', lang)}
          </button>
          <button class="cat-llm-tab-btn ${this._activeLLMTask === 'custom' ? 'active' : ''}" data-llm-task="custom">
            ${t('llmTabSettings', lang)}
          </button>
        </div>

        <!-- Task Content -->
        <div class="cat-llm-body">
          ${this._activeLLMTask === 'custom' ? this.renderLLMSettings() : this.renderLLMTaskView()}
        </div>
      </div>
    `;
  }

  private renderLLMSettings(): string {
    const lang = this._uiLang;
    const cfg = this._llmConfig;

    return `
      <div class="cat-llm-settings-grid">
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmPresetLabel', lang)}:</label>
          <select id="llm-preset-select" class="form-input">
            ${Object.entries(LLM_PROVIDER_PRESETS).map(([k, p]) => `
              <option value="${k}" ${cfg.providerPreset === k ? 'selected' : ''}>
                ${p.name}
              </option>
            `).join('')}
          </select>
          <small style="color: var(--text-muted); font-size: 0.74rem;">${LLM_PROVIDER_PRESETS[cfg.providerPreset]?.note || ''}</small>
        </div>

        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmEndpointLabel', lang)}:</label>
          <input type="text" id="llm-endpoint-input" class="form-input" value="${escapeHtml(cfg.endpoint)}" placeholder="https://api.openai.com/v1" />
        </div>

        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmApiKeyLabel', lang)}:</label>
          <div style="display: flex; gap: 0.3rem;">
            <input type="password" id="llm-apikey-input" class="form-input" value="${escapeHtml(cfg.apiKey)}" placeholder="sk-..." />
            <button type="button" class="btn btn-sm btn-outline" id="btn-toggle-apikey-vis" title="Zobrazit / skrýt klíč">👁️</button>
          </div>
        </div>

        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmModelLabel', lang)}:</label>
          <input type="text" id="llm-model-input" class="form-input" value="${escapeHtml(cfg.model)}" placeholder="gpt-4o-mini" />
        </div>

        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmContextVersesLabel', lang)}:</label>
          <select id="llm-context-verses-select" class="form-input">
            <option value="0" ${cfg.contextVersesCount === 0 ? 'selected' : ''}>0 (${lang === 'cs' ? 'pouze aktivní verš' : 'active verse only'})</option>
            <option value="1" ${cfg.contextVersesCount === 1 ? 'selected' : ''}>1 (${lang === 'cs' ? 'předchozí a následující verš N-1, N+1' : 'previous and next verse N-1, N+1'})</option>
            <option value="2" ${cfg.contextVersesCount === 2 ? 'selected' : ''}>2 (${lang === 'cs' ? 'dva verše před a po N-2..N+2' : 'two verses before and after N-2..N+2'})</option>
          </select>
        </div>

        <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.4rem;">
          <input type="checkbox" id="llm-include-glossary-checkbox" ${cfg.includeGlossary ? 'checked' : ''} />
          <label for="llm-include-glossary-checkbox" style="font-size: 0.82rem; font-weight: 600; cursor: pointer;">
            ${t('llmIncludeGlossaryLabel', lang)}
          </label>
        </div>

        <div class="form-group" style="grid-column: 1 / -1;">
          <label style="font-weight: 600; font-size: 0.82rem;">${t('llmCustomPromptLabel', lang)}:</label>
          <textarea id="llm-custom-prompt-input" class="form-input" rows="2" placeholder="Nepovinné: přepsat výchozí systémový prompt...">${escapeHtml(cfg.customSystemPrompt || '')}</textarea>
        </div>

        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 0.5rem;">
          <button class="btn btn-primary" id="btn-llm-save-settings">💾 ${lang === 'cs' ? 'Uložit nastavení modelu' : 'Save Model Settings'}</button>
        </div>
      </div>
    `;
  }

  private renderLLMTaskView(): string {
    const lang = this._uiLang;
    const task = this._activeLLMTask;

    const taskTitles: Record<string, string> = {
      translate: lang === 'cs' ? 'Filologický a literární překlad verše' : 'Philological & Literary Verse Translation',
      align: lang === 'cs' ? 'Automatické párování sanskrtských slov na český překlad' : 'Automatic Sanskrit Token-to-Translation Alignment',
      grammar_check: lang === 'cs' ? 'Oprava diakritiky, pádů a morfologie bez změny textu' : 'Proofread Sanskrit Grammar & Diacritics',
      critique: lang === 'cs' ? 'Odborný komentář, metrum a filozofická zpětná vazba' : 'Philological Critique & Commentary Feedback'
    };

    const promptPreviewHtml = this._showPromptPreview ? `
      <div style="margin: 0.6rem 0;">
        <label style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">${t('llmPromptPreviewLabel', lang)}:</label>
        <textarea id="llm-prompt-preview-textarea" class="form-input" style="font-family: monospace; font-size: 0.78rem; width: 100%;" rows="6">${escapeHtml(this.getCurrentPromptPreview())}</textarea>
      </div>
    ` : '';

    return `
      <div class="cat-llm-task-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.6rem;">
          <div>
            <strong style="color: var(--text-primary); font-size: 0.88rem;">${taskTitles[task] || task}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              ${lang === 'cs' ? 'Využívá kontext aktivního verše, okolních veršů i projektového glosáře.' : 'Uses context of active verse, surrounding verses and project glossary.'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <button class="btn btn-sm btn-outline" id="btn-llm-toggle-prompt-preview" title="${t('llmPromptPreviewLabel', lang)}">
              👁️ ${this._showPromptPreview ? (lang === 'cs' ? 'Skrýt prompt' : 'Hide prompt') : t('llmPromptPreviewLabel', lang)}
            </button>
            <button class="btn btn-primary" id="btn-llm-run-task" ${this._llmLoading ? 'disabled' : ''}>
              ${this._llmLoading ? `⏳ ${t('llmRunning', lang)}` : `▶ ${t('llmRunAnalysis', lang)}`}
            </button>
          </div>
        </div>

        ${promptPreviewHtml}

        ${this._llmLoading ? `
          <div class="cat-llm-loading">
            <div class="llm-spinner"></div>
            <span>${t('llmRunning', lang)} (${escapeHtml(this._llmConfig.model)})...</span>
          </div>
        ` : ''}

        ${this._llmError ? `
          <div class="cat-llm-error">
            <strong>⚠️ ${t('llmStatusError', lang)}:</strong> ${escapeHtml(this._llmError)}
          </div>
        ` : ''}

        ${this.currentLLMResult() ? this.renderLLMResultView() : ''}
      </div>
    `;
  }

  private renderLLMResultView(): string {
    const lang = this._uiLang;
    const res = this.currentLLMResult();
    if (!res || !res.data) return '';

    let contentHtml = '';

    if (this._activeLLMTask === 'translate') {
      const data = res.data;
      contentHtml = `
        <div class="cat-llm-result-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
            <strong style="color: var(--accent-gold); font-size: 0.9rem;">${lang === 'cs' ? 'Navržený plynulý překlad' : 'Suggested Fluent Translation'}</strong>
            <button class="btn btn-sm btn-primary" id="btn-llm-apply-translation">
              📥 ${t('llmApplyTranslation', lang)}
            </button>
          </div>
          <div class="cat-llm-quote-card" style="font-size: 1rem; color: var(--text-primary); margin-bottom: 0.8rem; font-style: italic; background: rgba(217, 119, 6, 0.08); padding: 0.6rem 0.8rem; border-left: 3px solid var(--accent-gold); border-radius: 4px;">
            „${escapeHtml(data.fluentTranslation || '—')}“
          </div>

          ${data.literalTranslation ? `
            <div style="margin-bottom: 0.6rem;">
              <strong style="color: var(--text-secondary); font-size: 0.8rem;">${lang === 'cs' ? 'Doslovný překlad:' : 'Literal Translation:'}</strong>
              <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem;">
                ${escapeHtml(data.literalTranslation)}
              </div>
            </div>
          ` : ''}

          ${data.alternativeTranslations && data.alternativeTranslations.length > 0 ? `
            <div style="margin-bottom: 0.6rem;">
              <strong style="color: var(--text-secondary); font-size: 0.8rem;">${lang === 'cs' ? 'Alternativní formulace / nuance:' : 'Alternative nuances:'}</strong>
              <ul style="margin: 0.3rem 0; padding-left: 1.2rem; font-size: 0.84rem; color: var(--text-secondary);">
                ${data.alternativeTranslations.map((alt: string) => `<li>${escapeHtml(alt)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${data.commentary ? `
            <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed var(--bg-card-border);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                <strong style="color: var(--accent-terracotta); font-size: 0.82rem;">💡 ${lang === 'cs' ? 'Filologický a filozofický komentář' : 'Philological Commentary'}</strong>
                <button class="btn btn-sm btn-outline" id="btn-llm-insert-commentary">
                  📥 ${t('llmInsertCommentary', lang)}
                </button>
              </div>
              <div style="font-size: 0.84rem; line-height: 1.4; color: var(--text-primary);">
                ${escapeHtml(data.commentary)}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (this._activeLLMTask === 'align') {
      const data = res.data;
      contentHtml = `
        <div class="cat-llm-result-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
            <div>
              <strong style="color: var(--accent-gold); font-size: 0.9rem;">${lang === 'cs' ? 'Navržené párování slov' : 'Suggested Word Alignments'}</strong>
              ${data.confidence ? `<span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 0.5rem;">(spolehlivost: ${Math.round(Number(data.confidence) * 100)}%)</span>` : ''}
            </div>
            <button class="btn btn-sm btn-primary" id="btn-llm-apply-alignments">
              📥 ${t('llmApplyAlignments', lang)}
            </button>
          </div>

          <table class="cat-llm-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 0.4rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--bg-card-border); text-align: left; background: var(--bg-card);">
                <th style="padding: 6px;">Sanskrtský token (IAST)</th>
                <th style="padding: 6px;">Přiřazená slova v překladu</th>
              </tr>
            </thead>
            <tbody>
              ${(data.alignments || []).map((a: any) => `
                <tr style="border-bottom: 1px solid var(--bg-card-border);">
                  <td style="padding: 6px; font-weight: 600; color: var(--accent-gold-dark);">${escapeHtml(a.tokenIast)}</td>
                  <td style="padding: 6px; color: var(--text-primary);">
                    ${(a.matchedWords || []).map((w: string) => `<span class="cat-glossary-match-pill" style="margin-right: 4px;">${escapeHtml(w)}</span>`).join('') || '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this._activeLLMTask === 'grammar_check') {
      const data = res.data;
      const corrs = data.tokenCorrections || [];
      contentHtml = `
        <div class="cat-llm-result-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
            <div>
              <strong style="color: var(--accent-gold); font-size: 0.9rem;">${lang === 'cs' ? 'Nalezené gramatické a Sandhi opravy' : 'Identified Grammar & Sandhi Corrections'}</strong>
              <span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 0.5rem;">(${corrs.length} ${lang === 'cs' ? 'návrhů' : 'suggestions'})</span>
            </div>
            ${corrs.length > 0 ? `
              <button class="btn btn-sm btn-primary" id="btn-llm-apply-grammar">
                📥 ${t('llmApplyGrammar', lang)}
              </button>
            ` : ''}
          </div>

          ${corrs.length === 0 ? `
            <div style="padding: 0.8rem; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 6px; color: #10b981; font-size: 0.84rem;">
              ✅ ${lang === 'cs' ? 'Nebyly nalezeny žádné chyby. Gramatický rozbor, Sandhi i diakritika odpovídají klasickým pravidlům.' : 'No errors found. Sanskrit grammar, sandhi and orthography appear correct.'}
            </div>
          ` : `
            <table class="cat-llm-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 0.4rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--bg-card-border); text-align: left; background: var(--bg-card);">
                  <th style="padding: 6px;">Původní token</th>
                  <th style="padding: 6px;">Doporučený IAST / Lemma</th>
                  <th style="padding: 6px;">Zdůvodnění</th>
                </tr>
              </thead>
              <tbody>
                ${corrs.map((c: any) => `
                  <tr style="border-bottom: 1px solid var(--bg-card-border);">
                    <td style="padding: 6px; font-weight: 600;">${escapeHtml(c.tokenIast)}</td>
                    <td style="padding: 6px; color: var(--accent-terracotta);">${escapeHtml(c.suggestedIast || c.tokenIast)} ${c.suggestedLemma ? `(${escapeHtml(c.suggestedLemma)})` : ''}</td>
                    <td style="padding: 6px; font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(c.explanation || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          ${data.meterNotes || data.sandhiNotes ? `
            <div style="margin-top: 0.6rem; font-size: 0.8rem; color: var(--text-muted); border-top: 1px dashed var(--bg-card-border); padding-top: 0.4rem;">
              ${data.meterNotes ? `<div><strong>Metrum:</strong> ${escapeHtml(data.meterNotes)}</div>` : ''}
              ${data.sandhiNotes ? `<div><strong>Sandhi:</strong> ${escapeHtml(data.sandhiNotes)}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    } else if (this._activeLLMTask === 'critique') {
      const data = res.data;
      contentHtml = `
        <div class="cat-llm-result-box">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4rem;">
            <strong style="color: var(--accent-gold); font-size: 0.9rem;">${lang === 'cs' ? 'Odborná zpětná vazba a hodnocení překladu' : 'Critique & Evaluation'}</strong>
            ${typeof data.qualityScore === 'number' ? `
              <div class="llm-score-badge" style="background: linear-gradient(135deg, var(--accent-gold), #10b981); color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 0.85rem;">
                ${escapeHtml(data.qualityScore)} / 100
              </div>
            ` : ''}
          </div>

          ${data.strengths && data.strengths.length > 0 ? `
            <div style="margin-bottom: 0.5rem;">
              <strong style="color: #10b981; font-size: 0.8rem;">✓ ${lang === 'cs' ? 'Silné stránky překladu:' : 'Strengths:'}</strong>
              <ul style="margin: 0.2rem 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-primary);">
                ${data.strengths.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${data.suggestions && data.suggestions.length > 0 ? `
            <div style="margin-bottom: 0.5rem;">
              <strong style="color: #f59e0b; font-size: 0.8rem;">💡 ${lang === 'cs' ? 'Doporučení pro zpřesnění a stylizaci:' : 'Suggestions for Improvement:'}</strong>
              <ul style="margin: 0.2rem 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-primary);">
                ${data.suggestions.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${data.philosophicalContext ? `
            <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed var(--bg-card-border); font-size: 0.82rem; color: var(--text-secondary);">
              <strong>Filozofický kontext:</strong> ${escapeHtml(data.philosophicalContext)}
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      ${contentHtml}
      <div style="margin-top: 0.6rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-sm btn-outline" id="btn-llm-toggle-raw-json">
          📋 ${this._showRawJsonResponse ? 'Skrýt surovou odpověď' : t('llmRawResponseLabel', lang)}
        </button>
      </div>
      ${this._showRawJsonResponse ? `
        <pre class="llm-raw-json" style="max-height: 200px; overflow-y: auto; background: var(--bg-code); border: 1px solid var(--bg-card-border); border-radius: 4px; padding: 0.5rem; font-size: 0.76rem; font-family: monospace; margin-top: 0.4rem;">${escapeHtml(res.rawResponse || JSON.stringify(res.data, null, 2))}</pre>
      ` : ''}
    `;
  }

  private getCurrentPromptPreview(): string {
    if (!this._verse) return '';
    const ctx = this.getLLMPromptContext();
    return buildUserPrompt(this._activeLLMTask, ctx, this._llmConfig);
  }

  private getLLMPromptContext(): LLMPromptContext {
    const v = this._verse!;
    let previousVerses: Verse[] = [];
    let followingVerses: Verse[] = [];

    if (this._document && this._llmConfig.contextVersesCount > 0) {
      const idx = this._document.verses.findIndex((x) => x.id === v.id);
      if (idx > 0) {
        const start = Math.max(0, idx - this._llmConfig.contextVersesCount);
        previousVerses = this._document.verses.slice(start, idx);
      }
      if (idx !== -1 && idx < this._document.verses.length - 1) {
        const end = Math.min(this._document.verses.length, idx + 1 + this._llmConfig.contextVersesCount);
        followingVerses = this._document.verses.slice(idx + 1, end);
      }
    }

    // The active translation (as typed, possibly unsaved) when it is in the target language
    const active = v.translations?.find((t) => t.id === this._activeTranslationId);
    const currentTransEl = this.querySelector('#edit-trans-text') as HTMLTextAreaElement | null;
    const activeText = active && active.lang === this._llmConfig.targetLanguage
      ? (currentTransEl?.value ?? active.text)
      : '';
    const currentTrans = activeText ||
      v.translations?.find((t) => t.lang === this._llmConfig.targetLanguage)?.text ||
      v.translations?.[0]?.text ||
      '';

    return {
      verse: v,
      targetTranslationText: currentTrans,
      targetLang: this._llmConfig.targetLanguage,
      previousVerses,
      followingVerses,
      glossary: this._llmConfig.includeGlossary ? this._glossary : undefined,
      bookTitle: v.book || this._document?.document.title,
      chapterTitle: v.chapter,
      customInstruction: this._llmCustomInstruction
    };
  }

  private async runLLMTask() {
    if (!this._verse) {
      this.notify(this._uiLang === 'cs' ? 'Nejprve vyberte verš k analýze.' : 'Select a verse first.', 'error');
      return;
    }

    this.syncInputsToVerse();
    const verseId = this._verse.id;
    this._llmAbort?.abort();
    const abort = new AbortController();
    this._llmAbort = abort;
    this._llmLoading = true;
    this._llmError = null;
    this._llmLastResult = null;
    this.render();

    try {
      const ctx = this.getLLMPromptContext();
      const res = await executeLLMTask(this._activeLLMTask, ctx, this._llmConfig, undefined, { signal: abort.signal });
      if (abort.signal.aborted || this._verse?.id !== verseId) return; // user moved on
      this._llmLastResult = res;
      this._llmResultVerseId = verseId;
      if (!res.success) {
        this._llmError = res.error || 'Neznámá chyba LLM.';
      }
    } catch (err: any) {
      this._llmError = err.message;
    } finally {
      if (this._llmAbort === abort) {
        this._llmAbort = null;
        this._llmLoading = false;
        this.render();
      }
    }
  }

  /** The last LLM result if it belongs to the active verse and task, otherwise null. */
  private currentLLMResult(): LLMExecutionResult | null {
    const res = this._llmLastResult;
    if (!res || !res.success || !this._verse) return null;
    if (this._llmResultVerseId !== this._verse.id || res.taskType !== this._activeLLMTask) return null;
    return res;
  }

  /** Non-blocking status message (replaces success alerts); also emitted as 'editor-notify'. */
  private notify(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.dispatchEvent(new CustomEvent('editor-notify', { detail: { message, type }, bubbles: true }));
    // Lives outside the component because render() replaces the component's whole content
    let toast = this._toastEl;
    if (!toast || !toast.isConnected) {
      toast = document.createElement('div');
      toast.className = 'editor-toast';
      toast.style.cssText = 'position: fixed; right: 1rem; bottom: 1rem; z-index: 10000; max-width: 420px; padding: 0.65rem 1rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); font-size: 0.88rem; color: #fff;';
      document.body.appendChild(toast);
      this._toastEl = toast;
    }
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.style.background = type === 'error' ? '#b91c1c' : (type === 'info' ? '#334155' : '#047857');
    toast.textContent = message;
    if (this._toastTimer) clearTimeout(this._toastTimer);
    const shown = toast;
    this._toastTimer = setTimeout(() => shown.remove(), type === 'error' ? 6000 : 3000);
  }

  private renderVerseSelector(): string {
    if (!this._document || this._document.verses.length === 0) {
      return '';
    }
    return `
      <label style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
        ${t('selectVerse', this._uiLang)}:
        <select id="editor-verse-select" class="layer-subselect" style="min-width: 140px;">
          ${this._document.verses
            .map((v) => {
              const status = this._verseStatuses[v.id] || 'draft';
              const dot = status === 'verified' ? '🟢' : status === 'translated' ? '🔵' : status === 'in_review' ? '🟡' : '⚪';
              return `
              <option value="${escapeHtml(v.id)}" ${this._verse?.id === v.id ? 'selected' : ''}>
                ${dot} ${v.book ? `[${escapeHtml(v.book)}] ` : ''}Verš ${escapeHtml(v.number)}
              </option>`;
            })
            .join('')}
        </select>
      </label>
    `;
  }

  private renderStatusPicker(): string {
    if (!this._verse) return '';
    const status = this._verseStatuses[this._verse.id] || (this._verse.translationStatus as VerseTranslationStatus) || 'draft';
    const lang = this._uiLang;

    return `
      <div class="cat-status-selector-wrap">
        <select id="edit-verse-status-select" class="cat-status-select status-${status}">
          <option value="untranslated" ${status === 'untranslated' ? 'selected' : ''}>⚪ ${t('statusUntranslated', lang)}</option>
          <option value="draft" ${status === 'draft' ? 'selected' : ''}>📝 ${t('statusDraft', lang)}</option>
          <option value="in_review" ${status === 'in_review' ? 'selected' : ''}>🟡 ${t('statusInReview', lang)}</option>
          <option value="translated" ${status === 'translated' ? 'selected' : ''}>🔵 ${t('statusTranslated', lang)}</option>
          <option value="verified" ${status === 'verified' ? 'selected' : ''}>🟢 ${t('statusVerified', lang)}</option>
        </select>
      </div>
    `;
  }

  private renderProgressBar(): string {
    if (!this._document || this._document.verses.length === 0) return '';
    const total = this._document.verses.length;
    let completed = 0;
    for (const v of this._document.verses) {
      const s = this._verseStatuses[v.id] || v.translationStatus;
      if (s === 'translated' || s === 'verified') completed++;
    }
    const percent = Math.round((completed / total) * 100);

    return `
      <div class="cat-progress-widget" title="${t('progressLabel', this._uiLang)}: ${completed}/${total} (${percent}%)">
        <div class="cat-progress-bar-outer">
          <div class="cat-progress-bar-inner" style="width: ${percent}%;"></div>
        </div>
        <span class="cat-progress-text">${completed}/${total} (${percent}%)</span>
      </div>
    `;
  }

  private renderEditTab(): string {
    if (!this._verse) {
      return `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
          Žádný verš není vybrán k editaci.
        </div>
      `;
    }

    const v = this._verse;
    const lang = this._uiLang;
    const cs = lang === 'cs';
    const devaText = typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari.text;
    const iastText = typeof v.scripts.iast === 'string' ? v.scripts.iast : v.scripts.iast.text;
    const context = this.getSurroundingVerses();
    const activeTrans = this.getActiveTranslation();

    const ribbon = (cv: Verse, kind: 'prev' | 'next') => `
      <div class="cat-context-ribbon ${kind}-context">
        <span class="cat-context-badge">${kind === 'prev' ? '▲' : '▼'} ${t(kind === 'prev' ? 'contextPrev' : 'contextNext', lang)} (${escapeHtml(cv.number)})</span>
        <span class="deva-font cat-context-deva">${escapeHtml(this.getVerseDevaText(cv))}</span>
        <span class="cat-context-trans">„${escapeHtml(cv.translations[0]?.text || '—')}“</span>
      </div>`;

    return `
      <div class="cat-workspace">
        <!-- COLUMN 1: SOURCE TEXT -->
        <section class="cat-col cat-col-source" aria-label="${cs ? 'Zdrojový text' : 'Source text'}">
          ${context.prev ? ribbon(context.prev, 'prev') : ''}

          <div class="editor-card">
            <h4 class="editor-card-title">${cs ? '1. Verš a metrum' : '1. Verse & meter'}</h4>
            <div class="cat-meta-grid">
              <label>${cs ? 'Číslo' : 'Number'}
                <input type="text" id="edit-verse-number" value="${escapeHtml(v.number || '')}" class="form-input">
              </label>
              <label>${cs ? 'Kniha' : 'Book'}
                <input type="text" id="edit-verse-book" value="${escapeHtml(v.book || '')}" placeholder="např. Bhagavadgītā" class="form-input">
              </label>
              <label>${cs ? 'Kapitola' : 'Chapter'}
                <input type="text" id="edit-verse-chapter" value="${escapeHtml(v.chapter || '')}" placeholder="např. 2. Sāṅkhyayoga" class="form-input">
              </label>
              <label>${cs ? 'Metrum (Chandas)' : 'Meter (Chandas)'}
                <span class="cat-inline">
                  <input type="text" id="edit-verse-meter" value="${escapeHtml(v.meter || '')}" placeholder="Anuṣṭubh (Śloka)" class="form-input">
                  <button id="btn-auto-detect-meter" class="btn btn-sm btn-outline" title="${cs ? 'Rozpoznat metrum' : 'Detect meter'}">⚡</button>
                </span>
              </label>
            </div>
          </div>

          <div class="editor-card">
            <div class="cat-card-head">
              <h4 class="editor-card-title">${cs ? '2. Dévanágarí a transliterace' : '2. Devanagari & transliteration'}</h4>
              <div class="cat-inline">
                <button class="btn btn-sm ${this._imeController?.isEnabled() ? 'btn-primary' : 'btn-outline'}" id="btn-toggle-ime">
                  ${this._imeController?.isEnabled() ? t('imeToggleOn', lang) : t('imeToggleOff', lang)}
                </button>
                <button class="btn btn-sm btn-outline" id="btn-toggle-paninian-kb">
                  ${t('btnPaninianKb', lang)} ${this._showPaninianKeyboard ? '▲' : '▼'}
                </button>
              </div>
            </div>
            ${this._showPaninianKeyboard ? this.renderPaninianKeyboard() : ''}
            <textarea id="edit-verse-devanagari" class="editor-textarea deva-font" rows="3" aria-label="Dévanágarí">${escapeHtml(devaText)}</textarea>
            <div class="cat-card-head" style="margin-top: 0.6rem;">
              <span class="cat-field-label">IAST</span>
              <button class="btn btn-sm btn-outline" id="btn-auto-transliterate-iast">🔄 ${cs ? 'Z dévanágarí' : 'From Devanagari'}</button>
            </div>
            <textarea id="edit-verse-iast" class="editor-textarea" rows="2" aria-label="IAST">${escapeHtml(iastText)}</textarea>
            <div class="iast-toolbar" title="${t('iastBarHelp', lang)}">
              ${IAST_CHARS.map((char) => `<button class="iast-key-btn" data-iast-insert="${char}">${char}</button>`).join('')}
            </div>
          </div>

          ${context.next ? ribbon(context.next, 'next') : ''}
        </section>

        <!-- COLUMN 2: TRANSLATION + WORD ALIGNMENT -->
        <section class="cat-col cat-col-board" aria-label="${cs ? 'Překlad a vazby' : 'Translation & alignment'}">
          <div class="editor-card cat-translation-card">
            <div class="cat-card-head">
              <h4 class="editor-card-title">${cs ? '3. Překlad' : '3. Translation'}</h4>
              <div class="cat-inline">
                <select id="edit-trans-select" class="layer-subselect" aria-label="${cs ? 'Překlad' : 'Translation'}">
                  ${v.translations.map((tr) => `
                    <option value="${escapeHtml(tr.id)}" ${tr.id === activeTrans.id ? 'selected' : ''}>[${escapeHtml(tr.lang)}] ${escapeHtml(tr.label)}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-outline" id="btn-add-translation">➕ ${cs ? 'Přidat překlad' : 'Add translation'}</button>
              </div>
            </div>
            <textarea id="edit-trans-text" class="editor-textarea cat-translation-text" rows="4" lang="${escapeHtml(activeTrans.lang)}" placeholder="${cs ? 'Zadejte překlad verše' : 'Type the translation'}">${escapeHtml(activeTrans.text || '')}</textarea>
            <div class="cat-card-head" style="margin-top: 0.6rem;">
              <span class="cat-hint-text">💡 ${cs ? 'Ctrl + Enter uloží verš a přejde na další' : 'Ctrl + Enter saves and moves to the next verse'}</span>
              <span class="cat-inline">
                <button class="btn btn-sm btn-outline" id="btn-bottom-prev">◀ ${t('btnPrevVerse', lang)}</button>
                <button class="btn btn-sm btn-primary" id="btn-bottom-save-next">💾 ${t('btnSaveAndNext', lang)}</button>
              </span>
            </div>
          </div>

          <div class="editor-card" id="align-board-mount">
            ${this.renderAlignmentBoard()}
          </div>
        </section>

        <!-- COLUMN 3: HINTS FOR THE SELECTED WORD -->
        <aside class="cat-col cat-col-hints" id="hints-mount" aria-label="${cs ? 'Nápověda ke slovu' : 'Word hints'}">
          ${this.renderTokenHints()}
        </aside>
      </div>

      <div class="cat-commentaries-row">
        ${this.renderCommentariesCard(v)}
      </div>
    `;
  }

  /** The translation being edited (falls back to the first one, or a new Czech one). */
  private getActiveTranslation(): { id: string; label: string; lang: string; type: string; text: string } {
    const v = this._verse!;
    const activeTrans = v.translations.find((tr) => tr.id === this._activeTranslationId) ||
      v.translations[0] ||
      { id: 'cs_fluent', label: 'Plynulý český překlad', lang: 'cs', type: 'fluent', text: '' };
    // Keep the active id in sync with what is displayed, otherwise word bindings and
    // edits would be stored under a translation id the verse does not have.
    this._activeTranslationId = activeTrans.id;
    return activeTrans;
  }

  private tokenColor(index: number): string {
    return `hsl(${(index * 47 + 25) % 360} 62% 40%)`;
  }

  /**
   * Word links of the active translation: which word chips belong to which token,
   * plus phrases that no longer occur in the translation text.
   */
  private computeAlignmentState(text: string) {
    const v = this._verse!;
    const words = splitTranslationWords(text);
    const tokensByWord = new Map<number, string[]>();
    const phrasesByToken = new Map<string, Array<{ phrase: string; found: boolean }>>();

    v.tokens.forEach((tk) => {
      const phrases = tk.alignment?.matched_words?.[this._activeTranslationId] || [];
      const list: Array<{ phrase: string; found: boolean }> = [];
      for (const phrase of phrases) {
        const range = findAlignedRanges(text, [{ phrase, tokenId: tk.id }])[0];
        list.push({ phrase, found: Boolean(range) });
        if (!range) continue;
        for (const w of words) {
          if (w.start < range.end && w.end > range.start) {
            tokensByWord.set(w.index, [...(tokensByWord.get(w.index) || []), tk.id]);
          }
        }
      }
      if (list.length) phrasesByToken.set(tk.id, list);
    });
    return { words, tokensByWord, phrasesByToken };
  }

  private renderAlignmentBoard(): string {
    if (!this._verse) return '';
    const v = this._verse;
    const lang = this._uiLang;
    const cs = lang === 'cs';
    const trans = this.getActiveTranslation();
    const { words, tokensByWord, phrasesByToken } = this.computeAlignmentState(trans.text || '');
    const colorOf = new Map(v.tokens.map((tk, i) => [tk.id, this.tokenColor(i)]));

    const tokenTip = (tk: Token, layer: 'deva' | 'iast') => {
      const g = formatGrammarAnalysis(tk.grammar, lang);
      const meaning = tk.vocabulary?.meanings_by_lang?.[trans.lang]?.contextual || tk.vocabulary?.meanings_by_lang?.cs?.contextual || '';
      return [
        layer === 'deva' ? `IAST: ${tk.text.iast}` : `Dévanágarí: ${tk.text.devanagari}`,
        tk.lemma ? `lemma: ${tk.lemma}` : '',
        g.fullLabel && g.fullLabel !== '—' ? g.fullLabel : '',
        meaning ? `${cs ? 'význam' : 'meaning'}: ${meaning}` : '',
        tk.compound?.is_compound_member ? `${cs ? 'člen složeniny' : 'compound member'}: ${tk.compound.analysis}` : ''
      ].filter(Boolean).join('\n');
    };

    const srcChip = (tk: Token, layer: 'deva' | 'iast') => {
      const linked = phrasesByToken.get(tk.id)?.length || 0;
      const g = formatGrammarAnalysis(tk.grammar, lang);
      return `
        <button class="align-chip align-src ${tk.id === this._selectedTokenId ? 'is-selected' : ''} ${linked ? 'is-linked' : ''} ${tk.compound?.is_compound_member ? 'is-member' : ''}"
          data-token-select="${escapeHtml(tk.id)}" data-layer="${layer}" data-tip="${escapeHtml(tokenTip(tk, layer))}"
          style="--tok-color: ${colorOf.get(tk.id)}; ${this._showGrammarHighlights ? `--gram-color: ${g.categoryColor};` : ''}">
          <span class="${layer === 'deva' ? 'deva-font' : 'iast-font'}">${escapeHtml(layer === 'deva' ? tk.text.devanagari : tk.text.iast)}</span>
          ${linked ? `<span class="align-chip-count">${linked}</span>` : ''}
        </button>`;
    };

    const wordChip = (w: TranslationWord) => {
      const ids = tokensByWord.get(w.index) || [];
      const mine = this._selectedTokenId ? ids.includes(this._selectedTokenId) : false;
      const linkedNames = ids.map((id) => v.tokens.find((tk) => tk.id === id)).filter(Boolean)
        .map((tk) => `${tk!.text.devanagari} · ${tk!.text.iast}`).join('\n');
      return `
        <button class="align-chip align-word ${ids.length ? 'is-linked' : ''} ${mine ? 'is-mine' : ''}"
          data-word-index="${w.index}" data-linked-tokens="${escapeHtml(ids.join(' '))}"
          ${linkedNames ? `data-tip="${escapeHtml(linkedNames)}"` : ''}
          style="${ids.length ? `--tok-color: ${colorOf.get(ids[0])};` : ''}">${escapeHtml(w.word)}</button>`;
    };

    const linkRows = v.tokens
      .filter((tk) => phrasesByToken.has(tk.id))
      .map((tk) => `
        <div class="align-link-row ${tk.id === this._selectedTokenId ? 'is-selected' : ''}" style="--tok-color: ${colorOf.get(tk.id)};">
          <button class="align-link-src" data-token-select="${escapeHtml(tk.id)}">
            <span class="deva-font">${escapeHtml(tk.text.devanagari)}</span> <em>${escapeHtml(tk.text.iast)}</em>
          </button>
          <span class="align-link-arrow">→</span>
          ${phrasesByToken.get(tk.id)!.map((p) => `
            <span class="align-link-phrase ${p.found ? '' : 'is-missing'}" title="${p.found ? '' : (cs ? 'Ve znění překladu se nevyskytuje' : 'Not found in the translation text')}">
              ${p.found ? '' : '⚠ '}${escapeHtml(p.phrase)}
              <button class="align-unlink" data-unlink-token="${escapeHtml(tk.id)}" data-unlink-phrase="${escapeHtml(p.phrase)}" aria-label="${cs ? 'Zrušit vazbu' : 'Remove link'}" title="${cs ? 'Zrušit vazbu' : 'Remove link'}">×</button>
            </span>`).join('')}
        </div>`).join('');

    return `
      <div class="cat-card-head">
        <h4 class="editor-card-title">${cs ? '4. Slova a vazby na překlad' : '4. Words & translation links'}</h4>
        <div class="cat-inline">
          <label class="cat-check"><input type="checkbox" id="toggle-grammar-highlights" ${this._showGrammarHighlights ? 'checked' : ''}> 🎨 ${t('grammarHighlightsToggle', lang)}</label>
          <button class="btn btn-sm btn-outline" id="btn-split-and-lemmatize" title="${cs ? 'Rozdělit IAST na slova a analyzovat' : 'Split the IAST text into words and analyze'}">✂️ ${cs ? 'Rozdělit verš na slova' : 'Tokenize verse'}</button>
          <button class="btn btn-sm btn-outline" id="btn-auto-align">${t('alignAuto', lang)}</button>
          <button class="btn btn-sm btn-danger" id="btn-clear-token-align" ${this._selectedTokenId ? '' : 'disabled'}>${t('alignClear', lang)}</button>
        </div>
      </div>
      <p class="cat-hint-text">
        ${cs
          ? 'Vyberte sanskrtské slovo (v řádku dévanágarí nebo IAST) a klikněte na slova překladu. Opětovné kliknutí vazbu zruší, Shift + klik přiřadí celý úsek od posledního slova. Najetí myší ukáže propojená slova ve všech vrstvách.'
          : 'Pick a Sanskrit word (Devanagari or IAST row), then click translation words. Clicking again removes the link, Shift + click links the whole span since the last word. Hover shows linked words in all layers.'}
      </p>
      ${v.tokens.length === 0 ? `
        <div class="cat-empty">${cs ? 'Verš zatím nemá slova – použijte „Rozdělit verš na slova“.' : 'The verse has no words yet – use “Tokenize verse”.'}</div>
      ` : `
        <div class="align-board">
          <div class="align-row"><div class="align-row-label">Dévanágarí</div><div class="align-row-items">${v.tokens.map((tk) => srcChip(tk, 'deva')).join('')}</div></div>
          <div class="align-row"><div class="align-row-label">IAST</div><div class="align-row-items">${v.tokens.map((tk) => srcChip(tk, 'iast')).join('')}</div></div>
          <div class="align-row align-row-target"><div class="align-row-label">${cs ? 'Překlad' : 'Translation'} [${escapeHtml(trans.lang)}]</div>
            <div class="align-row-items">${words.length ? words.map(wordChip).join('') : `<span class="cat-hint-text">${cs ? 'Překlad je prázdný.' : 'The translation is empty.'}</span>`}</div>
          </div>
        </div>
        <div class="align-links">
          <div class="align-links-title">${cs ? 'Vazby' : 'Links'} (${phrasesByToken.size}/${v.tokens.length})</div>
          ${linkRows || `<span class="cat-hint-text">${cs ? 'Zatím žádné vazby.' : 'No links yet.'}</span>`}
        </div>
      `}
    `;
  }

  private renderTokenHints(): string {
    const v = this._verse;
    const lang = this._uiLang;
    const cs = lang === 'cs';
    const tk = v?.tokens.find((t) => t.id === this._selectedTokenId);
    if (!v || !tk) {
      return `<div class="editor-card hint-card"><p class="cat-hint-text">${cs ? 'Vyberte slovo ve sloupci „Slova a vazby“ – zde se zobrazí rozbor, slovník, rozdělení složeniny a návrhy překladu.' : 'Select a word in “Words & links” to see its analysis, dictionary, compound split and translation suggestions.'}</p></div>`;
    }

    const trans = this.getActiveTranslation();
    const g = formatGrammarAnalysis(tk.grammar, lang);
    const lemma = sanitizeSearchLemma(tk.lemma || tk.text.iast);
    const meaning = tk.vocabulary?.meanings_by_lang?.[trans.lang]?.contextual ||
      (trans.lang === 'cs' ? tk.vocabulary?.contextual_meaning_cs : trans.lang === 'en' ? tk.vocabulary?.contextual_meaning_en : '') || '';
    const suggestions = this.getGlossarySuggestions();
    const split = this._splitState?.tokenId === tk.id ? this._splitState : null;
    const mw = this._mwState?.key === lemma ? this._mwState : null;
    const morph = this._morphState?.tokenId === tk.id ? this._morphState : null;
    const links: Array<[string, string]> = [
      ['📖 Monier-Williams', getDictionaryUrl(lemma, 'cologne_mw')],
      ['📖 Apte', getDictionaryUrl(lemma, 'cologne_apte')],
      ['🌐 WisdomLib', getDictionaryUrl(lemma, 'wisdomlib')],
      ['⚡ Ambuda', getDictionaryUrl(lemma, 'ambuda')]
    ];

    return `
      <div class="editor-card hint-card hint-token">
        <div class="hint-token-head">
          <span class="deva-font hint-token-deva">${escapeHtml(tk.text.devanagari)}</span>
          <span class="hint-token-iast">${escapeHtml(tk.text.iast)}</span>
          <span class="cat-grammar-badge" style="background: ${g.categoryColor}20; color: ${g.categoryColor};">${escapeHtml(g.fullLabel)}</span>
        </div>
        ${tk.compound?.is_compound_member ? `<div class="cat-hint-text">🔗 ${cs ? 'člen složeniny' : 'compound member of'} <em>${escapeHtml(tk.compound.analysis || '')}</em></div>` : ''}
        ${g.details.length ? `<div class="cat-grammar-detail-tags">${g.details.map((d) => `<div class="cat-grammar-tag"><span class="tag-title">${escapeHtml(d.title)}:</span> <span class="tag-value">${escapeHtml(d.value)}</span></div>`).join('')}</div>` : ''}
        <div class="hint-fields">
          <label>${cs ? 'Lemma (slovníkový tvar)' : 'Lemma (dictionary form)'}<input type="text" id="edit-token-lemma" value="${escapeHtml(tk.lemma || '')}" class="form-input"></label>
          <label>${cs ? 'Gramatika (poznámka)' : 'Grammar (note)'}<input type="text" id="edit-token-grammar" value="${escapeHtml(tk.grammar?.label_cs || '')}" class="form-input"></label>
          <label>${cs ? 'Význam v kontextu' : 'Contextual meaning'} [${escapeHtml(trans.lang)}]<input type="text" id="edit-token-meaning" value="${escapeHtml(meaning)}" class="form-input"></label>
        </div>
      </div>

      <div class="editor-card hint-card glossary-suggestions-box">
        <div class="cat-card-head">
          <div class="glossary-title">${t('glossaryTitle', lang)}</div>
          <button class="btn btn-sm btn-outline" id="btn-quick-add-glossary-term">${t('glossaryAddTerm', lang)}</button>
        </div>
        <div class="glossary-pills">
          ${suggestions.length > 0
            ? suggestions.map((s) => `
              <button class="glossary-pill" data-glossary-apply="${escapeHtml(s.translation)}" title="${t('glossaryInOtherVerse', lang)} ${escapeHtml(s.verseNumber)} (${s.frequency}x)">
                <strong>${escapeHtml(s.targetWord)}</strong> &rarr; „${escapeHtml(s.translation)}“ <em>(${escapeHtml(s.verseNumber)})</em>
              </button>`).join('')
            : `<span class="cat-hint-text">${t('glossaryInsertHint', lang)}</span>`}
        </div>
      </div>

      <div class="editor-card hint-card">
        <div class="cat-card-head">
          <h5 class="hint-title">📚 ${cs ? 'Slovník' : 'Dictionary'}: <code>${escapeHtml(lemma)}</code></h5>
          <button class="btn btn-sm btn-outline" id="btn-load-mw" ${mw?.loading ? 'disabled' : ''}>${mw?.loading ? '⏳' : (cs ? 'Heslo z Monier-Williams' : 'Monier-Williams entry')}</button>
        </div>
        ${mw?.result ? (mw.result.found ? `
          <ol class="mw-senses">
            ${mw.result.senses.slice(0, 4).map((s) => `<li>${escapeHtml(s.text.length > 320 ? `${s.text.slice(0, 319)}…` : s.text)}</li>`).join('')}
          </ol>` : `<p class="cat-hint-text">${mw.result.error ? (cs ? 'Slovník není dostupný (offline?).' : 'Dictionary unavailable (offline?).') : (cs ? `„${escapeHtml(lemma)}“ v MW nenalezeno – zkuste upravit lemma nebo rozdělit složeninu.` : `“${escapeHtml(lemma)}” not in MW – adjust the lemma or split the compound.`)}</p>`) : ''}
        <div class="dict-btn-grid">
          ${links.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">${label}</a>`).join('')}
        </div>
      </div>

      <div class="editor-card hint-card">
        <div class="cat-card-head">
          <h5 class="hint-title">✂️ ${cs ? 'Složenina / sandhi' : 'Compound / sandhi'}</h5>
          <span class="cat-inline">
            ${tk.compound?.is_compound_member ? `<button class="btn btn-sm btn-outline" id="btn-merge-compound">${cs ? 'Spojit zpět' : 'Merge back'}</button>` : ''}
            <button class="btn btn-sm btn-outline" id="btn-propose-split" ${split?.loading ? 'disabled' : ''}>${split?.loading ? '⏳' : (cs ? 'Navrhnout rozdělení' : 'Suggest split')}</button>
          </span>
        </div>
        ${split && !split.loading && split.whole?.length ? `<p class="cat-hint-text">📖 ${cs ? 'Slovník zná i celé slovo' : 'The dictionary also knows the whole word'}: ${split.whole.map((w) => `<strong>${escapeHtml(w.lemma)}</strong> <small>${escapeHtml(w.label)}</small>`).join(', ')}</p>` : ''}
        ${split && !split.loading ? (split.items.length ? `
          <ul class="split-candidates">
            ${split.items.map((c, i) => `
              <li>
                <button class="btn btn-sm btn-outline" data-apply-split="${i}">${cs ? 'Rozdělit' : 'Split'}</button>
                ${(c.badges || []).map((b) => `<span class="split-badge" title="${escapeHtml(b.title)}">${escapeHtml(b.text)}</span>`).join('')}
                ${c.parts.map((p) => `<span class="split-part ${p.found ? 'is-found' : 'is-unknown'}" title="${escapeHtml(p.note || (p.found ? '' : (cs ? 've slovníku nenalezeno' : 'not in the dictionary')))}">${p.found ? '✓' : '?'} ${escapeHtml(p.form)}${p.lemma !== p.form ? ` <small>(${escapeHtml(p.lemma)})</small>` : ''}</span>`).join(' + ')}
              </li>`).join('')}
          </ul>` : `<p class="cat-hint-text">${escapeHtml(split.error || (cs ? 'Nenalezeno žádné rozdělení potvrzené slovníkem.' : 'No dictionary-confirmed split found.'))}</p>`) : ''}
        <div class="cat-inline" style="margin-top: 0.4rem;">
          <input type="text" id="manual-split-input" class="form-input" placeholder="${cs ? 'ručně, např. dharma + kṣetre' : 'manual, e.g. dharma + kṣetre'}" aria-label="${cs ? 'Ruční rozdělení' : 'Manual split'}">
          <button class="btn btn-sm btn-outline" id="btn-apply-manual-split">${cs ? 'Rozdělit' : 'Split'}</button>
        </div>
        <p class="cat-hint-text">${split?.source === 'mw'
          ? (cs ? 'Návrhy: obrácení sandhi z Vidyut, části ověřené online v Monier-Williams (Kolín), jen na dvě části – data pro rozdělování složenin nejsou k dispozici.' : 'Suggestions: sandhi reversal by Vidyut, parts confirmed online in Monier-Williams (Cologne), two parts only – the compound data is not available.')
          : (cs ? 'Návrhy: rozdělení doložená v Digital Corpus of Sanskrit (DCS), jinak obrácení sandhi z Vidyut a členy ze slovníku Monier-Williams a DCS seřazené podle četnosti; stažený slovník Vidyut (karta Slovník) zpřesní tvary. Spojovníky (dharma-kṣetre) se dělí automaticky.' : 'Suggestions: splits attested in the Digital Corpus of Sanskrit (DCS), otherwise sandhi reversal by Vidyut with members from Monier-Williams and the DCS ranked by frequency; the downloaded Vidyut dictionary (Dictionary tab) refines the word forms. Hyphens (dharma-kṣetre) are split automatically.')}</p>
      </div>

      <div class="editor-card hint-card">
        <div class="cat-card-head">
          <h5 class="hint-title">🌳 ${cs ? 'Morfologická stavba (odvození)' : 'Morphology (derivation)'}</h5>
          <button class="btn btn-sm btn-outline" id="btn-load-morph" ${morph?.loading ? 'disabled' : ''}>${morph?.loading ? '⏳' : (cs ? 'Odvodit' : 'Derive')}</button>
        </div>
        ${morph && !morph.loading ? this.renderMorphology(morph.tree) : ''}
      </div>
    `;
  }

  /** Root / prefixes / suffixes of a verified Pāṇinian derivation, rule list on demand. */
  private renderMorphology(tree: WordDerivationTree | undefined | null): string {
    return renderMorphologyHtml(tree, this._uiLang);
  }

  private renderPreviewOverlay(): string {
    const cs = this._uiLang === 'cs';
    return `
      <div class="editor-preview-overlay ${this._previewOpen ? 'is-open' : ''}" id="editor-preview-overlay" ${this._previewOpen ? '' : 'hidden'}>
        <div class="editor-preview-backdrop" data-close-preview></div>
        <div class="editor-preview-panel" role="dialog" aria-modal="true" aria-label="${cs ? 'Náhled verše' : 'Verse preview'}">
          <div class="preview-header">
            <strong>👁 ${t('livePreviewTitle', this._uiLang)}</strong>
            <button class="btn btn-sm btn-outline" id="btn-close-preview" aria-label="${cs ? 'Zavřít náhled' : 'Close preview'}">✕</button>
          </div>
          <div id="editor-preview-mount"></div>
        </div>
      </div>
    `;
  }

  /** Re-renders only the alignment board (keeps focus in the translation textarea). */
  private refreshBoard() {
    const mount = this.querySelector('#align-board-mount');
    if (!mount) return;
    mount.innerHTML = this.renderAlignmentBoard();
    this.bindBoardEvents();
  }

  /** Re-renders only the hints column. */
  private refreshHints() {
    const mount = this.querySelector('#hints-mount');
    if (!mount) return;
    mount.innerHTML = this.renderTokenHints();
    this.bindHintEvents();
  }

  private selectToken(tokenId: string) {
    this._selectedTokenId = tokenId;
    this._lastWordIndex = null;
    this.refreshBoard();
    this.refreshHints();
  }

  private bindBoardEvents() {
    const board = this.querySelector('#align-board-mount');
    if (!board || !this._verse) return;

    board.querySelectorAll('[data-token-select]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-token-select');
        if (id) this.selectToken(id);
      });
    });

    // Hover / focus highlights the same token in every layer and its linked words
    const highlight = (ids: string[], on: boolean) => {
      for (const id of ids) {
        board.querySelectorAll(`[data-token-select="${cssEscape(id)}"]`).forEach((el) => el.classList.toggle('is-hl', on));
        board.querySelectorAll('[data-linked-tokens]').forEach((el) => {
          if ((el.getAttribute('data-linked-tokens') || '').split(' ').includes(id)) el.classList.toggle('is-hl', on);
        });
      }
    };
    board.querySelectorAll('.align-chip').forEach((el) => {
      const ids = () => {
        const src = el.getAttribute('data-token-select');
        return src ? [src] : (el.getAttribute('data-linked-tokens') || '').split(' ').filter(Boolean);
      };
      el.addEventListener('mouseenter', () => highlight(ids(), true));
      el.addEventListener('mouseleave', () => highlight(ids(), false));
      el.addEventListener('focus', () => highlight(ids(), true));
      el.addEventListener('blur', () => highlight(ids(), false));
    });

    board.querySelectorAll('[data-word-index]').forEach((el) => {
      el.addEventListener('click', (e) => this.onWordChipClick(Number(el.getAttribute('data-word-index')), (e as MouseEvent).shiftKey));
    });

    board.querySelectorAll('[data-unlink-token]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tk = this._verse?.tokens.find((t) => t.id === el.getAttribute('data-unlink-token'));
        const phrase = el.getAttribute('data-unlink-phrase') || '';
        if (!tk) return;
        const list = tk.alignment?.matched_words?.[this._activeTranslationId] || [];
        tk.alignment.matched_words[this._activeTranslationId] = list.filter((p) => p !== phrase);
        this.refreshBoard();
        this.updateLivePreview();
      });
    });

    (board.querySelector('#toggle-grammar-highlights') as HTMLInputElement | null)?.addEventListener('change', (e) => {
      this._showGrammarHighlights = (e.target as HTMLInputElement).checked;
      this.refreshBoard();
    });
    board.querySelector('#btn-split-and-lemmatize')?.addEventListener('click', () => this.autoSplitAndLemmatize());
    board.querySelector('#btn-auto-align')?.addEventListener('click', () => {
      if (!this._verse) return;
      this.syncInputsToVerse();
      const trans = this._verse.translations.find((tr) => tr.id === this._activeTranslationId);
      if (trans && trans.text) {
        autoSuggestBindings(this._verse.tokens, this._activeTranslationId, trans.text, trans.lang);
        this.refreshBoard();
      }
    });
    board.querySelector('#btn-clear-token-align')?.addEventListener('click', () => {
      const tk = this._verse?.tokens.find((t) => t.id === this._selectedTokenId);
      if (tk?.alignment?.matched_words) {
        tk.alignment.matched_words[this._activeTranslationId] = [];
        this.refreshBoard();
        this.updateLivePreview();
      }
    });
  }

  /**
   * Click on a translation word: link it to the selected token, or remove the link if the
   * word is already linked to it (a multi-word phrase is removed as a whole).
   * Shift + click links the whole span since the previously clicked word as one phrase.
   */
  private onWordChipClick(index: number, extend: boolean) {
    const v = this._verse;
    const cs = this._uiLang === 'cs';
    if (!v) return;
    const tk = v.tokens.find((t) => t.id === this._selectedTokenId);
    if (!tk) {
      this.notify(cs ? 'Nejprve vyberte sanskrtské slovo (dévanágarí nebo IAST).' : 'Select a Sanskrit word first (Devanagari or IAST).', 'info');
      return;
    }
    this.syncInputsToVerse();
    const trans = this.getActiveTranslation();
    const { words, tokensByWord } = this.computeAlignmentState(trans.text || '');
    const word = words.find((w) => w.index === index);
    if (!word) return;
    if (!tk.alignment) tk.alignment = { matched_words: {} };
    const list = tk.alignment.matched_words[trans.id] || [];

    if (extend && this._lastWordIndex !== null && this._lastWordIndex !== index) {
      const a = words.find((w) => w.index === Math.min(index, this._lastWordIndex!))!;
      const b = words.find((w) => w.index === Math.max(index, this._lastWordIndex!))!;
      const phrase = (trans.text || '').slice(a.start, b.end);
      // the span replaces the single words of it that were linked before
      const inside = words.filter((w) => w.index >= a.index && w.index <= b.index).map((w) => w.word.toLowerCase());
      tk.alignment.matched_words[trans.id] = [...list.filter((p) => !inside.includes(p.toLowerCase())), phrase];
    } else if ((tokensByWord.get(index) || []).includes(tk.id)) {
      // remove every phrase of this token that covers the word
      const covering = list.filter((p) => {
        const r = findAlignedRanges(trans.text || '', [{ phrase: p, tokenId: tk.id }])[0];
        return r && r.start < word.end && r.end > word.start;
      });
      tk.alignment.matched_words[trans.id] = list.filter((p) => !covering.includes(p));
    } else {
      tk.alignment.matched_words[trans.id] = [...list, word.word];
    }
    this._lastWordIndex = index;
    this.refreshBoard();
    this.updateLivePreview();
  }

  private bindHintEvents() {
    const hints = this.querySelector('#hints-mount');
    if (!hints || !this._verse) return;
    const tk = this._verse.tokens.find((t) => t.id === this._selectedTokenId);
    const cs = this._uiLang === 'cs';

    // Token property edits
    const lemmaInput = hints.querySelector('#edit-token-lemma') as HTMLInputElement | null;
    const grammarInput = hints.querySelector('#edit-token-grammar') as HTMLInputElement | null;
    const meaningInput = hints.querySelector('#edit-token-meaning') as HTMLInputElement | null;
    const onTokenPropChange = () => {
      if (!tk) return;
      if (lemmaInput) tk.lemma = lemmaInput.value;
      if (grammarInput) {
        if (!tk.grammar) tk.grammar = {};
        tk.grammar.label_cs = grammarInput.value;
      }
      if (meaningInput) {
        const tLang = this.getActiveTranslation().lang;
        if (!tk.vocabulary) tk.vocabulary = { meanings_by_lang: {} };
        if (!tk.vocabulary.meanings_by_lang) tk.vocabulary.meanings_by_lang = {};
        tk.vocabulary.meanings_by_lang[tLang] = {
          contextual: meaningInput.value,
          alternatives: tk.vocabulary.meanings_by_lang[tLang]?.alternatives || []
        };
        if (tLang === 'cs') tk.vocabulary.contextual_meaning_cs = meaningInput.value;
        if (tLang === 'en') tk.vocabulary.contextual_meaning_en = meaningInput.value;
      }
      this.updateLivePreview();
    };
    [lemmaInput, grammarInput, meaningInput].forEach((inp) => inp?.addEventListener('input', onTokenPropChange));
    // Board tooltips show lemma and meaning – refresh them when editing is finished
    [lemmaInput, meaningInput].forEach((inp) => inp?.addEventListener('change', () => this.refreshBoard()));

    // Glossary suggestion → insert into the translation
    hints.querySelectorAll('[data-glossary-apply]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-glossary-apply');
        const transText = this.querySelector('#edit-trans-text') as HTMLTextAreaElement | null;
        if (!text || !transText) return;
        insertAtCursor(transText, ` ${text}`);
        this.syncInputsToVerse();
        this.refreshBoard();
      });
    });

    hints.querySelector('#btn-quick-add-glossary-term')?.addEventListener('click', () => {
      if (!tk) return;
      const stem = prompt(cs ? 'Sanskrtský kmen (např. yoga, dharma):' : 'Sanskrit stem (e.g. yoga, dharma):', tk.lemma || tk.text.iast);
      if (!stem) return;
      const transCs = prompt(cs ? 'Český překlad termínu:' : 'Czech translation:', tk.vocabulary?.meanings_by_lang?.cs?.contextual || '');
      const transEn = prompt(cs ? 'Anglický překlad termínu:' : 'English translation:', tk.vocabulary?.meanings_by_lang?.en?.contextual || '');
      this._glossary[stem.toLowerCase()] = {
        stem,
        devanagari: tk.text.devanagari,
        translationCs: transCs || '',
        translationEn: transEn || ''
      };
      this.notify(cs ? `Termín „${stem}“ byl uložen do projektového glosáře.` : `Term “${stem}” saved to the project glossary.`);
      this.refreshHints();
    });

    // Monier-Williams entry on demand
    hints.querySelector('#btn-load-mw')?.addEventListener('click', async () => {
      if (!tk) return;
      const key = sanitizeSearchLemma(tk.lemma || tk.text.iast);
      this._mwState = { key, loading: true, result: null };
      this.refreshHints();
      const result = await lookupMonierWilliams(key);
      if (this._mwState?.key !== key) return;
      this._mwState = { key, loading: false, result };
      this.refreshHints();
    });

    // Compound split suggestions (Vidyut sandhi + Monier-Williams validation)
    hints.querySelector('#btn-propose-split')?.addEventListener('click', async () => {
      if (!tk) return;
      const tokenId = tk.id;
      this._splitState = { tokenId, loading: true, items: [] };
      this.refreshHints();
      try {
        if (!isVidyutReady()) await loadVidyutWasm();
        // Offline kosha: all members at once, with grammar of the final member
        const analysis = await analyzeCompound(tk.text.iast, { max: 6 });
        if (this._splitState?.tokenId !== tokenId) return;
        if (analysis) {
          const cs = this._uiLang === 'cs';
          const items: SplitSuggestion[] = analysis.splits.map((s) => ({
            parts: s.members.map((m) => ({
              form: m.iast,
              lemma: m.lemma,
              found: m.role !== 'unknown',
              note: [m.label, m.alternatives.length ? `${cs ? 'též' : 'also'} ${m.alternatives.join(', ')}` : ''].filter(Boolean).join(' · ')
            })),
            badges: [
              ...(s.source === 'corpus' ? [{ text: `DCS ×${s.count}`, title: cs ? 'Takto rozděleno v Digital Corpus of Sanskrit' : 'Split like this in the Digital Corpus of Sanskrit' }] : []),
              ...(s.mw ? [{ text: 'MW', title: cs ? 'Hranice členů podle hesla Monier-Williams' : 'Member boundaries as in the Monier-Williams entry' }] : [])
            ]
          }));
          this._splitState = { tokenId, loading: false, items, source: 'offline', whole: analysis.whole };
        } else {
          // Without the downloaded dictionary: two-way splits checked online in Monier-Williams
          const ranked = await rankSplits(tk.text.iast, { max: 6 });
          if (this._splitState?.tokenId !== tokenId) return;
          const items: SplitSuggestion[] = ranked.map((r) => ({
            parts: r.parts.map((p) => ({ form: p.form, lemma: p.lemma, found: p.found, note: p.gloss }))
          }));
          this._splitState = { tokenId, loading: false, items, source: 'mw' };
        }
      } catch (err: any) {
        this._splitState = { tokenId, loading: false, items: [], error: err?.message || String(err) };
      }
      this.refreshHints();
    });

    hints.querySelectorAll('[data-apply-split]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cand = this._splitState?.items[Number(btn.getAttribute('data-apply-split'))];
        if (!cand || !tk) return;
        this.applyTokenSplit(tk.id, cand.parts.map((p) => ({ iast: p.form, lemma: p.lemma })));
      });
    });

    hints.querySelector('#btn-apply-manual-split')?.addEventListener('click', () => {
      const input = hints.querySelector('#manual-split-input') as HTMLInputElement | null;
      const parts = parseManualSplit(input?.value || '');
      if (!tk) return;
      if (parts.length < 2) {
        this.notify(cs ? 'Zadejte alespoň dvě části oddělené „+“.' : 'Enter at least two parts separated by “+”.', 'error');
        return;
      }
      this.applyTokenSplit(tk.id, parts);
    });

    hints.querySelector('#btn-merge-compound')?.addEventListener('click', () => {
      if (!tk || !this._verse) return;
      const before = this._verse.tokens.length;
      this._verse.tokens = mergeCompound(this._verse.tokens, tk.id);
      const merged = this._verse.tokens.find((t) => !t.compound?.is_compound_member && t.text.iast === tk.compound?.analysis);
      if (this._verse.tokens.length < before) {
        this._selectedTokenId = merged?.id ?? this._verse.tokens[0]?.id ?? null;
        this._splitState = null;
        this.refreshBoard();
        this.refreshHints();
        this.updateLivePreview();
      }
    });

    // Morphological derivation on demand
    hints.querySelector('#btn-load-morph')?.addEventListener('click', async () => {
      if (!tk) return;
      const tokenId = tk.id;
      this._morphState = { tokenId, loading: true, tree: null };
      this.refreshHints();
      let tree: WordDerivationTree | undefined;
      try {
        const analysis = await defaultSanskritAdapter.analyzeWord(tk.text.iast, { lang: this._uiLang });
        tree = analysis.derivationTree;
      } catch {
        tree = undefined;
      }
      if (this._morphState?.tokenId !== tokenId) return;
      this._morphState = { tokenId, loading: false, tree };
      this.refreshHints();
    });
  }

  private applyTokenSplit(tokenId: string, parts: SplitPartSpec[]) {
    if (!this._verse) return;
    this._verse.tokens = splitToken(this._verse.tokens, tokenId, parts);
    const first = this._verse.tokens.find((t) => t.compound?.is_compound_member && t.id.startsWith(`${tokenId}_`));
    this._selectedTokenId = first?.id ?? this._selectedTokenId;
    this._splitState = null;
    this._morphState = null;
    this.refreshBoard();
    this.refreshHints();
    this.updateLivePreview();
    this.notify(this._uiLang === 'cs' ? `Slovo rozděleno: ${parts.map((p) => p.iast).join(' + ')}` : `Word split: ${parts.map((p) => p.iast).join(' + ')}`);
  }

  private escape(str?: string): string {
    return escapeHtml(str);
  }

  private renderCommentariesCard(verse: Verse): string {
    const lang = this._uiLang;
    const commentaries = getVerseCommentaries(verse);
    const filteredCommentaries = this._commentaryFilterAuthor === 'all'
      ? commentaries
      : commentaries.filter((c) => c.author === this._commentaryFilterAuthor);

    const authors = Array.from(new Set(commentaries.map((c) => c.author)));

    return `
      <div class="editor-card" id="card-commentaries" style="margin-top: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h4 class="editor-card-title" style="margin: 0;">7. ${t('commentariesTitle', lang)}</h4>
            <span class="badge" style="background: var(--bg-card); border: 1px solid var(--accent-gold); color: var(--accent-gold); border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700;">
              ${commentaries.length}
            </span>
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            ${authors.length > 1 ? `
              <select id="select-comm-filter-author" style="font-size: 0.78rem; padding: 3px 6px; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--bg-card-border);">
                <option value="all" ${this._commentaryFilterAuthor === 'all' ? 'selected' : ''}>${t('commentariesFilterAll', lang)} (${commentaries.length})</option>
                ${authors.map((a) => `<option value="${this.escape(a)}" ${this._commentaryFilterAuthor === a ? 'selected' : ''}>${this.escape(a)}</option>`).join('')}
              </select>
            ` : ''}
            <button class="btn btn-sm btn-primary" id="btn-toggle-add-commentary">
              ${this._showAddCommentaryForm ? '❌ Zrušit' : `➕ ${t('btnAddCommentary', lang)}`}
            </button>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
          ${t('commentariesDesc', lang)}
        </p>

        <!-- ADD COMMENTARY FORM -->
        ${this._showAddCommentaryForm ? `
          <div class="add-comm-box" style="background: var(--bg-secondary); border: 1px solid var(--accent-gold); border-radius: 6px; padding: 0.85rem; margin-bottom: 0.85rem;">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--accent-gold); margin-bottom: 0.5rem;">
              ➕ ${t('btnAddCommentary', lang)}
            </div>

            <!-- Quick presets -->
            <div style="margin-bottom: 0.6rem;">
              <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: 4px;">Rychlé předvolby autorů:</span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="shankara" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Śaṅkara (Advaita, sa)
                </button>
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="ramanuja" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Rāmānuja (Viśiṣṭādvaita, sa)
                </button>
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="sridhara" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Śrīdhara (Subodhinī, sa)
                </button>
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="madhva" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Madhva (Dvaita, sa)
                </button>
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="translator" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Překladatelský komentář (cs)
                </button>
                <button class="btn btn-sm btn-outline btn-comm-preset" data-preset="filipsky" type="button" style="font-size: 0.72rem; padding: 1px 6px;">
                  Filipský & Vacek (cs)
                </button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem;">
              <div>
                <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                  ${t('commentaryAuthor', lang)}:
                </label>
                <input type="text" id="new-comm-author" class="editor-input" placeholder="např. Śaṅkarācārya, Překladatel" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                  ${t('commentaryTradition', lang)}:
                </label>
                <input type="text" id="new-comm-tradition" class="editor-input" placeholder="např. Advaita Vedānta, Filologie" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                  ${t('commentaryTitle', lang)}:
                </label>
                <input type="text" id="new-comm-title" class="editor-input" placeholder="např. Śāṅkarabhāṣya" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                  ${t('commentaryLanguage', lang)}:
                </label>
                <select id="new-comm-lang" class="editor-input" style="width: 100%;">
                  <option value="sa">Sanskrt (sa)</option>
                  <option value="cs" selected>Čeština (cs)</option>
                  <option value="en">Angličtina (en)</option>
                  <option value="de">Němčina (de)</option>
                  <option value="fr">Francouzština (fr)</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                ${t('commentaryText', lang)}:
              </label>
              <textarea id="new-comm-text" class="editor-textarea" rows="4" placeholder="Zadejte sanskrtský komentář nebo českou poznámku k výkladu verše..." style="width: 100%;"></textarea>
            </div>

            <div style="margin-bottom: 0.6rem;">
              <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 2px;">
                ${t('commentarySource', lang)}:
              </label>
              <input type="text" id="new-comm-source" class="editor-input" placeholder="např. Nirnayasagar Press 1936, s. 42" style="width: 100%;">
            </div>

            <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              <button class="btn btn-sm btn-outline" id="btn-cancel-add-commentary" type="button">Zrušit</button>
              <button class="btn btn-sm btn-primary" id="btn-confirm-add-commentary" type="button">💾 ${t('btnSaveCommentary', lang)}</button>
            </div>
          </div>
        ` : ''}

        <!-- SIMULTANEOUS COMMENTARIES LIST / GRID -->
        ${filteredCommentaries.length === 0 && !this._showAddCommentaryForm ? `
          <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 6px; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
            ${t('noCommentariesNotice', lang)}
          </div>
        ` : `
          <div class="commentaries-simultaneous-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.75rem;">
            ${filteredCommentaries.map((comm) => {
              const isEditing = this._editingCommentaryId === comm.id;
              if (isEditing) {
                return `
                  <div class="comm-edit-form-card" style="background: var(--bg-card); border: 2px solid var(--accent-gold); border-radius: 6px; padding: 0.75rem;">
                    <div style="font-weight: 700; font-size: 0.84rem; color: var(--accent-gold); margin-bottom: 0.4rem;">
                      ✏️ ${t('btnEditCommentary', lang)}: ${this.escape(comm.author)}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.4rem;">
                      <div>
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Autor:</label>
                        <input type="text" id="edit-comm-author" class="editor-input" value="${this.escape(comm.author)}" placeholder="Autor" style="width: 100%;">
                      </div>
                      <div>
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Tradice / Škola:</label>
                        <input type="text" id="edit-comm-tradition" class="editor-input" value="${this.escape(comm.tradition || '')}" placeholder="Tradice / Škola" style="width: 100%;">
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.4rem; margin-bottom: 0.4rem;">
                      <div>
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Název díla:</label>
                        <input type="text" id="edit-comm-title" class="editor-input" value="${this.escape(comm.title || '')}" placeholder="Název" style="width: 100%;">
                      </div>
                      <div>
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Jazyk:</label>
                        <input type="text" id="edit-comm-lang" class="editor-input" value="${this.escape(comm.lang)}" placeholder="sa, cs, en" style="width: 100%;">
                      </div>
                    </div>
                    <div style="margin-bottom: 0.4rem;">
                      <label style="font-size: 0.7rem; color: var(--text-muted);">Text komentáře:</label>
                      <textarea id="edit-comm-text" class="editor-textarea" rows="4" style="width: 100%;">${this.escape(comm.text)}</textarea>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                      <label style="font-size: 0.7rem; color: var(--text-muted);">Pramen / Citace:</label>
                      <input type="text" id="edit-comm-source" class="editor-input" value="${this.escape(comm.source || '')}" placeholder="Pramen" style="width: 100%;">
                    </div>
                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                      <button class="btn btn-sm btn-outline btn-cancel-edit-comm" data-comm-id="${escapeHtml(comm.id)}" type="button">Zrušit</button>
                      <button class="btn btn-sm btn-primary btn-save-edit-comm" data-comm-id="${escapeHtml(comm.id)}" type="button">💾 ${t('btnSaveCommentary', lang)}</button>
                    </div>
                  </div>
                `;
              }

              return `
                <div class="commentary-card" style="background: var(--bg-card); border-left: 3px solid ${comm.isOriginalSanskrit || comm.lang === 'sa' ? 'var(--accent-terracotta)' : 'var(--accent-gold)'}; border-radius: 6px; padding: 0.65rem 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; gap: 0.4rem;">
                      <div>
                        <strong style="color: var(--accent-gold-dark); font-size: 0.92rem;">${this.escape(comm.author)}</strong>
                        ${comm.tradition ? `<span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px; font-style: italic;">(${this.escape(comm.tradition)})</span>` : ''}
                        ${comm.title ? `<div style="font-size: 0.74rem; color: var(--text-muted); font-weight: 600;">${this.escape(comm.title)}</div>` : ''}
                      </div>
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <span class="badge" style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; background: var(--bg-secondary); padding: 1px 5px; border-radius: 3px;">
                          ${this.escape(comm.lang)}
                        </span>
                        <button class="btn btn-sm btn-outline btn-edit-comm" data-edit-comm-id="${escapeHtml(comm.id)}" title="${t('btnEditCommentary', lang)}" style="padding: 1px 5px; font-size: 0.75rem;" type="button">
                          ✏️
                        </button>
                        <button class="btn btn-sm btn-danger btn-del-comm" data-del-comm-id="${escapeHtml(comm.id)}" title="${t('btnDeleteCommentary', lang)}" style="padding: 1px 5px; font-size: 0.75rem;" type="button">
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div class="comm-text-body" style="font-size: 0.88rem; line-height: 1.5; color: var(--text-primary); margin-bottom: 0.4rem; ${comm.isOriginalSanskrit || comm.lang === 'sa' ? 'font-family: var(--font-deva, serif); font-size: 0.98rem;' : ''}">
                      ${this.escape(comm.text)}
                    </div>
                  </div>
                  ${comm.source ? `
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; text-align: right; border-top: 1px dashed var(--bg-card-border); padding-top: 0.25rem;">
                      📖 ${this.escape(comm.source)}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  private renderPaninianKeyboard(): string {
    return `
      <div class="paninian-keyboard-box">
        <div class="paninian-sections-grid">
          ${PANINIAN_SECTIONS.map(
            (sec) => `
            <div class="paninian-section-group">
              <div class="paninian-sec-title">${sec.title}</div>
              <div class="paninian-sec-keys">
                ${sec.items
                  .map(
                    (it) => `
                  <button class="paninian-key-btn deva-font" data-deva-insert="${it.char}" title="${it.label || it.char}">
                    ${it.char}
                  </button>`
                  )
                  .join('')}
              </div>
            </div>`
          ).join('')}
        </div>
      </div>
    `;
  }

  private getActiveTranslationLang(): string {
    return this._verse?.translations.find((t) => t.id === this._activeTranslationId)?.lang || this._uiLang;
  }

  private getGlossarySuggestions(): TranslationSuggestion[] {
    if (!this._verse || !this._selectedTokenId) {
      return [];
    }
    const token = this._verse.tokens.find((t) => t.id === this._selectedTokenId);
    if (!token) return [];

    const lang = this.getActiveTranslationLang();
    const query = (token.lemma || token.text.iast).replace(/^√/, '');
    const keys = [query, token.text.iast].map((k) => sanitizeSearchLemma(k).toLowerCase());

    // 1. Project glossary terms (explicitly curated, therefore listed first)
    const fromGlossary: TranslationSuggestion[] = [];
    for (const entry of Object.values(this._glossary)) {
      const stem = sanitizeSearchLemma(entry.stem).toLowerCase();
      if (!stem || !keys.some((k) => k === stem || (stem.length >= 3 && k.startsWith(stem)))) continue;
      const translation = lang === 'en' ? (entry.translationEn || entry.translationCs) : (entry.translationCs || entry.translationEn);
      if (!translation) continue;
      fromGlossary.push({
        targetWord: entry.stem,
        translation,
        verseNumber: lang === 'cs' ? 'glosář' : 'glossary',
        verseId: '',
        lang,
        frequency: 100
      });
    }

    // 2. Earlier translations of the same word elsewhere in the book
    const fromCorpus = this._document
      ? getTranslationSuggestions(this._document.verses, query, lang)
      : [];
    const seen = new Set(fromGlossary.map((g) => g.translation.toLowerCase()));
    return [...fromGlossary, ...fromCorpus.filter((c) => !seen.has(c.translation.toLowerCase()))].slice(0, 6);
  }

  private getSurroundingVerses(): { prev: Verse | null; next: Verse | null } {
    if (!this._document || !this._verse) return { prev: null, next: null };
    const idx = this._document.verses.findIndex((v) => v.id === this._verse!.id);
    if (idx < 0) return { prev: null, next: null };

    return {
      prev: idx > 0 ? this._document.verses[idx - 1] : null,
      next: idx < this._document.verses.length - 1 ? this._document.verses[idx + 1] : null
    };
  }

  private getVerseDevaText(v: Verse): string {
    return typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari.text;
  }

  private renderCorpusTab(): string {
    const allVerses = this._document?.verses || [];
    const verses = this._corpusFilterText.trim()
      ? filterCorpus(allVerses, { query: this._corpusFilterText })
      : allVerses;
    const hierarchy: BookHierarchy = buildBookHierarchy(verses);
    const lang = this._uiLang;

    return `
      <div class="corpus-manager-container">
        <div class="editor-grid-2">
          <!-- LEFT: BOOK HIERARCHY & SEARCH -->
          <div class="editor-card">
            <h4 class="editor-card-title">${t('bookHierarchyTitle', lang)}</h4>
            <div style="margin-bottom: 0.75rem;">
              <input type="text" id="input-corpus-filter" value="${escapeHtml(this._corpusFilterText)}" placeholder="${t('searchBookPlaceholder', lang)}" class="form-input">
            </div>

            <div class="hierarchy-tree-box">
              ${hierarchy.books
                .map(
                  (b) => `
                <div class="hierarchy-book-node">
                  <div class="book-node-title">📖 ${escapeHtml(b.book)} <span class="badge">(${b.totalVerses} veršů)</span></div>
                  <div class="chapters-list">
                    ${b.chapters
                      .map(
                        (ch) => `
                      <div class="chapter-node">
                        <div class="chapter-node-title">🔖 ${escapeHtml(ch.chapter)} (${ch.verses.length})</div>
                        <div class="verse-pills-row">
                          ${ch.verses
                            .map((v) => {
                              const s = this._verseStatuses[v.id] || v.translationStatus || 'draft';
                              const dot = s === 'verified' ? '🟢' : s === 'translated' ? '🔵' : s === 'in_review' ? '🟡' : '⚪';
                              return `
                              <button class="verse-chip ${this._verse?.id === v.id ? 'active' : ''}" data-select-verse-id="${escapeHtml(v.id)}">
                                ${dot} ${escapeHtml(v.number)}
                              </button>`;
                            })
                            .join('')}
                        </div>
                      </div>`
                      )
                      .join('')}
                  </div>
                </div>`
                )
                .join('')}
            </div>

            <!-- Export Filtered Subset -->
            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px dashed var(--bg-card-border);">
              <h5 style="margin: 0 0 0.5rem; font-size: 0.9rem;">Export vybraného celku:</h5>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary" id="btn-export-subset-html">
                  ${t('exportSubsetHtml', lang)}
                </button>
                <button class="btn btn-outline" id="btn-export-subset-json">
                  ${t('exportSubsetJson', lang)}
                </button>
                <button class="btn btn-outline" id="btn-export-subset-md">
                  ${t('exportSubsetMd', lang)}
                </button>
              </div>
            </div>
          </div>

          <!-- RIGHT: BULK TEXT IMPORTER -->
          <div class="editor-card">
            <h4 class="editor-card-title">${t('bulkImportTitle', lang)}</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              ${t('bulkImportDesc', lang)}
            </p>

            <div class="editor-grid-2" style="margin-bottom: 0.6rem;">
              <label>
                ${t('bookNameLabel', lang)}:
                <input type="text" id="bulk-import-book" placeholder="např. Bhagavadgītā" value="${escapeHtml(this._verse?.book || '')}" class="form-input">
              </label>
              <label>
                ${t('chapterNameLabel', lang)}:
                <input type="text" id="bulk-import-chapter" placeholder="např. 1. Kapitola" value="${escapeHtml(this._verse?.chapter || '')}" class="form-input">
              </label>
            </div>

            <textarea id="bulk-import-textarea" class="editor-textarea" rows="8" placeholder="${t('bulkTextareaPlaceholder', lang)}"></textarea>

            <div style="display: flex; justify-content: flex-end; margin-top: 0.75rem;">
              <button class="btn btn-primary" id="btn-run-bulk-import">
                ${t('btnRunBulkImport', lang)}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderIndexTab(): string {
    const lang = this._uiLang;
    return `
      <div class="index-manager-container">
        <!-- Top Toolbar -->
        <div class="editor-card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h4 class="editor-card-title" style="margin: 0;">${t('indexVerborumTitle', lang)}</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                ${t('indexVerborumDesc', lang)}
              </p>
            </div>
            <button class="btn btn-primary" id="btn-generate-full-index">
              ${t('btnGenFullIndex', lang)}
            </button>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 0.8rem; max-width: 500px;">
            <input type="text" id="input-concordance-search" placeholder="${t('searchConcordancePlaceholder', lang)}" class="form-input">
            <button class="btn btn-secondary" id="btn-run-concordance">${t('btnSearchConcordance', lang)}</button>
          </div>
        </div>

        <!-- Concordance Search Results -->
        ${
          this._concordanceResults.length > 0
            ? `
          <div class="editor-card" style="margin-bottom: 1.25rem;">
            <h4 class="editor-card-title">Výsledky vyhledávání výskytů (${this._concordanceResults.length}):</h4>
            <div class="concordance-results-list">
              ${this._concordanceResults
                .map(
                  (c) => `
                <div class="concordance-item-card">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.3rem;">
                    <button class="verse-num-badge" data-select-verse-id="${escapeHtml(c.verseId)}">
                      ${c.book ? `${escapeHtml(c.book)} ` : ''}Verš ${escapeHtml(c.verseNumber)} &rarr;
                    </button>
                    <span style="font-size: 0.8rem; color: var(--accent-gold-dark); font-weight: 600;">
                      ${escapeHtml(c.token.devanagari)} (${escapeHtml(c.token.iast)})
                    </span>
                  </div>
                  <div class="concordance-context-deva deva-font">${escapeHtml(c.contextDevanagari)}</div>
                  <div class="concordance-context-iast">${escapeHtml(c.contextIast)}</div>
                  ${
                    c.translations.length > 0
                      ? `<div class="concordance-trans">${escapeHtml(c.translations.join(' | '))}</div>`
                      : ''
                  }
                </div>`
                )
                .join('')}
            </div>
          </div>`
            : ''
        }

        <!-- Index Verborum Table -->
        ${
          this._indexVerborum.length > 0
            ? `
          <div class="editor-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
              <h4 class="editor-card-title" style="margin: 0;">Kompletní heslář knihy (${this._indexVerborum.length} hesel):</h4>
            </div>
            <div class="table-responsive">
              <table class="index-verborum-table">
                <thead>
                  <tr>
                    <th>Heslo / Lemma</th>
                    <th>Dévanágarí</th>
                    <th>Výskyty ve verších</th>
                    <th>Slovníkové významy</th>
                    <th>Použité překlady</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._indexVerborum
                    .map(
                      (entry) => `
                    <tr>
                      <td><strong>${escapeHtml(entry.lemma)}</strong></td>
                      <td class="deva-font" style="font-size: 1.1rem; color: var(--accent-gold-dark);">${escapeHtml(entry.devanagari)}</td>
                      <td>
                        <div class="index-occ-chips">
                          ${entry.occurrences
                            .map(
                              (occ) => `
                            <button class="occ-chip" data-select-verse-id="${escapeHtml(occ.verseId)}">
                              ${escapeHtml(occ.verseNumber)}
                            </button>`
                            )
                            .join('')}
                        </div>
                      </td>
                      <td>${escapeHtml(entry.meanings.join(', ') || '—')}</td>
                      <td><em style="color: var(--accent-terracotta);">${escapeHtml(entry.translationsUsed.join(', ') || '—')}</em></td>
                    </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>`
            : ''
        }
      </div>
    `;
  }

  private updateLivePreview() {
    const mount = this.querySelector('#editor-preview-mount');
    if (!mount) return;
    mount.innerHTML = '';
    if (!this._previewOpen || !this._verse) return;
    const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
    verseEl.verse = this._verse;
    mount.appendChild(verseEl);
  }

  private setPreviewOpen(open: boolean) {
    this._previewOpen = open;
    const overlay = this.querySelector('#editor-preview-overlay') as HTMLElement | null;
    if (overlay) {
      overlay.hidden = !open;
      overlay.classList.toggle('is-open', open);
    }
    this.querySelector('#btn-toggle-preview')?.classList.toggle('active', open);
    this.syncInputsToVerse();
    this.updateLivePreview();
    if (open) (this.querySelector('#btn-close-preview') as HTMLElement | null)?.focus();
  }

  private attachEventListeners() {
    // UI Language Toggle
    const btnToggleUiLang = this.querySelector('#btn-toggle-ui-lang');
    btnToggleUiLang?.addEventListener('click', () => {
      this._uiLang = this._uiLang === 'cs' ? 'en' : 'cs';
      this.render();
      this.dispatchEvent(new CustomEvent('language-change', { detail: { lang: this._uiLang } }));
    });

    // LLM Panel Toggle
    const btnToggleLLM = this.querySelector('#btn-toggle-llm-panel');
    btnToggleLLM?.addEventListener('click', () => {
      this._showLLMPanel = !this._showLLMPanel;
      this.render();
    });

    const btnCloseLLM = this.querySelector('#btn-close-llm-panel');
    btnCloseLLM?.addEventListener('click', () => {
      this._showLLMPanel = false;
      this.render();
    });

    // LLM Task Sub-tabs
    this.querySelectorAll('[data-llm-task]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const task = (e.currentTarget as HTMLElement).getAttribute('data-llm-task') as LLMTaskType;
        if (task) {
          this._activeLLMTask = task;
          this.render();
        }
      });
    });

    // LLM Preset Select
    const llmPresetSelect = this.querySelector('#llm-preset-select') as HTMLSelectElement;
    llmPresetSelect?.addEventListener('change', (e) => {
      const presetKey = (e.target as HTMLSelectElement).value;
      const preset = LLM_PROVIDER_PRESETS[presetKey];
      if (preset) {
        this._llmConfig.providerPreset = presetKey as any;
        this._llmConfig.endpoint = preset.endpoint;
        this._llmConfig.model = preset.defaultModel;
        this.render();
      }
    });

    // Toggle API Key visibility
    const btnToggleApiKey = this.querySelector('#btn-toggle-apikey-vis');
    btnToggleApiKey?.addEventListener('click', () => {
      const input = this.querySelector('#llm-apikey-input') as HTMLInputElement;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });

    // Save LLM Settings
    const btnSaveLLMSettings = this.querySelector('#btn-llm-save-settings');
    btnSaveLLMSettings?.addEventListener('click', () => {
      const endpoint = (this.querySelector('#llm-endpoint-input') as HTMLInputElement)?.value.trim();
      const apiKey = (this.querySelector('#llm-apikey-input') as HTMLInputElement)?.value.trim();
      const model = (this.querySelector('#llm-model-input') as HTMLInputElement)?.value.trim();
      const contextVerses = parseInt((this.querySelector('#llm-context-verses-select') as HTMLSelectElement)?.value || '1', 10);
      const includeGlossary = (this.querySelector('#llm-include-glossary-checkbox') as HTMLInputElement)?.checked ?? true;
      const customPrompt = (this.querySelector('#llm-custom-prompt-input') as HTMLTextAreaElement)?.value || '';

      this.saveLLMConfig({
        ...this._llmConfig,
        endpoint: endpoint || this._llmConfig.endpoint,
        apiKey: apiKey ?? this._llmConfig.apiKey,
        model: model || this._llmConfig.model,
        contextVersesCount: contextVerses,
        includeGlossary,
        customSystemPrompt: customPrompt
      });

      this.notify(this._uiLang === 'cs' ? 'Nastavení modelu bylo úspěšně uloženo.' : 'Model settings saved successfully.');
      this.render();
    });

    // Toggle Prompt Preview
    const btnTogglePromptPreview = this.querySelector('#btn-llm-toggle-prompt-preview');
    btnTogglePromptPreview?.addEventListener('click', () => {
      this._showPromptPreview = !this._showPromptPreview;
      this.render();
    });

    // Toggle Raw JSON
    const btnToggleRawJson = this.querySelector('#btn-llm-toggle-raw-json');
    btnToggleRawJson?.addEventListener('click', () => {
      this._showRawJsonResponse = !this._showRawJsonResponse;
      this.render();
    });

    // Run LLM Task
    const btnRunLLMTask = this.querySelector('#btn-llm-run-task');
    btnRunLLMTask?.addEventListener('click', () => {
      this.runLLMTask();
    });

    // Apply Translation
    const btnApplyTrans = this.querySelector('#btn-llm-apply-translation');
    btnApplyTrans?.addEventListener('click', () => {
      const res = this.currentLLMResult();
      if (!this._verse || !res?.data) return;
      const targetLang = this._llmConfig.targetLanguage;
      const active = this._verse.translations.find((t) => t.id === this._activeTranslationId);
      this.verse = applyTranslationToVerse(this._verse, res.data, targetLang, {
        translationId: active && active.lang === targetLang && active.type === 'fluent' ? active.id : undefined,
        model: res.modelUsed
      });
      this.saveCurrentVerse(false);
      this.notify(this._uiLang === 'cs' ? 'Překlad byl úspěšně aplikován do verše.' : 'Translation applied to verse.');
    });

    // Apply Word Alignments
    const btnApplyAlignments = this.querySelector('#btn-llm-apply-alignments');
    btnApplyAlignments?.addEventListener('click', () => {
      const res = this.currentLLMResult();
      if (!this._verse || !res?.data) return;
      // Alignments are keyed by the translation the LLM was asked about (the active one)
      this.verse = applyAlignmentsToVerse(this._verse, res.data, this._activeTranslationId);
      this.saveCurrentVerse(false);
      this.notify(this._uiLang === 'cs' ? 'Párování slov bylo úspěšně uloženo do tokenů verše.' : 'Word alignments saved to verse tokens.');
    });

    // Apply Grammar Corrections
    const btnApplyGrammar = this.querySelector('#btn-llm-apply-grammar');
    btnApplyGrammar?.addEventListener('click', () => {
      const res = this.currentLLMResult();
      if (!this._verse || !res?.data) return;
      this.verse = applyGrammarCorrectionsToVerse(this._verse, res.data);
      this.saveCurrentVerse(false);
      this.notify(this._uiLang === 'cs' ? 'Gramatické a Sandhi opravy byly úspěšně uplatněny na tokenech verše.' : 'Grammar corrections applied to verse tokens.');
    });

    // Insert Commentary
    const btnInsertCommentary = this.querySelector('#btn-llm-insert-commentary');
    btnInsertCommentary?.addEventListener('click', () => {
      const res = this.currentLLMResult();
      if (!this._verse || !res?.data?.commentary) return;
      const comm = res.data.commentary;
      if (!this._verse.commentaries) {
        this._verse.commentaries = getVerseCommentaries(this._verse);
      }
      this._verse.commentaries.push({
        id: `comm_llm_${Date.now()}`,
        author: res.modelUsed ? `LLM (${res.modelUsed})` : 'AI / LLM Asistent',
        tradition: 'Syntéza komentářů',
        title: 'Výklad verše',
        lang: this._llmConfig.targetLanguage || this._uiLang,
        text: comm,
        isOriginalSanskrit: false
      });
      this.saveCurrentVerse(false);
      this.render();
      this.notify(this._uiLang === 'cs' ? 'Komentář byl úspěšně přidán do seznamu výkladů verše.' : 'Commentary successfully added to verse exegesis.');
    });

    // Translation Status Picker
    const statusSelect = this.querySelector('#edit-verse-status-select') as HTMLSelectElement;
    statusSelect?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as VerseTranslationStatus;
      if (this._verse) {
        this._verse.translationStatus = val;
        this._verseStatuses[this._verse.id] = val;
        this.render();
      }
    });

    // Navigation buttons (Prev / Next)
    const btnPrev = this.querySelector('#btn-editor-prev-verse');
    btnPrev?.addEventListener('click', () => this.navigateVerse(-1));
    const btnBottomPrev = this.querySelector('#btn-bottom-prev');
    btnBottomPrev?.addEventListener('click', () => this.navigateVerse(-1));

    const btnNext = this.querySelector('#btn-editor-next-verse');
    btnNext?.addEventListener('click', () => this.navigateVerse(1));

    // Save & Next
    const btnSaveNext = this.querySelector('#btn-editor-save-and-next');
    btnSaveNext?.addEventListener('click', () => this.saveCurrentVerseAndAdvance());
    const btnBottomSaveNext = this.querySelector('#btn-bottom-save-next');
    btnBottomSaveNext?.addEventListener('click', () => this.saveCurrentVerseAndAdvance());

    // Tab switching
    this.querySelectorAll('[data-editor-tab]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-editor-tab') as any;
        if (tab) {
          this._activeTab = tab;
          this.render();
        }
      });
    });

    // Track focused inputs for IAST insertion
    this.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('focus', (e) => {
        this._lastFocusedInput = e.target as any;
      });
    });

    // IAST toolbar button clicks
    this.querySelectorAll('[data-iast-insert]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const char = (e.currentTarget as HTMLElement).getAttribute('data-iast-insert');
        if (!char) return;

        let target = this._lastFocusedInput;
        if (!target || !this.contains(target)) {
          target = this.querySelector('#edit-verse-iast') as HTMLTextAreaElement;
        }
        if (target) {
          insertAtCursor(target, char);
          this.syncInputsToVerse();
        }
      });
    });

    // Paninian keyboard key clicks
    this.querySelectorAll('[data-deva-insert]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const char = (e.currentTarget as HTMLElement).getAttribute('data-deva-insert');
        if (!char) return;

        let target = this._lastFocusedInput;
        if (!target || !this.contains(target) || target.id !== 'edit-verse-devanagari') {
          target = this.querySelector('#edit-verse-devanagari') as HTMLTextAreaElement;
        }
        if (target) {
          insertAtCursor(target, char);
          this.syncInputsToVerse();
        }
      });
    });

    // Toggle Paninian visual keyboard
    const btnTogglePaninian = this.querySelector('#btn-toggle-paninian-kb');
    btnTogglePaninian?.addEventListener('click', () => {
      this._showPaninianKeyboard = !this._showPaninianKeyboard;
      this.render();
    });

    // Attach IME to Devanagari textarea
    const devaTextarea = this.querySelector('#edit-verse-devanagari') as HTMLTextAreaElement;
    if (devaTextarea) {
      // Preserve the on/off state across re-renders (the textarea is recreated by render())
      const wasEnabled = this._imeController?.isEnabled() ?? false;
      this._imeController?.destroy();
      this._imeController = attachDevanagariIME(devaTextarea, wasEnabled);

      const btnToggleIme = this.querySelector('#btn-toggle-ime');
      btnToggleIme?.addEventListener('click', () => {
        if (this._imeController) {
          const isNowOn = this._imeController.toggle();
          if (btnToggleIme) {
            btnToggleIme.textContent = isNowOn ? t('imeToggleOn', this._uiLang) : t('imeToggleOff', this._uiLang);
            if (isNowOn) {
              btnToggleIme.classList.add('btn-primary');
              btnToggleIme.classList.remove('btn-outline');
            } else {
              btnToggleIme.classList.remove('btn-primary');
              btnToggleIme.classList.add('btn-outline');
            }
          }
        }
      });
    }

    // Live sync inputs to model
    const devaInput = this.querySelector('#edit-verse-devanagari') as HTMLTextAreaElement;
    const iastInput = this.querySelector('#edit-verse-iast') as HTMLTextAreaElement;
    const numInput = this.querySelector('#edit-verse-number') as HTMLInputElement;
    const bookInput = this.querySelector('#edit-verse-book') as HTMLInputElement;
    const chapInput = this.querySelector('#edit-verse-chapter') as HTMLInputElement;
    const meterInput = this.querySelector('#edit-verse-meter') as HTMLInputElement;
    const transText = this.querySelector('#edit-trans-text') as HTMLTextAreaElement;

    const onInputChange = () => {
      this.syncInputsToVerse();
    };

    [devaInput, iastInput, numInput, bookInput, chapInput, meterInput, transText].forEach((inp) => {
      inp?.addEventListener('input', onInputChange);
    });
    let boardTimer: ReturnType<typeof setTimeout> | null = null;
    transText?.addEventListener('input', () => {
      if (boardTimer) clearTimeout(boardTimer);
      boardTimer = setTimeout(() => this.refreshBoard(), 300);
    });

    // Auto-transliterate IAST from Devanagari
    const btnAutoTranslit = this.querySelector('#btn-auto-transliterate-iast');
    btnAutoTranslit?.addEventListener('click', () => {
      if (!this._verse) return;
      const deva = typeof this._verse.scripts.devanagari === 'string'
        ? this._verse.scripts.devanagari
        : this._verse.scripts.devanagari.text;
      try {
        const iast = transliterateLipi(deva, 'Devanagari', 'Iast');
        if (typeof this._verse.scripts.iast === 'string') {
          this._verse.scripts.iast = iast;
        } else {
          this._verse.scripts.iast.text = iast;
        }
        if (iastInput) iastInput.value = iast;
        this.updateLivePreview();
      } catch {
        const iast = defaultSanskritAdapter.transliterate(deva, 'devanagari', 'iast');
        if (iastInput) iastInput.value = iast;
        this.syncInputsToVerse();
      }
    });

    // Auto-detect meter
    const btnAutoMeter = this.querySelector('#btn-auto-detect-meter');
    btnAutoMeter?.addEventListener('click', () => {
      if (!this._verse) return;
      const iast = typeof this._verse.scripts.iast === 'string'
        ? this._verse.scripts.iast
        : this._verse.scripts.iast.text;
      const meterResult = defaultSanskritAdapter.analyzeMeter(iast);
      if (meterResult.meterName) {
        this._verse.meter = meterResult.meterName;
        if (meterInput) meterInput.value = meterResult.meterName;
        this.updateLivePreview();
      }
    });

    // Switch active translation
    const transSelect = this.querySelector('#edit-trans-select') as HTMLSelectElement;
    transSelect?.addEventListener('change', (e) => {
      this.syncInputsToVerse();
      this._activeTranslationId = (e.target as HTMLSelectElement).value;
      this.render();
    });

    // Add translation
    const btnAddTrans = this.querySelector('#btn-add-translation');
    btnAddTrans?.addEventListener('click', () => {
      if (!this._verse) return;
      const lang = prompt('Zadejte kód jazyka překladu (např. cs, en, de, sk):', 'cs') || 'cs';
      const label = prompt('Zadejte název překladu:', `Nový překlad (${lang})`) || `Překlad (${lang})`;
      const id = `${lang}_custom_${Date.now()}`;
      this._verse.translations.push({
        id,
        label,
        lang,
        type: 'fluent',
        text: ''
      });
      this._activeTranslationId = id;
      this.render();
    });

    // Preview overlay (on demand)
    this.querySelector('#btn-toggle-preview')?.addEventListener('click', () => this.setPreviewOpen(!this._previewOpen));
    this.querySelector('#btn-close-preview')?.addEventListener('click', () => this.setPreviewOpen(false));
    this.querySelector('[data-close-preview]')?.addEventListener('click', () => this.setPreviewOpen(false));

    this.bindBoardEvents();
    this.bindHintEvents();

    // Verse selector in header
    const verseSelect = this.querySelector('#editor-verse-select') as HTMLSelectElement;
    verseSelect?.addEventListener('change', (e) => {
      const vid = (e.target as HTMLSelectElement).value;
      this.selectVerseById(vid);
    });

    // New verse button
    const btnNewVerse = this.querySelector('#btn-editor-new-verse');
    btnNewVerse?.addEventListener('click', () => {
      this.createNewVerse();
    });

    // Save verse into document
    const btnSaveVerse = this.querySelector('#btn-editor-save-verse');
    btnSaveVerse?.addEventListener('click', () => {
      this.saveCurrentVerse();
    });

    // Save full workspace project bundle (*.sanskrit-project.json)
    const btnSaveProject = this.querySelector('#btn-save-project-bundle');
    btnSaveProject?.addEventListener('click', () => {
      this.saveFullProjectBundle();
    });

    // Load full workspace project bundle from file
    const inputLoadProject = this.querySelector('#input-load-project-bundle') as HTMLInputElement;
    inputLoadProject?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const bundle = await importWorkspaceBundleFromFile(file);
        this.document = bundle.document;
        this._glossary = bundle.glossary || {};
        this._verseStatuses = bundle.translationState?.verseStatuses || {};
        if (bundle.translationState?.activeVerseId) {
          this.selectVerseById(bundle.translationState.activeVerseId);
        }
        saveWorkspaceBundleToCache(bundle);
        this.render();
        this.notify(`Projekt „${bundle.projectTitle}“ byl úspěšně obnoven ze souboru.`);
        this.dispatchEvent(new CustomEvent('project-loaded', { detail: { bundle } }));
      } catch (err: any) {
        alert('Chyba při načítání projektu: ' + err.message);
      } finally {
        inputLoadProject.value = '';
      }
    });

    // Export single verse JSON
    const btnExportVerseJson = this.querySelector('#btn-editor-export-verse-json');
    btnExportVerseJson?.addEventListener('click', () => {
      if (!this._verse) return;
      const jsonStr = JSON.stringify(this._verse, null, 2);
      downloadFile(`verse_${this._verse.number || 'export'}.json`, jsonStr, 'application/json');
    });

    // Import single verse JSON
    const inputImportVerseJson = this.querySelector('#input-editor-import-verse-json') as HTMLInputElement;
    inputImportVerseJson?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const parsed = VerseSchema.parse(JSON.parse(re.target?.result as string));
          this.verse = parsed;
          this.notify('Verš byl úspěšně načten z JSON.');
        } catch (err) {
          alert('Chyba při čtení JSON: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    });

    // Corpus tab filter
    const filterInput = this.querySelector('#input-corpus-filter') as HTMLInputElement;
    filterInput?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      this._corpusFilterText = input.value;
      const caret = input.selectionStart ?? input.value.length;
      this.render();
      // render() replaces the DOM; restore focus and caret so typing can continue
      const fresh = this.querySelector('#input-corpus-filter') as HTMLInputElement | null;
      if (fresh) {
        fresh.focus();
        fresh.setSelectionRange(caret, caret);
      }
    });

    // Select verse from hierarchy or concordance chip
    this.querySelectorAll('[data-select-verse-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const vid = (e.currentTarget as HTMLElement).getAttribute('data-select-verse-id');
        if (vid) {
          this.selectVerseById(vid);
          this._activeTab = 'edit';
          this.render();
        }
      });
    });

    // Bulk text import
    const btnRunBulk = this.querySelector('#btn-run-bulk-import');
    btnRunBulk?.addEventListener('click', () => {
      const rawText = (this.querySelector('#bulk-import-textarea') as HTMLTextAreaElement)?.value;
      const bookName = (this.querySelector('#bulk-import-book') as HTMLInputElement)?.value;
      const chapName = (this.querySelector('#bulk-import-chapter') as HTMLInputElement)?.value;

      if (!rawText || !rawText.trim()) {
        alert('Vložte prosím text k importu.');
        return;
      }

      // Number new verses after the ones already in the same book & chapter
      const sameChapter = (this._document?.verses || []).filter((v) =>
        (v.book || '').trim() === (bookName || '').trim() && (v.chapter || '').trim() === (chapName || '').trim()
      );
      const importedVerses = bulkImportText(rawText, {
        book: bookName,
        chapter: chapName,
        startNumber: sameChapter.length + 1
      });

      if (importedVerses.length === 0) {
        alert('Nepodařilo se rozpoznat žádné verše.');
        return;
      }

      if (!this._document) {
        this._document = {
          document: {
            id: `doc_${Date.now()}`,
            title: bookName || (this._uiLang === 'cs' ? 'Nový dokument' : 'New document'),
            status: 'draft',
            defaultLayers: ['devanagari', 'transliteration', 'translation']
          },
          verses: []
        };
      }
      this._document.verses.push(...importedVerses);
      this.verse = importedVerses[0];
      this._activeTab = 'edit';
      this.render();
      this.dispatchEvent(new CustomEvent('document-change', { detail: { document: this._document } }));
      this.notify(this._uiLang === 'cs' ? `Úspěšně importováno ${importedVerses.length} veršů.` : `Imported ${importedVerses.length} verses.`);
    });

    // Export subsets
    const btnExportSubsetHtml = this.querySelector('#btn-export-subset-html');
    btnExportSubsetHtml?.addEventListener('click', () => {
      if (!this._document) return;
      const htmlStr = exportCorpusSubset(this._document, { query: this._corpusFilterText }, 'html');
      downloadFile('vyber_versu.html', htmlStr, 'text/html');
    });

    const btnExportSubsetJson = this.querySelector('#btn-export-subset-json');
    btnExportSubsetJson?.addEventListener('click', () => {
      if (!this._document) return;
      const jsonStr = exportCorpusSubset(this._document, { query: this._corpusFilterText }, 'json');
      downloadFile('vyber_versu.json', jsonStr, 'application/json');
    });

    const btnExportSubsetMd = this.querySelector('#btn-export-subset-md');
    btnExportSubsetMd?.addEventListener('click', () => {
      if (!this._document) return;
      const mdStr = exportCorpusSubset(this._document, { query: this._corpusFilterText }, 'markdown');
      downloadFile('vyber_versu.md', mdStr, 'text/markdown');
    });

    // Concordance search
    const btnRunConcordance = this.querySelector('#btn-run-concordance');
    const inputConcordance = this.querySelector('#input-concordance-search') as HTMLInputElement;

    const doConcordance = () => {
      const q = inputConcordance?.value?.trim();
      if (!q || !this._document) return;
      this._concordanceResults = findWordConcordance(this._document.verses, q);
      this.render();
    };

    btnRunConcordance?.addEventListener('click', doConcordance);
    inputConcordance?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doConcordance();
    });

    // Full Index Verborum generator
    const btnGenIndex = this.querySelector('#btn-generate-full-index');
    btnGenIndex?.addEventListener('click', () => {
      if (!this._document) return;
      this._indexVerborum = generateIndexVerborum(this._document.verses, this.getActiveTranslationLang());
      this.render();
    });

    // Commentary management events
    // Toggle add commentary form
    const btnToggleAddComm = this.querySelector('#btn-toggle-add-commentary');
    btnToggleAddComm?.addEventListener('click', () => {
      this._showAddCommentaryForm = !this._showAddCommentaryForm;
      this.render();
    });

    const btnCancelAddComm = this.querySelector('#btn-cancel-add-commentary');
    btnCancelAddComm?.addEventListener('click', () => {
      this._showAddCommentaryForm = false;
      this.render();
    });

    // Quick presets
    this.querySelectorAll('.btn-comm-preset').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const presetKey = (e.currentTarget as HTMLElement).getAttribute('data-preset');
        if (!presetKey) return;
        const preset = COMMENTARY_PRESETS[presetKey];
        if (!preset) return;

        const authInp = this.querySelector('#new-comm-author') as HTMLInputElement;
        const tradInp = this.querySelector('#new-comm-tradition') as HTMLInputElement;
        const titInp = this.querySelector('#new-comm-title') as HTMLInputElement;
        const langSel = this.querySelector('#new-comm-lang') as HTMLSelectElement;

        if (authInp && preset.author) authInp.value = preset.author;
        if (tradInp && preset.tradition) tradInp.value = preset.tradition;
        if (titInp && preset.title) titInp.value = preset.title;
        if (langSel && preset.lang) langSel.value = preset.lang;
      });
    });

    // Confirm add commentary
    const btnConfirmAddComm = this.querySelector('#btn-confirm-add-commentary');
    btnConfirmAddComm?.addEventListener('click', () => {
      if (!this._verse) return;
      const author = (this.querySelector('#new-comm-author') as HTMLInputElement)?.value.trim();
      const tradition = (this.querySelector('#new-comm-tradition') as HTMLInputElement)?.value.trim();
      const title = (this.querySelector('#new-comm-title') as HTMLInputElement)?.value.trim();
      const lang = (this.querySelector('#new-comm-lang') as HTMLSelectElement)?.value || 'cs';
      const text = (this.querySelector('#new-comm-text') as HTMLTextAreaElement)?.value.trim();
      const source = (this.querySelector('#new-comm-source') as HTMLInputElement)?.value.trim();

      if (!text) {
        alert('Zadejte prosím text komentáře.');
        return;
      }

      if (!this._verse.commentaries) {
        this._verse.commentaries = [];
      }

      const newComm: CommentaryItem = {
        id: `comm_${Date.now()}`,
        author: author || 'Komentátor',
        tradition: tradition || undefined,
        title: title || undefined,
        lang,
        text,
        source: source || undefined,
        isOriginalSanskrit: lang === 'sa'
      };

      this._verse.commentaries.push(newComm);
      this._showAddCommentaryForm = false;
      this.saveCurrentVerse();
      this.render();
    });

    // Author filter select
    const selectCommAuthor = this.querySelector('#select-comm-filter-author') as HTMLSelectElement;
    selectCommAuthor?.addEventListener('change', (e) => {
      this._commentaryFilterAuthor = (e.target as HTMLSelectElement).value;
      this.render();
    });

    // Edit commentary click
    this.querySelectorAll('.btn-edit-comm').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const commId = (e.currentTarget as HTMLElement).getAttribute('data-edit-comm-id');
        if (commId) {
          this._editingCommentaryId = commId;
          this.render();
        }
      });
    });

    // Save edited commentary
    this.querySelectorAll('.btn-save-edit-comm').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const commId = (e.currentTarget as HTMLElement).getAttribute('data-comm-id');
        if (!commId || !this._verse) return;

        if (!this._verse.commentaries) {
          this._verse.commentaries = getVerseCommentaries(this._verse);
        }

        const comm = this._verse.commentaries.find((c) => c.id === commId);
        if (comm) {
          const authInp = this.querySelector('#edit-comm-author') as HTMLInputElement;
          const tradInp = this.querySelector('#edit-comm-tradition') as HTMLInputElement;
          const titInp = this.querySelector('#edit-comm-title') as HTMLInputElement;
          const langInp = this.querySelector('#edit-comm-lang') as HTMLInputElement;
          const textInp = this.querySelector('#edit-comm-text') as HTMLTextAreaElement;
          const srcInp = this.querySelector('#edit-comm-source') as HTMLInputElement;

          if (authInp) comm.author = authInp.value.trim() || 'Komentátor';
          if (tradInp) comm.tradition = tradInp.value.trim() || undefined;
          if (titInp) comm.title = titInp.value.trim() || undefined;
          if (langInp) {
            comm.lang = langInp.value.trim() || 'cs';
            comm.isOriginalSanskrit = comm.lang === 'sa';
          }
          if (textInp) comm.text = textInp.value.trim();
          if (srcInp) comm.source = srcInp.value.trim() || undefined;

          this._editingCommentaryId = null;
          this.saveCurrentVerse();
          this.render();
        }
      });
    });

    // Cancel edit commentary
    this.querySelectorAll('.btn-cancel-edit-comm').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._editingCommentaryId = null;
        this.render();
      });
    });

    // Delete commentary
    this.querySelectorAll('.btn-del-comm').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const commId = (e.currentTarget as HTMLElement).getAttribute('data-del-comm-id');
        if (!commId || !this._verse) return;

        if (confirm('Opravdu chcete smazat tento komentář?')) {
          if (!this._verse.commentaries) {
            this._verse.commentaries = getVerseCommentaries(this._verse);
          }
          this._verse.commentaries = this._verse.commentaries.filter((c) => c.id !== commId);
          // Legacy single-text fields would reappear through getVerseCommentaries() once the list is empty
          this._verse.commentary_cs = undefined;
          this._verse.commentary_by_lang = undefined;
          this.saveCurrentVerse();
          this.render();
        }
      });
    });
  }

  private syncInputsToVerse() {
    if (!this._verse) return;

    const devaInput = this.querySelector('#edit-verse-devanagari') as HTMLTextAreaElement;
    const iastInput = this.querySelector('#edit-verse-iast') as HTMLTextAreaElement;
    const numInput = this.querySelector('#edit-verse-number') as HTMLInputElement;
    const bookInput = this.querySelector('#edit-verse-book') as HTMLInputElement;
    const chapInput = this.querySelector('#edit-verse-chapter') as HTMLInputElement;
    const meterInput = this.querySelector('#edit-verse-meter') as HTMLInputElement;
    const transText = this.querySelector('#edit-trans-text') as HTMLTextAreaElement;

    if (devaInput) {
      if (typeof this._verse.scripts.devanagari === 'string') {
        this._verse.scripts.devanagari = devaInput.value;
      } else {
        this._verse.scripts.devanagari.text = devaInput.value;
      }
    }

    if (iastInput) {
      if (typeof this._verse.scripts.iast === 'string') {
        this._verse.scripts.iast = iastInput.value;
      } else {
        this._verse.scripts.iast.text = iastInput.value;
      }
    }

    if (numInput) this._verse.number = numInput.value;
    if (bookInput) this._verse.book = bookInput.value;
    if (chapInput) this._verse.chapter = chapInput.value;
    if (meterInput) this._verse.meter = meterInput.value;

    if (transText) {
      let tr = this._verse.translations.find((t) => t.id === this._activeTranslationId);
      if (!tr) {
        tr = {
          id: this._activeTranslationId || `${this._uiLang}_fluent`,
          label: this._uiLang === 'cs' ? 'Plynulý český překlad' : 'Fluent Translation',
          lang: this._uiLang,
          type: 'fluent',
          text: transText.value
        };
        this._verse.translations.push(tr);
      } else {
        tr.text = transText.value;
      }
    }

    this.updateLivePreview();
    this.dispatchEvent(new CustomEvent('verse-change', { detail: { verse: this._verse } }));
  }

  private navigateVerse(direction: number) {
    if (!this._document || !this._verse) return;
    const idx = this._document.verses.findIndex((v) => v.id === this._verse!.id);
    if (idx < 0) return;

    const targetIdx = idx + direction;
    if (targetIdx >= 0 && targetIdx < this._document.verses.length) {
      this.selectVerseById(this._document.verses[targetIdx].id);
    }
  }

  private saveCurrentVerseAndAdvance() {
    this.saveCurrentVerse(false);
    this.navigateVerse(1);
  }

  private saveFullProjectBundle() {
    if (!this._document) return;
    this.syncInputsToVerse();

    const bundle = createWorkspaceBundle(
      this._document,
      AppSettingsSchema.parse({ uiLanguage: this._uiLang }),
      this._verse?.id || '',
      this._glossary,
      this._verseStatuses
    );

    saveWorkspaceBundleToCache(bundle);
    downloadWorkspaceBundle(bundle);
    this.notify(this._uiLang === 'cs' ? 'Projektový soubor (.sanskrit-project.json) byl uložen.' : 'Project file (.sanskrit-project.json) saved.');
  }

  private autoSplitAndLemmatize() {
    if (!this._verse) return;
    const iast = typeof this._verse.scripts.iast === 'string'
      ? this._verse.scripts.iast
      : this._verse.scripts.iast.text;

    const oldTokens = this._verse.tokens;
    const hasCuratedData = oldTokens.some((tk) =>
      Object.values(tk.alignment?.matched_words || {}).some((w) => w.length > 0) || tk.vocabulary
    );
    if (hasCuratedData && !confirm(this._uiLang === 'cs'
      ? 'Slova verše budou znovu rozdělena. Významy a párování se zachovají u slov, která zůstanou stejná. Pokračovat?'
      : 'The verse will be re-tokenized. Meanings and alignments are kept for words that stay the same. Continue?')) {
      return;
    }

    // Carry curated data over to new tokens with the same IAST form (in order of appearance)
    const pool = new Map<string, Token[]>();
    for (const tk of oldTokens) {
      const key = tk.text.iast.toLowerCase();
      pool.set(key, [...(pool.get(key) || []), tk]);
    }

    const tokens: Token[] = createTokensFromIast(iast, 't').map((fresh) => {
      const previous = pool.get(fresh.text.iast.toLowerCase())?.shift();
      if (!previous) return fresh;
      return {
        ...fresh,
        lemma: previous.lemma || fresh.lemma,
        grammar: previous.grammar || fresh.grammar,
        vocabulary: previous.vocabulary || fresh.vocabulary,
        compound: previous.compound,
        sandhi_note: previous.sandhi_note,
        dictionaryLookup: previous.dictionaryLookup,
        alignment: previous.alignment || fresh.alignment
      };
    });

    this._verse.tokens = tokens;
    this._selectedTokenId = tokens[0]?.id ?? null;
    this.render();
  }

  private selectVerseById(verseId: string) {
    if (!this._document) return;
    this.syncInputsToVerse();
    if (this._verse) {
      const curIdx = this._document.verses.findIndex((v) => v.id === this._verse!.id);
      if (curIdx >= 0) {
        this._document.verses[curIdx] = JSON.parse(JSON.stringify(this._verse));
      }
    }

    const found = this._document.verses.find((v) => v.id === verseId);
    if (found) {
      this.adoptVerse(found);
      this.render();
      this.dispatchEvent(new CustomEvent('verse-selected', { detail: { verse: this._verse } }));
    }
  }

  private createNewVerse() {
    const nextNum = this._document ? `${this._document.verses.length + 1}` : '1.1';
    const newV: Verse = {
      id: `verse_user_${Date.now()}`,
      number: nextNum,
      book: this._verse?.book || 'Kniha',
      chapter: this._verse?.chapter || '1. Kapitola',
      translationStatus: 'draft',
      scripts: {
        devanagari: { text: '', mode: 'auto', lastAutoText: '' },
        iast: { text: '', mode: 'auto', lastAutoText: '' }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: ''
        }
      ],
      tokens: []
    };

    if (this._document) {
      this._document.verses.push(newV);
    }
    this._verseStatuses[newV.id] = 'draft';
    this.verse = newV;
  }

  private saveCurrentVerse(announce = true) {
    if (!this._verse || !this._document) return;

    this.syncInputsToVerse();
    const idx = this._document.verses.findIndex((v) => v.id === this._verse!.id);
    if (idx >= 0) {
      this._document.verses[idx] = JSON.parse(JSON.stringify(this._verse));
    } else {
      this._document.verses.push(JSON.parse(JSON.stringify(this._verse)));
    }

    this.dispatchEvent(new CustomEvent('verse-saved', { detail: { verse: this._verse } }));
    if (announce) {
      this.notify(this._uiLang === 'cs' ? `Verš ${this._verse.number} byl úspěšně uložen.` : `Verse ${this._verse.number} saved.`);
    }
  }
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Registers <sanskrit-editor> custom element safely
 */
export function registerSanskritEditor(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('sanskrit-editor')) {
    customElements.define('sanskrit-editor', SanskritEditorElement);
  }
}

// Auto-register in browser/DOM environments (like <sanskrit-reader> and <sanskrit-verse>)
registerSanskritEditor();
