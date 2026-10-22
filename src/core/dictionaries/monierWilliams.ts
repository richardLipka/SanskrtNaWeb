/**
 * Monier-Williams lookups through the Cologne Digital Sanskrit Lexicon API
 * (https://www.sanskrit-lexicon.uni-koeln.de, CORS-enabled).
 *
 * Used for showing dictionary entries inline and for validating compound-split candidates.
 */

import { iastToSlp1 } from '../transliteration/engine.ts';

const API = 'https://www.sanskrit-lexicon.uni-koeln.de/scans/csl-apidev/getword_xml.php';

export interface MwSense {
  /** Headword in IAST */
  headword: string;
  /** Plain-text entry (tags removed), IAST */
  text: string;
}

export interface MwLookupResult {
  /** The queried word in IAST */
  query: string;
  found: boolean;
  senses: MwSense[];
  /** Human-readable page for the word */
  url: string;
  /** True when the lookup failed (network/offline) rather than the word being absent */
  error?: boolean;
}

export interface MwLookupOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Maximum number of senses kept per word (default 6) */
  maxSenses?: number;
}

const cache = new Map<string, Promise<MwLookupResult>>();

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

/** Strips XML tags and Vedic accent marks, collapses whitespace. */
export function mwXmlToText(xml: string): string {
  return decodeEntities(xml.replace(/<[^>]+>/g, ' '))
    .replace(/[\u0300\u0301]/g, '') // svara accents (key2 / body carry them as combining marks)
    .normalize('NFC')
    .replace(/\s+([,;.)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Public, human-readable MW page for a word (IAST input). */
export function mwPageUrl(wordIast: string): string {
  return `https://www.sanskrit-lexicon.uni-koeln.de/simple/mw/${encodeURIComponent(wordIast)}`;
}

/** Normalizes a lookup key: no root sign, hyphens or final visarga/anusvāra spelling variants. */
export function mwKey(wordIast: string): string {
  return wordIast.normalize('NFC').trim().toLowerCase().replace(/^√/, '').replace(/[-–—_\s]/g, '');
}

/**
 * Looks up a word (IAST) in Monier-Williams. Results are cached per session;
 * network errors resolve to `found: false` and are not cached.
 */
export function lookupMonierWilliams(wordIast: string, options: MwLookupOptions = {}): Promise<MwLookupResult> {
  const query = mwKey(wordIast);
  const url = mwPageUrl(query);
  if (!query) return Promise.resolve({ query, found: false, senses: [], url });

  const cached = cache.get(query);
  if (cached) return cached;

  const doFetch = options.fetchImpl || globalThis.fetch.bind(globalThis);
  const maxSenses = options.maxSenses ?? 6;
  const notFound: MwLookupResult = { query, found: false, senses: [], url };
  const request = (async (): Promise<MwLookupResult> => {
    try {
      const params = new URLSearchParams({ dict: 'mw', key: iastToSlp1(query), input: 'slp1', output: 'roman', accent: 'no' });
      const res = await doFetch(`${API}?${params}`, { signal: options.signal });
      // The API answers a missing headword with HTTP 404 and an empty "xml" list
      if (res.status === 404) return notFound;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const xmls: string[] = Array.isArray(data?.xml) ? data.xml : [];
      const senses = xmls.slice(0, maxSenses).map((xml) => {
        const head = /<key1>(.*?)<\/key1>/.exec(xml)?.[1] || query;
        const body = /<body>([\s\S]*?)<\/body>/.exec(xml)?.[1] || xml;
        return { headword: mwXmlToText(head), text: mwXmlToText(body) };
      });
      return { query, found: senses.length > 0, senses, url };
    } catch {
      // Network problem or abort: report "not found" now, but allow a retry later
      cache.delete(query);
      return { ...notFound, error: true };
    }
  })();

  cache.set(query, request);
  return request;
}

/** Clears the in-memory lookup cache (mainly for tests). */
export function clearMonierWilliamsCache(): void {
  cache.clear();
}
