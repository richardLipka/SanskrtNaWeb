import { SanskritDocument, AppSettings } from '../types/schema.ts';
import { createCzechRules } from '../transliteration/rules.ts';

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
  return JSON.stringify(bundle, null, 2);
}

/**
 * Downloads the full Workspace Project Bundle file (*.sanskrit-project.json).
 */
export function downloadWorkspaceBundle(bundle: SanskritWorkspaceProject, filename?: string): void {
  const jsonStr = exportWorkspaceBundleToJSON(bundle);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeTitle = (bundle.projectTitle || 'projekt')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  a.download = filename || `${safeTitle}_workspace.sanskrit-project.json`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

        // Check if it's a full workspace bundle
        if (parsed.format === 'sanskrit-web-workspace-bundle' && parsed.document) {
          resolve(parsed as SanskritWorkspaceProject);
          return;
        }

        // Backward compatibility: If it's a plain SanskritDocument JSON, upgrade it to a project bundle!
        if (parsed.document && parsed.verses) {
          const upgraded = createWorkspaceBundle(
            parsed as SanskritDocument,
            {
              version: '2.0.0',
              layers: {
                devanagari: { visible: true, version: 'standard' },
                transliteration: { visible: true, version: 'iast' },
                translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent'] },
                meter: { visible: true, showAksharas: true }
              },
              theme: 'parchment',
              uiLanguage: 'cs',
              czechRules: createCzechRules(),
              defaultDictionary: 'cologne_mw',
              preserveManualEdits: true,
              fontSizeDevanagari: 24,
              fontSizeTransliteration: 16,
              fontFamilyDevanagari: 'Tiro Devanagari Sanskrit, Noto Serif Devanagari, serif',
              autoSaveToLocalStorage: true
            },
            parsed.verses[0]?.id || ''
          );
          resolve(upgraded);
          return;
        }

        reject(new Error('Neplatný formát souboru projektu (očekáván .sanskrit-project.json nebo dokumentový JSON).'));
      } catch (err: any) {
        reject(new Error(`Chyba při čtení JSON souboru: ${err.message}`));
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
    localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(bundle));
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
