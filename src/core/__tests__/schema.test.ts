import { describe, it, expect } from 'vitest';
import { DocumentSchema, AppSettingsSchema, AlphabetMappingTableSchema } from '../types/schema.ts';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import { DEFAULT_ALPHABET_MAPPING } from '../transliteration/schemes.ts';

describe('Schema & Data Validation', () => {
  it('validates SAMPLE_DOCUMENT cleanly against Zod schema', () => {
    const validated = DocumentSchema.parse(SAMPLE_DOCUMENT);
    expect(validated.document.id).toBe('sanskrit-corpus-sample-v2');
    expect(validated.verses.length).toBe(8);
    expect(validated.verses[0].tokens.length).toBe(3);
    expect(validated.verses[1].tokens.length).toBe(4);
    expect(validated.verses[2].tokens.length).toBe(4);
  });

  it('validates multilingual translations on verses', () => {
    const v1 = SAMPLE_DOCUMENT.verses[0];
    const langs = v1.translations.map((t) => t.lang);
    expect(langs).toContain('cs');
    expect(langs).toContain('en');
  });

  it('validates multilingual vocabulary meanings on tokens', () => {
    const t1 = SAMPLE_DOCUMENT.verses[0].tokens[0];
    expect(t1.vocabulary?.meanings_by_lang['cs'].contextual).toBe('Nyní, zde');
    expect(t1.vocabulary?.meanings_by_lang['en'].contextual).toBe('Now, auspicious beginning');
  });

  it('validates default AppSettings schema with 3-layer configuration', () => {
    const defaultSettings = AppSettingsSchema.parse({});
    expect(defaultSettings.defaultDictionary).toBe('cologne_mw');
    expect(defaultSettings.theme).toBe('parchment');
    expect(defaultSettings.layers.devanagari.visible).toBe(true);
    expect(defaultSettings.layers.transliteration.visible).toBe(true);
    expect(defaultSettings.layers.translation.visible).toBe(true);
    expect(defaultSettings.layers.translation.activeLang).toBe('cs');
  });

  it('validates AlphabetMappingTableSchema with base characters and ligatures', () => {
    const validatedTable = AlphabetMappingTableSchema.parse(DEFAULT_ALPHABET_MAPPING);
    expect(validatedTable.baseCharacters.length).toBeGreaterThan(50);
    expect(validatedTable.ligatures.length).toBeGreaterThan(10);

    const ksa = validatedTable.ligatures.find((l) => l.devanagari === 'क्ष');
    expect(ksa).toBeDefined();
    expect(ksa?.iast).toBe('kṣa');
    expect(ksa?.cs_phonetic).toBe('kša');

    const jna = validatedTable.ligatures.find((l) => l.devanagari === 'ज्ञ');
    expect(jna).toBeDefined();
    expect(jna?.iast).toBe('jña');
    expect(jna?.cs_phonetic).toBe('džňa');
  });

  it('rejects document with missing mandatory fields', () => {
    const invalidDoc = {
      document: { title: 'No ID' },
      verses: []
    };

    expect(() => DocumentSchema.parse(invalidDoc)).toThrow();
  });
});
