import { describe, it, expect, beforeAll } from 'vitest';
import {
  getLinguisticDictionary,
  formatGrammarAnalysis,
  getMeterWeightLabel,
  getCompoundTypeLabel,
  getSandhiTypeLabel,
  CZECH_LINGUISTICS,
  ENGLISH_LINGUISTICS,
  VIBHAKTI_TERMS,
  GENDER_TERMS
} from '../i18n/linguistics/index.ts';
import {
  getGuiDictionary,
  t,
  CZECH_GUI,
  ENGLISH_GUI
} from '../i18n/gui/index.ts';
import { detectVerseMeter, loadVidyutWasm } from '../lemmatizer/vidyutAdapter.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';
import { Grammar } from '../types/schema.ts';

describe('Multilingual Architecture & Clean Separation of Concerns', () => {
  beforeAll(async () => {
    await loadVidyutWasm();
  });
  describe('Linguistic Dictionary System (Grammar & Philology)', () => {
    it('provides isolated Czech linguistic dictionary based on Zbavitel / Panini', () => {
      const csDict = getLinguisticDictionary('cs');
      expect(csDict.language).toBe('cs');
      expect(csDict.vibhaktis.nominative.sanskrit).toBe('prathamā');
      expect(csDict.vibhaktis.nominative.label).toContain('nominativ');
      expect(csDict.vibhaktis.genitive.label).toContain('genitiv');
      expect(csDict.genders.masculine.label).toContain('mužský rod');
      expect(csDict.numbers.dual.sanskrit).toContain('dvivacana');
      expect(csDict.chandasWeights.L.label).toBe('laghu');
      expect(csDict.chandasWeights.G.label).toBe('guru');
      expect(csDict.compoundTypes.tatpurusa.sanskrit).toBe('tatpuruṣa');
      expect(csDict.compoundTypes.tatpurusa.label).toContain('determinativní');
    });

    it('provides isolated English linguistic dictionary based on Macdonell / Whitney', () => {
      const enDict = getLinguisticDictionary('en');
      expect(enDict.language).toBe('en');
      expect(enDict.vibhaktis.nominative.sanskrit).toBe('prathamā');
      expect(enDict.vibhaktis.nominative.label).toContain('nominative');
      expect(enDict.vibhaktis.genitive.label).toContain('genitive');
      expect(enDict.genders.masculine.label).toContain('masculine');
      expect(enDict.numbers.dual.label).toContain('dual');
      expect(enDict.chandasWeights.L.explanation).toContain('light');
      expect(enDict.chandasWeights.G.explanation).toContain('heavy');
      expect(enDict.compoundTypes.tatpurusa.label).toContain('determinative');
    });

    it('formats grammatical metadata correctly in both languages', () => {
      const sampleGrammar: Grammar = {
        pos: 'noun',
        stem: 'yoga',
        case: 'nominative',
        number: 'singular',
        gender: 'masculine'
      };

      const csFormatted = formatGrammarAnalysis(sampleGrammar, 'cs');
      expect(csFormatted.fullLabel).toContain('mužský rod');
      expect(csFormatted.fullLabel).toContain('nominativ');
      expect(csFormatted.details.some((d) => d.title.includes('Pád'))).toBe(true);

      const enFormatted = formatGrammarAnalysis(sampleGrammar, 'en');
      expect(enFormatted.fullLabel).toContain('masculine');
      expect(enFormatted.fullLabel).toContain('nominative');
      expect(enFormatted.details.some((d) => d.title.includes('Case'))).toBe(true);
    });

    it('returns localized metrical weight labels', () => {
      expect(getMeterWeightLabel('L', 'cs')).toBe('laghu');
      expect(getMeterWeightLabel('G', 'cs')).toBe('guru');
      expect(getMeterWeightLabel('L', 'en')).toBe('laghu');
      expect(getMeterWeightLabel('G', 'en')).toBe('guru');
    });

    it('returns localized compound and sandhi labels', () => {
      expect(getCompoundTypeLabel('bahuvrihi', 'cs')).toContain('posesivní');
      expect(getCompoundTypeLabel('bahuvrihi', 'en')).toContain('possessive');
      expect(getSandhiTypeLabel('svarasandhi', 'cs')).toContain('vokálové');
      expect(getSandhiTypeLabel('svarasandhi', 'en')).toContain('vowel');
    });

    it('maintains backward compatibility with legacy terminology exports', () => {
      expect(VIBHAKTI_TERMS.nominative.sanskrit).toBe('prathamā');
      expect(VIBHAKTI_TERMS.nominative.cs).toContain('nominativ');
      expect(VIBHAKTI_TERMS.nominative.en).toContain('nominative');
      expect(GENDER_TERMS.masculine.cs).toContain('mužský rod');
      expect(GENDER_TERMS.masculine.en).toContain('masculine');
    });
  });

  describe('GUI Translation System (UI & Technological Texts)', () => {
    it('provides isolated Czech GUI texts', () => {
      const csGui = getGuiDictionary('cs');
      expect(csGui.appTitle).toBe('Sanskrt Na Web');
      expect(csGui.tabReader).toContain('3-Vrstvá čtečka');
      expect(csGui.btnSaveProject).toContain('Uložit');
      expect(csGui.llmPanelTitle).toContain('Filologický');
    });

    it('provides isolated English GUI texts', () => {
      const enGui = getGuiDictionary('en');
      expect(enGui.appTitle).toBe('Sanskrit On The Web');
      expect(enGui.tabReader).toContain('3-Layer Reader');
      expect(enGui.btnSaveProject).toContain('Save');
      expect(enGui.llmPanelTitle).toContain('Philological');
    });

    it('t() helper function retrieves strings for active language with Czech fallback', () => {
      expect(t('themeLabel', 'cs')).toBe('Vzhled');
      expect(t('themeLabel', 'en')).toBe('Theme');
      expect(t('tabReader', 'cs')).toContain('čtečka');
      expect(t('tabReader', 'en')).toContain('Reader');
    });

    it('verifies linguistic dictionary contains NO gui buttons or technological strings', () => {
      const csLing = CZECH_LINGUISTICS as any;
      expect(csLing.btnSaveProject).toBeUndefined();
      expect(csLing.appTitle).toBeUndefined();
      expect(csLing.llmEndpointLabel).toBeUndefined();

      const enLing = ENGLISH_LINGUISTICS as any;
      expect(enLing.btnSaveProject).toBeUndefined();
      expect(enLing.appTitle).toBeUndefined();
      expect(enLing.llmEndpointLabel).toBeUndefined();
    });

    it('verifies GUI dictionary contains NO case tables or vibhaktis', () => {
      const csGui = CZECH_GUI as any;
      expect(csGui.vibhaktis).toBeUndefined();
      expect(csGui.lakaras).toBeUndefined();
      expect(csGui.chandasWeights).toBeUndefined();

      const enGui = ENGLISH_GUI as any;
      expect(enGui.vibhaktis).toBeUndefined();
      expect(enGui.lakaras).toBeUndefined();
      expect(enGui.chandasWeights).toBeUndefined();
    });
  });

  describe('Multilingual Core Library Functions', () => {
    const slokaVerse = `dharma-kṣetre kuru-kṣetre samavetā yuyutsavaḥ ।
māmakāḥ pāṇḍavāś caiva kim akurvata sañjaya ॥`;

    it('detectVerseMeter returns Czech notes and labels when requested with cs', () => {
      const analysisCs = detectVerseMeter(slokaVerse, undefined, 'cs');
      expect(analysisCs.totalAksharas).toBe(32);
      expect(analysisCs.isClassicalAnushtubh).toBe(true);
      expect(analysisCs.meterName).toContain('slabik');
      expect(analysisCs.notes).toContain('Detekováno klasické epické metrum');
      expect(analysisCs.aksharas[0].weightLabel).toBe('guru');
    });

    it('detectVerseMeter returns English notes and labels when requested with en', () => {
      const analysisEn = detectVerseMeter(slokaVerse, undefined, 'en');
      expect(analysisEn.totalAksharas).toBe(32);
      expect(analysisEn.isClassicalAnushtubh).toBe(true);
      expect(analysisEn.meterName).toContain('syllables');
      expect(analysisEn.notes).toContain('Detected classical epic');
      expect(analysisEn.aksharas[0].weightLabel).toBe('guru');
    });

    it('LanguageAdapter.analyzeMeter returns localized metrical analysis', () => {
      const meterCs = defaultSanskritAdapter.analyzeMeter(slokaVerse, undefined, 'cs');
      expect(meterCs.meterName).toContain('slabik');
      expect(meterCs.notes).toContain('Detekováno');

      const meterEn = defaultSanskritAdapter.analyzeMeter(slokaVerse, undefined, 'en');
      expect(meterEn.meterName).toContain('syllables');
      expect(meterEn.notes).toContain('Detected');
    });

    it('LanguageAdapter.analyzeWord returns localized meanings and labels', async () => {
      const wordAnalysisCs = await defaultSanskritAdapter.analyzeWord('dharmaḥ', { lang: 'cs' });
      expect(wordAnalysisCs.lemma).toBeDefined();
      expect(wordAnalysisCs.meanings.contextual).toBeDefined();

      const wordAnalysisEn = await defaultSanskritAdapter.analyzeWord('dharmaḥ', { lang: 'en' });
      expect(wordAnalysisEn.lemma).toBeDefined();
      expect(wordAnalysisEn.meanings.byLang?.en).toBeDefined();
    });
  });
});
