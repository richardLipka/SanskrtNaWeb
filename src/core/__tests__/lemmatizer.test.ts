import { describe, it, expect } from 'vitest';
import { analyzeSanskritWord } from '../lemmatizer/sanskritLemmatizer.ts';

describe('Built-in Client-Side Sanskrit Lemmatizer', () => {
  it('correctly analyzes indeclinables (avyaya)', () => {
    const atha = analyzeSanskritWord('atha');
    expect(atha[0].pos).toBe('indeclinable');
    expect(atha[0].lemma).toBe('atha');

    const eva = analyzeSanskritWord('eva');
    expect(eva[0].pos).toBe('indeclinable');
  });

  it('correctly lemmatizes nominal forms back to dictionary lemma', () => {
    // Genitive singular: yogasya -> yoga
    const gen = analyzeSanskritWord('yogasya');
    expect(gen[0].lemma).toBe('yoga');
    expect(gen[0].case).toBe('genitive');

    // Instrumental singular: yogena -> yoga
    const instr = analyzeSanskritWord('yogena');
    expect(instr[0].lemma).toBe('yoga');
    expect(instr[0].case).toBe('instrumental');

    // Nominative singular: yogaḥ -> yoga
    const nom = analyzeSanskritWord('yogaḥ');
    expect(nom[0].lemma).toBe('yoga');
    expect(nom[0].case).toBe('nominative');

    // Locative plural: phaleṣu -> phala
    const locPl = analyzeSanskritWord('phaleṣu');
    expect(locPl[0].lemma).toBe('phala');
    expect(locPl[0].case).toBe('locative');
    expect(locPl[0].number).toBe('plural');
  });

  it('correctly lemmatizes -an stems like karman', () => {
    const loc = analyzeSanskritWord('karmaṇi');
    expect(loc[0].lemma).toBe('karman');
    expect(loc[0].case).toBe('locative');
  });

  it('correctly analyzes verb forms', () => {
    const verb = analyzeSanskritWord('bhavati');
    expect(verb[0].pos).toBe('verb');
    expect(verb[0].root).toContain('bhū');
    expect(verb[0].person).toBe('3rd');
    expect(verb[0].number).toBe('singular');
  });

  it('works with Devanagari input', () => {
    const deva = analyzeSanskritWord('योगेन');
    expect(deva[0].lemma).toBe('yoga');
    expect(deva[0].case).toBe('instrumental');
  });
});
