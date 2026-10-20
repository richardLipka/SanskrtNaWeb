import { SanskritDocument, DocumentSchema, AppSettings, AppSettingsSchema } from '../types/schema.ts';

const STORAGE_KEY_DOC = 'sanskrit_reader_active_document_v1';
const STORAGE_KEY_SETTINGS = 'sanskrit_reader_settings_v1';

/**
 * Trigger a browser download for text content without needing any server.
 * The object URL is revoked asynchronously; revoking it synchronously right after
 * `click()` cancels the download in some browsers (notably Firefox).
 */
export function downloadTextFile(filename: string, content: string | Blob, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Trigger browser file download for JSON content without needing any server.
 */
export function downloadJsonFile(filename: string, content: string): void {
  downloadTextFile(filename, content, 'application/json;charset=utf-8');
}

/**
 * Returns a copy of the settings without secrets (LLM API key), suitable for files
 * that may be shared with other people.
 */
export function stripSettingsSecrets(settings: AppSettings): AppSettings {
  if (!settings.llmConfig?.apiKey) return settings;
  return { ...settings, llmConfig: { ...settings.llmConfig, apiKey: '' } };
}

/**
 * Export Document to disk as JSON file.
 */
export async function exportDocument(
  doc: SanskritDocument,
  preferredFilename?: string
): Promise<void> {
  // Validate before export
  const validated = DocumentSchema.parse(doc);
  const json = JSON.stringify(validated, null, 2);
  const filename = preferredFilename || `${doc.document.id || 'sanskrit-text'}.json`;

  // Try File System Access API if supported (native Save dialog)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Sanskrit Document JSON',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      // Fallback to standard download
    }
  }

  downloadJsonFile(filename, json);
}

/**
 * Export User Settings & Rules to disk as JSON file (separate from document).
 */
export async function exportSettings(
  settings: AppSettings,
  preferredFilename = 'sanskrit-settings.json'
): Promise<void> {
  const validated = stripSettingsSecrets(AppSettingsSchema.parse(settings));
  const json = JSON.stringify(validated, null, 2);

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: preferredFilename,
        types: [
          {
            description: 'Sanskrit Reader Settings JSON',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
    }
  }

  downloadJsonFile(preferredFilename, json);
}

/**
 * Read and validate document from an uploaded File or text.
 */
export async function importDocumentFromFile(file: File): Promise<SanskritDocument> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return DocumentSchema.parse(parsed);
}

/**
 * Read and validate settings from an uploaded File.
 */
export async function importSettingsFromFile(file: File): Promise<AppSettings> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return AppSettingsSchema.parse(parsed);
}

/**
 * Autosave Document to LocalStorage
 */
export function saveDocumentToCache(doc: SanskritDocument): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DOC, JSON.stringify(doc));
    }
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
}

/**
 * Load Document from LocalStorage
 */
export function loadDocumentFromCache(): SanskritDocument | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_DOC);
      if (raw) {
        return DocumentSchema.parse(JSON.parse(raw));
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached document from LocalStorage', e);
  }
  return null;
}

/**
 * Autosave Settings to LocalStorage
 */
export function saveSettingsToCache(settings: AppSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  } catch (e) {
    console.warn('LocalStorage save settings failed', e);
  }
}

/**
 * Load Settings from LocalStorage
 */
export function loadSettingsFromCache(): AppSettings | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        return AppSettingsSchema.parse(JSON.parse(raw));
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached settings from LocalStorage', e);
  }
  return null;
}
