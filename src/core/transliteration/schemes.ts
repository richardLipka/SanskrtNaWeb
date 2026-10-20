import { CharacterMapItem, LigatureItem, AlphabetMappingTable, AlphabetMappingTableSchema } from '../types/schema.ts';

export const VIRAMA = '्';

/**
 * Complete Base Characters Table (Vowels, Matras, Consonants, Signs, Numerals)
 */
export const DEFAULT_BASE_CHARACTERS: CharacterMapItem[] = [
  // Independent Vowels
  { devanagari: 'अ', iast: 'a', cs_phonetic: 'a', hk: 'a', slp1: 'a', category: 'vowel_independent' },
  { devanagari: 'आ', iast: 'ā', cs_phonetic: 'á', hk: 'A', slp1: 'A', category: 'vowel_independent' },
  { devanagari: 'इ', iast: 'i', cs_phonetic: 'i', hk: 'i', slp1: 'i', category: 'vowel_independent' },
  { devanagari: 'ई', iast: 'ī', cs_phonetic: 'í', hk: 'I', slp1: 'I', category: 'vowel_independent' },
  { devanagari: 'उ', iast: 'u', cs_phonetic: 'u', hk: 'u', slp1: 'u', category: 'vowel_independent' },
  { devanagari: 'ऊ', iast: 'ū', cs_phonetic: 'ú', hk: 'U', slp1: 'U', category: 'vowel_independent' },
  { devanagari: 'ऋ', iast: 'ṛ', cs_phonetic: 'r', hk: 'R', slp1: 'f', category: 'vowel_independent' },
  { devanagari: 'ॠ', iast: 'ṝ', cs_phonetic: 'rí', hk: 'RR', slp1: 'F', category: 'vowel_independent' },
  { devanagari: 'ऌ', iast: 'ḷ', cs_phonetic: 'l', hk: 'lR', slp1: 'x', category: 'vowel_independent' },
  { devanagari: 'ॡ', iast: 'ḹ', cs_phonetic: 'lí', hk: 'lRR', slp1: 'X', category: 'vowel_independent' },
  { devanagari: 'ए', iast: 'e', cs_phonetic: 'e', hk: 'e', slp1: 'e', category: 'vowel_independent' },
  { devanagari: 'ऐ', iast: 'ai', cs_phonetic: 'ai', hk: 'ai', slp1: 'E', category: 'vowel_independent' },
  { devanagari: 'ओ', iast: 'o', cs_phonetic: 'o', hk: 'o', slp1: 'o', category: 'vowel_independent' },
  { devanagari: 'औ', iast: 'au', cs_phonetic: 'au', hk: 'au', slp1: 'O', category: 'vowel_independent' },

  // Dependent Vowel Signs (Mātrās)
  { devanagari: 'ा', iast: 'ā', cs_phonetic: 'á', hk: 'A', slp1: 'A', category: 'vowel_matra' },
  { devanagari: 'ि', iast: 'i', cs_phonetic: 'i', hk: 'i', slp1: 'i', category: 'vowel_matra' },
  { devanagari: 'ी', iast: 'ī', cs_phonetic: 'í', hk: 'I', slp1: 'I', category: 'vowel_matra' },
  { devanagari: 'ु', iast: 'u', cs_phonetic: 'u', hk: 'u', slp1: 'u', category: 'vowel_matra' },
  { devanagari: 'ू', iast: 'ū', cs_phonetic: 'ú', hk: 'U', slp1: 'U', category: 'vowel_matra' },
  { devanagari: 'ृ', iast: 'ṛ', cs_phonetic: 'r', hk: 'R', slp1: 'f', category: 'vowel_matra' },
  { devanagari: 'ॄ', iast: 'ṝ', cs_phonetic: 'rí', hk: 'RR', slp1: 'F', category: 'vowel_matra' },
  { devanagari: 'ॢ', iast: 'ḷ', cs_phonetic: 'l', hk: 'lR', slp1: 'x', category: 'vowel_matra' },
  { devanagari: 'ॣ', iast: 'ḹ', cs_phonetic: 'lí', hk: 'lRR', slp1: 'X', category: 'vowel_matra' },
  { devanagari: 'े', iast: 'e', cs_phonetic: 'e', hk: 'e', slp1: 'e', category: 'vowel_matra' },
  { devanagari: 'ै', iast: 'ai', cs_phonetic: 'ai', hk: 'ai', slp1: 'E', category: 'vowel_matra' },
  { devanagari: 'ो', iast: 'o', cs_phonetic: 'o', hk: 'o', slp1: 'o', category: 'vowel_matra' },
  { devanagari: 'ौ', iast: 'au', cs_phonetic: 'au', hk: 'au', slp1: 'O', category: 'vowel_matra' },

  // Consonants - Gutturals (Velars)
  { devanagari: 'क', iast: 'k', cs_phonetic: 'k', hk: 'k', slp1: 'k', category: 'consonant' },
  { devanagari: 'ख', iast: 'kh', cs_phonetic: 'kh', hk: 'kh', slp1: 'K', category: 'consonant' },
  { devanagari: 'ग', iast: 'g', cs_phonetic: 'g', hk: 'g', slp1: 'g', category: 'consonant' },
  { devanagari: 'घ', iast: 'gh', cs_phonetic: 'gh', hk: 'gh', slp1: 'G', category: 'consonant' },
  { devanagari: 'ङ', iast: 'ṅ', cs_phonetic: 'n', hk: 'G', slp1: 'N', category: 'consonant' },

  // Consonants - Palatals
  { devanagari: 'च', iast: 'c', cs_phonetic: 'č', hk: 'c', slp1: 'c', category: 'consonant' },
  { devanagari: 'छ', iast: 'ch', cs_phonetic: 'čh', hk: 'ch', slp1: 'C', category: 'consonant' },
  { devanagari: 'ज', iast: 'j', cs_phonetic: 'dž', hk: 'j', slp1: 'j', category: 'consonant' },
  { devanagari: 'झ', iast: 'jh', cs_phonetic: 'džh', hk: 'jh', slp1: 'J', category: 'consonant' },
  { devanagari: 'ञ', iast: 'ñ', cs_phonetic: 'ň', hk: 'J', slp1: 'Y', category: 'consonant' },

  // Consonants - Retroflexes
  { devanagari: 'ट', iast: 'ṭ', cs_phonetic: 't', hk: 'T', slp1: 'w', category: 'consonant' },
  { devanagari: 'ठ', iast: 'ṭh', cs_phonetic: 'th', hk: 'Th', slp1: 'W', category: 'consonant' },
  { devanagari: 'ड', iast: 'ḍ', cs_phonetic: 'd', hk: 'D', slp1: 'q', category: 'consonant' },
  { devanagari: 'ढ', iast: 'ḍh', cs_phonetic: 'dh', hk: 'Dh', slp1: 'Q', category: 'consonant' },
  { devanagari: 'ण', iast: 'ṇ', cs_phonetic: 'n', hk: 'N', slp1: 'R', category: 'consonant' },

  // Consonants - Dentals
  { devanagari: 'त', iast: 't', cs_phonetic: 't', hk: 't', slp1: 't', category: 'consonant' },
  { devanagari: 'थ', iast: 'th', cs_phonetic: 'th', hk: 'th', slp1: 'T', category: 'consonant' },
  { devanagari: 'द', iast: 'd', cs_phonetic: 'd', hk: 'd', slp1: 'd', category: 'consonant' },
  { devanagari: 'ध', iast: 'dh', cs_phonetic: 'dh', hk: 'dh', slp1: 'D', category: 'consonant' },
  { devanagari: 'न', iast: 'n', cs_phonetic: 'n', hk: 'n', slp1: 'n', category: 'consonant' },

  // Consonants - Labials
  { devanagari: 'प', iast: 'p', cs_phonetic: 'p', hk: 'p', slp1: 'p', category: 'consonant' },
  { devanagari: 'फ', iast: 'ph', cs_phonetic: 'ph', hk: 'ph', slp1: 'P', category: 'consonant' },
  { devanagari: 'ब', iast: 'b', cs_phonetic: 'b', hk: 'b', slp1: 'b', category: 'consonant' },
  { devanagari: 'भ', iast: 'bh', cs_phonetic: 'bh', hk: 'bh', slp1: 'B', category: 'consonant' },
  { devanagari: 'म', iast: 'm', cs_phonetic: 'm', hk: 'm', slp1: 'm', category: 'consonant' },

  // Semivowels
  { devanagari: 'य', iast: 'y', cs_phonetic: 'j', hk: 'y', slp1: 'y', category: 'consonant' },
  { devanagari: 'र', iast: 'r', cs_phonetic: 'r', hk: 'r', slp1: 'r', category: 'consonant' },
  { devanagari: 'ल', iast: 'l', cs_phonetic: 'l', hk: 'l', slp1: 'l', category: 'consonant' },
  { devanagari: 'व', iast: 'v', cs_phonetic: 'v', hk: 'v', slp1: 'v', category: 'consonant' },

  // Sibilants & Aspirate
  { devanagari: 'श', iast: 'ś', cs_phonetic: 'š', hk: 'z', slp1: 'S', category: 'consonant' },
  { devanagari: 'ष', iast: 'ṣ', cs_phonetic: 'š', hk: 'S', slp1: 'z', category: 'consonant' },
  { devanagari: 'स', iast: 's', cs_phonetic: 's', hk: 's', slp1: 's', category: 'consonant' },
  { devanagari: 'ह', iast: 'h', cs_phonetic: 'h', hk: 'h', slp1: 'h', category: 'consonant' },

  // Special signs
  { devanagari: 'ं', iast: 'ṃ', cs_phonetic: 'm', hk: 'M', slp1: 'M', category: 'special' },
  { devanagari: 'ः', iast: 'ḥ', cs_phonetic: 'h', hk: 'H', slp1: 'H', category: 'special' },
  { devanagari: 'ँ', iast: 'm̐', cs_phonetic: 'm', hk: '~', slp1: '~', category: 'special' },
  { devanagari: 'ऽ', iast: '\'', cs_phonetic: '\'', hk: '\'', slp1: '\'', category: 'special' },
  { devanagari: '।', iast: '|', cs_phonetic: '|', hk: '|', slp1: '|', category: 'special' },
  { devanagari: '॥', iast: '||', cs_phonetic: '||', hk: '||', slp1: '||', category: 'special' },

  // Numerals
  { devanagari: '०', iast: '0', cs_phonetic: '0', hk: '0', slp1: '0', category: 'numeral' },
  { devanagari: '१', iast: '1', cs_phonetic: '1', hk: '1', slp1: '1', category: 'numeral' },
  { devanagari: '२', iast: '2', cs_phonetic: '2', hk: '2', slp1: '2', category: 'numeral' },
  { devanagari: '३', iast: '3', cs_phonetic: '3', hk: '3', slp1: '3', category: 'numeral' },
  { devanagari: '४', iast: '4', cs_phonetic: '4', hk: '4', slp1: '4', category: 'numeral' },
  { devanagari: '५', iast: '5', cs_phonetic: '5', hk: '5', slp1: '5', category: 'numeral' },
  { devanagari: '६', iast: '6', cs_phonetic: '6', hk: '6', slp1: '6', category: 'numeral' },
  { devanagari: '७', iast: '7', cs_phonetic: '7', hk: '7', slp1: '7', category: 'numeral' },
  { devanagari: '८', iast: '8', cs_phonetic: '8', hk: '8', slp1: '8', category: 'numeral' },
  { devanagari: '९', iast: '9', cs_phonetic: '9', hk: '9', slp1: '9', category: 'numeral' }
];

/**
 * Complete Ligatures & Conjuncts Table (Samyukta Aksharas)
 * Separately configurable from base character set.
 */
export const DEFAULT_LIGATURES: LigatureItem[] = [
  {
    id: 'lig_k_sa',
    devanagari: 'क्ष',
    components: ['क', 'ष'],
    iast: 'kṣa',
    cs_phonetic: 'kša',
    hk: 'kSa',
    description: 'Zvláštní nerozložitelná ligatura k + ṣ',
    isIrregular: true
  },
  {
    id: 'lig_j_na',
    devanagari: 'ज्ञ',
    components: ['ज', 'ञ'],
    iast: 'jña',
    cs_phonetic: 'džňa',
    hk: 'jJa',
    description: 'Tradiční vědění/poznání ligatura j + ñ',
    isIrregular: true
  },
  {
    id: 'lig_s_ra',
    devanagari: 'श्र',
    components: ['श', 'र'],
    iast: 'śra',
    cs_phonetic: 'šra',
    hk: 'zra',
    description: 'Ligatura ś + r (např. śrī, āśrama)',
    isIrregular: false
  },
  {
    id: 'lig_t_ra',
    devanagari: 'त्र',
    components: ['त', 'र'],
    iast: 'tra',
    cs_phonetic: 'tra',
    hk: 'tra',
    description: 'Ligatura t + r (např. mantra, sūtra)',
    isIrregular: false
  },
  {
    id: 'lig_t_ta',
    devanagari: 'त्त',
    components: ['त', 'त'],
    iast: 'tta',
    cs_phonetic: 'tta',
    hk: 'tta',
    description: 'Zdvojené t + t (např. citta, sattva)',
    isIrregular: false
  },
  {
    id: 'lig_d_ya',
    devanagari: 'द्य',
    components: ['द', 'य'],
    iast: 'dya',
    cs_phonetic: 'dja',
    hk: 'dya',
    description: 'Ligatura d + y (např. vidyā, adya)',
    isIrregular: true
  },
  {
    id: 'lig_d_dha',
    devanagari: 'द्ध',
    components: ['द', 'ध'],
    iast: 'ddha',
    cs_phonetic: 'ddha',
    hk: 'ddha',
    description: 'Ligatura d + dh (např. samādhi, śuddha, buddha)',
    isIrregular: true
  },
  {
    id: 'lig_d_da',
    devanagari: 'द्द',
    components: ['द', 'द'],
    iast: 'dda',
    cs_phonetic: 'dda',
    hk: 'dda',
    description: 'Zdvojené d + d',
    isIrregular: true
  },
  {
    id: 'lig_d_bha',
    devanagari: 'द्भ',
    components: ['द', 'भ'],
    iast: 'dbha',
    cs_phonetic: 'dbha',
    hk: 'dbha',
    description: 'Ligatura d + bh',
    isIrregular: true
  },
  {
    id: 'lig_d_ma',
    devanagari: 'द्म',
    components: ['द', 'म'],
    iast: 'dma',
    cs_phonetic: 'dma',
    hk: 'dma',
    description: 'Ligatura d + m (např. padma)',
    isIrregular: true
  },
  {
    id: 'lig_h_ya',
    devanagari: 'ह्य',
    components: ['ह', 'य'],
    iast: 'hya',
    cs_phonetic: 'hja',
    hk: 'hya',
    description: 'Ligatura h + y',
    isIrregular: true
  },
  {
    id: 'lig_h_ma',
    devanagari: 'ह्म',
    components: ['ह', 'म'],
    iast: 'hma',
    cs_phonetic: 'hma',
    hk: 'hma',
    description: 'Ligatura h + m (např. brahman)',
    isIrregular: true
  },
  {
    id: 'lig_h_na',
    devanagari: 'ह्न',
    components: ['ह', 'न'],
    iast: 'hna',
    cs_phonetic: 'hna',
    hk: 'hna',
    description: 'Ligatura h + n',
    isIrregular: true
  },
  {
    id: 'lig_h_ra',
    devanagari: 'ह्र',
    components: ['ह', 'र'],
    iast: 'hra',
    cs_phonetic: 'hra',
    hk: 'hra',
    description: 'Ligatura h + r',
    isIrregular: true
  },
  {
    id: 'lig_k_ta',
    devanagari: 'क्त',
    components: ['क', 'त'],
    iast: 'kta',
    cs_phonetic: 'kta',
    hk: 'kta',
    description: 'Ligatura k + t (např. bhakta, mukti)',
    isIrregular: false
  },
  {
    id: 'lig_s_ca',
    devanagari: 'श्च',
    components: ['श', 'च'],
    iast: 'śca',
    cs_phonetic: 'šča',
    hk: 'zca',
    description: 'Sandhi spojení ś + c (např. yogaś ca)',
    isIrregular: false
  },
  {
    id: 'lig_s_na',
    devanagari: 'ष्ण',
    components: ['ष', 'ण'],
    iast: 'ṣṇa',
    cs_phonetic: 'šna',
    hk: 'SNa',
    description: 'Ligatura ṣ + ṇ (např. kṛṣṇa, viṣṇu)',
    isIrregular: false
  }
];

export const DEFAULT_ALPHABET_MAPPING: AlphabetMappingTable = {
  version: '1.0.0',
  name: 'Standardní znaková a ligaturní tabulka sanskrtu',
  baseCharacters: DEFAULT_BASE_CHARACTERS,
  ligatures: DEFAULT_LIGATURES
};

/**
 * Serialize full alphabet mapping table to formatted JSON for disk saving.
 */
export function exportAlphabetTableToJSON(table: AlphabetMappingTable = DEFAULT_ALPHABET_MAPPING): string {
  return JSON.stringify(table, null, 2);
}

/**
 * Parse and validate alphabet table from JSON string.
 */
export function importAlphabetTableFromJSON(jsonString: string): AlphabetMappingTable {
  const parsed = JSON.parse(jsonString);
  return AlphabetMappingTableSchema.parse(parsed);
}
