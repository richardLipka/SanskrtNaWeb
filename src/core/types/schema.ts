import { z } from 'zod';
import { LLMConfigSchema } from '../llm/llmTypes.ts';

/**
 * Script entry with edit tracking to protect manual entries from auto-overwrite.
 */
export const ScriptItemSchema = z.object({
  text: z.string(),
  mode: z.enum(['auto', 'manual']).default('auto'),
  lastAutoText: z.string().optional()
});

export type ScriptItem = z.infer<typeof ScriptItemSchema>;

/**
 * Supported script keys and custom extensions
 */
export const ScriptMapSchema = z.object({
  devanagari: z.union([z.string(), ScriptItemSchema]),
  devanagari_padaccheda: z.union([z.string(), ScriptItemSchema]).optional(),
  iast: z.union([z.string(), ScriptItemSchema]),
  iast_padaccheda: z.union([z.string(), ScriptItemSchema]).optional(),
  cs_phonetic: z.union([z.string(), ScriptItemSchema]).optional(),
  cs_phonetic_padaccheda: z.union([z.string(), ScriptItemSchema]).optional(),
  harvard_kyoto: z.union([z.string(), ScriptItemSchema]).optional(),
  slp1: z.union([z.string(), ScriptItemSchema]).optional(),
  iso15919: z.union([z.string(), ScriptItemSchema]).optional()
}).catchall(z.union([z.string(), ScriptItemSchema]));

export type ScriptMap = z.infer<typeof ScriptMapSchema>;

/**
 * Translation entry schema - supports arbitrary languages and styles
 */
export const TranslationSchema = z.object({
  id: z.string(),
  label: z.string(),
  lang: z.string().default('cs'), // e.g. cs, en, de, fr, es, sk
  type: z.enum(['fluent', 'literal', 'scholarly', 'poetic', 'commentary']).default('fluent'),
  text: z.string(),
  author: z.string().optional(),
  notes: z.string().optional()
});

export type Translation = z.infer<typeof TranslationSchema>;

/**
 * Commentary entry schema - supports traditional and modern commentaries,
 * multiple authors (Śaṅkara, Rāmānuja, Madhva, modern scholars, translator notes),
 * and various languages (Sanskrit original, Czech, English, etc.)
 */
export const CommentaryItemSchema = z.object({
  id: z.string(),
  author: z.string(), // e.g. "Śaṅkarācārya", "Rāmānuja", "Madhvācārya", "Śrīdhara Svāmī", "Abhinavagupta", "Překladatel"
  tradition: z.string().optional(), // e.g. "Advaita Vedānta", "Viśiṣṭādvaita", "Dvaita", "Kaula-Śaiva", "Akademická poznámka"
  title: z.string().optional(), // e.g. "Śāṅkarabhāṣya", "Gītābhāṣya", "Subodhinī"
  lang: z.string().default('sa'), // "sa" (Sanskrit), "cs" (Czech), "en" (English), etc.
  text: z.string(),
  source: z.string().optional(),
  isOriginalSanskrit: z.boolean().default(false)
});

export type CommentaryItem = z.infer<typeof CommentaryItemSchema>;

/**
 * Detailed Sanskrit grammar analysis
 */
export const GrammarSchema = z.object({
  pos: z.enum([
    'noun',
    'verb',
    'adjective',
    'indeclinable',
    'pronoun',
    'participle',
    'prefix',
    'particle'
  ]).optional(),
  root: z.string().optional(),
  stem: z.string().optional(),
  gender: z.enum(['masculine', 'feminine', 'neuter', 'any']).optional(),
  case: z.enum([
    'nominative',
    'accusative',
    'instrumental',
    'dative',
    'ablative',
    'genitive',
    'locative',
    'vocative',
    'stem_in_compound'
  ]).optional(),
  number: z.enum(['singular', 'dual', 'plural']).optional(),
  tense: z.string().optional(),
  mood: z.string().optional(),
  person: z.enum(['1st', '2nd', '3rd']).optional(),
  voice: z.enum(['active', 'middle', 'passive']).optional(),
  label_cs: z.string().optional(),
  label_en: z.string().optional(),
  notes: z.string().optional()
});

export type Grammar = z.infer<typeof GrammarSchema>;

/**
 * Samasa / compound metadata
 */
export const CompoundSchema = z.object({
  is_compound_member: z.boolean().default(false),
  position: z.enum(['prefix', 'middle', 'final']).optional(),
  type: z.string().optional(),
  analysis: z.string().optional()
});

export type Compound = z.infer<typeof CompoundSchema>;

/**
 * Multilingual vocabulary definition
 * Supports contextual meaning and alternative definitions in arbitrary languages (cs, en, de, etc.)
 */
export const VocabularyEntrySchema = z.object({
  contextual: z.string(),
  alternatives: z.array(z.string()).default([])
});

export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;

export const VocabularySchema = z.object({
  // Multilingual map: { cs: { contextual: '...', alternatives: [...] }, en: { contextual: '...', alternatives: [...] } }
  meanings_by_lang: z.record(VocabularyEntrySchema).default({}),
  // Backward compatibility fields
  contextual_meaning_cs: z.string().optional(),
  alternative_meanings_cs: z.array(z.string()).optional(),
  contextual_meaning_en: z.string().optional(),
  alternative_meanings_en: z.array(z.string()).optional(),
  etymology: z.union([z.string(), z.record(z.string())]).optional(),
  philosophical_note: z.union([z.string(), z.record(z.string())]).optional()
});

export type Vocabulary = z.infer<typeof VocabularySchema>;

/**
 * Alignment link between this token and translation target text
 */
export const AlignmentSchema = z.object({
  matched_words: z.record(z.array(z.string())).default({})
});

export type Alignment = z.infer<typeof AlignmentSchema>;

/**
 * Token (word/element) representation
 */
export const TokenSchema = z.object({
  id: z.string(),
  text: z.object({
    devanagari: z.string(),
    devanagari_in_verse: z.string().optional(),
    iast: z.string(),
    iast_in_verse: z.string().optional(),
    cs_phonetic: z.string().optional()
  }),
  lemma: z.string().optional(),
  sandhi_note: z.string().optional(),
  compound: CompoundSchema.optional(),
  grammar: GrammarSchema.optional(),
  vocabulary: VocabularySchema.optional(),
  alignment: AlignmentSchema.default({ matched_words: {} }),
  dictionaryLookup: z.string().optional()
});

export type Token = z.infer<typeof TokenSchema>;

/**
 * External source / citation metadata
 */
export const SourceSchema = z.object({
  title: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  citation: z.string().optional(),
  note: z.string().optional()
});

export type Source = z.infer<typeof SourceSchema>;

/**
 * Single verse / stanza / sutra
 */
export const VerseSchema = z.object({
  id: z.string(),
  number: z.string(),
  book: z.string().optional(),
  chapter: z.string().optional(),
  section: z.string().optional(),
  source: SourceSchema.optional(),
  scripts: ScriptMapSchema,
  translations: z.array(TranslationSchema).default([]),
  tokens: z.array(TokenSchema).default([]),
  commentaries: z.array(CommentaryItemSchema).optional(),
  commentary_cs: z.string().optional(),
  commentary_by_lang: z.record(z.string()).optional(),
  meter: z.string().optional(), // e.g. "Anuṣṭubh (Śloka)", "Triṣṭubh", "Sūtra"
  meter_notes: z.string().optional(),
  translationStatus: z.enum(['untranslated', 'draft', 'in_review', 'translated', 'verified']).optional(),
  visibleLayersOverride: z.array(z.string()).optional()
});

export type Verse = z.infer<typeof VerseSchema>;

/**
 * Normalizes and retrieves all commentaries associated with a verse.
 * Smoothly bridges structured commentaries with legacy commentary_cs / commentary_by_lang.
 */
export function getVerseCommentaries(verse: Verse): CommentaryItem[] {
  const result: CommentaryItem[] = [];

  if (verse.commentaries && verse.commentaries.length > 0) {
    result.push(...verse.commentaries);
  }

  // Fallback to legacy fields if commentaries array is empty
  if (result.length === 0) {
    if (verse.commentary_by_lang) {
      for (const [lang, text] of Object.entries(verse.commentary_by_lang)) {
        if (text && text.trim()) {
          result.push({
            id: `comm_${verse.id}_${lang}`,
            author: lang === 'sa' ? 'Tradiční komentář' : 'Komentář k verši',
            tradition: lang === 'sa' ? 'Sanskrt' : undefined,
            lang,
            text: text.trim(),
            isOriginalSanskrit: lang === 'sa'
          });
        }
      }
    } else if (verse.commentary_cs && verse.commentary_cs.trim()) {
      result.push({
        id: `comm_${verse.id}_cs`,
        author: 'Český komentář',
        lang: 'cs',
        text: verse.commentary_cs.trim(),
        isOriginalSanskrit: false
      });
    }
  }

  return result;
}

/**
 * Top-level Sanskrit document / collection
 */
export const DocumentMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  book: z.string().optional(),
  chapter: z.string().optional(),
  section: z.string().optional(),
  author: z.string().optional(),
  tradition: z.string().optional(),
  editor: z.string().optional(),
  totalVerses: z.number().optional(),
  status: z.enum(['draft', 'in_review', 'verified']).default('draft'),
  defaultLayers: z.array(z.string()).default([
    'devanagari',
    'transliteration',
    'translation'
  ]),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

export const DocumentSchema = z.object({
  $schema: z.string().optional(),
  document: DocumentMetadataSchema,
  verses: z.array(VerseSchema)
});

export type SanskritDocument = z.infer<typeof DocumentSchema>;

/**
 * Complete Alphabet and Ligature Mapping Tables
 */
export const CharacterMapItemSchema = z.object({
  devanagari: z.string(),
  iast: z.string(),
  cs_phonetic: z.string(),
  hk: z.string(),
  slp1: z.string().optional(),
  category: z.enum(['vowel_independent', 'vowel_matra', 'consonant', 'special', 'numeral'])
});

export type CharacterMapItem = z.infer<typeof CharacterMapItemSchema>;

export const LigatureItemSchema = z.object({
  id: z.string(),
  devanagari: z.string(),
  components: z.array(z.string()), // e.g. ["j", "ñ"]
  iast: z.string(),               // e.g. "jña"
  cs_phonetic: z.string(),        // e.g. "džňa"
  hk: z.string(),                 // e.g. "J"
  description: z.string().optional(),
  isIrregular: z.boolean().default(false)
});

export type LigatureItem = z.infer<typeof LigatureItemSchema>;

export const AlphabetMappingTableSchema = z.object({
  version: z.string().default('1.0.0'),
  name: z.string().default('Sanskrit Alphabet & Ligatures Table'),
  baseCharacters: z.array(CharacterMapItemSchema),
  ligatures: z.array(LigatureItemSchema)
});

export type AlphabetMappingTable = z.infer<typeof AlphabetMappingTableSchema>;

/**
 * Transliteration configuration rules
 */
export const CzechPhoneticRulesSchema = z.object({
  rSyllabic: z.enum(['r', 'ri', 'ṛ']).default('r'),
  rSyllabicLong: z.enum(['rí', 'rī', 'ṝ']).default('rí'),
  lSyllabic: z.enum(['l', 'li', 'ḷ']).default('l'),
  sibilantPalatal: z.enum(['š', 'ś', 'sh']).default('š'),
  sibilantRetroflex: z.enum(['š', 'ṣ', 'sh']).default('š'),
  cPalatal: z.enum(['č', 'c', 'ch']).default('č'),
  chAspirated: z.enum(['čh', 'ch', 'cch']).default('čh'),
  jAffricate: z.enum(['dž', 'j', 'dzh']).default('dž'),
  jhAspirated: z.enum(['džh', 'jh']).default('džh'),
  ySemivowel: z.enum(['j', 'y']).default('j'),
  vSemivowel: z.enum(['v', 'w']).default('v'),
  longVowels: z.enum(['czech_accents', 'iast_macrons']).default('czech_accents'),
  anusvaraMode: z.enum(['simple_m', 'simple_n', 'phonetic']).default('simple_m'),
  visargaMode: z.enum(['h', 'ah', 'none']).default('h'),
  customWordOverrides: z.record(z.string()).default({})
});

export type CzechPhoneticRules = z.infer<typeof CzechPhoneticRulesSchema>;

/**
 * Application Settings with 3-layer architecture, theme and multilingual preferences
 */
export const AppSettingsSchema = z.object({
  version: z.string().default('2.0.0'),
  // 3-Layer configuration
  layers: z.object({
    devanagari: z.object({
      visible: z.boolean().default(true),
      version: z.enum(['standard', 'padaccheda']).default('standard')
    }),
    transliteration: z.object({
      visible: z.boolean().default(true),
      version: z.enum(['iast', 'cs_phonetic', 'harvard_kyoto', 'slp1', 'iast_padaccheda']).default('iast')
    }),
    translation: z.object({
      visible: z.boolean().default(true),
      activeLang: z.string().default('cs'), // active language filter
      activeTypes: z.array(z.string()).default(['fluent', 'literal']) // which translation types to show
    }),
    meter: z.object({
      visible: z.boolean().default(true),
      showAksharas: z.boolean().default(true)
    }).default({ visible: true, showAksharas: true }),
    commentary: z.object({
      visible: z.boolean().default(true),
      activeAuthors: z.array(z.string()).default([]),
      activeLangs: z.array(z.string()).default(['sa', 'cs', 'en']),
      layout: z.enum(['stacked', 'columns']).default('stacked')
    }).default({ visible: true, activeAuthors: [], activeLangs: ['sa', 'cs', 'en'], layout: 'stacked' }).optional()
  }).default({
    devanagari: { visible: true, version: 'standard' },
    transliteration: { visible: true, version: 'iast' },
    translation: { visible: true, activeLang: 'cs', activeTypes: ['fluent', 'literal'] },
    meter: { visible: true, showAksharas: true },
    commentary: { visible: true, activeAuthors: [], activeLangs: ['sa', 'cs', 'en'], layout: 'stacked' }
  }),
  theme: z.enum(['parchment', 'dark', 'ashram', 'academic']).default('parchment'),
  uiLanguage: z.enum(['cs', 'en']).optional().default('cs'),
  czechRules: CzechPhoneticRulesSchema.default({}),
  defaultDictionary: z.enum([
    'cologne_mw',
    'cologne_apte',
    'wisdomlib',
    'ambuda',
    'learnsanskrit',
    'ashtadhyayi'
  ]).default('cologne_mw'),
  preserveManualEdits: z.boolean().default(true),
  fontSizeDevanagari: z.number().default(24),
  fontSizeTransliteration: z.number().default(16),
  fontFamilyDevanagari: z.string().default('Tiro Devanagari Sanskrit, Noto Serif Devanagari, serif'),
  autoSaveToLocalStorage: z.boolean().default(true),
  llmConfig: LLMConfigSchema.optional()
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;
