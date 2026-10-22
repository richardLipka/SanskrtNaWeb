/**
 * SanskrtNaWeb - Core Sanskrit Library & Web Components
 * 
 * An extensible, language-agnostic library for classical text analysis,
 * multi-script transliteration, Paninian grammar analysis (Vidyut WASM),
 * alignment tooling, commentary exegesis, and interactive Web Components.
 *
 * @license MIT
 */

// Core Schema & Data Types
export * from './core/types/schema.ts';

// Adapters (Language-agnostic framework & Sanskrit implementation)
export * from './core/adapters/languageAdapter.ts';
export * from './core/adapters/sanskritAdapter.ts';

// Lemmatizer, Morphology & Vidyut WASM
export * from './core/lemmatizer/sanskritLemmatizer.ts';
export * from './core/lemmatizer/vidyutAdapter.ts';
export * from './core/lemmatizer/vidyutKoshaDownloader.ts';
export * from './core/lemmatizer/kosha/kosha.ts';
export * from './core/lemmatizer/kosha/koshaService.ts';
export * from './core/lemmatizer/compoundSegmenter.ts';
export * from './core/lemmatizer/staticLexicon.ts';
export * from './core/lemmatizer/compoundService.ts';
export * from './core/dictionaries/dictionaryBuilder.ts';

// Transliteration & Phonetics
export * from './core/transliteration/engine.ts';
export * from './core/transliteration/rules.ts';

// Corpus, Concordance & Book Hierarchy
export * from './core/corpus/bookManager.ts';
export * from './core/corpus/concordance.ts';

// Alignment & Virtual Keyboards
export * from './core/editor/virtualKeyboard.ts';
export * from './core/editor/alignmentTool.ts';

// Multilingual Terminology & i18n
export * from './core/i18n/terminology.ts';
export * from './core/i18n/translations.ts';

// Workspace Persistence & Storage
export * from './core/storage/workspaceBundle.ts';
export * from './core/storage/localStore.ts';

// LLM Translation & Exegesis
export * from './core/llm/llmService.ts';
export * from './core/llm/llmTypes.ts';

// Custom Web Components
export * from './components/SanskritVerse.ts';
export * from './components/SanskritReader.ts';
export * from './components/SanskritEditor.ts';
