/**
 * GUI & Technical Interface Translation Types
 * 
 * Separates user interface, layout, technological buttons, dialogs and LLM controls
 * from pure philological/linguistic grammatical data.
 */

export interface GuiDictionary {
  appTitle: string;
  appSubtitle: string;
  themeLabel: string;
  themeParchment: string;
  themeDark: string;
  themeAshram: string;
  themeAcademic: string;
  langToggle: string;

  // Main Tabs
  tabReader: string;
  tabEditor: string;
  tabPrint: string;
  tabRules: string;

  // Save & Project Bundle
  btnSaveProject: string;
  btnLoadProject: string;
  btnExportDoc: string;
  btnImportDoc: string;
  btnExportSettings: string;
  btnImportSettings: string;

  // CAT Editor Header
  editorTitle: string;
  selectVerse: string;
  statusUntranslated: string;
  statusDraft: string;
  statusInReview: string;
  statusTranslated: string;
  statusVerified: string;
  progressLabel: string;
  btnPrevVerse: string;
  btnNextVerse: string;
  btnSaveAndNext: string;
  btnSaveVerse: string;
  btnNewVerse: string;
  btnExportVerseJson: string;
  btnImportVerseJson: string;

  // Editor Sub-tabs
  editorTabEdit: string;
  editorTabCorpus: string;
  editorTabIndex: string;

  // Context Ribbon
  contextPrev: string;
  contextNext: string;

  // On-Demand Grammar & Dictionaries
  grammarHighlightsToggle: string;
  grammarInspectorTitle: string;
  dictLookupTitle: string;
  dictOpenMw: string;
  dictOpenApte: string;
  dictOpenWisdom: string;
  dictOpenAmbuda: string;
  dictOpenKosha: string;

  // Diacritics & IME
  iastBarTitle: string;
  iastBarHelp: string;
  imeToggleOn: string;
  imeToggleOff: string;
  btnPaninianKb: string;

  // Termbase & Glossary
  glossaryTitle: string;
  glossaryAddTerm: string;
  glossaryInOtherVerse: string;
  glossaryTerm: string;
  glossaryTrans: string;
  glossaryInsertHint: string;

  // Alignment Tool
  alignTitle: string;
  alignHelp: string;
  alignAuto: string;
  alignClear: string;

  // Split-view Preview
  livePreviewTitle: string;
  liveSyncBadge: string;

  // Corpus & Bulk Import
  bookHierarchyTitle: string;
  searchBookPlaceholder: string;
  bulkImportTitle: string;
  bulkImportDesc: string;
  bookNameLabel: string;
  chapterNameLabel: string;
  bulkTextareaPlaceholder: string;
  btnRunBulkImport: string;
  exportSubsetHtml: string;
  exportSubsetJson: string;
  exportSubsetMd: string;

  // Index & Concordance
  indexVerborumTitle: string;
  indexVerborumDesc: string;
  btnGenFullIndex: string;
  searchConcordancePlaceholder: string;
  btnSearchConcordance: string;

  // LLM Assistant
  llmPanelTitle: string;
  llmToggleBtn: string;
  llmTabTranslate: string;
  llmTabAlign: string;
  llmTabGrammar: string;
  llmTabCritique: string;
  llmTabSettings: string;
  llmRunAnalysis: string;
  llmRunning: string;
  llmApplyTranslation: string;
  llmApplyAlignments: string;
  llmApplyGrammar: string;
  llmInsertCommentary: string;
  llmEndpointLabel: string;
  llmApiKeyLabel: string;
  llmModelLabel: string;
  llmPresetLabel: string;
  llmContextVersesLabel: string;
  llmIncludeGlossaryLabel: string;
  llmCustomPromptLabel: string;
  llmPromptPreviewLabel: string;
  llmStatusReady: string;
  llmStatusSuccess: string;
  llmStatusError: string;
  llmRawResponseLabel: string;

  // Commentaries & Exegesis
  commentariesTitle: string;
  commentariesDesc: string;
  btnAddCommentary: string;
  btnSaveCommentary: string;
  btnDeleteCommentary: string;
  btnEditCommentary: string;
  commentaryAuthor: string;
  commentaryTradition: string;
  commentaryTitle: string;
  commentaryLanguage: string;
  commentaryText: string;
  commentarySource: string;
  commentariesSimultaneousView: string;
  commentariesFilterAll: string;
  noCommentariesNotice: string;
}

export type GuiTranslationKey = keyof GuiDictionary;
