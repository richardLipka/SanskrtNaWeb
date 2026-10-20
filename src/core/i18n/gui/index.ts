/**
 * GUI Translation Management
 * 
 * Provides UI/technological string lookups decoupled from pure linguistic terms.
 */

import { SupportedLanguage } from '../types.ts';
import { GuiDictionary, GuiTranslationKey } from './types.ts';
import { CZECH_GUI } from './cs.ts';
import { ENGLISH_GUI } from './en.ts';

export * from './types.ts';
export { CZECH_GUI } from './cs.ts';
export { ENGLISH_GUI } from './en.ts';

export const UI_TRANSLATIONS: Record<string, GuiDictionary> = {
  cs: CZECH_GUI,
  en: ENGLISH_GUI
};

/**
 * Returns the full GUI dictionary for the specified language.
 */
export function getGuiDictionary(lang: SupportedLanguage = 'cs'): GuiDictionary {
  if (lang === 'en') {
    return ENGLISH_GUI;
  }
  return CZECH_GUI;
}

/**
 * Returns a translated GUI string for the given key and language.
 */
export function t(key: GuiTranslationKey, lang: SupportedLanguage = 'cs'): string {
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS['cs'];
  return dict[key] || UI_TRANSLATIONS['cs'][key] || key;
}
