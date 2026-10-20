import { Verse, SanskritDocument, Token, getVerseCommentaries } from '../types/schema.ts';
import { getScriptText } from '../transliteration/engine.ts';
import { escapeHtml } from '../utils/html.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';
import { transliterateLipi } from '../lemmatizer/vidyutAdapter.ts';
import { analyzeSanskritWord } from '../lemmatizer/sanskritLemmatizer.ts';

export interface ChapterNode {
  chapter: string;
  verses: Verse[];
}

export interface BookNode {
  book: string;
  chapters: ChapterNode[];
  totalVerses: number;
}

export interface BookHierarchy {
  books: BookNode[];
  totalVerses: number;
}

/**
 * Builds a structured hierarchy of books -> chapters -> verses from a list of verses.
 */
export function buildBookHierarchy(verses: Verse[], fallbackBookName = 'Obecná kniha'): BookHierarchy {
  const bookMap = new Map<string, Map<string, Verse[]>>();

  for (const v of verses) {
    const bookName = (v.book && v.book.trim()) || fallbackBookName;
    const chapterName = (v.chapter && v.chapter.trim()) || '1. Kapitola';

    if (!bookMap.has(bookName)) {
      bookMap.set(bookName, new Map<string, Verse[]>());
    }
    const chapters = bookMap.get(bookName)!;
    if (!chapters.has(chapterName)) {
      chapters.set(chapterName, []);
    }
    chapters.get(chapterName)!.push(v);
  }

  const books: BookNode[] = [];
  let totalVerses = 0;

  for (const [bookName, chaptersMap] of bookMap.entries()) {
    const chapters: ChapterNode[] = [];
    let bookVerseCount = 0;

    for (const [chapName, chapVerses] of chaptersMap.entries()) {
      chapters.push({
        chapter: chapName,
        verses: chapVerses
      });
      bookVerseCount += chapVerses.length;
    }

    books.push({
      book: bookName,
      chapters,
      totalVerses: bookVerseCount
    });
    totalVerses += bookVerseCount;
  }

  return { books, totalVerses };
}

export interface BulkImportOptions {
  book?: string;
  chapter?: string;
  startNumber?: number;
  numberPrefix?: string;
  sourceScript?: 'auto' | 'devanagari' | 'iast';
  defaultLang?: string;
  defaultTranslationText?: string;
}

/**
 * Parses raw text containing multiple verses into structured Verse objects.
 * Supports standard Sanskrit text delimiters (e.g. double danda '॥', numbers in brackets, empty lines).
 */
export function bulkImportText(rawText: string, options: BulkImportOptions = {}): Verse[] {
  const book = options.book?.trim() || 'Importovaná kniha';
  const chapter = options.chapter?.trim() || '1. Kapitola';
  const numberPrefix = options.numberPrefix || '';
  let currentNum = options.startNumber !== undefined ? options.startNumber : 1;
  const lang = options.defaultLang || 'cs';

  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').trim();

  // Split into chunks: by empty lines OR by lines ending with double danda verse markers
  const rawChunks: string[] = [];
  const lines = normalized.split('\n');
  let currentChunkLines: string[] = [];

  for (const l of lines) {
    const trimmedLine = l.trim();
    if (!trimmedLine) {
      if (currentChunkLines.length > 0) {
        rawChunks.push(currentChunkLines.join('\n'));
        currentChunkLines = [];
      }
      continue;
    }

    currentChunkLines.push(trimmedLine);

    // If line ends with double danda and verse number (e.g. ॥ १.१ ॥ or || 1.1 || or ॥ ১ ॥), it completes a verse chunk
    if (/(?:॥|\|\|)\s*[0-9०-९.]*\s*(?:॥|\|\|)\s*$/.test(trimmedLine)) {
      rawChunks.push(currentChunkLines.join('\n'));
      currentChunkLines = [];
    }
  }
  if (currentChunkLines.length > 0) {
    rawChunks.push(currentChunkLines.join('\n'));
  }

  const verses: Verse[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];

    // Try to extract verse number from text (e.g. ॥ १.१ ॥, || 1.1 ||, [12], 12.)
    let verseNumber = `${numberPrefix}${currentNum}`;
    let cleanedText = chunk;

    // Verse number inside double dandas stays part of the text (traditional layout);
    // a leading "[12]" or "12." marker is removed from the verse text.
    const dandaMatch = chunk.match(/(?:॥|\|\|)\s*([0-9०-९]+(?:\.[0-9०-९]+)*)\s*(?:॥|\|\|)/);
    const leadingMatch = chunk.match(/^\[([0-9०-९]+(?:\.[0-9०-९]+)*)\]\s*/) ||
                         chunk.match(/^([0-9०-९]+(?:\.[0-9०-९]+)*)\.?\s+/);
    const numMatch = dandaMatch || leadingMatch;

    if (numMatch && numMatch[1]) {
      verseNumber = numMatch[1];
      if (!dandaMatch && leadingMatch) {
        cleanedText = chunk.slice(leadingMatch[0].length);
      }
      // Continue automatic numbering after an explicit plain integer ("12" -> next is 13)
      const asciiNum = numMatch[1].replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
      currentNum = /^\d+$/.test(asciiNum) ? parseInt(asciiNum, 10) + 1 : currentNum + 1;
    } else {
      currentNum++;
    }

    // Determine script (check for actual Devanagari letters/matras, excluding dandas U+0964/U+0965)
    const hasDevanagari = /[\u0904-\u093D\u0940-\u094D]/.test(chunk);
    let devaText = '';
    let iastText = '';

    if (hasDevanagari) {
      devaText = cleanedText;
      try {
        iastText = transliterateLipi(cleanedText, 'Devanagari', 'Iast');
      } catch {
        iastText = defaultSanskritAdapter.transliterate(cleanedText, 'devanagari', 'iast');
      }
    } else {
      iastText = cleanedText;
      try {
        devaText = transliterateLipi(cleanedText, 'Iast', 'Devanagari');
      } catch {
        devaText = defaultSanskritAdapter.transliterate(cleanedText, 'iast', 'devanagari');
      }
    }

    // Generate Czech phonetic version
    let csPhonetic = '';
    try {
      csPhonetic = defaultSanskritAdapter.transliterate(devaText, 'devanagari', 'cs_phonetic');
    } catch {
      csPhonetic = iastText;
    }

    // Analyze meter
    let detectedMeter = '';
    try {
      const meterRes = defaultSanskritAdapter.analyzeMeter(iastText);
      detectedMeter = meterRes.meterName || '';
    } catch {
      detectedMeter = '';
    }

    const tokens = createTokensFromIast(iastText, `t_${i + 1}`);

    const newVerse: Verse = {
      id: `verse_imp_${Date.now()}_${i + 1}`,
      number: verseNumber,
      book,
      chapter,
      scripts: {
        devanagari: {
          text: devaText,
          mode: 'auto',
          lastAutoText: devaText
        },
        iast: {
          text: iastText,
          mode: 'auto',
          lastAutoText: iastText
        },
        cs_phonetic: {
          text: csPhonetic,
          mode: 'auto',
          lastAutoText: csPhonetic
        }
      },
      translations: [
        {
          id: `${lang}_fluent`,
          label: lang === 'cs' ? 'Plynulý český překlad' : 'Translation',
          lang,
          type: 'fluent',
          text: options.defaultTranslationText || ''
        }
      ],
      tokens,
      meter: detectedMeter
    };

    verses.push(newVerse);
  }

  return verses;
}

/**
 * Splits an IAST verse text into word tokens with Devanagari, Czech phonetic form and a
 * first-guess morphological analysis from the built-in lemmatizer. Token ids are
 * `${idPrefix}_1`, `${idPrefix}_2`, …
 */
export function createTokensFromIast(iastText: string, idPrefix = 't'): Token[] {
  const words = iastText
    .replace(/[।॥|0-9०-९.,!?;:[\]()"„“”‚‘’]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return words.map((w, wIdx) => {
    const wordDeva = transliterateLipi(w, 'iast', 'devanagari');
    const firstMorph = analyzeSanskritWord(w)[0];

    return {
      id: `${idPrefix}_${wIdx + 1}`,
      text: {
        devanagari: wordDeva,
        iast: w,
        cs_phonetic: defaultSanskritAdapter.transliterate(w, 'iast', 'cs_phonetic')
      },
      lemma: firstMorph?.lemma || w.toLowerCase(),
      grammar: firstMorph ? {
        pos: firstMorph.pos,
        case: firstMorph.case,
        number: firstMorph.number,
        gender: firstMorph.gender,
        root: firstMorph.root,
        stem: firstMorph.stem,
        person: firstMorph.person,
        tense: firstMorph.tense,
        voice: firstMorph.voice,
        label_cs: firstMorph.label_cs,
        label_en: firstMorph.label_en
      } : undefined,
      // Only indeclinables carry a dictionary meaning in the built-in lemmatizer;
      // for other words the grammar label is not a meaning and is not copied here.
      vocabulary: firstMorph && firstMorph.pos === 'indeclinable' ? {
        meanings_by_lang: {
          cs: { contextual: firstMorph.label_cs, alternatives: [] },
          en: { contextual: firstMorph.label_en, alternatives: [] }
        },
        contextual_meaning_cs: firstMorph.label_cs
      } : undefined,
      alignment: {
        matched_words: {}
      }
    };
  });
}

export interface CorpusFilter {
  book?: string;
  chapter?: string;
  query?: string;
}

/**
 * Lower-cases and strips Latin diacritics (ā→a, ṛ→r, ś→s, č→c …) so that searches like
 * "krsna" find "kṛṣṇa". Devanagari vowel signs are combining marks too, but lie outside
 * U+0300–U+036F and are therefore preserved.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase().normalize('NFC');
}

/**
 * Filters a list of verses by book, chapter and fulltext search query.
 */
export function filterCorpus(verses: Verse[], filter: CorpusFilter): Verse[] {
  return verses.filter((v) => {
    if (filter.book && filter.book !== 'all' && v.book !== filter.book) {
      return false;
    }
    if (filter.chapter && filter.chapter !== 'all' && v.chapter !== filter.chapter) {
      return false;
    }
    if (filter.query && filter.query.trim()) {
      const q = foldForSearch(filter.query.trim());
      const has = (value?: string) => Boolean(value) && foldForSearch(value!).includes(q);
      const numMatch = has(v.number);
      const textMatch = has(getScriptText(v.scripts.devanagari)) || has(getScriptText(v.scripts.iast));
      const transMatch = v.translations.some((t) => has(t.text));
      const tokenMatch = v.tokens.some(
        (tk) => has(tk.text.iast) || has(tk.text.devanagari) || has(tk.lemma)
      );
      if (!numMatch && !textMatch && !transMatch && !tokenMatch) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Exports a filtered subset of the corpus into standalone HTML, JSON or Markdown.
 */
export function exportCorpusSubset(
  doc: SanskritDocument,
  filter: CorpusFilter,
  format: 'json' | 'html' | 'markdown' = 'html'
): string {
  const filteredVerses = filterCorpus(doc.verses, filter);

  if (format === 'json') {
    const exportedDoc: SanskritDocument = {
      $schema: doc.$schema,
      document: {
        ...doc.document,
        title: `${doc.document.title}${filter.book ? ` – ${filter.book}` : ''}${filter.chapter ? ` (${filter.chapter})` : ''}`,
        totalVerses: filteredVerses.length
      },
      verses: filteredVerses
    };
    return JSON.stringify(exportedDoc, null, 2);
  }

  if (format === 'markdown') {
    let md = `# ${doc.document.title}\n`;
    if (filter.book) md += `**Kniha:** ${filter.book}\n`;
    if (filter.chapter) md += `**Kapitola:** ${filter.chapter}\n`;
    md += `*Celkem veršů: ${filteredVerses.length}*\n\n---\n\n`;

    for (const v of filteredVerses) {
      const deva = typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari.text;
      const iast = typeof v.scripts.iast === 'string' ? v.scripts.iast : v.scripts.iast.text;
      md += `### Verš ${v.number} ${v.meter ? `*(${v.meter})*` : ''}\n\n`;
      md += `**Dévanágarí:**\n${deva}\n\n`;
      md += `**IAST:**\n${iast}\n\n`;
      if (v.translations.length > 0) {
        md += `**Překlad:**\n`;
        for (const t of v.translations) {
          md += `- *[${t.lang}/${t.type}]* ${t.text}\n`;
        }
        md += `\n`;
      }
      if (v.tokens.length > 0) {
        md += `| Slovo | Lemma | Gramatika | Význam |\n`;
        md += `|---|---|---|---|\n`;
        for (const tk of v.tokens) {
          const meaning = tk.vocabulary?.meanings_by_lang?.cs?.contextual ||
                          tk.vocabulary?.contextual_meaning_cs ||
                          '';
          const gram = tk.grammar?.label_cs || '';
          md += `| ${mdCell(`${tk.text.devanagari} (${tk.text.iast})`)} | ${mdCell(tk.lemma || '—')} | ${mdCell(gram || '—')} | ${mdCell(meaning || '—')} |\n`;
        }
        md += `\n`;
      }
      const commentaries = getVerseCommentaries(v);
      if (commentaries.length > 0) {
        md += `**Komentáře:**\n`;
        for (const c of commentaries) {
          const meta = [c.tradition, c.title, c.lang].filter(Boolean).join(', ');
          md += `- **${c.author}**${meta ? ` (${meta})` : ''}: ${c.text.replace(/\s*\n\s*/g, ' ')}${c.source ? ` — *${c.source}*` : ''}\n`;
        }
        md += `\n`;
      }
      md += `---\n\n`;
    }
    return md;
  }

  // Standalone HTML format with modern responsive CSS
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(doc.document.title)} – Export</title>
  <style>
    :root {
      --bg: #fcfbf7;
      --card-bg: #ffffff;
      --border: #e2d9c8;
      --primary: #92400e;
      --accent: #b45309;
      --text: #26211a;
      --text-muted: #6b7280;
    }
    body {
      font-family: 'Cambria', 'Georgia', serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    h1, h2, h3 { color: var(--primary); }
    .header { border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 2rem; }
    .verse-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.8rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .verse-num {
      display: inline-block;
      background: var(--accent);
      color: white;
      font-weight: bold;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }
    .meter-badge {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-left: 0.5rem;
      font-style: italic;
    }
    .devanagari {
      font-family: 'Tiro Devanagari Sanskrit', 'Noto Serif Devanagari', serif;
      font-size: 1.5rem;
      color: #78350f;
      margin-bottom: 0.5rem;
      white-space: pre-line;
    }
    .iast {
      font-style: italic;
      color: #4b5563;
      margin-bottom: 1rem;
      white-space: pre-line;
    }
    .translation {
      background: #fdfaf3;
      border-left: 4px solid var(--accent);
      padding: 0.6rem 1rem;
      margin: 0.5rem 0;
      border-radius: 0 4px 4px 0;
    }
    .token-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.88rem;
    }
    .token-table th, .token-table td {
      border: 1px solid var(--border);
      padding: 6px 10px;
      text-align: left;
    }
    .token-table th { background: #f8f5ee; color: var(--primary); }
    .commentary { margin-top: 0.9rem; padding: 0.6rem 0.9rem; border-left: 3px solid var(--border); }
    .commentary-text { white-space: pre-line; margin-top: 0.25rem; }
    .commentary-text[lang="sa"] { font-family: 'Tiro Devanagari Sanskrit', 'Noto Serif Devanagari', serif; }
    .commentary-source { font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 0.25rem; }
    @media print {
      body { max-width: 100%; margin: 0; padding: 1cm; }
      .verse-card { page-break-inside: avoid; border: 1px solid #ccc; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(doc.document.title)}</h1>
    <p><strong>Kniha:</strong> ${escapeHtml(filter.book || doc.document.book || 'Všechny')} | <strong>Kapitola:</strong> ${escapeHtml(filter.chapter || 'Všechny')} | <strong>Celkem veršů:</strong> ${filteredVerses.length}</p>
  </div>
  ${filteredVerses
    .map((v) => {
      const deva = typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari.text;
      const iast = typeof v.scripts.iast === 'string' ? v.scripts.iast : v.scripts.iast.text;
      return `
    <div class="verse-card">
      <span class="verse-num">Verš ${escapeHtml(v.number)}</span>
      ${v.meter ? `<span class="meter-badge">${escapeHtml(v.meter)}</span>` : ''}
      <div class="devanagari">${escapeHtml(deva)}</div>
      <div class="iast">${escapeHtml(iast)}</div>
      ${v.translations
        .map(
          (t) => `
        <div class="translation">
          <strong>${escapeHtml(t.label)}:</strong> ${escapeHtml(t.text)}
        </div>`
        )
        .join('')}
      ${
        v.tokens.length > 0
          ? `
      <table class="token-table">
        <thead>
          <tr>
            <th>Dévanágarí</th>
            <th>IAST</th>
            <th>Lemma</th>
            <th>Gramatika</th>
            <th>Význam</th>
          </tr>
        </thead>
        <tbody>
          ${v.tokens
            .map((tk) => {
              const meaning =
                tk.vocabulary?.meanings_by_lang?.cs?.contextual ||
                tk.vocabulary?.contextual_meaning_cs ||
                '—';
              const gram = tk.grammar?.label_cs || '—';
              return `
            <tr>
              <td><strong>${escapeHtml(tk.text.devanagari)}</strong></td>
              <td><em>${escapeHtml(tk.text.iast)}</em></td>
              <td>${escapeHtml(tk.lemma || '—')}</td>
              <td>${escapeHtml(gram)}</td>
              <td>${escapeHtml(meaning)}</td>
            </tr>`;
            })
            .join('')}
        </tbody>
      </table>`
          : ''
      }
      ${getVerseCommentaries(v)
        .map(
          (c) => `
        <div class="commentary">
          <strong>${escapeHtml(c.author)}</strong>${c.tradition ? ` <em>(${escapeHtml(c.tradition)})</em>` : ''}${c.title ? ` – ${escapeHtml(c.title)}` : ''}
          <div class="commentary-text"${c.lang === 'sa' ? ' lang="sa"' : ''}>${escapeHtml(c.text)}</div>
          ${c.source ? `<div class="commentary-source">${escapeHtml(c.source)}</div>` : ''}
        </div>`
        )
        .join('')}
    </div>`;
    })
    .join('')}
</body>
</html>`;
}

/** Escapes a value for a Markdown table cell (pipes and line breaks). */
function mdCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
}
