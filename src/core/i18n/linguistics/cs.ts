import { LinguisticDictionary } from './types.ts';

/**
 * Czech Sanskrit Linguistic Terminology
 * Based on:
 * - Dušan Zbavitel: Učebnice sanskrtu (Academia / ČSAV)
 * - Jaroslav Vacek: Učebnice sanskrtu (UK Praha)
 * - Jan Filipský: Encyklopedie indické mytologie a sanskrtských pojmů
 * - Tradiční Pāṇiniovská gramatika (Aṣṭādhyāyī)
 */
export const CZECH_LINGUISTICS: LinguisticDictionary = {
  language: 'cs',

  vibhaktis: {
    nominative: {
      sanskrit: 'prathamā',
      sanskritDeva: 'प्रथमा',
      label: '1. pád – nominativ (podmět)',
      short: '1. p. (nom.)',
      caseNumber: 1,
      explanation: 'Základní jmenný pád vyjadřující podmět věty (kartari prayoga).',
      color: '#2563eb'
    },
    accusative: {
      sanskrit: 'dvitīyā',
      sanskritDeva: 'द्वितीया',
      label: '2. pád – akuzativ (předmět přímý)',
      short: '2. p. (akuz.)',
      caseNumber: 2,
      explanation: 'Pád přímého předmětu (karman), cíle pohybu nebo časového trvání.',
      color: '#0284c7'
    },
    instrumental: {
      sanskrit: 'tṛtīyā',
      sanskritDeva: 'तृतीया',
      label: '3. pád – instrumentál (prostředek, činitel)',
      short: '3. p. (inst.)',
      caseNumber: 3,
      explanation: 'Nástroj, prostředek (karaṇa), činitel v pasívu nebo společník (saha).',
      color: '#059669'
    },
    dative: {
      sanskrit: 'caturthī',
      sanskritDeva: 'चतुर्थी',
      label: '4. pád – dativ (účel, příjemce)',
      short: '4. p. (dat.)',
      caseNumber: 4,
      explanation: 'Příjemce daru (sampradāna), cíl nebo účel jednání.',
      color: '#d97706'
    },
    ablative: {
      sanskrit: 'pañcamī',
      sanskritDeva: 'पञ्चमी',
      label: '5. pád – ablativ (východisko, příčina)',
      short: '5. p. (abl.)',
      caseNumber: 5,
      explanation: 'Odkud, východisko pohybu (apādāna), příčina, odloučení nebo srovnání.',
      color: '#ea580c'
    },
    genitive: {
      sanskrit: 'ṣaṣṭhī',
      sanskritDeva: 'षष्ठी',
      label: '6. pád – genitiv (vztah, přivlastnění)',
      short: '6. p. (gen.)',
      caseNumber: 6,
      explanation: 'Přivlastňovací vztah (sambandha), příslušnost nebo celistvost.',
      color: '#7c3aed'
    },
    locative: {
      sanskrit: 'saptamī',
      sanskritDeva: 'सप्तमी',
      label: '7. pád – lokativ (místo, čas, okolnost)',
      short: '7. p. (lok.)',
      caseNumber: 7,
      explanation: 'Kde, v čem, místo a čas děje (adhikaraṇa), absolutní lokativ.',
      color: '#db2777'
    },
    vocative: {
      sanskrit: 'sambodhana',
      sanskritDeva: 'सम्बोधनम्',
      label: 'vokativ (oslovení)',
      short: 'vok.',
      caseNumber: 8,
      explanation: 'Přímé oslovení nebo vzývání osoby / božstva.',
      color: '#dc2626'
    },
    stem_in_compound: {
      sanskrit: 'pūrvapada / samāsa',
      sanskritDeva: 'पूर्वपदम्',
      label: 'kmen ve složenině (samāsa)',
      short: 'slož.',
      explanation: 'Nekoncový člen složeného slova zachovávající základní kmenový tvar.',
      color: '#b45309'
    }
  },

  genders: {
    masculine: {
      sanskrit: 'puṃliṅga (पुंलिङ्ग)',
      sanskritDeva: 'पुंलिङ्गम्',
      label: 'mužský rod (maskulinum)',
      short: 'm.',
      explanation: 'Jména gramatického rodu mužského.'
    },
    feminine: {
      sanskrit: 'strīliṅga (स्त्रीलिङ्ग)',
      sanskritDeva: 'स्त्रीलिङ्गम्',
      label: 'ženský rod (femininum)',
      short: 'f.',
      explanation: 'Jména gramatického rodu ženského.'
    },
    neuter: {
      sanskrit: 'napuṃsakaliṅga (नपुंसकलिङ्ग)',
      sanskritDeva: 'नपुंसकलिङ्गम्',
      label: 'střední rod (neutrum)',
      short: 'n.',
      explanation: 'Jména gramatického rodu středního.'
    },
    any: {
      sanskrit: 'sarvaliṅga (सर्वलिङ्ग)',
      sanskritDeva: 'सर्वलिङ्गम्',
      label: 'obourodé / libovolný rod',
      short: 'any',
      explanation: 'Přídavná jména nebo zájmena použitelná pro všechny rody.'
    }
  },

  numbers: {
    singular: {
      sanskrit: 'ekavacana (एकवचन)',
      sanskritDeva: 'एकवचनम्',
      label: 'jednotné číslo (singulár)',
      short: 'sg.',
      explanation: 'Vyjadřuje jednu entitu.'
    },
    dual: {
      sanskrit: 'dvivacana (द्विवचन)',
      sanskritDeva: 'द्विवचनम्',
      label: 'dvojné číslo (duál)',
      short: 'du.',
      explanation: 'Specifické sanskrtské číslo označující přesně dvě entity (ruce, oči, pár).'
    },
    plural: {
      sanskrit: 'bahuvacana (बहुवचन)',
      sanskritDeva: 'बहुवचनम्',
      label: 'množné číslo (plurál)',
      short: 'pl.',
      explanation: 'Vyjadřuje tři a více entit.'
    }
  },

  pos: {
    noun: {
      sanskrit: 'nāman / subanta',
      label: 'podstatné jméno (substantivum)',
      short: 'subst.',
      color: '#2563eb',
      explanation: 'Jmenná slova skloňovaná v pádech (subanta).'
    },
    verb: {
      sanskrit: 'ākhyāta / tiṅanta',
      label: 'sloveso (verbum)',
      short: 'verb.',
      color: '#16a34a',
      explanation: 'Časovaná určitá slovesa s koncovkami tiṅ.'
    },
    adjective: {
      sanskrit: 'viśeṣaṇa',
      label: 'přídavné jméno (adjektivum)',
      short: 'adj.',
      color: '#0891b2',
      explanation: 'Přívlastková jména shodující se v rodě, čísle a pádě.'
    },
    indeclinable: {
      sanskrit: 'avyaya',
      label: 'nesklonné slovo (předložka, příslovce)',
      short: 'neskl.',
      color: '#9333ea',
      explanation: 'Slova neměnící tvar (avyaya), příslovce, částice, předložky.'
    },
    pronoun: {
      sanskrit: 'sarvanāman',
      label: 'zájmeno (pronomen)',
      short: 'pron.',
      color: '#4f46e5',
      explanation: 'Zájmena osobní, ukazovací, tázací a vztažná.'
    },
    participle: {
      sanskrit: 'kṛdanta',
      label: 'příčestí (participium)',
      short: 'part.',
      color: '#0d9488',
      explanation: 'Jmenné tvary odvozené přímo ze slovesného kořene (kṛt).'
    },
    prefix: {
      sanskrit: 'upasarga',
      label: 'slovesná předpona (prefix)',
      short: 'pref.',
      color: '#ca8a04',
      explanation: 'Předpony modifikující význam slovesného kořene (např. pra-, sam-, anu-).'
    },
    particle: {
      sanskrit: 'nipāta',
      label: 'zdůrazňovací / spojovací částice',
      short: 'partik.',
      color: '#64748b',
      explanation: 'Enklitické a větné částice (ca, vā, eva, ha, sma).'
    }
  },

  verbPersons: {
    '1st': {
      sanskrit: 'uttama-puruṣa (उत्तमपुरुष)',
      label: '1. osoba (já / my)',
      short: '1. os.'
    },
    '2nd': {
      sanskrit: 'madhyama-puruṣa (मध्यमपुरुष)',
      label: '2. osoba (ty / vy)',
      short: '2. os.'
    },
    '3rd': {
      sanskrit: 'prathama-puruṣa (प्रथमपुरुष)',
      label: '3. osoba (on / oni)',
      short: '3. os.'
    }
  },

  verbVoices: {
    active: {
      sanskrit: 'parasmaipada (परस्मैपद)',
      label: 'činný rod (parasmaipada)',
      short: 'akt.'
    },
    middle: {
      sanskrit: 'ātmanepada (आत्मनेपद)',
      label: 'střední rod (ātmanepada)',
      short: 'med.'
    },
    passive: {
      sanskrit: 'karmaṇi-prayoga (कर्मणि)',
      label: 'trpný rod (pasívum)',
      short: 'pas.'
    }
  },

  lakaras: {
    lat: {
      sanskrit: 'laṭ',
      sanskritDeva: 'लट्',
      label: 'přítomný čas (indikativ prézentu / laṭ)',
      short: 'préz.',
      tenseMeaning: 'přítomný čas (prézens)',
      explanation: 'Základní přítomný čas vyjadřující právě probíhající děj.'
    },
    lan: {
      sanskrit: 'laṅ',
      sanskritDeva: 'लङ्',
      label: 'minulý čas (imperfektum / laṅ)',
      short: 'impf.',
      tenseMeaning: 'minulý čas neviděný mluvčím',
      explanation: 'Běžný vyprávěcí minulý čas bez přímého svědectví mluvčího.'
    },
    lit: {
      sanskrit: 'liṭ',
      sanskritDeva: 'लिट्',
      label: 'perfektum (reduplikované perfektum / liṭ)',
      short: 'perf.',
      tenseMeaning: 'vzdálená minulost (historické události)',
      explanation: 'Vyprávění bájných nebo starodávných událostí.'
    },
    lut: {
      sanskrit: 'luṭ',
      sanskritDeva: 'लुट्',
      label: 'budoucí čas perifrastický (luṭ)',
      short: 'fut. I',
      tenseMeaning: 'budoucí čas ne dnešní (anadyatane)',
      explanation: 'Složený budoucí čas tvořený jmennou koncovkou -tā.'
    },
    lrt: {
      sanskrit: 'lṛṭ',
      sanskritDeva: 'लृट्',
      label: 'budoucí čas prostý (sigmatické futurum / lṛṭ)',
      short: 'fut. II',
      tenseMeaning: 'prosté budoucí děje (-sya-)',
      explanation: 'Univerzální budoucí čas v sanskrtu.'
    },
    lot: {
      sanskrit: 'loṭ',
      sanskritDeva: 'लोट्',
      label: 'rozkazovací způsob (imperativ / loṭ)',
      short: 'imp.',
      tenseMeaning: 'rozkaz, prosba, pobídka',
      explanation: 'Vyjadřuje rozkaz, zákaz, přání nebo požehnání.'
    },
    vidhilin: {
      sanskrit: 'vidhiliṅ',
      sanskritDeva: 'विधिलिङ्',
      label: 'žádací způsob (potenciál / optativ / vidhiliṅ)',
      short: 'opt.',
      tenseMeaning: 'možnost, povinnost, rada',
      explanation: 'Měl by, mohl by – vyjadřuje morální povinnost (dharma) či možnost.'
    },
    asirlin: {
      sanskrit: 'āśīrliṅ',
      sanskritDeva: 'आशीर्लिङ्',
      label: 'požehnání (benediktiv / āśīrliṅ)',
      short: 'bened.',
      tenseMeaning: 'slavnostní přání / požehnání',
      explanation: 'Vzácný archaický modus pro posvátná požehnání.'
    },
    lun: {
      sanskrit: 'luṅ',
      sanskritDeva: 'लुङ्',
      label: 'aorist (luṅ)',
      short: 'aor.',
      tenseMeaning: 'bezprostřední minulost',
      explanation: 'Čas vyjadřující děj, který právě proběhl nebo byl osobně dosvědčen.'
    },
    lrn: {
      sanskrit: 'lṛṅ',
      sanskritDeva: 'लृङ्',
      label: 'podmiňovací způsob (kondicionál / lṛṅ)',
      short: 'kond.',
      tenseMeaning: 'nereálná podmínka v minulosti',
      explanation: 'Kdyby bývalo nastalo, byl by býval nastal děj.'
    }
  },

  chandasWeights: {
    L: {
      label: 'laghu',
      symbol: '∪',
      explanation: 'krátká / lehká slabika (krátká samohláska následovaná nanejvýš jednou souhláskou)'
    },
    G: {
      label: 'guru',
      symbol: '—',
      explanation: 'dlouhá / těžká slabika (přirozeně dlouhá samohláska nebo slabika s ligaturou / anusvárou / visargou)'
    }
  },

  compoundTypes: {
    tatpurusa: {
      sanskrit: 'tatpuruṣa',
      label: 'tatpuruša (determinativní složenina)',
      explanation: 'Druhý člen je určován prvním členem v pádu (např. rāja-putra = králův syn).'
    },
    karmadharaya: {
      sanskrit: 'karmadhāraya',
      label: 'karmadhāraya (deskriptivní složenina)',
      explanation: 'Přívlastek podstatného jména (např. mahā-rāja = velký král).'
    },
    bahuvrihi: {
      sanskrit: 'bahuvrīhi',
      label: 'bahuvrīhi (posesivní / exocentrická složenina)',
      explanation: 'Označuje nositele vlastnosti (např. pītāmbara = ten, kdo má žlutý šat).'
    },
    dvandva: {
      sanskrit: 'dvandva',
      label: 'dvandva (kopulativní / slučovací složenina)',
      explanation: 'Spojení souřadných slov spojkou „a“ (např. mātā-pitarau = matka a otec).'
    },
    avyayibhava: {
      sanskrit: 'avyayībhāva',
      label: 'avjajíbháva (adverbiální nesklonná složenina)',
      explanation: 'První člen je nesklonná předložka určující celek (např. yathā-śakti = podle sil).'
    },
    dvigu: {
      sanskrit: 'dvigu',
      label: 'dvigu (číslovková složenina)',
      explanation: 'První člen je číslovka udávající souhrn (např. tri-loka = trojice světů).'
    }
  },

  sandhiTypes: {
    svarasandhi: {
      sanskrit: 'svara-sandhi',
      label: 'vokálové sandhi (spojování samohlásek)',
      explanation: 'Splývání nebo alternace koncových a počátečních samohlásek.'
    },
    vyanjanasandhi: {
      sanskrit: 'vyañjana-sandhi',
      label: 'souhláskové sandhi (asimilace konsonantů)',
      explanation: 'Spodoba znělosti, místa artikulace a nazalizace souhlásek.'
    },
    visargasandhi: {
      sanskrit: 'visarga-sandhi',
      label: 'visargové sandhi (proměny hlásek -ḥ a -r)',
      explanation: 'Změny koncového visargy na -o, -r, sibilanty nebo jeho zánik.'
    }
  },

  titles: {
    pos: 'Slovní druh',
    root: 'Slovesný kořen (Dhātu)',
    stem: 'Jmenný kmen (Prātipadika)',
    gender: 'Gramatický rod (Liṅga)',
    case: 'Pád (Vibhakti)',
    number: 'Číslo (Vacana)',
    person: 'Osoba (Puruṣa)',
    voice: 'Slovesný rod (Diateze / Prayoga)',
    tenseMood: 'Čas a způsob (Lakāra)',
    compound: 'Složenina (Samāsa)',
    sandhi: 'Sandhiové rozdělení',
    meter: 'Metrum (Chandas)',
    unspecified: 'Nespecifikováno'
  }
};
