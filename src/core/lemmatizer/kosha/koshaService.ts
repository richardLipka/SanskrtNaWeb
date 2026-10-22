/**
 * Offline Vidyut lexicon (kosha) for the browser: loads the downloaded data archive from
 * IndexedDB once (used by compoundService.ts).
 */

import { Kosha, koshaFromZip } from './kosha.ts';
import { getKoshaZipFromIndexedDb } from '../vidyutKoshaDownloader.ts';

let kosha: Kosha | null = null;
let loading: Promise<Kosha | null> | null = null;

/** The kosha when it has already been loaded (synchronous callers). */
export function getLoadedKosha(): Kosha | null {
  return kosha;
}

/**
 * Loads the kosha from the archive cached in IndexedDB. Resolves to null when the archive
 * has not been downloaded (the next call tries again, e.g. after a download).
 */
export async function loadOfflineKosha(): Promise<Kosha | null> {
  if (kosha) return kosha;
  if (loading) return loading;
  loading = (async () => {
    try {
      const cached = await getKoshaZipFromIndexedDb();
      if (!cached?.blob) return null;
      kosha = await koshaFromZip(cached.blob);
      return kosha;
    } catch (err) {
      console.warn('[kosha] Offline dictionary could not be loaded:', err);
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Forgets the loaded kosha (after the archive was deleted or replaced). */
export function resetOfflineKosha(): void {
  kosha = null;
}

/** Uses an already constructed kosha (tests, Node scripts). */
export function useKosha(k: Kosha | null): void {
  kosha = k;
}
