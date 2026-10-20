/**
 * Shared HTML safety helpers for the Web Components and exporters.
 *
 * Every string that reaches `innerHTML` (document data, LLM output, user input)
 * must pass through `escapeHtml`, and every user-controlled URL through `safeUrl`.
 */

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns the URL if it uses a safe scheme (http, https, mailto) or is relative,
 * otherwise an empty string. Blocks `javascript:`, `data:` and similar schemes.
 */
export function safeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Strip control characters and whitespace that browsers ignore inside schemes
  const probe = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  const schemeMatch = probe.match(/^([a-z][a-z0-9+.-]*):/);
  if (!schemeMatch) return trimmed; // relative URL
  return ['http', 'https', 'mailto'].includes(schemeMatch[1]) ? trimmed : '';
}

/**
 * Escapes a value for use inside a CSS attribute selector.
 */
export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface AlignedPhrase {
  phrase: string;
  tokenId: string;
}

export interface AlignedRange {
  start: number;
  end: number;
  tokenId: string;
}

const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;

/**
 * Locates non-overlapping occurrences of aligned phrases in a translation text.
 *
 * Longer phrases are placed first. Word boundaries are Unicode-aware, so Czech words
 * with diacritics (e.g. "činnost") are matched as whole words and short phrases such as
 * "je" never match inside "jeho". A boundary is only required on a side where the phrase
 * itself starts/ends with a letter, so phrases like "ne-" or "[nyní]" still work.
 */
export function findAlignedRanges(text: string, alignments: AlignedPhrase[]): AlignedRange[] {
  if (!text) return [];
  const sorted = alignments
    .map((a) => ({ phrase: (a.phrase || '').trim(), tokenId: a.tokenId }))
    .filter((a) => a.phrase.length > 0)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const taken: AlignedRange[] = [];

  for (const { phrase, tokenId } of sorted) {
    const leading = WORD_CHAR.test(phrase[0]) ? '(?<![\\p{L}\\p{N}\\p{M}])' : '';
    const trailing = WORD_CHAR.test(phrase[phrase.length - 1]) ? '(?![\\p{L}\\p{N}\\p{M}])' : '';
    const re = new RegExp(`${leading}${escapeRegExp(phrase)}${trailing}`, 'giu');

    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!taken.some((r) => start < r.end && end > r.start)) {
        taken.push({ start, end, tokenId });
        break;
      }
      if (match[0].length === 0) re.lastIndex++;
    }
  }

  return taken.sort((a, b) => a.start - b.start);
}

/**
 * Renders a translation text as escaped HTML with aligned phrases wrapped by `wrap`.
 * `wrap` receives the already-escaped phrase text and the token id.
 */
export function renderAlignedHtml(
  text: string,
  alignments: AlignedPhrase[],
  wrap: (escapedPhrase: string, tokenId: string) => string
): string {
  if (!text) return '';
  const ranges = findAlignedRanges(text, alignments);
  let html = '';
  let cursor = 0;
  for (const r of ranges) {
    html += escapeHtml(text.slice(cursor, r.start));
    html += wrap(escapeHtml(text.slice(r.start, r.end)), r.tokenId);
    cursor = r.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}
