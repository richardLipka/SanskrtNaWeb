import { describe, it, expect } from 'vitest';
import { formatToSargeant, generateSargeantHtml } from '../sargeant/sargeantFormatter.ts';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';

describe('Winthrop Sargeant Formatter', () => {
  const verse1_2 = SAMPLE_DOCUMENT.verses[1]; // Yogasutra 1.2

  it('formats verse into Winthrop Sargeant structured columns', () => {
    const layout = formatToSargeant(verse1_2);

    expect(layout.verseNumber).toBe('1.2');
    expect(layout.fullDevanagari).toBe('योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥');
    expect(layout.wordColumns.length).toBe(4);

    // Column 1: yogaḥ
    const col1 = layout.wordColumns[0];
    expect(col1.devanagari).toBe('योगः');
    expect(col1.iast).toBe('yogaḥ');
    expect(col1.grammarTag).toBe('m. nom. sg.');
    expect(col1.meaning).toBe('Jóga');

    // Column 2: citta (compound prefix)
    const col2 = layout.wordColumns[1];
    expect(col2.isCompound).toBe(true);
    expect(col2.meaning).toBe('mysli');
  });

  it('generates rich Sargeant HTML for print and web rendering', () => {
    const html = generateSargeantHtml(verse1_2);

    expect(html).toContain('sargeant-card');
    expect(html).toContain('sargeant-interlinear-grid');
    expect(html).toContain('m. nom. sg.');
    expect(html).toContain('sargeant-glossary');
    expect(html).toContain('sargeant-commentary');
  });
});
