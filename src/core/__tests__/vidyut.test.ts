import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadVidyutWasm,
  isVidyutReady,
  splitSandhiWasm,
  classifyMeterWasm,
  analyzeSanskritWordFull,
  transliterateLipi,
  segmentAksharas,
  derivePrakriyaTree,
  detectVerseMeter,
  VIDYUT_METADATA
} from '../lemmatizer/vidyutAdapter.ts';

describe('Ambuda Vidyut WebAssembly Integration', () => {
  beforeAll(async () => {
    await loadVidyutWasm();
  });

  it('successfully initializes Vidyut WebAssembly module', () => {
    expect(isVidyutReady()).toBe(true);
  });

  it('provides correct open-source MIT attribution and metadata', () => {
    expect(VIDYUT_METADATA.license).toBe('MIT');
    expect(VIDYUT_METADATA.repository).toBe('https://github.com/ambuda-org/vidyut');
    expect(VIDYUT_METADATA.author).toContain('Ambuda Project');
  });

  it('correctly executes Sandhi splitting via WebAssembly (e.g. ceti -> ca + iti)', () => {
    const splits = splitSandhiWasm('ceti');
    expect(splits.length).toBeGreaterThan(0);

    const caIti = splits.find(
      (s) => s.firstIast === 'ca' && (s.secondIast === 'iti' || s.secondIast === 'Iti')
    );
    expect(caIti).toBeDefined();
    expect(caIti?.isValid).toBe(true);
    expect(caIti?.firstDeva).toBe('च');
  });

  it('splits compound words like yogāśca (yoga + ca)', () => {
    const splits = splitSandhiWasm('yogāśca');
    expect(splits.length).toBeGreaterThan(0);
  });

  it('analyzes metrical akṣara weights (Laghu / Guru) via Chandas WASM', () => {
    const meter = classifyMeterWasm('dharmakṣetre kurukṣetre');
    expect(meter).not.toBeNull();
    expect(meter?.aksharas.length).toBeGreaterThan(0);

    // Verify presence of Guru/Laghu weights
    const weights = meter?.aksharas.map((a) => a.weight);
    expect(weights).toContain('G');
    expect(weights).toContain('L');
  });

  it('combines morphological lemmatization with Vidyut WASM sandhi splits', async () => {
    const result = await analyzeSanskritWordFull('yogasya');
    expect(result.analyses.length).toBeGreaterThan(0);
    expect(result.analyses[0].lemma).toBe('yoga');
    expect(result.analyses[0].case).toBe('genitive');
    expect(result.attribution.license).toBe('MIT');
  });

  it('handles Devanagari input seamlessly through transliteration bridge', async () => {
    const result = await analyzeSanskritWordFull('योगस्य');
    expect(result.analyses.length).toBeGreaterThan(0);
    expect(result.analyses[0].lemma).toBe('yoga');
  });

  it('performs high-precision transliteration via vidyut-lipi', () => {
    const iast = transliterateLipi('योगश्चित्तवृत्तिनिरोधः', 'Devanagari', 'Iast');
    expect(iast).toBe('yogaścittavṛttinirodhaḥ');

    const deva = transliterateLipi('atha yogānuśāsanam', 'Iast', 'Devanagari');
    expect(deva).toBe('अथ योगानुशासनम्');
  });

  it('segments text into syllables (aksharas) with metrical weights (G/L)', () => {
    const aksharas = segmentAksharas('atha yogānuśāsanam');
    expect(aksharas.length).toBeGreaterThan(5);
    // atha -> a (L), tha (L) or similar
    expect(aksharas[0].devanagari).toBeDefined();
    expect(aksharas[0].iast).toBeDefined();
    expect(['L', 'G']).toContain(aksharas[0].weight);
  });

  it('generates Paninian derivation tree via vidyut-prakriya', () => {
    const derivation = derivePrakriyaTree('yoga', {
      linga: 'pum',
      vibhakti: '6',
      vacana: 'eka'
    });

    expect(derivation).not.toBeNull();
    if (derivation) {
      expect(derivation.targetTerm).toBe('yogasya');
      expect(derivation.prakriyaSteps?.length).toBeGreaterThan(0);
      // Step should have rule and url to ashtadhyayi
      const hasAshtadhyayiUrl = derivation.prakriyaSteps?.some(s => (s.url || s.sutraUrl)?.includes('ashtadhyayi.com'));
      expect(hasAshtadhyayiUrl).toBe(true);
      expect(derivation.linguisticNotes.type).toBeDefined();
    }
  });

  it('detects verse meter with vidyut-chandas and custom override', () => {
    // Bhagavadgita 2.47 is Anustubh (4x8 syllables)
    const sloka = 'karmaṇyevādhikāraste mā phaleṣu kadācana । mā karmaphalaheturbhūrmā te saṅgo\'stvakarmaṇi ॥';
    const detection = detectVerseMeter(sloka);
    expect(detection.aksharas.length).toBeGreaterThan(0);
    expect(detection.meter).toContain('Anuṣṭubh');

    // Custom override
    const custom = detectVerseMeter(sloka, 'Vasantatilakā');
    expect(custom.meter).toBe('Vasantatilakā');
    expect(custom.notes).toContain('uživatelem');
  });
});

