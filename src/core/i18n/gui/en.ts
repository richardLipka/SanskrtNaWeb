import { GuiDictionary } from './types.ts';

export const ENGLISH_GUI: GuiDictionary = {
  appTitle: 'Sanskrit On The Web',
  appSubtitle: 'Professional Philological Sanskrit Reader & CAT Translation Workstation',
  themeLabel: 'Theme',
  themeParchment: '📜 Traditional Manuscript (Parchment)',
  themeDark: '🌙 Modern Dark (Dark)',
  themeAshram: '🌅 Saffron & Terracotta (Ashram)',
  themeAcademic: '🏛️ Clean Academic (Academic)',
  langToggle: 'Interface Language',

  // Main Tabs
  tabReader: '📖 3-Layer Reader',
  tabEditor: '✏️ CAT Translation Workstation',
  tabPrint: '📄 Print View (Sargeant)',
  tabRules: '⌨️ Alphabet Tables & Rules',

  // Save & Project Bundle
  btnSaveProject: '💾 Save Project Workspace (JSON)',
  btnLoadProject: '📂 Restore Project from File',
  btnExportDoc: '💾 Save Document (JSON)',
  btnImportDoc: '📂 Open Document',
  btnExportSettings: '⚙️ Save Settings',
  btnImportSettings: '📥 Load Settings',

  // CAT Editor Header
  editorTitle: '✏️ Philological Translation Workstation & Corpus',
  selectVerse: 'Active Verse',
  statusUntranslated: 'Untranslated',
  statusDraft: 'In Progress (Draft)',
  statusInReview: 'In Review',
  statusTranslated: 'Translated',
  statusVerified: 'Verified / Approved',
  progressLabel: 'Chapter Progress',
  btnPrevVerse: '◀ Previous (Alt+↑)',
  btnNextVerse: 'Next (Alt+↓)',
  btnSaveAndNext: 'Save & Next Verse (Ctrl+Enter)',
  btnSaveVerse: '💾 Save Verse',
  btnNewVerse: '➕ New Verse',
  btnExportVerseJson: '📤 Export Verse',
  btnImportVerseJson: '📥 Import Verse',

  // Editor Sub-tabs
  editorTabEdit: '📝 CAT Translation Window',
  editorTabCorpus: '📚 Book Manager & Bulk Import',
  editorTabIndex: '📖 Index Verborum & Concordance',

  // Context Ribbon
  contextPrev: 'Previous Verse (Context)',
  contextNext: 'Next Verse (Context)',

  // On-Demand Grammar & Dictionaries
  grammarHighlightsToggle: 'Grammatical Structure Highlights (Cases / Verbs)',
  grammarInspectorTitle: '🏛️ Philological & Pāṇinian Word Analysis',
  dictLookupTitle: '🔍 Dictionary Lookup by Stem / Lemma',
  dictOpenMw: 'Cologne Monier-Williams (1899)',
  dictOpenApte: 'V. S. Apte (1957)',
  dictOpenWisdom: 'Wisdom Library',
  dictOpenAmbuda: 'Ambuda Dictionary',
  dictOpenKosha: 'Local Vidyut Kosha (IndexedDB)',

  // Diacritics & IME
  iastBarTitle: 'Virtual IAST Diacritic Bar',
  iastBarHelp: 'Inserts character at cursor position',
  imeToggleOn: '⚡ IME Translit: ON',
  imeToggleOff: '⚡ IME Translit: OFF',
  btnPaninianKb: '🏛️ Pāṇinian Keyboard',

  // Termbase & Glossary
  glossaryTitle: '💡 Integrated Glossary & Translation Memory',
  glossaryAddTerm: '➕ Add Term to Glossary',
  glossaryInOtherVerse: 'Translated in another verse in this book as',
  glossaryTerm: 'Sanskrit Stem / Word',
  glossaryTrans: 'Translation',
  glossaryInsertHint: 'Click a term to insert it directly into translation',

  // Alignment Tool
  alignTitle: 'Translation Alignment Tool',
  alignHelp: 'Click a Sanskrit token then click the corresponding word in translation',
  alignAuto: '🤖 Auto-Suggest Alignments',
  alignClear: '🧹 Clear Word Alignments',

  // Split-view Preview
  livePreviewTitle: '👁️ Live Verse Preview (Split-view)',
  liveSyncBadge: 'Live Sync',

  // Corpus & Bulk Import
  bookHierarchyTitle: '1. Book Hierarchy & Search',
  searchBookPlaceholder: '🔍 Search in entire book (word, number, meaning)...',
  bulkImportTitle: '2. Bulk Text Import for Books & Chapters',
  bulkImportDesc: 'Paste continuous Sanskrit text in Devanāgarī or IAST. The engine parses verses, generates transliterations and analyzes meter.',
  bookNameLabel: 'Book Title',
  chapterNameLabel: 'Chapter',
  bulkTextareaPlaceholder: 'Paste verses separated by blank line or ॥...',
  btnRunBulkImport: '🚀 Import Verses into Book',
  exportSubsetHtml: '📄 Export Standalone HTML (view/print)',
  exportSubsetJson: '💾 Export Selected Subset (JSON)',
  exportSubsetMd: '📝 Export Markdown',

  // Index & Concordance
  indexVerborumTitle: '📖 Index Verborum & Concordance',
  indexVerborumDesc: 'Complete book concordance: find all verses where a given word occurs and inspect used translations.',
  btnGenFullIndex: '📑 Generate Full Book Index',
  searchConcordancePlaceholder: 'Enter word or stem (e.g. yoga, dharma)...',
  btnSearchConcordance: 'Search Occurrences',

  // LLM Assistant
  llmPanelTitle: '🤖 Philological & Translation Assistant (LLM)',
  llmToggleBtn: '🤖 LLM Assistant',
  llmTabTranslate: '📝 Translation',
  llmTabAlign: '🔗 Auto-Align',
  llmTabGrammar: '🔍 Grammar Check',
  llmTabCritique: '💡 Feedback & Critique',
  llmTabSettings: '⚙️ Model Settings',
  llmRunAnalysis: '▶ Run LLM Analysis',
  llmRunning: '⏳ Communicating with model...',
  llmApplyTranslation: '📥 Apply Translation',
  llmApplyAlignments: '📥 Apply Word Alignments',
  llmApplyGrammar: '📥 Apply Grammar Corrections',
  llmInsertCommentary: '📥 Insert into Commentary',
  llmEndpointLabel: 'OpenAI-Compatible Endpoint URL',
  llmApiKeyLabel: 'API Key',
  llmModelLabel: 'Model Identifier',
  llmPresetLabel: 'Provider Preset',
  llmContextVersesLabel: 'Context Window Range (surrounding verses)',
  llmIncludeGlossaryLabel: 'Include project glossary in context',
  llmCustomPromptLabel: 'Custom System Prompt / Instructions (Optional)',
  llmPromptPreviewLabel: 'Prompt Preview',
  llmStatusReady: 'Ready to execute',
  llmStatusSuccess: 'Analysis completed successfully',
  llmStatusError: 'LLM Error',
  llmRawResponseLabel: 'Show Raw Response (JSON)',

  // Commentaries & Exegesis
  commentariesTitle: '📜 Commentaries & Exegesis (Bhāṣya & Ṭīkā)',
  commentariesDesc: 'Traditional Sanskrit commentaries (Śaṅkara, Rāmānuja, Madhva, Śrīdhara) and modern philological/translation notes.',
  btnAddCommentary: '➕ Add Commentary to Verse',
  btnSaveCommentary: '💾 Save Commentary',
  btnDeleteCommentary: '🗑️ Delete',
  btnEditCommentary: '✏️ Edit Commentary',
  commentaryAuthor: 'Commentator / Author',
  commentaryTradition: 'Philosophical School / Tradition',
  commentaryTitle: 'Work / Commentary Title',
  commentaryLanguage: 'Commentary Language',
  commentaryText: 'Commentary Text',
  commentarySource: 'Source / Edition / Citation',
  commentariesSimultaneousView: 'Simultaneous View of All Commentaries',
  commentariesFilterAll: 'All Commentaries',
  noCommentariesNotice: 'No commentaries have been added for this verse yet. You can add a traditional Sanskrit bhāṣya or a modern translator note.'
};
