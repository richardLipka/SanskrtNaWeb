import { describe, it, expect } from 'vitest';
import {
  devanagariToIast,
  iastToDevanagari,
  iastToCzechPhonetic,
  devanagariToCzechPhonetic,
  transliterate
} from '../transliteration/engine.ts';
import { createCzechRules } from '../transliteration/rules.ts';

describe('Transliteration Engine', () => {
  describe('Devanagari to IAST', () => {
    it('converts independent vowels correctly', () => {
      expect(devanagariToIast('अ आ इ ई उ ऊ ऋ ॠ ऌ ए ऐ ओ औ')).toBe('a ā i ī u ū ṛ ṝ ḷ e ai o au');
    });

    it('converts basic consonants with inherent "a"', () => {
      expect(devanagariToIast('क ख ग घ ङ')).toBe('ka kha ga gha ṅa');
      expect(devanagariToIast('च छ ज झ ञ')).toBe('ca cha ja jha ña');
      expect(devanagariToIast('ट ठ ड ढ ण')).toBe('ṭa ṭha ḍa ḍha ṇa');
      expect(devanagariToIast('त थ द ध न')).toBe('ta tha da dha na');
      expect(devanagariToIast('प फ ब भ म')).toBe('pa pha ba bha ma');
      expect(devanagariToIast('य र ल व श ष स ह')).toBe('ya ra la va śa ṣa sa ha');
    });

    it('converts matras and virama correctly', () => {
      expect(devanagariToIast('कि की कु कू कृ')).toBe('ki kī ku kū kṛ');
      expect(devanagariToIast('क्')).toBe('k');
    });

    it('converts complex Sanskrit conjunct ligatures', () => {
      expect(devanagariToIast('योग')).toBe('yoga');
      expect(devanagariToIast('चित्त')).toBe('citta');
      expect(devanagariToIast('वृत्ति')).toBe('vṛtti');
      expect(devanagariToIast('निरोधः')).toBe('nirodhaḥ');
      expect(devanagariToIast('कर्मण्य्')).toBe('karmaṇy');
      expect(devanagariToIast('ज्ञ')).toBe('jña');
      expect(devanagariToIast('क्ष')).toBe('kṣa');
      expect(devanagariToIast('श्र')).toBe('śra');
    });

    it('preserves danda, double danda, and numerals', () => {
      expect(devanagariToIast('॥ १.२ ॥')).toBe('|| 1.2 ||');
      expect(devanagariToIast('।')).toBe('|');
    });
  });

  describe('IAST to Devanagari', () => {
    it('converts vowels and simple words back to Devanagari', () => {
      expect(iastToDevanagari('yoga')).toBe('योग');
      expect(iastToDevanagari('citta')).toBe('चित्त');
      expect(iastToDevanagari('vṛtti')).toBe('वृत्ति');
      expect(iastToDevanagari('nirodhaḥ')).toBe('निरोधः');
    });

    it('converts danda and numbers', () => {
      expect(iastToDevanagari('|| 1.2 ||')).toBe('॥ १.२ ॥');
    });
  });

  describe('Czech Phonetic Transliteration & Configurable Rules', () => {
    it('applies default Czech phonetic rules accurately', () => {
      expect(iastToCzechPhonetic('śiva')).toBe('šiva');
      expect(iastToCzechPhonetic('kṛṣṇa')).toBe('kršna');
      expect(iastToCzechPhonetic('citta')).toBe('čitta');
      expect(iastToCzechPhonetic('jñāna')).toBe('džňána');
      expect(iastToCzechPhonetic('yogaḥ')).toBe('jógah');
      expect(iastToCzechPhonetic('prāṇāyāma')).toBe('pránájáma');
    });

    it('allows customized rules for syllabic r (r vs ri)', () => {
      const customRi = createCzechRules({ rSyllabic: 'ri' });
      expect(iastToCzechPhonetic('vṛtti', customRi)).toBe('vritti');

      const customR = createCzechRules({ rSyllabic: 'r' });
      expect(iastToCzechPhonetic('vṛtti', customR)).toBe('vrtti');
    });

    it('allows customized rules for long vowels (macrons vs Czech accents)', () => {
      const customMacrons = createCzechRules({ longVowels: 'iast_macrons' });
      // When longVowels is iast_macrons, ā, ī, ū remain intact
      expect(iastToCzechPhonetic('ātmā', customMacrons)).toBe('ātmā');
    });

    it('allows customized dictionary word overrides', () => {
      const customRules = createCzechRules({
        customWordOverrides: {
          'haṭhayoga': 'hathajóga',
          'samādhi': 'konečné usebrání'
        }
      });

      expect(iastToCzechPhonetic('haṭhayoga', customRules)).toBe('hathajóga');
      expect(iastToCzechPhonetic('samādhi', customRules)).toBe('konečné usebrání');
    });

    it('transliterates directly from Devanagari to Czech Phonetic', () => {
      const cz = devanagariToCzechPhonetic('योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥');
      expect(cz).toContain('čitta');
      expect(cz).toContain('nirodhah');
      expect(cz).toContain('|| 1.2 ||');
    });

    it('universal transliterate function works between any pair', () => {
      expect(transliterate('योग', 'devanagari', 'iast')).toBe('yoga');
      expect(transliterate('yoga', 'iast', 'devanagari')).toBe('योग');
      expect(transliterate('yogaḥ', 'iast', 'cs_phonetic')).toBe('jógah');
    });
  });
});
