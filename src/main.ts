import { SanskritDocument, AppSettings, Token, AlphabetMappingTable } from './core/types/schema.ts';
import { SAMPLE_DOCUMENT } from './data/sampleVerses.ts';
import './components/index.ts';
import { SanskritReaderElement } from './components/SanskritReader.ts';
import { SanskritEditorElement } from './components/SanskritEditor.ts';
import {
  devanagariToIast,
  iastToCzechPhonetic
} from './core/transliteration/engine.ts';
import {
  analyzeSanskritWordFull,
  VIDYUT_METADATA
} from './core/lemmatizer/vidyutAdapter.ts';
import {
  DEFAULT_ALPHABET_MAPPING,
  exportAlphabetTableToJSON,
  importAlphabetTableFromJSON
} from './core/transliteration/schemes.ts';
import { createCzechRules } from './core/transliteration/rules.ts';
import { generateSargeantHtml } from './core/sargeant/sargeantFormatter.ts';
import {
  exportDocument,
  exportSettings,
  importDocumentFromFile,
  importSettingsFromFile,
  saveDocumentToCache,
  loadDocumentFromCache,
  saveSettingsToCache,
  loadSettingsFromCache,
  downloadJsonFile
} from './core/storage/localStore.ts';
import { getDictionaryUrl } from './core/dictionaries/dictionaryBuilder.ts';
import {
  checkKoshaCacheStatus,
  downloadVidyutKoshaZip,
  saveKoshaZipToIndexedDb,
  getKoshaZipFromIndexedDb,
  deleteKoshaZipFromIndexedDb,
  inspectZipArchive,
  exportKoshaZipToDisk,
  VIDYUT_DATA_ARCHIVE_INFO
} from './core/lemmatizer/vidyutKoshaDownloader.ts';

// State
let activeDoc: SanskritDocument = loadDocumentFromCache() || SAMPLE_DOCUMENT;
let activeSettings: AppSettings = loadSettingsFromCache() || {
  version: '2.0.0',
  layers: {
    devanagari: { visible: true, version: 'standard' },
    transliteration: { visible: true, version: 'iast' },
    translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent', 'literal'] },
    commentary: { visible: true, activeAuthors: [], activeLangs: ['sa', 'cs', 'en'], layout: 'stacked' },
    meter: { visible: true, showAksharas: true }
  },
  theme: 'parchment',
  uiLanguage: 'cs',
  czechRules: createCzechRules(),
  defaultDictionary: 'cologne_mw',
  preserveManualEdits: true,
  fontSizeDevanagari: 24,
  fontSizeTransliteration: 16,
  fontFamilyDevanagari: 'Tiro Devanagari Sanskrit, Noto Serif Devanagari, serif',
  autoSaveToLocalStorage: true
};

let activeAlphabetTable: AlphabetMappingTable = DEFAULT_ALPHABET_MAPPING;
let activeCharTableTab: 'base' | 'ligatures' = 'base';

// DOM Elements
const docTitleEl = document.getElementById('doc-title')!;
const docSubtitleEl = document.getElementById('doc-subtitle')!;
const versesContainerEl = document.getElementById('verses-container')!;
const sargeantContainerEl = document.getElementById('sargeant-container')!;
const panelTransliterationEl = document.getElementById('panel-transliteration')!;
const viewControlsEl = document.getElementById('view-controls')!;
const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement;



// 4-Layer DOM Controls
const layerDevaToggle = document.getElementById('layer-deva-toggle') as HTMLInputElement;
const layerDevaVersion = document.getElementById('layer-deva-version') as HTMLSelectElement;
const layerTranslitToggle = document.getElementById('layer-translit-toggle') as HTMLInputElement;
const layerTranslitVersion = document.getElementById('layer-translit-version') as HTMLSelectElement;
const layerTransToggle = document.getElementById('layer-trans-toggle') as HTMLInputElement;
const layerTransLang = document.getElementById('layer-trans-lang') as HTMLSelectElement;
const layerMeterToggle = document.getElementById('layer-meter-toggle') as HTMLInputElement;
const layerMeterView = document.getElementById('layer-meter-view') as HTMLSelectElement;
const layerCommToggle = document.getElementById('layer-comm-toggle') as HTMLInputElement | null;
const layerCommView = document.getElementById('layer-comm-view') as HTMLSelectElement | null;

// Buttons & Inputs
const fileInputDoc = document.getElementById('file-input-doc') as HTMLInputElement;
const fileInputSettings = document.getElementById('file-input-settings') as HTMLInputElement;
const fileInputTable = document.getElementById('file-input-table') as HTMLInputElement;
const btnExportDoc = document.getElementById('btn-export-doc')!;
const btnImportDoc = document.getElementById('btn-import-doc')!;
const btnExportSettings = document.getElementById('btn-export-settings')!;
const btnImportSettings = document.getElementById('btn-import-settings')!;
const btnPrintView = document.getElementById('btn-print-view')!;

// Character Table DOM
const btnTabCharsBase = document.getElementById('btn-tab-chars-base')!;
const btnTabCharsLigatures = document.getElementById('btn-tab-chars-ligatures')!;
const charGridDisplay = document.getElementById('char-grid-display')!;
const btnExportTable = document.getElementById('btn-export-table')!;
const btnImportTable = document.getElementById('btn-import-table')!;

// Tester inputs
const testInputDeva = document.getElementById('test-input-deva') as HTMLTextAreaElement;
const testOutputIast = document.getElementById('test-output-iast') as HTMLTextAreaElement;
const testOutputCs = document.getElementById('test-output-cs') as HTMLTextAreaElement;
const ruleRSyllabic = document.getElementById('rule-r-syllabic') as HTMLSelectElement;
const ruleLongVowels = document.getElementById('rule-long-vowels') as HTMLSelectElement;
const ruleCPalatal = document.getElementById('rule-c-palatal') as HTMLSelectElement;
const ruleJAffricate = document.getElementById('rule-j-affricate') as HTMLSelectElement;

// Lemmatizer DOM elements
const lemmatizerInput = document.getElementById('lemmatizer-input') as HTMLInputElement;
const btnRunLemmatize = document.getElementById('btn-run-lemmatize') as HTMLButtonElement;
const lemmatizerResults = document.getElementById('lemmatizer-results') as HTMLDivElement;

// Kosha Downloader DOM elements
const btnDownloadKosha = document.getElementById('btn-download-kosha') as HTMLButtonElement;
const inputUploadKoshaZip = document.getElementById('input-upload-kosha-zip') as HTMLInputElement;
const btnExportKosha = document.getElementById('btn-export-kosha') as HTMLButtonElement;
const btnDeleteKosha = document.getElementById('btn-delete-kosha') as HTMLButtonElement;
const koshaCacheBadge = document.getElementById('kosha-cache-badge') as HTMLSpanElement;
const koshaProgressContainer = document.getElementById('kosha-progress-container') as HTMLDivElement;
const koshaProgressBar = document.getElementById('kosha-progress-bar') as HTMLDivElement;
const koshaProgressText = document.getElementById('kosha-progress-text') as HTMLDivElement;
const koshaDetailsContainer = document.getElementById('kosha-details-container') as HTMLDivElement;
const koshaDetailsInfo = document.getElementById('kosha-details-info') as HTMLDivElement;

// Tab buttons and containers
const tabInteractiveBtn = document.getElementById('tab-interactive')!;
const tabEditorBtn = document.getElementById('tab-editor')!;
const tabSargeantBtn = document.getElementById('tab-sargeant')!;
const tabTransliterationBtn = document.getElementById('tab-transliteration')!;
const editorContainerEl = document.getElementById('editor-container')!;
const mainEditorEl = document.getElementById('main-sanskrit-editor') as SanskritEditorElement;

/**
 * Initialize application
 */
function init(): void {
  applyTheme(activeSettings.theme);
  themeSelector.value = activeSettings.theme;

  // Sync 4-layer controls
  layerDevaToggle.checked = activeSettings.layers.devanagari.visible;
  layerDevaVersion.value = activeSettings.layers.devanagari.version;
  layerTranslitToggle.checked = activeSettings.layers.transliteration.visible;
  layerTranslitVersion.value = activeSettings.layers.transliteration.version;
  layerTransToggle.checked = activeSettings.layers.translation.visible;
  layerTransLang.value = activeSettings.layers.translation.activeLang;
  if (activeSettings.layers.meter) {
    layerMeterToggle.checked = activeSettings.layers.meter.visible;
    layerMeterView.value = activeSettings.layers.meter.showAksharas ? 'full' : 'name_only';
  }
  if (layerCommToggle) {
    layerCommToggle.checked = activeSettings.layers.commentary?.visible ?? true;
  }

  updateDocHeader();
  renderVerses();
  renderSargeantView();
  renderCharacterTable();
  setupEventListeners();
  updateTester();
  runLemmatizer();
  updateKoshaDownloaderStatus();
}

async function updateKoshaDownloaderStatus(): Promise<void> {
  if (!koshaCacheBadge) return;
  const status = await checkKoshaCacheStatus();
  if (status.isDownloaded) {
    koshaCacheBadge.textContent = `✅ Uloženo offline (${status.sizeFormatted || '18,5 MB'})`;
    koshaCacheBadge.style.color = 'var(--accent-gold)';
    koshaCacheBadge.style.borderColor = 'var(--accent-gold)';
    btnDownloadKosha.textContent = '🔄 Znovu stáhnout / aktualizovat';
    btnExportKosha.style.display = 'inline-block';
    btnDeleteKosha.style.display = 'inline-block';

    if (status.filenames && status.filenames.length > 0) {
      koshaDetailsContainer.style.display = 'block';
      const fileListHtml = status.filenames.slice(0, 10).map((f) => `<code>${escapeHtml(f)}</code>`).join(', ');
      const moreText = status.filenames.length > 10 ? ` a dalších ${status.filenames.length - 10} souborů...` : '';
      koshaDetailsInfo.innerHTML = `
        <strong>📁 Obsah archivu v IndexedDB:</strong> ${fileListHtml}${moreText}<br>
        <small style="color: var(--text-muted);">Verze: ${status.version || '0.4.0'} | Uloženo: ${status.downloadedAt ? new Date(status.downloadedAt).toLocaleString('cs-CZ') : 'nyní'}</small>
      `;
    } else {
      koshaDetailsContainer.style.display = 'none';
    }
  } else {
    koshaCacheBadge.textContent = '❌ Nestaženo (používá se lehký režim)';
    koshaCacheBadge.style.color = 'var(--text-muted)';
    koshaCacheBadge.style.borderColor = 'var(--bg-card-border)';
    btnDownloadKosha.textContent = '📥 Stáhnout slovník do prohlížeče (~18,5 MB)';
    btnExportKosha.style.display = 'none';
    btnDeleteKosha.style.display = 'none';
    koshaDetailsContainer.style.display = 'none';
  }
}

function applyTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
  activeSettings.theme = theme as any;
  saveSettingsToCache(activeSettings);
}

function updateDocHeader(): void {
  docTitleEl.textContent = activeDoc.document.title;
  docSubtitleEl.textContent = `${activeDoc.document.section || ''} ${activeDoc.document.tradition ? `(${activeDoc.document.tradition})` : ''}`;
}

let activeReaderEl: SanskritReaderElement | null = null;

/**
 * Render Standalone Web Component Sanskrit Reader (<sanskrit-reader>)
 */
function renderVerses(): void {
  versesContainerEl.innerHTML = '';

  const reader = document.createElement('sanskrit-reader') as SanskritReaderElement;
  reader.document = activeDoc;
  reader.setGlobalLayers({
    devanagari: activeSettings.layers.devanagari.visible,
    transliteration: activeSettings.layers.transliteration.visible,
    translation: activeSettings.layers.translation.visible,
    meter: activeSettings.layers.meter?.visible ?? true,
    commentary: activeSettings.layers.commentary?.visible ?? true
  });
  reader.setOptions({
    transliterationVersion: activeSettings.layers.transliteration.version,
    translationFilter: activeSettings.layers.translation.activeLang,
    devanagariVersion: activeSettings.layers.devanagari.version,
    showMeterAksharas: activeSettings.layers.meter?.showAksharas ?? true
  });

  versesContainerEl.appendChild(reader);
  activeReaderEl = reader;
}

function syncGlobalLayersToReader(): void {
  if (activeReaderEl) {
    activeReaderEl.setGlobalLayers({
      devanagari: activeSettings.layers.devanagari.visible,
      transliteration: activeSettings.layers.transliteration.visible,
      translation: activeSettings.layers.translation.visible,
      meter: activeSettings.layers.meter?.visible ?? true,
      commentary: activeSettings.layers.commentary?.visible ?? true
    });
    activeReaderEl.setOptions({
      transliterationVersion: activeSettings.layers.transliteration.version,
      translationFilter: activeSettings.layers.translation.activeLang,
      devanagariVersion: activeSettings.layers.devanagari.version,
      showMeterAksharas: activeSettings.layers.meter?.showAksharas ?? true
    });
  } else {
    renderVerses();
  }
}





/**
 * Open Word Details Popup Modal (Multilingual Support)
 */
export function openWordModal(_token: Token): void {
  // Built-in word modal is handled inside <sanskrit-reader> component
}

export function closeWordModal(): void {}

/**
 * Render Sargeant Print View
 */
function renderSargeantView(): void {
  const currentLang = activeSettings.layers.translation.activeLang.startsWith('en') ? 'en' : 'cs';
  sargeantContainerEl.innerHTML = activeDoc.verses
    .map((v) => generateSargeantHtml(v, currentLang))
    .join('\n');
}

/**
 * Render Character Tables Inspector (Base vs. Ligatures)
 */
function renderCharacterTable(): void {
  charGridDisplay.innerHTML = '';

  if (activeCharTableTab === 'base') {
    activeAlphabetTable.baseCharacters.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'char-cell';
      cell.innerHTML = `
        <div class="char-deva-big">${item.devanagari}</div>
        <div class="char-translit-label"><strong>IAST:</strong> ${item.iast}</div>
        <div class="char-translit-label"><strong>ČR:</strong> ${item.cs_phonetic}</div>
        <div class="char-translit-label" style="font-size: 0.72rem; color: var(--text-muted);">${item.category}</div>
      `;
      charGridDisplay.appendChild(cell);
    });
  } else {
    activeAlphabetTable.ligatures.forEach((lig) => {
      const cell = document.createElement('div');
      cell.className = 'char-cell';
      cell.innerHTML = `
        <div class="char-deva-big">${lig.devanagari}</div>
        <div class="char-translit-label"><strong>IAST:</strong> ${lig.iast}</div>
        <div class="char-translit-label"><strong>ČR:</strong> ${lig.cs_phonetic}</div>
        <div class="char-translit-label" style="font-size: 0.72rem; color: var(--accent-terracotta);">${lig.description || 'ligatura'}</div>
      `;
      charGridDisplay.appendChild(cell);
    });
  }
}

/**
 * Update Transliteration Tester
 */
function updateTester(): void {
  const deva = testInputDeva.value;
  const iast = devanagariToIast(deva);
  const cs = iastToCzechPhonetic(iast, activeSettings.czechRules);

  testOutputIast.value = iast;
  testOutputCs.value = cs;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Execute client-side Sanskrit lemmatizer and morphological analysis via Vidyut WASM
 */
async function runLemmatizer(): Promise<void> {
  if (!lemmatizerInput || !lemmatizerResults) return;
  const query = lemmatizerInput.value.trim();

  if (!query) {
    lemmatizerResults.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Zadejte sanskrtské slovo k analýze (např. yogasya, karmaṇi, citta, karoti)...</div>';
    return;
  }

  lemmatizerResults.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Probíhá analýza ve WebAssembly (Vidyut)...</div>';

  try {
    const fullResult = await analyzeSanskritWordFull(query);
    const analyses = fullResult.analyses;

    let itemsHtml = '';
    if (analyses.length === 0) {
      itemsHtml = `
        <div style="margin-bottom: 0.5rem; color: var(--accent-terracotta); font-weight: 500;">
          V morfologické databázi nebyl nalezen přesný tvar pro „<strong>${escapeHtml(query)}</strong>“.
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          Může jít o méně obvyklý kmen. Vyhledejte heslo přímo v ověřených online slovnících:
        </div>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <a href="${getDictionaryUrl(query, 'cologne_mw')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">Monier-Williams ↗</a>
          <a href="${getDictionaryUrl(query, 'cologne_apte')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">Apte ↗</a>
          <a href="${getDictionaryUrl(query, 'wisdomlib')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">WisdomLib ↗</a>
          <a href="${getDictionaryUrl(query, 'ambuda')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">Ambuda ↗</a>
        </div>
      `;
    } else {
      itemsHtml = analyses
        .map((a, idx) => {
          const mwUrl = getDictionaryUrl(a.lemma, 'cologne_mw');
          const apteUrl = getDictionaryUrl(a.lemma, 'cologne_apte');
          const wisdomUrl = getDictionaryUrl(a.lemma, 'wisdomlib');
          const ambudaUrl = getDictionaryUrl(a.lemma, 'ambuda');

          return `
          <div style="padding: 0.6rem 0; ${idx > 0 ? 'border-top: 1px dashed var(--bg-card-border);' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.82rem; color: var(--text-muted); margin-right: 0.35rem;">Heslo / lemma:</span>
                <strong style="color: var(--accent-saffron); font-size: 1.1rem; font-family: 'Tiro Devanagari Sanskrit', serif;">${escapeHtml(a.lemma)}</strong>
                ${a.stem ? `<span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;">(kmen: <em>${escapeHtml(a.stem)}</em>)</span>` : ''}
                ${a.root ? `<span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;">(kořen: <em>√${escapeHtml(a.root)}</em>)</span>` : ''}
              </div>
              <span style="font-size: 0.78rem; background: var(--bg-primary); border: 1px solid var(--bg-card-border); border-radius: 4px; padding: 2px 6px; color: var(--accent-gold);">
                spolehlivost ${(a.confidence * 100).toFixed(0)} %
              </span>
            </div>
            <div style="margin-top: 0.3rem; font-weight: 500; color: var(--text-main);">
              Česky: ${escapeHtml(a.label_cs)}
            </div>
            <div style="margin-top: 0.2rem; font-size: 0.82rem; color: var(--text-muted);">
              EN: ${escapeHtml(a.label_en)}
            </div>
            <div style="margin-top: 0.45rem; display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.78rem; color: var(--text-muted);">Slovníky pro heslo:</span>
              <a href="${mwUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">Monier-Williams ↗</a>
              <a href="${apteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">Apte ↗</a>
              <a href="${wisdomUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">WisdomLib ↗</a>
              <a href="${ambudaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">Ambuda ↗</a>
            </div>
          </div>
        `;
        })
        .join('');
    }

    // Sandhi splits section from Vidyut WASM
    let sandhiHtml = '';
    if (fullResult.sandhiSplits && fullResult.sandhiSplits.length > 0) {
      sandhiHtml = `
        <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid var(--bg-card-border);">
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.4rem;">
            🔗 Možný rozklad sandhiových spřežek (Ambuda Vidyut Sandhi WASM):
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            ${fullResult.sandhiSplits.map(s => `
              <span style="font-size: 0.82rem; background: var(--bg-primary); border: 1px solid var(--bg-card-border); border-radius: var(--radius-sm); padding: 3px 8px;">
                <strong>${escapeHtml(s.firstIast)}</strong> (${escapeHtml(s.firstDeva)}) + <strong>${escapeHtml(s.secondIast)}</strong> (${escapeHtml(s.secondDeva)})
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Chandas meter section from Vidyut WASM
    let meterHtml = '';
    if (fullResult.meterInfo && fullResult.meterInfo.aksharas.length > 0) {
      meterHtml = `
        <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid var(--bg-card-border);">
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.4rem;">
            🎵 Metrické slabiky a délky (Ambuda Vidyut Chandas WASM):
          </div>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${fullResult.meterInfo.aksharas.map(ak => `
              <span title="${ak.weightLabelCs}" style="font-size: 0.82rem; background: var(--bg-primary); border: 1px solid ${ak.weight === 'G' ? 'var(--accent-saffron)' : 'var(--bg-card-border)'}; border-radius: 4px; padding: 2px 6px;">
                ${escapeHtml(ak.text)} <sub style="font-weight: bold; color: ${ak.weight === 'G' ? 'var(--accent-saffron)' : 'var(--text-muted)'};">${ak.weight === 'G' ? '— (G)' : '∪ (L)'}</sub>
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Paninian Prakriya derivation tree from Vidyut WASM
    let prakriyaHtml = '';
    if (fullResult.prakriyaTree && fullResult.prakriyaTree.steps.length > 0) {
      const tree = fullResult.prakriyaTree;
      prakriyaHtml = `
        <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid var(--bg-card-border);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.4rem;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main);">
              🏛️ Pāṇiniovský derivační strom (vidyut-prakriya / Aṣṭādhyāyī):
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(tree.linguisticNotes.type)} (${tree.steps.length} kroků)</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 220px; overflow-y: auto;">
            ${tree.steps.map(s => `
              <div style="background: var(--bg-primary); border: 1px solid var(--bg-card-border); border-radius: 4px; padding: 0.3rem 0.55rem; display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.82rem;">
                <span>
                  <strong style="color: var(--text-muted); font-size: 0.78rem;">${s.stepNumber}.</strong>
                  <code style="font-family: monospace; color: var(--accent-gold); font-size: 0.88rem;">${escapeHtml(s.termsIast)}</code>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.35rem;">(${escapeHtml(s.termsDeva)})</span>
                </span>
                <a href="${s.sutraUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--accent-terracotta); text-decoration: underline;" title="Zobrazit pravidlo a komentář na Ashtadhyayi.com">
                  Aṣṭ. ${escapeHtml(s.ruleCode)} ↗
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    lemmatizerResults.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4rem;">
        <span style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">
          Výsledky analýzy:
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">
          ⚡ Powered by <a href="${VIDYUT_METADATA.repository}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); text-decoration: underline;">Ambuda Vidyut</a> (${VIDYUT_METADATA.license} License)
        </span>
      </div>
      ${itemsHtml}
      ${sandhiHtml}
      ${meterHtml}
      ${prakriyaHtml}
    `;
  } catch (err: any) {
    lemmatizerResults.innerHTML = `<div style="color: var(--accent-terracotta);">Chyba při analýze: ${escapeHtml(err.message)}</div>`;
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners(): void {
  // Theme change listener
  themeSelector.addEventListener('change', (e) => {
    const newTheme = (e.target as HTMLSelectElement).value;
    applyTheme(newTheme);
  });

  // Tabs
  tabInteractiveBtn.addEventListener('click', () => switchTab('interactive'));
  tabEditorBtn.addEventListener('click', () => switchTab('editor'));
  tabSargeantBtn.addEventListener('click', () => switchTab('sargeant'));
  tabTransliterationBtn.addEventListener('click', () => switchTab('transliteration'));

  // Sync saved edits from <sanskrit-editor> to reader and local cache
  if (mainEditorEl) {
    mainEditorEl.addEventListener('verse-saved', () => {
      saveDocumentToCache(activeDoc);
      updateDocHeader();
      renderVerses();
      renderSargeantView();
    });

    mainEditorEl.addEventListener('document-change', (e: any) => {
      if (e.detail?.document) {
        activeDoc = e.detail.document;
        saveDocumentToCache(activeDoc);
        updateDocHeader();
        renderVerses();
        renderSargeantView();
      }
    });

    mainEditorEl.addEventListener('project-loaded', (e: any) => {
      if (e.detail?.bundle?.document) {
        activeDoc = e.detail.bundle.document;
        saveDocumentToCache(activeDoc);
        updateDocHeader();
        renderVerses();
        renderSargeantView();
      }
    });
  }

  // 3-Layer Event Handlers
  layerDevaToggle.addEventListener('change', (e) => {
    activeSettings.layers.devanagari.visible = (e.target as HTMLInputElement).checked;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });
  layerDevaVersion.addEventListener('change', (e) => {
    activeSettings.layers.devanagari.version = (e.target as HTMLSelectElement).value as any;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });

  layerTranslitToggle.addEventListener('change', (e) => {
    activeSettings.layers.transliteration.visible = (e.target as HTMLInputElement).checked;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });
  layerTranslitVersion.addEventListener('change', (e) => {
    activeSettings.layers.transliteration.version = (e.target as HTMLSelectElement).value as any;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });

  layerTransToggle.addEventListener('change', (e) => {
    activeSettings.layers.translation.visible = (e.target as HTMLInputElement).checked;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });
  layerTransLang.addEventListener('change', (e) => {
    activeSettings.layers.translation.activeLang = (e.target as HTMLSelectElement).value;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
    renderSargeantView();
  });

  // Layer 4: Meter & Rhythm (Chandas)
  layerMeterToggle.addEventListener('change', (e) => {
    if (!activeSettings.layers.meter) activeSettings.layers.meter = { visible: true, showAksharas: true };
    activeSettings.layers.meter.visible = (e.target as HTMLInputElement).checked;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });
  layerMeterView.addEventListener('change', (e) => {
    if (!activeSettings.layers.meter) activeSettings.layers.meter = { visible: true, showAksharas: true };
    activeSettings.layers.meter.showAksharas = (e.target as HTMLSelectElement).value === 'full';
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });

  // Layer 5: Commentaries & Exegesis
  layerCommToggle?.addEventListener('change', (e) => {
    if (!activeSettings.layers.commentary) {
      activeSettings.layers.commentary = { visible: true, activeAuthors: [], activeLangs: ['sa', 'cs', 'en'], layout: 'stacked' };
    }
    activeSettings.layers.commentary.visible = (e.target as HTMLInputElement).checked;
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });
  layerCommView?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (!activeSettings.layers.commentary) {
      activeSettings.layers.commentary = { visible: true, activeAuthors: [], activeLangs: ['sa', 'cs', 'en'], layout: 'stacked' };
    }
    if (val === 'sanskrit_only') {
      activeSettings.layers.commentary.activeLangs = ['sa'];
    } else if (val === 'vernacular_only') {
      activeSettings.layers.commentary.activeLangs = ['cs', 'en'];
    } else {
      activeSettings.layers.commentary.activeLangs = ['sa', 'cs', 'en'];
    }
    saveSettingsToCache(activeSettings);
    syncGlobalLayersToReader();
  });

  // Character table sub-tabs
  btnTabCharsBase.addEventListener('click', () => {
    activeCharTableTab = 'base';
    btnTabCharsBase.className = 'btn btn-primary';
    btnTabCharsLigatures.className = 'btn btn-outline';
    renderCharacterTable();
  });
  btnTabCharsLigatures.addEventListener('click', () => {
    activeCharTableTab = 'ligatures';
    btnTabCharsBase.className = 'btn btn-outline';
    btnTabCharsLigatures.className = 'btn btn-primary';
    renderCharacterTable();
  });

  // Export / Import Character Table
  btnExportTable.addEventListener('click', () => {
    const json = exportAlphabetTableToJSON(activeAlphabetTable);
    downloadJsonFile('sanskrit-alphabet-table.json', json);
  });
  btnImportTable.addEventListener('click', () => {
    fileInputTable.click();
  });
  fileInputTable.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        const text = await file.text();
        activeAlphabetTable = importAlphabetTableFromJSON(text);
        renderCharacterTable();
        alert('Znaková tabulka byla úspěšně načtena!');
      } catch (err: any) {
        alert('Chyba při čtení znakové tabulky: ' + err.message);
      }
    }
  });



  // Save / Export Document
  btnExportDoc.addEventListener('click', () => {
    exportDocument(activeDoc);
  });

  // Import Document
  btnImportDoc.addEventListener('click', () => {
    fileInputDoc.click();
  });
  fileInputDoc.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        const loaded = await importDocumentFromFile(file);
        activeDoc = loaded;
        saveDocumentToCache(activeDoc);
        updateDocHeader();
        renderVerses();
        renderSargeantView();
        alert(`Dokument „${activeDoc.document.title}“ byl úspěšně načten!`);
      } catch (err: any) {
        alert('Chyba při čtení souboru: ' + err.message);
      }
    }
  });

  // Save / Export Settings
  btnExportSettings.addEventListener('click', () => {
    exportSettings(activeSettings);
  });

  // Import Settings
  btnImportSettings.addEventListener('click', () => {
    fileInputSettings.click();
  });
  fileInputSettings.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        const loaded = await importSettingsFromFile(file);
        activeSettings = loaded;
        saveSettingsToCache(activeSettings);
        applyTheme(activeSettings.theme);
        themeSelector.value = activeSettings.theme;

        // Sync 4-layer controls
        layerDevaToggle.checked = activeSettings.layers.devanagari.visible;
        layerDevaVersion.value = activeSettings.layers.devanagari.version;
        layerTranslitToggle.checked = activeSettings.layers.transliteration.visible;
        layerTranslitVersion.value = activeSettings.layers.transliteration.version;
        layerTransToggle.checked = activeSettings.layers.translation.visible;
        layerTransLang.value = activeSettings.layers.translation.activeLang;
        if (activeSettings.layers.meter) {
          layerMeterToggle.checked = activeSettings.layers.meter.visible;
          layerMeterView.value = activeSettings.layers.meter.showAksharas ? 'full' : 'name_only';
        }

        updateTester();
        renderVerses();
        renderSargeantView();
        alert('Pravidla a konfigurace byly úspěšně načteny!');
      } catch (err: any) {
        alert('Chyba při čtení nastavení: ' + err.message);
      }
    }
  });

  // Print button
  btnPrintView.addEventListener('click', () => {
    switchTab('sargeant');
    setTimeout(() => {
      window.print();
    }, 200);
  });

  // Transliteration tester input
  testInputDeva.addEventListener('input', updateTester);

  // Rule change listeners
  const onRuleChange = () => {
    activeSettings.czechRules = createCzechRules({
      ...activeSettings.czechRules,
      rSyllabic: ruleRSyllabic.value as any,
      longVowels: ruleLongVowels.value as any,
      cPalatal: ruleCPalatal.value as any,
      jAffricate: ruleJAffricate.value as any
    });
    saveSettingsToCache(activeSettings);
    updateTester();
    renderVerses();
  };

  ruleRSyllabic.addEventListener('change', onRuleChange);
  ruleLongVowels.addEventListener('change', onRuleChange);
  ruleCPalatal.addEventListener('change', onRuleChange);
  ruleJAffricate.addEventListener('change', onRuleChange);

  // Lemmatizer listeners
  btnRunLemmatize.addEventListener('click', runLemmatizer);
  lemmatizerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runLemmatizer();
    }
  });

  // Offline Kosha Downloader listeners
  btnDownloadKosha.addEventListener('click', async () => {
    const proceed = confirm(
      'Spustit stahování archivu data-0.4.0.zip (~18,5 MB)?\n\n' +
      '⚠️ Upozornění: V závislosti na rychlosti vašeho internetového připojení může stahování trvat 5 až 40 sekund.\n' +
      'Data budou trvale uložena v offline mezipaměti prohlížeče (IndexedDB).'
    );
    if (!proceed) return;

    koshaProgressContainer.style.display = 'block';
    koshaProgressBar.style.width = '0%';
    koshaProgressText.textContent = 'Navazuji spojení s GitHub Releases...';
    btnDownloadKosha.disabled = true;

    try {
      const blob = await downloadVidyutKoshaZip((progress) => {
        koshaProgressBar.style.width = `${progress.percent}%`;
        koshaProgressText.textContent = progress.statusText;
      });

      koshaProgressText.textContent = 'Prověřuji strukturu souborů v archivu...';
      const filenames = await inspectZipArchive(blob);

      koshaProgressText.textContent = 'Ukládám do IndexedDB mezipaměti...';
      await saveKoshaZipToIndexedDb(blob, filenames, 'data-0.4.0.zip');

      koshaProgressText.textContent = '✅ Slovník byl úspěšně stažen a uložen pro offline použití!';
      setTimeout(() => {
        koshaProgressContainer.style.display = 'none';
      }, 3500);
    } catch (err: any) {
      koshaProgressText.innerHTML = `
        <span style="color: var(--accent-terracotta); font-weight: 600;">❌ Chyba stahování: ${escapeHtml(err.message)}</span><br>
        <span style="font-size: 0.78rem; color: var(--text-muted);">Pokud váš prohlížeč blokuje stahování kvůli CORS ochraně GitHubu, stáhněte soubor přímo odkazem <a href="${VIDYUT_DATA_ARCHIVE_INFO.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); text-decoration: underline;">data-0.4.0.zip</a> a poté klikněte na <strong>'Vybrat ZIP z disku'</strong>.</span>
      `;
    } finally {
      btnDownloadKosha.disabled = false;
      await updateKoshaDownloaderStatus();
    }
  });

  inputUploadKoshaZip.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    koshaProgressContainer.style.display = 'block';
    koshaProgressBar.style.width = '50%';
    koshaProgressText.textContent = `Načítám soubor ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`;

    try {
      const filenames = await inspectZipArchive(file);
      await saveKoshaZipToIndexedDb(file, filenames, file.name);
      koshaProgressBar.style.width = '100%';
      koshaProgressText.textContent = `✅ Soubor ${file.name} byl úspěšně uložen do IndexedDB!`;
      setTimeout(() => {
        koshaProgressContainer.style.display = 'none';
      }, 3000);
    } catch (err: any) {
      alert('Chyba při čtení ZIP archivu: ' + err.message);
      koshaProgressContainer.style.display = 'none';
    } finally {
      await updateKoshaDownloaderStatus();
      inputUploadKoshaZip.value = '';
    }
  });

  btnExportKosha.addEventListener('click', async () => {
    const cached = await getKoshaZipFromIndexedDb();
    if (cached && cached.blob) {
      exportKoshaZipToDisk(cached.blob, cached.meta.filename || 'data-0.4.0.zip');
    } else {
      alert('V mezipaměti nebyl nalezen žádný soubor k uložení.');
    }
  });

  btnDeleteKosha.addEventListener('click', async () => {
    if (confirm('Opravdu chcete odstranit stažený slovník Vidyut z mezipaměti prohlížeče?')) {
      await deleteKoshaZipFromIndexedDb();
      await updateKoshaDownloaderStatus();
      alert('Slovník byl odstraněn z mezipaměti prohlížeče.');
    }
  });
}

function switchTab(tab: 'interactive' | 'editor' | 'sargeant' | 'transliteration'): void {
  tabInteractiveBtn.classList.toggle('active', tab === 'interactive');
  tabEditorBtn.classList.toggle('active', tab === 'editor');
  tabSargeantBtn.classList.toggle('active', tab === 'sargeant');
  tabTransliterationBtn.classList.toggle('active', tab === 'transliteration');

  versesContainerEl.style.display = tab === 'interactive' ? 'block' : 'none';
  editorContainerEl.style.display = tab === 'editor' ? 'block' : 'none';
  sargeantContainerEl.style.display = tab === 'sargeant' ? 'block' : 'none';
  panelTransliterationEl.style.display = tab === 'transliteration' ? 'block' : 'none';
  viewControlsEl.style.display = (tab === 'interactive' || tab === 'sargeant') ? 'block' : 'none';

  if (tab === 'editor' && mainEditorEl) {
    mainEditorEl.document = activeDoc;
    if (activeDoc.verses.length > 0 && !mainEditorEl.verse) {
      mainEditorEl.verse = activeDoc.verses[0];
    }
  }
}

// Start app
init();
