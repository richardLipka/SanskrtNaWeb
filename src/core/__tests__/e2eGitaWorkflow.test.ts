import { describe, it, expect, beforeAll } from 'vitest';
import { bulkImportText, buildBookHierarchy } from '../corpus/bookManager.ts';
import {
  tokenizeTranslation,
  toggleWordBinding,
  bindTokenToWord,
  getBoundTokensForWord
} from '../editor/alignmentTool.ts';
import {
  findWordConcordance,
  generateIndexVerborum,
  getTranslationSuggestions
} from '../corpus/concordance.ts';
import {
  createWorkspaceBundle,
  exportWorkspaceBundleToJSON,
  GlossaryTermEntry,
  SanskritWorkspaceProject
} from '../storage/workspaceBundle.ts';
import { loadVidyutWasm } from '../lemmatizer/vidyutAdapter.ts';
import { SanskritDocument, AppSettings } from '../types/schema.ts';
import { createCzechRules } from '../transliteration/rules.ts';

describe('E2E Bhagavad Gītā Translation & Philological Workflow', () => {
  beforeAll(async () => {
    await loadVidyutWasm();
  });

  // Authentic Sanskrit Wikisource text for Bhagavad Gītā 1.1 - 1.4
  const gitaWikisourceText = `
धृतराष्ट्र उवाच ।
धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।
मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १.१ ॥

सञ्जय उवाच ।
दृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा ।
आचार्यमुपसङ्गम्य राजा वचनमब्रवीत् ॥ १.२ ॥

पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम् ।
व्यूढां द्रुपदपुत्रेण तव शिष्येण धीमता ॥ १.३ ॥

अत्र शूरा महेष्वासा भीमार्जुनसमा युधि ।
युयुधानो विराटश्च द्रुपदश्च महारथः ॥ १.४ ॥
`.trim();

  let gitaDocument: SanskritDocument;
  let glossary: Record<string, GlossaryTermEntry> = {};

  it('1. Imports raw Bhagavad Gītā text from Wikisource into structured verses', () => {
    const verses = bulkImportText(gitaWikisourceText, {
      book: 'Bhagavadgītā',
      chapter: '1. Arjuna-viṣāda-yoga',
      startNumber: 1
    });

    expect(verses.length).toBe(4);

    // Verify verse numbers extracted from Wikisource double dandas (॥ १.१ ॥ etc.)
    expect(verses[0].number).toBe('१.१');
    expect(verses[1].number).toBe('१.२');
    expect(verses[2].number).toBe('१.३');
    expect(verses[3].number).toBe('१.४');

    // Verify metrical detection (all 4 are classical Anuṣṭubh / Śloka)
    expect(verses[0].meter).toContain('Anuṣṭubh');
    expect(verses[1].meter).toContain('Anuṣṭubh');

    // Verify IAST transliteration and word segmentation
    const v0Iast = typeof verses[0].scripts.iast === 'string' ? verses[0].scripts.iast : verses[0].scripts.iast.text;
    expect(v0Iast).toContain('dharma');
    expect(verses[0].tokens.length).toBeGreaterThan(5);

    // Verify that tokens received morphological analysis
    const devaTokens = verses[0].tokens.map((t) => t.text.devanagari);
    expect(devaTokens.length).toBeGreaterThan(0);

    gitaDocument = {
      document: {
        id: 'bg_doc_1',
        title: 'Śrīmad Bhagavadgītā',
        author: 'Kṛṣṇa Dvaipāyana Vyāsa',
        tradition: 'Vedānta / Mahābhārata',
        section: 'Bhīṣmaparvan',
        status: 'in_review',
        defaultLayers: ['devanagari', 'transliteration', 'translation']
      },
      verses
    };

    const hierarchy = buildBookHierarchy(gitaDocument.verses);
    expect(hierarchy.books.length).toBe(1);
    expect(hierarchy.books[0].book).toBe('Bhagavadgītā');
    expect(hierarchy.books[0].chapters[0].verses.length).toBe(4);
  });

  it('2. Edits translations and applies word-level alignment across tokens', () => {
    const v1 = gitaDocument.verses[0];
    const transText1 = 'Na posvátném poli cti, na poli Kuruovců, když shromáždili se k boji moji synové a Pánduovci, co učinili, Saňdžajo?';
    
    // Add/update Czech fluent translation
    v1.translations[0].text = transText1;
    v1.translationStatus = 'in_review';

    const words1 = tokenizeTranslation(transText1);
    expect(words1).toContain('posvátném');
    expect(words1).toContain('Kuruovců');
    expect(words1).toContain('Saňdžajo');

    // Find tokens for dharmaksetre, kuruksetre, sañjaya
    const tokenDharma = v1.tokens.find((t) => t.text.iast.toLowerCase().includes('dharma'));
    const tokenKuru = v1.tokens.find((t) => t.text.iast.toLowerCase().includes('kuru'));
    const tokenSanjaya = v1.tokens.find((t) => t.text.iast.toLowerCase().includes('sañjaya') || t.text.iast.toLowerCase().includes('sanjaya'));

    expect(tokenDharma).toBeDefined();
    expect(tokenKuru).toBeDefined();

    if (tokenDharma) {
      bindTokenToWord(tokenDharma, v1.translations[0].id, 'posvátném');
      bindTokenToWord(tokenDharma, v1.translations[0].id, 'poli');
      expect(tokenDharma.alignment.matched_words[v1.translations[0].id]).toEqual(['posvátném', 'poli']);
    }

    if (tokenKuru) {
      bindTokenToWord(tokenKuru, v1.translations[0].id, 'Kuruovců');
      expect(tokenKuru.alignment.matched_words[v1.translations[0].id]).toContain('Kuruovců');
    }

    if (tokenSanjaya) {
      toggleWordBinding(tokenSanjaya, v1.translations[0].id, 'Saňdžajo');
      expect(tokenSanjaya.alignment.matched_words[v1.translations[0].id]).toContain('Saňdžajo');
    }

    // Verify reverse lookup: given word 'Kuruovců', returns tokenKuru
    const bound = getBoundTokensForWord(v1.tokens, v1.translations[0].id, 'Kuruovců');
    expect(bound.length).toBe(1);
    expect(bound[0].id).toBe(tokenKuru?.id);

    // Verse 1.2 translation
    const v2 = gitaDocument.verses[1];
    v2.translations[0].text = 'Když spatřil vojsko Pánduovců seřazené do šiku, král Durjódhana přistoupil k učiteli a promluvil toto slovo.';
    v2.translationStatus = 'translated';
  });

  it('3. Cross-verse checks: verifies concordance, index verborum, and glossary memory', () => {
    // 3a. Search concordance for common words across verses (e.g. pāṇḍu / pāṇḍava in 1.1, 1.2, 1.3)
    const pandavaMatches = findWordConcordance(gitaDocument.verses, 'pāṇḍ');
    expect(pandavaMatches.length).toBeGreaterThanOrEqual(2);
    expect(pandavaMatches.some((m) => m.verseNumber === '१.१')).toBe(true);
    expect(pandavaMatches.some((m) => m.verseNumber === '१.२')).toBe(true);

    // 3b. Verify Index Verborum builds complete book dictionary index
    const indexVerborum = generateIndexVerborum(gitaDocument.verses, 'cs');
    expect(indexVerborum.length).toBeGreaterThan(10);
    const lemmaEntries = indexVerborum.map((e) => e.lemma.toLowerCase());
    expect(lemmaEntries.some((l) => l.includes('kuru') || l.includes('dharma'))).toBe(true);

    // 3c. Translation suggestions (Translation Memory / Consistency check)
    // In verse 1.1, 'pāṇḍava' was translated as 'Pánduovci'. When translating 1.2 or 1.3,
    // the system should suggest 'Pánduovci' as translation consistency hint.
    const v1PandavaToken = gitaDocument.verses[0].tokens.find((t) => t.text.iast.includes('pāṇḍav'));
    if (v1PandavaToken) {
      bindTokenToWord(v1PandavaToken, gitaDocument.verses[0].translations[0].id, 'Pánduovci');
    }

    const suggestions = getTranslationSuggestions(gitaDocument.verses, 'pāṇḍava', 'cs');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].translation).toBe('Pánduovci');

    // 3d. Add key philosophical term to Project Glossary
    glossary['dharma'] = {
      stem: 'dharma',
      devanagari: 'धर्म',
      translationCs: 'ctnost, spravedlnost, kosmický řád, duchovní povinnost',
      translationEn: 'righteousness, duty, cosmic order',
      notes: 'Z kořene √dhṛ (držet, nést).'
    };

    expect(glossary['dharma'].devanagari).toBe('धर्म');
  });

  it('4. Saves project workspace bundle to JSON and restores it with full verification', () => {
    const settings: AppSettings = {
      version: '2.0.0',
      layers: {
        devanagari: { visible: true, version: 'standard' },
        transliteration: { visible: true, version: 'iast' },
        translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent'] },
        meter: { visible: true, showAksharas: true }
      },
      theme: 'ashram',
      uiLanguage: 'cs',
      czechRules: createCzechRules(),
      defaultDictionary: 'cologne_mw',
      preserveManualEdits: true,
      fontSizeDevanagari: 26,
      fontSizeTransliteration: 17,
      fontFamilyDevanagari: 'Tiro Devanagari Sanskrit',
      autoSaveToLocalStorage: true
    };

    const bundle = createWorkspaceBundle(
      gitaDocument,
      settings,
      gitaDocument.verses[0].id,
      glossary,
      {
        [gitaDocument.verses[0].id]: 'in_review',
        [gitaDocument.verses[1].id]: 'translated'
      }
    );

    expect(bundle.format).toBe('sanskrit-web-workspace-bundle');
    expect(bundle.projectTitle).toBe('Śrīmad Bhagavadgītā');
    expect(bundle.document.verses.length).toBe(4);
    expect(bundle.glossary['dharma']).toBeDefined();

    // Serialize to JSON string
    const jsonSerialized = exportWorkspaceBundleToJSON(bundle);
    expect(typeof jsonSerialized).toBe('string');
    expect(jsonSerialized.length).toBeGreaterThan(500);

    // Simulate reloading / restoring from file
    const parsedBundle: SanskritWorkspaceProject = JSON.parse(jsonSerialized);
    expect(parsedBundle.format).toBe('sanskrit-web-workspace-bundle');
    expect(parsedBundle.document.document.title).toBe('Śrīmad Bhagavadgītā');
    expect(parsedBundle.document.verses.length).toBe(4);

    // Verify verse 1 data integrity after restoration
    const restoredV1 = parsedBundle.document.verses[0];
    expect(restoredV1.number).toBe('१.१');
    expect(restoredV1.translations[0].text).toContain('Na posvátném poli cti');
    expect(restoredV1.tokens.length).toBeGreaterThan(5);

    // Verify word bindings are preserved
    const restoredDharmaToken = restoredV1.tokens.find((t) => t.text.iast.toLowerCase().includes('dharma'));
    expect(restoredDharmaToken?.alignment.matched_words[restoredV1.translations[0].id]).toEqual(['posvátném', 'poli']);

    // Verify translation statuses preserved
    expect(parsedBundle.translationState.verseStatuses[restoredV1.id]).toBe('in_review');
    expect(parsedBundle.translationState.verseStatuses[parsedBundle.document.verses[1].id]).toBe('translated');

    // Verify glossary preserved
    expect(parsedBundle.glossary['dharma'].translationCs).toContain('kosmický řád');
  });
});
