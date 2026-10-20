import { SanskritDocument, AppSettings, DocumentSchema, AppSettingsSchema } from '../types/schema.ts';
import { downloadJsonFile, stripSettingsSecrets } from './localStore.ts';

export interface GlossaryTermEntry {
  stem: string;
  devanagari: string;
  translationCs: string;
  translationEn: string;
  notes?: string;
  category?: string;
}

export type VerseTranslationStatus = 'untranslated' | 'draft' | 'in_review' | 'translated' | 'verified';

export interface SanskritWorkspaceProject {
  format: 'sanskrit-web-workspace-bundle';
  version: '1.0.0';
  projectTitle: string;
  exportedAt: string;
  document: SanskritDocument;
  settings: AppSettings;
  glossary: Record<string, GlossaryTermEntry>;
  translationState: {
    activeVerseId: string;
    verseStatuses: Record<string, VerseTranslationStatus>;
    lastSavedAt: string;
  };
}

const STORAGE_PROJECT_KEY = 'sanskrt_workspace_project_v1';

/**
 * Creates a complete Workspace Project Bundle from current application state.
 */
export function createWorkspaceBundle(
  document: SanskritDocument,
  settings: AppSettings,
  activeVerseId: string,
  glossary: Record<string, GlossaryTermEntry> = {},
  verseStatuses: Record<string, VerseTranslationStatus> = {}
): SanskritWorkspaceProject {
  // Sync statuses from verses if not provided
  const statuses: Record<string, VerseTranslationStatus> = { ...verseStatuses };
  for (const v of document.verses) {
    if (!statuses[v.id]) {
      statuses[v.id] = (v.translationStatus as VerseTranslationStatus) || 'draft';
    }
  }

  return {
    format: 'sanskrit-web-workspace-bundle',
    version: '1.0.0',
    projectTitle: document.document.title || 'Sanskrt Překladatelský Projekt',
    exportedAt: new Date().toISOString(),
    document,
    settings,
    glossary,
    translationState: {
      activeVerseId: activeVerseId || (document.verses[0]?.id ?? ''),
      verseStatuses: statuses,
      lastSavedAt: new Date().toISOString()
    }
  };
}

/**
 * Serializes a Workspace Project Bundle to JSON.
 */
export function exportWorkspaceBundleToJSON(bundle: SanskritWorkspaceProject): string {
  // Project files are meant to be shared – never write the LLM API key into them
  return JSON.stringify({ ...bundle, settings: stripSettingsSecrets(bundle.settings) }, null, 2);
}

/**
 * Builds a filesystem-friendly file name from a project title ("Bhagavadgītā" -> "bhagavadgita").
 */
export function projectFileSlug(title: string): string {
  const slug = (title || 'projekt')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || 'projekt';
}

/**
 * Downloads the full Workspace Project Bundle file (*.sanskrit-project.json).
 */
export function downloadWorkspaceBundle(bundle: SanskritWorkspaceProject, filename?: string): void {
  downloadJsonFile(
    filename || `${projectFileSlug(bundle.projectTitle)}_workspace.sanskrit-project.json`,
    exportWorkspaceBundleToJSON(bundle)
  );
}

/**
 * Imports a Workspace Project Bundle from a File or JSON string.
 */
export async function importWorkspaceBundleFromFile(file: File): Promise<SanskritWorkspaceProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Full workspace bundle: validate the document (applies defaults, rejects broken data)
        if (parsed.format === 'sanskrit-web-workspace-bundle' && parsed.document) {
          const document = DocumentSchema.parse(parsed.document);
          const settingsResult = AppSettingsSchema.safeParse(parsed.settings ?? {});
          resolve({
            ...parsed,
            document,
            settings: settingsResult.success ? settingsResult.data : AppSettingsSchema.parse({}),
            glossary: parsed.glossary && typeof parsed.glossary === 'object' ? parsed.glossary : {},
            translationState: {
              activeVerseId: parsed.translationState?.activeVerseId || document.verses[0]?.id || '',
              verseStatuses: parsed.translationState?.verseStatuses || {},
              lastSavedAt: parsed.translationState?.lastSavedAt || new Date().toISOString()
            }
          } as SanskritWorkspaceProject);
          return;
        }

        // Backward compatibility: If it's a plain SanskritDocument JSON, upgrade it to a project bundle!
        if (parsed.document && parsed.verses) {
          const document = DocumentSchema.parse(parsed);
          resolve(createWorkspaceBundle(document, AppSettingsSchema.parse({}), document.verses[0]?.id || ''));
          return;
        }

        reject(new Error('Neplatný formát souboru projektu (očekáván .sanskrit-project.json nebo dokumentový JSON).'));
      } catch (err: any) {
        const detail = err?.issues
          ? err.issues.slice(0, 3).map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : err.message;
        reject(new Error(`Chyba při čtení JSON souboru: ${detail}`));
      }
    };
    reader.onerror = () => reject(new Error('Chyba při načítání souboru.'));
    reader.readAsText(file);
  });
}

/**
 * Persists the entire active workspace bundle to localStorage for instant crash recovery.
 */
export function saveWorkspaceBundleToCache(bundle: SanskritWorkspaceProject): void {
  try {
    localStorage.setItem(STORAGE_PROJECT_KEY, exportWorkspaceBundleToJSON(bundle));
  } catch (e) {
    console.warn('[Storage] Failed to save workspace bundle to cache:', e);
  }
}

/**
 * Loads the last persisted workspace bundle from localStorage.
 */
export function loadWorkspaceBundleFromCache(): SanskritWorkspaceProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[Storage] Failed to load workspace bundle from cache:', e);
    return null;
  }
}
