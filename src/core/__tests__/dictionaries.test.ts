import { describe, it, expect } from 'vitest';
import {
  getDictionaryUrl,
  sanitizeSearchLemma,
  iastToHk
} from '../dictionaries/dictionaryBuilder.ts';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';

describe('Online Reference Tools Integration', () => {
  it('cleans root symbols and accents for search', () => {
    expect(sanitizeSearchLemma('√yuj')).toBe('yuj');
    expect(sanitizeSearchLemma('  citta-vṛtti  ')).toBe('cittavṛtti');
  });

  it('converts IAST to Harvard-Kyoto for query params', () => {
    expect(iastToHk('yogaḥ')).toBe('yogaH');
    expect(iastToHk('citta')).toBe('citta');
    expect(iastToHk('vṛtti')).toBe('vRtti');
    expect(iastToHk('śiva')).toBe('ziva');
  });

  it('generates working URLs for Cologne Monier-Williams (Simple REST)', () => {
    const url = getDictionaryUrl('yoga', 'cologne_mw');
    expect(url).toContain('sanskrit-lexicon.uni-koeln.de');
    expect(url).toContain('/simple/mw/yoga');
  });

  it('generates working URLs for Cologne Apte (AP90)', () => {
    const url = getDictionaryUrl('yoga', 'cologne_apte');
    expect(url).toContain('sanskrit-lexicon.uni-koeln.de');
    expect(url).toContain('/simple/ap90/yoga');
  });

  it('generates working URLs for WisdomLib Sanskrit', () => {
    const url = getDictionaryUrl('yoga', 'wisdomlib');
    expect(url).toContain('wisdomlib.org');
    expect(url).toContain('/definition/yoga');
  });

  it('generates working URLs for Ambuda.org', () => {
    const url = getDictionaryUrl('citta', 'ambuda');
    expect(url).toContain('ambuda.org');
    expect(url).toContain('/tools/dictionaries/mw/citta');
  });

  it('generates working URLs for LearnSanskrit.cc', () => {
    const url = getDictionaryUrl('yoga', 'learnsanskrit');
    expect(url).toContain('learnsanskrit.cc');
    expect(url).toContain('search=yoga');
  });

  it('generates working URLs for Ashtadhyayi.com', () => {
    const url = getDictionaryUrl('yoga', 'ashtadhyayi');
    expect(url).toContain('ashtadhyayi.com');
    expect(url).toContain('/kosha?search=yoga');
  });

  it('correctly uses token dictionaryLookup or lemma', () => {
    const token = SAMPLE_DOCUMENT.verses[0].tokens[2];
    const url = getDictionaryUrl(token, 'cologne_mw');
    expect(url).toContain('anuzAsana');
  });
});
