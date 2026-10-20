import { LinguisticDictionary } from './types.ts';

/**
 * English Sanskrit Linguistic Terminology
 * Based on:
 * - Arthur Anthony Macdonell: A Sanskrit Grammar for Students (Oxford University Press)
 * - William Dwight Whitney: Sanskrit Grammar (Harvard / Dover)
 * - Winthrop Sargeant: The Bhagavad Gita (Grammatical concordance and glossary)
 * - Pāṇinian vyākaraṇa tradition (Aṣṭādhyāyī)
 */
export const ENGLISH_LINGUISTICS: LinguisticDictionary = {
  language: 'en',

  vibhaktis: {
    nominative: {
      sanskrit: 'prathamā',
      sanskritDeva: 'प्रथमा',
      label: '1st case – nominative (subject)',
      short: 'nom.',
      caseNumber: 1,
      explanation: 'First case designating the subject or agent of an active sentence (kartari prayoga).',
      color: '#2563eb'
    },
    accusative: {
      sanskrit: 'dvitīyā',
      sanskritDeva: 'द्वितीया',
      label: '2nd case – accusative (direct object)',
      short: 'acc.',
      caseNumber: 2,
      explanation: 'Direct object of transitive verbs (karman), goal of motion, or duration of time/space.',
      color: '#0284c7'
    },
    instrumental: {
      sanskrit: 'tṛtīyā',
      sanskritDeva: 'तृतीया',
      label: '3rd case – instrumental (by / with, agent)',
      short: 'inst.',
      caseNumber: 3,
      explanation: 'Means, instrument (karaṇa), agent in passive construction, or accompaniment (saha).',
      color: '#059669'
    },
    dative: {
      sanskrit: 'caturthī',
      sanskritDeva: 'चतुर्थी',
      label: '4th case – dative (recipient, purpose)',
      short: 'dat.',
      caseNumber: 4,
      explanation: 'Recipient of a gift or action (sampradāna), indirect object, or purpose/aim.',
      color: '#d97706'
    },
    ablative: {
      sanskrit: 'pañcamī',
      sanskritDeva: 'पञ्चमी',
      label: '5th case – ablative (source, from, cause)',
      short: 'abl.',
      caseNumber: 5,
      explanation: 'Point of departure, source, separation (apādāna), cause, or comparison.',
      color: '#ea580c'
    },
    genitive: {
      sanskrit: 'ṣaṣṭhī',
      sanskritDeva: 'षष्ठी',
      label: '6th case – genitive (of, relation, possession)',
      short: 'gen.',
      caseNumber: 6,
      explanation: 'Possession, connection, or partition (sambandha).',
      color: '#7c3aed'
    },
    locative: {
      sanskrit: 'saptamī',
      sanskritDeva: 'सप्तमी',
      label: '7th case – locative (in, on, at, locus)',
      short: 'loc.',
      caseNumber: 7,
      explanation: 'Locus, place, time (adhikaraṇa), or absolute condition (locative absolute).',
      color: '#db2777'
    },
    vocative: {
      sanskrit: 'sambodhana',
      sanskritDeva: 'सम्बोधनम्',
      label: 'vocative (address, invocation)',
      short: 'voc.',
      caseNumber: 8,
      explanation: 'Direct address, exclamation, or invocation.',
      color: '#dc2626'
    },
    stem_in_compound: {
      sanskrit: 'pūrvapada / samāsa',
      sanskritDeva: 'पूर्वपदम्',
      label: 'stem in compound (samāsa)',
      short: 'cpd.',
      explanation: 'Prior member of a compound showing uninflected stem form.',
      color: '#b45309'
    }
  },

  genders: {
    masculine: {
      sanskrit: 'puṃliṅga (पुंलिङ्ग)',
      sanskritDeva: 'पुंलिङ्गम्',
      label: 'masculine gender',
      short: 'm.',
      explanation: 'Nouns and adjectives of masculine grammatical gender.'
    },
    feminine: {
      sanskrit: 'strīliṅga (स्त्रीलिङ्ग)',
      sanskritDeva: 'स्त्रीलिङ्गम्',
      label: 'feminine gender',
      short: 'f.',
      explanation: 'Nouns and adjectives of feminine grammatical gender.'
    },
    neuter: {
      sanskrit: 'napuṃsakaliṅga (नपुंसकलिङ्ग)',
      sanskritDeva: 'नपुंसकलिङ्गम्',
      label: 'neuter gender',
      short: 'n.',
      explanation: 'Nouns and adjectives of neuter grammatical gender.'
    },
    any: {
      sanskrit: 'sarvaliṅga (सर्वलिङ्ग)',
      sanskritDeva: 'सर्वलिङ्गम्',
      label: 'any / common gender',
      short: 'any',
      explanation: 'Adjectives or pronouns applicable to all genders.'
    }
  },

  numbers: {
    singular: {
      sanskrit: 'ekavacana (एकवचन)',
      sanskritDeva: 'एकवचनम्',
      label: 'singular number',
      short: 'sg.',
      explanation: 'Denotes a single entity.'
    },
    dual: {
      sanskrit: 'dvivacana (द्विवचन)',
      sanskritDeva: 'द्विवचनम्',
      label: 'dual number',
      short: 'du.',
      explanation: 'Special Sanskrit number category denoting exactly two entities (hands, eyes, pair).'
    },
    plural: {
      sanskrit: 'bahuvacana (बहुवचन)',
      sanskritDeva: 'बहुवचनम्',
      label: 'plural number',
      short: 'pl.',
      explanation: 'Denotes three or more entities.'
    }
  },

  pos: {
    noun: {
      sanskrit: 'nāman / subanta',
      label: 'noun (substantive)',
      short: 'noun',
      color: '#2563eb',
      explanation: 'Inflected nominal word ending in sub-suffixes.'
    },
    verb: {
      sanskrit: 'ākhyāta / tiṅanta',
      label: 'verb (finite verb)',
      short: 'verb',
      color: '#16a34a',
      explanation: 'Conjugated finite verb ending in tiṅ-suffixes.'
    },
    adjective: {
      sanskrit: 'viśeṣaṇa',
      label: 'adjective',
      short: 'adj.',
      color: '#0891b2',
      explanation: 'Attribute agreeing in gender, number, and case with the noun.'
    },
    indeclinable: {
      sanskrit: 'avyaya',
      label: 'indeclinable (particle, adverb)',
      short: 'ind.',
      color: '#9333ea',
      explanation: 'Uninflected words, adverbs, prepositions, and particles.'
    },
    pronoun: {
      sanskrit: 'sarvanāman',
      label: 'pronoun',
      short: 'pron.',
      color: '#4f46e5',
      explanation: 'Personal, demonstrative, interrogative, or relative pronouns.'
    },
    participle: {
      sanskrit: 'kṛdanta',
      label: 'participle (verbal adjective)',
      short: 'ptc.',
      color: '#0d9488',
      explanation: 'Verbal adjectives or verbal nouns formed directly from root.'
    },
    prefix: {
      sanskrit: 'upasarga',
      label: 'verbal prefix',
      short: 'pref.',
      color: '#ca8a04',
      explanation: 'Directional or modifying prefixes prefixed to roots (pra-, sam-, vi-).'
    },
    particle: {
      sanskrit: 'nipāta',
      label: 'enclitic particle / connective',
      short: 'part.',
      color: '#64748b',
      explanation: 'Sentence connectives and enclitic particles (ca, vā, eva, ha, sma).'
    }
  },

  verbPersons: {
    '1st': {
      sanskrit: 'uttama-puruṣa (उत्तमपुरुष)',
      label: '1st person (I / we)',
      short: '1st'
    },
    '2nd': {
      sanskrit: 'madhyama-puruṣa (मध्यमपुरुष)',
      label: '2nd person (you)',
      short: '2nd'
    },
    '3rd': {
      sanskrit: 'prathama-puruṣa (प्रथमपुरुष)',
      label: '3rd person (he / they)',
      short: '3rd'
    }
  },

  verbVoices: {
    active: {
      sanskrit: 'parasmaipada (परस्मैपद)',
      label: 'active voice (parasmaipada)',
      short: 'act.'
    },
    middle: {
      sanskrit: 'ātmanepada (आत्मनेपद)',
      label: 'middle voice (ātmanepada)',
      short: 'mid.'
    },
    passive: {
      sanskrit: 'karmaṇi-prayoga (कर्मणि)',
      label: 'passive voice (karmaṇi)',
      short: 'pass.'
    }
  },

  lakaras: {
    lat: {
      sanskrit: 'laṭ',
      sanskritDeva: 'लट्',
      label: 'present indicative (laṭ)',
      short: 'pres.',
      tenseMeaning: 'present indicative tense',
      explanation: 'Standard present tense for ongoing or habitual actions.'
    },
    lan: {
      sanskrit: 'laṅ',
      sanskritDeva: 'लङ्',
      label: 'imperfect (laṅ)',
      short: 'impf.',
      tenseMeaning: 'past not of today / narrative past',
      explanation: 'Common narrative past tense formed with augment a-.'
    },
    lit: {
      sanskrit: 'liṭ',
      sanskritDeva: 'लिट्',
      label: 'perfect (reduplicated / liṭ)',
      short: 'perf.',
      tenseMeaning: 'remote past / ancient history',
      explanation: 'Archaic and epic past formed with syllable reduplication.'
    },
    lut: {
      sanskrit: 'luṭ',
      sanskritDeva: 'लुट्',
      label: 'periphrastic future (first future / luṭ)',
      short: 'fut. I',
      tenseMeaning: 'future not of today (anadyatane)',
      explanation: 'Formed with agent suffix -tṛ + auxiliary verb as-.'
    },
    lrt: {
      sanskrit: 'lṛṭ',
      sanskritDeva: 'लृट्',
      label: 'simple future (second future / lṛṭ)',
      short: 'fut. II',
      tenseMeaning: 'general future tense (-sya-)',
      explanation: 'Universal sigmatic future tense.'
    },
    lot: {
      sanskrit: 'loṭ',
      sanskritDeva: 'लोट्',
      label: 'imperative (loṭ)',
      short: 'impv.',
      tenseMeaning: 'command, request, invitation',
      explanation: 'Expresses direct commands, prohibitions, or blessings.'
    },
    vidhilin: {
      sanskrit: 'vidhiliṅ',
      sanskritDeva: 'विधिलिङ्',
      label: 'optative / potential (vidhiliṅ)',
      short: 'opt.',
      tenseMeaning: 'potentiality, advice, duty',
      explanation: 'Should / could – expresses ethical obligation or possibility.'
    },
    asirlin: {
      sanskrit: 'āśīrliṅ',
      sanskritDeva: 'आशीर्लिङ्',
      label: 'benedictive / precative (āśīrliṅ)',
      short: 'prec.',
      tenseMeaning: 'solemn blessing or prayer',
      explanation: 'Rare archaic Vedic/classical mood for blessings.'
    },
    lun: {
      sanskrit: 'luṅ',
      sanskritDeva: 'लुङ्',
      label: 'aorist (luṅ)',
      short: 'aor.',
      tenseMeaning: 'recent past',
      explanation: 'Past tense denoting action completed recently or witnessed.'
    },
    lrn: {
      sanskrit: 'lṛṅ',
      sanskritDeva: 'लृङ्',
      label: 'conditional (lṛṅ)',
      short: 'cond.',
      tenseMeaning: 'counterfactual past condition',
      explanation: 'Expresses past unfulfilled condition (if it had happened, then...).'
    }
  },

  chandasWeights: {
    L: {
      label: 'laghu',
      symbol: '∪',
      explanation: 'light / short syllable (short vowel followed by at most one consonant)'
    },
    G: {
      label: 'guru',
      symbol: '—',
      explanation: 'heavy / long syllable (long vowel, diphthong, or followed by conjunct / anusvāra / visarga)'
    }
  },

  compoundTypes: {
    tatpurusa: {
      sanskrit: 'tatpuruṣa',
      label: 'tatpuruṣa (determinative compound)',
      explanation: 'The second member is qualified by the first in a case relationship.'
    },
    karmadharaya: {
      sanskrit: 'karmadhāraya',
      label: 'karmadhāraya (descriptive compound)',
      explanation: 'Appositional compound where the first member describes the second.'
    },
    bahuvrihi: {
      sanskrit: 'bahuvrīhi',
      label: 'bahuvrīhi (possessive / exocentric compound)',
      explanation: 'Exocentric compound referring to an external possessor.'
    },
    dvandva: {
      sanskrit: 'dvandva',
      label: 'dvandva (copulative / coordinating compound)',
      explanation: 'Coordinating elements connected by "and" (e.g., mātā-pitarau = mother and father).'
    },
    avyayibhava: {
      sanskrit: 'avyayībhāva',
      label: 'avyayībhāva (adverbial indeclinable compound)',
      explanation: 'First member is an indeclinable governing the whole as an adverb.'
    },
    dvigu: {
      sanskrit: 'dvigu',
      label: 'dvigu (numeral determinative compound)',
      explanation: 'Subspecies of tatpuruṣa where the first member is a numeral denoting an aggregate.'
    }
  },

  sandhiTypes: {
    svarasandhi: {
      sanskrit: 'svara-sandhi',
      label: 'vowel sandhi (euphonic vowel combination)',
      explanation: 'Fusion, lengthening, or guna/vriddhi vowel transitions across boundaries.'
    },
    vyanjanasandhi: {
      sanskrit: 'vyañjana-sandhi',
      label: 'consonant sandhi (assimilation)',
      explanation: 'Voicing, devoicing, palatalization, or retroflexion of consonants.'
    },
    visargasandhi: {
      sanskrit: 'visarga-sandhi',
      label: 'visarga sandhi (treatment of final -ḥ and -r)',
      explanation: 'Transformation of final visarga into -o, -r, sibilants, or elision.'
    }
  },

  titles: {
    pos: 'Part of Speech',
    root: 'Verbal Root (Dhātu)',
    stem: 'Nominal Stem (Prātipadika)',
    gender: 'Gender (Liṅga)',
    case: 'Case (Vibhakti)',
    number: 'Number (Vacana)',
    person: 'Person (Puruṣa)',
    voice: 'Voice (Diatheris / Prayoga)',
    tenseMood: 'Tense & Mood (Lakāra)',
    compound: 'Compound (Samāsa)',
    sandhi: 'Sandhi Split',
    meter: 'Meter (Chandas)',
    unspecified: 'Unspecified'
  }
};
