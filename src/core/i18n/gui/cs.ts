import { GuiDictionary } from './types.ts';

export const CZECH_GUI: GuiDictionary = {
  appTitle: 'Sanskrt Na Web',
  appSubtitle: 'Profesionální filologická čtečka a překladatelská stanice sanskrtských textů',
  themeLabel: 'Vzhled',
  themeParchment: '📜 Tradiční rukopisný (Parchment)',
  themeDark: '🌙 Moderní tmavý (Dark)',
  themeAshram: '🌅 Šafrán & Terakota (Ashram)',
  themeAcademic: '🏛️ Akademický čistý (Academic)',
  langToggle: 'Jazyk rozhraní',

  // Main Tabs
  tabReader: '📖 3-Vrstvá čtečka',
  tabEditor: '✏️ CAT Překladatelská stanice',
  tabPrint: '📄 Tiskový režim (Sargeant)',
  tabRules: '⌨️ Znakové tabulky & Pravidla',

  // Save & Project Bundle
  btnSaveProject: '💾 Uložit rozpracovaný projekt (JSON)',
  btnLoadProject: '📂 Obnovit projekt ze souboru',
  btnExportDoc: '💾 Uložit text (JSON)',
  btnImportDoc: '📂 Otevřít text',
  btnExportSettings: '⚙️ Uložit pravidla',
  btnImportSettings: '📥 Načíst pravidla',

  // CAT Editor Header
  editorTitle: '✏️ Filologická překladatelská stanice & Kniha',
  selectVerse: 'Aktivní verš',
  statusUntranslated: 'Nezahájeno',
  statusDraft: 'Rozpracováno',
  statusInReview: 'Ke kontrole',
  statusTranslated: 'Přeloženo',
  statusVerified: 'Schváleno / Ověřeno',
  progressLabel: 'Překlad kapitoly',
  btnPrevVerse: '◀ Předchozí (Alt+↑)',
  btnNextVerse: 'Další (Alt+↓)',
  btnSaveAndNext: 'Uložit a přejít dále (Ctrl+Enter)',
  btnSaveVerse: '💾 Uložit verš',
  btnNewVerse: '➕ Nový verš',
  btnExportVerseJson: '📤 Export verše',
  btnImportVerseJson: '📥 Import verše',

  // Editor Sub-tabs
  editorTabEdit: '📝 CAT Překladatelské okno',
  editorTabCorpus: '📚 Správce knihy & Hromadný import',
  editorTabIndex: '📖 Rejstřík slovníku & Konkordance',

  // Context Ribbon
  contextPrev: 'Předchozí verš (Kontext)',
  contextNext: 'Následující verš (Kontext)',

  // On-Demand Grammar & Dictionaries
  grammarHighlightsToggle: 'Zvýraznění gramatické struktury (Pády / Časy)',
  grammarInspectorTitle: '🏛️ Filologický & Pāṇiniovský rozbor slova',
  dictLookupTitle: '🔍 Slovníkové hledání podle kmenu / lemmatu',
  dictOpenMw: 'Cologne Monier-Williams (1899)',
  dictOpenApte: 'V. S. Apte (1957)',
  dictOpenWisdom: 'Wisdom Library',
  dictOpenAmbuda: 'Ambuda Dictionary',
  dictOpenKosha: 'Lokální Vidyut Kosha (IndexedDB)',

  // Diacritics & IME
  iastBarTitle: 'Virtuální IAST diakritická lišta',
  iastBarHelp: 'Vloží znak na pozici kurzoru',
  imeToggleOn: '⚡ IME Přepis: ZAPNUTO',
  imeToggleOff: '⚡ IME Přepis: VYPNUTO',
  btnPaninianKb: '🏛️ Pāṇiniovská klávesnice',

  // Termbase & Glossary
  glossaryTitle: '💡 Integrovaný glosář & Překladová paměť',
  glossaryAddTerm: '➕ Přidat termín do glosáře',
  glossaryInOtherVerse: 'V jiném verši v této knize přeloženo jako',
  glossaryTerm: 'Sanskrtský kmen / slovo',
  glossaryTrans: 'Překlad',
  glossaryInsertHint: 'Kliknutím na výraz jej vložíte přímo do překladu',

  // Alignment Tool
  alignTitle: 'Nástroj pro přiřazení vazeb překladu',
  alignHelp: 'Klikněte na sanskrtské slovo a následně na slovo v překladu',
  alignAuto: '🤖 Auto-odhadnout vazby',
  alignClear: '🧹 Vymazat vazby slova',

  // Split-view Preview
  livePreviewTitle: '👁️ Živý náhled verše (Split-view)',
  liveSyncBadge: 'Živá synchronizace',

  // Corpus & Bulk Import
  bookHierarchyTitle: '1. Struktura knihy & Vyhledávání celků',
  searchBookPlaceholder: '🔍 Hledat v celé knize (slovo, číslo, význam)...',
  bulkImportTitle: '2. Hromadný import celých knih a kapitol',
  bulkImportDesc: 'Vložte souvislý text v dévanágarí nebo IAST. Systém text automaticky rozdělí na verše, vygeneruje transliteraci a detekuje metrum.',
  bookNameLabel: 'Název knihy',
  chapterNameLabel: 'Kapitola',
  bulkTextareaPlaceholder: 'Vložte text veršů oddělených prázdným řádkem nebo ॥...',
  btnRunBulkImport: '🚀 Importovat verše do knihy',
  exportSubsetHtml: '📄 Export do samostatného HTML (zobrazení/tisk)',
  exportSubsetJson: '💾 Export vybraného celku (JSON)',
  exportSubsetMd: '📝 Export Markdown',

  // Index & Concordance
  indexVerborumTitle: '📖 Rejstřík slovníku (Index Verborum) & Konkordance',
  indexVerborumDesc: 'Kompletní konkordance knihy: najděte všechny verše, kde se vyskytuje dané slovo, a prozkoumejte použitý překlad.',
  btnGenFullIndex: '📑 Vygenerovat kompletní rejstřík knihy',
  searchConcordancePlaceholder: 'Zadejte slovo nebo kmen (např. yoga, dharma)...',
  btnSearchConcordance: 'Hledat výskyty',

  // LLM Assistant
  llmPanelTitle: '🤖 Filologický & Překladatelský Asistent (LLM)',
  llmToggleBtn: '🤖 LLM Asistent',
  llmTabTranslate: '📝 Překlad',
  llmTabAlign: '🔗 Auto-párování',
  llmTabGrammar: '🔍 Oprava gramatiky',
  llmTabCritique: '💡 Zpětná vazba',
  llmTabSettings: '⚙️ Nastavení modelu',
  llmRunAnalysis: '▶ Spustit LLM analýzu',
  llmRunning: '⏳ Probíhá komunikace s modelem...',
  llmApplyTranslation: '📥 Použít navržený překlad',
  llmApplyAlignments: '📥 Aplikovat párování slov',
  llmApplyGrammar: '📥 Aplikovat gramatické opravy',
  llmInsertCommentary: '📥 Vložit do komentáře',
  llmEndpointLabel: 'OpenAI-kompatibilní Endpoint URL',
  llmApiKeyLabel: 'API Klíč',
  llmModelLabel: 'Název modelu',
  llmPresetLabel: 'Přednastavený poskytovatel',
  llmContextVersesLabel: 'Rozsah okolního kontextu (počet veršů)',
  llmIncludeGlossaryLabel: 'Zahrnout projektový glosář do kontextu',
  llmCustomPromptLabel: 'Vlastní systémový prompt / instrukce (volitelné)',
  llmPromptPreviewLabel: 'Náhled odesílaného promptu',
  llmStatusReady: 'Připraveno ke spuštění',
  llmStatusSuccess: 'Analýza úspěšně dokončena',
  llmStatusError: 'Chyba volání LLM',
  llmRawResponseLabel: 'Zobrazit surovou odpověď (JSON)',

  // Commentaries & Exegesis
  commentariesTitle: '📜 Komentáře & Tradiční výklady (Bhāṣya & Ṭīkā)',
  commentariesDesc: 'Tradiční sanskrtské výklady (Śaṅkara, Rāmānuja, Madhva, Śrīdhara) i moderní překladatelské a filologické poznámky.',
  btnAddCommentary: '➕ Přidat komentář k verši',
  btnSaveCommentary: '💾 Uložit komentář',
  btnDeleteCommentary: '🗑️ Smazat',
  btnEditCommentary: '✏️ Upravit komentář',
  commentaryAuthor: 'Autor komentáře / Komentátor',
  commentaryTradition: 'Filozofická škola / Tradice',
  commentaryTitle: 'Název díla / Komentáře',
  commentaryLanguage: 'Jazyk komentáře',
  commentaryText: 'Text komentáře',
  commentarySource: 'Pramen / Vydání / Citace',
  commentariesSimultaneousView: 'Současné zobrazení všech výkladů',
  commentariesFilterAll: 'Všechny komentáře',
  noCommentariesNotice: 'Pro tento verš zatím není zadán žádný komentář. Můžete přidat tradiční sanskrtský výklad nebo vlastní překladatelskou poznámku.'
};
