/**
 * Client-Side Download, Cache & Inspection Manager for Vidyut Kosha & Cheda Dictionaries
 *
 * Provides persistent offline browser storage (IndexedDB) for Ambuda Vidyut's full dictionary
 * dataset (data-0.4.0.zip, ~18.5 MB compressed, ~55 MB uncompressed FST lexicons).
 */

export interface VidyutDataArchiveInfo {
  version: string;
  url: string;
  mirrorUrl: string;
  compressedSizeMb: number;
  uncompressedSizeMb: number;
  dictionaries: string[];
  description: string;
}

export const VIDYUT_DATA_ARCHIVE_INFO: VidyutDataArchiveInfo = {
  version: '0.4.0',
  url: 'https://github.com/ambuda-org/vidyut/releases/download/py-0.4.0/data-0.4.0.zip',
  mirrorUrl: 'https://raw.githubusercontent.com/ambuda-org/vidyut/main/data/README.md',
  compressedSizeMb: 18.5,
  uncompressedSizeMb: 55.0,
  dictionaries: [
    'Monier-Williams Sanskrit-English Dictionary (1899)',
    'V. S. Apte Practical Sanskrit-English Dictionary (1957)',
    'Śabda-Sāgara (Śabdakalpadruma)',
    'Vācaspatyam Sanskrit Lexicon',
    'Prakriyā Generated Inflections (> 10 000 000 slovních tvarů z Aṣṭādhyāyī)'
  ],
  description: 'Kompletní předsestavený FST lexikon pro vidyut-kosha a segmentátor vidyut-cheda.'
};

export interface KoshaCacheStatus {
  isDownloaded: boolean;
  sizeBytes?: number;
  sizeFormatted?: string;
  downloadedAt?: string;
  version?: string;
  filename?: string;
  filenames?: string[];
  fileCount?: number;
}

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  statusText: string;
  isComplete: boolean;
}

const DB_NAME = 'VidyutOfflineKoshaDB';
const DB_VERSION = 1;
const STORE_NAME = 'archives';
const RECORD_KEY = 'vidyut_data_archive';

/**
 * Open or upgrade the IndexedDB for Vidyut Kosha archives.
 */
function openKoshaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB není v tomto prostředí k dispozici.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Nelze otevřít IndexedDB databázi.'));
  });
}

/**
 * Check if the full dictionary ZIP is already cached in browser IndexedDB.
 */
export async function checkKoshaCacheStatus(): Promise<KoshaCacheStatus> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return { isDownloaded: false };
  }

  try {
    const db = await openKoshaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        const record = req.result;
        if (!record || !record.blob) {
          resolve({ isDownloaded: false });
          return;
        }

        const sizeBytes = record.blob.size || record.size || 0;
        const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);

        resolve({
          isDownloaded: true,
          sizeBytes,
          sizeFormatted: `${sizeMb} MB`,
          downloadedAt: record.downloadedAt,
          version: record.version || VIDYUT_DATA_ARCHIVE_INFO.version,
          filename: record.filename || 'data-0.4.0.zip',
          filenames: record.filenames || [],
          fileCount: record.filenames ? record.filenames.length : undefined
        });
      };

      req.onerror = () => resolve({ isDownloaded: false });
    });
  } catch (err) {
    console.warn('[Vidyut Kosha Downloader] Error checking cache:', err);
    return { isDownloaded: false };
  }
}

/**
 * Save downloaded ZIP blob into IndexedDB with metadata.
 */
export async function saveKoshaZipToIndexedDb(
  blob: Blob,
  filenames: string[] = [],
  filename: string = 'data-0.4.0.zip'
): Promise<void> {
  const db = await openKoshaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => db.close();
    tx.onabort = () => db.close();
    const store = tx.objectStore(STORE_NAME);

    const record = {
      id: RECORD_KEY,
      blob,
      size: blob.size,
      filename,
      version: VIDYUT_DATA_ARCHIVE_INFO.version,
      downloadedAt: new Date().toISOString(),
      filenames
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Chyba při ukládání do IndexedDB.'));
  });
}

/**
 * Retrieve the cached ZIP blob from IndexedDB.
 */
export async function getKoshaZipFromIndexedDb(): Promise<{ blob: Blob; meta: any } | null> {
  try {
    const db = await openKoshaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.blob) {
          resolve({ blob: res.blob, meta: res });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Remove cached ZIP archive from IndexedDB.
 */
export async function deleteKoshaZipFromIndexedDb(): Promise<void> {
  const db = await openKoshaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => db.close();
    tx.onabort = () => db.close();
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(RECORD_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Light-weight ZIP central directory parser to list filenames inside the archive
 * without needing an external 3rd-party library.
 *
 * Reads the End-Of-Central-Directory record and walks the central directory, which is
 * authoritative (local headers may carry zero sizes when data descriptors are used, and a
 * byte scan can hit false signatures inside compressed data). Falls back to scanning
 * local file headers for truncated archives.
 */
export async function inspectZipArchive(bufferOrBlob: ArrayBuffer | Blob): Promise<string[]> {
  const buffer = bufferOrBlob instanceof Blob ? await bufferOrBlob.arrayBuffer() : bufferOrBlob;
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  const fileNames: string[] = [];
  const pushName = (name: string) => {
    if (name && !name.endsWith('/') && !fileNames.includes(name)) fileNames.push(name);
  };

  // 1. Locate EOCD (0x06054b50) within the last 64 KiB + 22 bytes
  const minEocd = Math.max(0, buffer.byteLength - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= minEocd; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }

  if (eocd >= 0) {
    const entries = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    for (let n = 0; n < entries && offset + 46 <= buffer.byteLength; n++) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      if (offset + 46 + nameLen > buffer.byteLength) break;
      pushName(decoder.decode(new Uint8Array(buffer, offset + 46, nameLen)));
      offset += 46 + nameLen + extraLen + commentLen;
    }
    if (fileNames.length > 0) return fileNames;
  }

  // 2. Fallback: scan for local file header signatures (0x04034b50)
  for (let i = 0; i < buffer.byteLength - 30; i++) {
    if (view.getUint32(i, true) === 0x04034b50) {
      const fileNameLength = view.getUint16(i + 26, true);
      const extraFieldLength = view.getUint16(i + 28, true);
      if (fileNameLength > 0 && i + 30 + fileNameLength <= buffer.byteLength) {
        pushName(decoder.decode(new Uint8Array(buffer, i + 30, fileNameLength)));
      }
      i += 30 + fileNameLength + extraFieldLength - 1;
    }
  }

  return fileNames;
}

/**
 * Download the Vidyut data ZIP archive from upstream GitHub Releases with progress tracking.
 */
export async function downloadVidyutKoshaZip(
  onProgress?: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const targetUrl = VIDYUT_DATA_ARCHIVE_INFO.url;

  onProgress?.({
    loadedBytes: 0,
    totalBytes: VIDYUT_DATA_ARCHIVE_INFO.compressedSizeMb * 1024 * 1024,
    percent: 0,
    statusText: 'Navazuji spojení s GitHub Releases...',
    isComplete: false
  });

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      signal: abortSignal,
      mode: 'cors'
    });
  } catch (err: any) {
    throw new Error(
      `Nepodařilo se navázat spojení se serverem GitHub Releases (${err.message || 'CORS / Síťová chyba'}). ` +
      `Můžete soubor data-0.4.0.zip stáhnout ručně a nahrát ho tlačítkem 'Vybrat ZIP z disku'.`
    );
  }

  if (!response.ok) {
    throw new Error(`Server vrátil HTTP chybu ${response.status}: ${response.statusText}`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader
    ? parseInt(contentLengthHeader, 10)
    : Math.round(VIDYUT_DATA_ARCHIVE_INFO.compressedSizeMb * 1024 * 1024);

  if (!response.body) {
    const blob = await response.blob();
    onProgress?.({
      loadedBytes: blob.size,
      totalBytes: blob.size,
      percent: 100,
      statusText: 'Staženo!',
      isComplete: true
    });
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      loadedBytes += value.length;

      const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 50;
      const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);
      const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

      onProgress?.({
        loadedBytes,
        totalBytes,
        percent,
        statusText: `Stahování: ${loadedMb} MB z ${totalMb} MB (${percent} %)...`,
        isComplete: false
      });
    }
  }

  const blob = new Blob(chunks, { type: 'application/zip' });

  onProgress?.({
    loadedBytes,
    totalBytes: loadedBytes,
    percent: 100,
    statusText: `Rozbalování a ukládání do IndexedDB (${(loadedBytes / (1024 * 1024)).toFixed(1)} MB)...`,
    isComplete: true
  });

  return blob;
}

/**
 * Trigger export of the cached ZIP file to local filesystem.
 */
export function exportKoshaZipToDisk(blob: Blob, filename = 'data-0.4.0.zip'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
