import { Verse, Token, CommentaryItem, getVerseCommentaries } from '../types/schema.ts';
import { getScriptText } from '../transliteration/engine.ts';
import { escapeHtml, safeUrl } from '../utils/html.ts';

export interface SargeantWordColumn {
  id: string;
  devanagari: string;
  iast: string;
  csPhonetic?: string;
  grammarTag: string;
  meaning: string;
  isCompound: boolean;
}

export interface SargeantVerseLayout {
  verseId: string;
  verseNumber: string;
  sourceTitle?: string;
  sourceUrl?: string;
  fullDevanagari: string;
  fullIast: string;
  wordColumns: SargeantWordColumn[];
  translations: { label: string; text: string; type: string; lang: string }[];
  glossary: { word: string; root?: string; meanings: string[]; etymology?: string }[];
  /** First commentary in the requested language (kept for backward compatibility) */
  commentary?: string;
  /** All structured and legacy commentaries of the verse */
  commentaries: CommentaryItem[];
}

/**
 * Format a verse into Winthrop Sargeant data structure with multilingual support.
 */
export function formatToSargeant(verse: Verse, lang = 'cs'): SargeantVerseLayout {
  const fullDevanagari = getScriptText(verse.scripts.devanagari);
  const fullIast = getScriptText(verse.scripts.iast);

  const wordColumns: SargeantWordColumn[] = verse.tokens.map((token: Token) => {
    const isCompound = token.compound?.is_compound_member ?? false;
    const grammarTag = (lang === 'en'
      ? token.grammar?.label_en || token.grammar?.label_cs
      : token.grammar?.label_cs || token.grammar?.label_en) || token.grammar?.pos || '—';

    // Multilingual meaning lookup
    let meaning = '';
    if (token.vocabulary?.meanings_by_lang?.[lang]?.contextual) {
      meaning = token.vocabulary.meanings_by_lang[lang].contextual;
    } else if (lang === 'cs' && token.vocabulary?.contextual_meaning_cs) {
      meaning = token.vocabulary.contextual_meaning_cs;
    } else if (token.vocabulary?.contextual_meaning_en) {
      meaning = token.vocabulary.contextual_meaning_en;
    } else {
      meaning = token.vocabulary?.contextual_meaning_cs || token.lemma || '—';
    }

    return {
      id: token.id,
      devanagari: token.text.devanagari,
      iast: token.text.iast,
      csPhonetic: token.text.cs_phonetic,
      grammarTag,
      meaning,
      isCompound
    };
  });

  const translations = verse.translations.map((t) => ({
    label: t.label,
    text: t.text,
    type: t.type,
    lang: t.lang
  }));

  const glossary = verse.tokens.map((token) => {
    const meaningsList: string[] = [];
    const entry = token.vocabulary?.meanings_by_lang?.[lang];
    if (entry) {
      if (entry.contextual) meaningsList.push(entry.contextual);
      if (entry.alternatives) meaningsList.push(...entry.alternatives);
    } else if (token.vocabulary?.contextual_meaning_cs) {
      meaningsList.push(token.vocabulary.contextual_meaning_cs);
      if (token.vocabulary.alternative_meanings_cs) {
        meaningsList.push(...token.vocabulary.alternative_meanings_cs);
      }
    }

    let etym = '';
    if (typeof token.vocabulary?.etymology === 'string') {
      etym = token.vocabulary.etymology;
    } else if (typeof token.vocabulary?.etymology === 'object') {
      etym = token.vocabulary.etymology[lang] || '';
    }

    return {
      word: `${token.text.devanagari} (${token.text.iast})`,
      root: token.grammar?.root,
      meanings: meaningsList.filter(Boolean),
      etymology: etym
    };
  });

  return {
    verseId: verse.id,
    verseNumber: verse.number,
    sourceTitle: verse.source?.title,
    sourceUrl: verse.source?.url,
    fullDevanagari,
    fullIast,
    wordColumns,
    translations,
    glossary,
    commentary: verse.commentary_by_lang?.[lang] || verse.commentary_cs ||
      getVerseCommentaries(verse).find((c) => c.lang === lang)?.text,
    commentaries: getVerseCommentaries(verse)
  };
}

/**
 * Generate clean HTML representation of Winthrop Sargeant layout.
 */
export function generateSargeantHtml(verse: Verse, lang = 'cs'): string {
  const data = formatToSargeant(verse, lang);
  const isEn = lang === 'en';
  const sourceUrl = safeUrl(data.sourceUrl);

  const columnsHtml = data.wordColumns
    .map(
      (col) => `
      <div class="sargeant-col ${col.isCompound ? 'is-compound' : ''}">
        <div class="sargeant-deva" lang="sa">${escapeHtml(col.devanagari)}</div>
        <div class="sargeant-iast">${escapeHtml(col.iast)}</div>
        <div class="sargeant-grammar">${escapeHtml(col.grammarTag)}</div>
        <div class="sargeant-meaning">${escapeHtml(col.meaning)}</div>
      </div>`
    )
    .join('');

  const translationsHtml = data.translations
    .map(
      (t) => `
      <div class="sargeant-trans">
        <span class="sargeant-trans-label">[${escapeHtml(t.lang.toUpperCase())}] ${escapeHtml(t.label)}:</span>
        <blockquote class="sargeant-trans-text" lang="${escapeHtml(t.lang)}">${escapeHtml(t.text)}</blockquote>
      </div>`
    )
    .join('');

  const glossaryHtml = data.glossary
    .map(
      (g) => `
      <li>
        <strong>${escapeHtml(g.word)}</strong>${g.root ? ` [${escapeHtml(g.root)}]` : ''}:
        ${escapeHtml(g.meanings.join(', '))}
        ${g.etymology ? `<span class="glossary-etym">(${escapeHtml(g.etymology)})</span>` : ''}
      </li>`
    )
    .join('');

  const commentariesHtml = data.commentaries
    .map(
      (c) => `
      <div class="sargeant-commentary-item">
        <strong>${escapeHtml(c.author)}</strong>${c.tradition ? ` <em>(${escapeHtml(c.tradition)})</em>` : ''}${c.title ? ` – ${escapeHtml(c.title)}` : ''}:
        <p lang="${escapeHtml(c.lang)}" style="white-space: pre-line;">${escapeHtml(c.text)}</p>
        ${c.source ? `<cite>${escapeHtml(c.source)}</cite>` : ''}
      </div>`
    )
    .join('');

  return `
  <article class="sargeant-card" id="sargeant-${escapeHtml(data.verseId)}">
    <header class="sargeant-header">
      <h3 class="sargeant-title">${isEn ? 'Verse' : 'Verš'} ${escapeHtml(data.verseNumber)} ${data.sourceTitle ? `– ${escapeHtml(data.sourceTitle)}` : ''}</h3>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="sargeant-source-link">${isEn ? 'Source' : 'Zdroj'} ↗</a>` : ''}
    </header>

    <section class="sargeant-interlinear-grid">
      ${columnsHtml}
    </section>

    <section class="sargeant-continuous">
      <div class="continuous-deva" lang="sa">${escapeHtml(data.fullDevanagari)}</div>
      <div class="continuous-iast">${escapeHtml(data.fullIast)}</div>
    </section>

    <section class="sargeant-translations">
      ${translationsHtml}
    </section>

    ${
      data.glossary.length > 0
        ? `
    <section class="sargeant-glossary">
      <h4>${isEn ? 'Glossary and etymology:' : 'Slovníček a etymologie:'}</h4>
      <ul>${glossaryHtml}</ul>
    </section>`
        : ''
    }

    ${
      data.commentaries.length > 0
        ? `
    <section class="sargeant-commentary">
      <h4>${isEn ? 'Notes and commentaries:' : 'Poznámky a komentáře:'}</h4>
      ${commentariesHtml}
    </section>`
        : ''
    }
  </article>
  `.trim();
}
