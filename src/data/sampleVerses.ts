import { SanskritDocument } from '../core/types/schema.ts';

export const SAMPLE_DOCUMENT: SanskritDocument = {
  $schema: 'https://sanskrit-viewer.org/schemas/v1/collection.json',
  document: {
    id: 'sanskrit-corpus-sample-v2',
    title: 'Kanonické sanskrtské texty: Yogasūtra, Bhagavadgītā & Mahābhārata',
    section: 'Výběr klíčových veršů pro studium a jógovou praxi',
    author: 'Patañjali / Kṛṣṇa Dvaipāyana Vyāsa',
    tradition: 'Rāja-yoga, Karma-yoga & Itihāsa',
    editor: 'SanskrtNaWeb Redakce',
    status: 'verified',
    defaultLayers: [
      'devanagari',
      'transliteration',
      'translation',
      'meter'
    ],
    notes: 'Kánon 8 veršů (3x Jógasūtra, 3x Bhagavadgītā, 2x Mahābhārata) s plnou morfologií, zarovnáním a metrem.'
  },
  verses: [
    // ==========================================
    // 1. PATAÑJALIHO YOGASŪTRA (3 VERŠE)
    // ==========================================
    {
      id: 'pys_1_1',
      number: '1.1',
      book: 'Yogasūtra',
      chapter: '1. Samādhipāda',
      section: 'ys',
      source: {
        title: 'Patañjali: Yogasūtra 1.1',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Samādhi-pāda 1.1',
        note: 'Iniciační aforismus klasické jógy'
      },
      scripts: {
        devanagari: {
          text: 'अथ योगानुशासनम् ॥ १.१ ॥',
          mode: 'auto',
          lastAutoText: 'अथ योगानुशासनम् ॥ १.१ ॥'
        },
        devanagari_padaccheda: {
          text: 'अथ योग-अनुशासनम् ॥ १.१ ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'atha yogānuśāsanam || 1.1 ||',
          mode: 'auto',
          lastAutoText: 'atha yogānuśāsanam || 1.1 ||'
        },
        iast_padaccheda: {
          text: 'atha yoga-anuśāsanam || 1.1 ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'atha jógánušásanam || 1.1 ||',
          mode: 'auto',
          lastAutoText: 'atha jógánušásanam || 1.1 ||'
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Nyní začíná tradiční výklad jógy.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Zde [nyní] [předkládá se] autoritativní předání [učení] jógy.'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation (Edwin Bryant)',
          lang: 'en',
          type: 'scholarly',
          text: 'Now, the authoritative exposition of Yoga [is being presented].'
        }
      ],
      tokens: [
        {
          id: 't1_1',
          text: {
            devanagari: 'अथ',
            iast: 'atha',
            cs_phonetic: 'atha'
          },
          lemma: 'atha',
          grammar: {
            pos: 'indeclinable',
            label_cs: 'nesklonné, příznivá zahajovací částice (nyní, zde)',
            label_en: 'indeclinable, inceptive auspicious particle'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: {
                contextual: 'Nyní, zde',
                alternatives: ['od této chvíle', 'na počátku', 'po předchozí přípravě']
              },
              en: {
                contextual: 'Now, auspicious beginning',
                alternatives: ['here begins', 'subsequently', 'after preparation']
              }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['Nyní'],
              cs_literal: ['Zde [nyní]'],
              en_scholarly: ['Now']
            }
          },
          dictionaryLookup: 'atha'
        },
        {
          id: 't1_2',
          text: {
            devanagari: 'योग',
            iast: 'yoga',
            cs_phonetic: 'jóga'
          },
          lemma: 'yoga',
          grammar: {
            pos: 'noun',
            root: '√yuj',
            stem: 'yoga',
            gender: 'masculine',
            case: 'genitive',
            number: 'singular',
            label_cs: 'm. gen. sg. ve složenině (jógy, spojení, soustředění)',
            label_en: 'm. gen. sg. in compound (of Yoga)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: {
                contextual: 'jóga, sjednocení, samādhi',
                alternatives: ['duchovní sjednocení', 'kázeň mysli', 'spojení']
              },
              en: {
                contextual: 'Yoga, union, meditative absorption',
                alternatives: ['union', 'integration', 'spiritual discipline']
              }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['jógy'],
              cs_literal: ['jógy'],
              en_scholarly: ['Yoga']
            }
          },
          dictionaryLookup: 'yoga'
        },
        {
          id: 't1_3',
          text: {
            devanagari: 'अनुशासनम्',
            iast: 'anuśāsanam',
            cs_phonetic: 'anušásanam'
          },
          lemma: 'anuśāsana',
          grammar: {
            pos: 'noun',
            root: '√śās',
            stem: 'anuśāsana',
            gender: 'neuter',
            case: 'nominative',
            number: 'singular',
            label_cs: 'n. nom. sg. (předání nauky, poučení, výklad)',
            label_en: 'n. nom. sg. (instruction, teaching)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: {
                contextual: 'autoritativní výklad, tradiční předání nauky',
                alternatives: ['instrukce', 'směrnice', 'předání linie']
              },
              en: {
                contextual: 'authoritative exposition, instruction',
                alternatives: ['teaching', 'lineage transmission', 'treatise']
              }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['začíná', 'tradiční výklad'],
              cs_literal: ['[předkládá se] autoritativní předání [učení]'],
              en_scholarly: ['the authoritative exposition', '[is being presented]']
            }
          },
          dictionaryLookup: 'anuzAsana'
        }
      ],
      commentary_cs: 'Předpona anu- naznačuje následnictví (paramparā) – Patañjali jógu nevymyslel, ale kodifikuje věčnou moudrost.',
      meter: 'Sūtra (aforismus – 8 slabik)',
      meter_notes: 'Iniciační aforismus v úsečné prozaické sūtrové formě.'
    },

    {
      id: 'pys_1_2',
      number: '1.2',
      book: 'Yogasūtra',
      chapter: '1. Samādhipāda',
      section: 'ys',
      source: {
        title: 'Patañjali: Yogasūtra 1.2',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Samādhi-pāda 1.2',
        note: 'Kanonická definice podstaty jógy'
      },
      scripts: {
        devanagari: {
          text: 'योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥',
          mode: 'auto',
          lastAutoText: 'योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥'
        },
        devanagari_padaccheda: {
          text: 'योगः चित्त-वृत्ति-निरोधः ॥ १.२ ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'yogaś citta-vṛtti-nirodhaḥ || 1.2 ||',
          mode: 'auto',
          lastAutoText: 'yogaś citta-vṛtti-nirodhaḥ || 1.2 ||'
        },
        iast_padaccheda: {
          text: 'yogaḥ citta-vṛtti-nirodhaḥ || 1.2 ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'jógaš čitta-vrtti-niródhah || 1.2 ||',
          mode: 'auto',
          lastAutoText: 'jógaš čitta-vrtti-niródhah || 1.2 ||'
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Jóga je zastavení víření mysli.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Jóga [jest] utišení [zastavení] změn [vlnění] vědomí [mysli].'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Yoga is the stilling of the fluctuating modifications of the mind.'
        }
      ],
      tokens: [
        {
          id: 't2_1',
          text: {
            devanagari: 'योगः',
            iast: 'yogaḥ',
            cs_phonetic: 'jógah'
          },
          lemma: 'yoga',
          grammar: {
            pos: 'noun',
            root: '√yuj',
            stem: 'yoga',
            gender: 'masculine',
            case: 'nominative',
            number: 'singular',
            label_cs: 'm. nom. sg.',
            label_en: 'm. nom. sg. (Yoga)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'Jóga', alternatives: ['stav samādhi', 'sjednocení'] },
              en: { contextual: 'Yoga', alternatives: ['union', 'integration'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['Jóga'],
              cs_literal: ['Jóga'],
              en_scholarly: ['Yoga']
            }
          },
          dictionaryLookup: 'yoga'
        },
        {
          id: 't2_2',
          text: {
            devanagari: 'चित्त',
            iast: 'citta',
            cs_phonetic: 'čitta'
          },
          lemma: 'citta',
          grammar: {
            pos: 'noun',
            root: '√cit',
            stem: 'citta',
            gender: 'neuter',
            case: 'genitive',
            number: 'singular',
            label_cs: 'n. kmen ve složenině (mysl, vědomí)',
            label_en: 'n. stem in compound (mind-stuff)'
          },
          compound: {
            is_compound_member: true,
            position: 'prefix'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'mysli', alternatives: ['vědomí', 'srdce-mysl', 'vnitřní orgán'] },
              en: { contextual: 'mind, consciousness', alternatives: ['mind-field'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['mysli'],
              cs_literal: ['vědomí [mysli]'],
              en_scholarly: ['of the mind']
            }
          },
          dictionaryLookup: 'citta'
        },
        {
          id: 't2_3',
          text: {
            devanagari: 'वृत्ति',
            iast: 'vṛtti',
            cs_phonetic: 'vrtti'
          },
          compound: {
            is_compound_member: true,
            position: 'middle'
          },
          lemma: 'vṛtti',
          grammar: {
            pos: 'noun',
            root: '√vṛt',
            stem: 'vṛtti',
            gender: 'feminine',
            case: 'genitive',
            number: 'plural',
            label_cs: 'f. kmen ve složenině (víření, obraty, modifikace)',
            label_en: 'f. stem in compound (fluctuations, whirlpools)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'víření, fluktuace, myšlenkové vlny', alternatives: ['obraty', 'stavy'] },
              en: { contextual: 'whirlpools, fluctuations', alternatives: ['modifications', 'waves'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['víření'],
              cs_literal: ['změn [vlnění]'],
              en_scholarly: ['fluctuating modifications']
            }
          },
          dictionaryLookup: 'vftti'
        },
        {
          id: 't2_4',
          text: {
            devanagari: 'निरोधः',
            iast: 'nirodhaḥ',
            cs_phonetic: 'niródhah'
          },
          lemma: 'nirodha',
          grammar: {
            pos: 'noun',
            root: '√rudh',
            stem: 'nirodha',
            gender: 'masculine',
            case: 'nominative',
            number: 'singular',
            label_cs: 'm. nom. sg. (zastavení, ztišení, utišení)',
            label_en: 'm. nom. sg. (restriction, cessation)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'zastavení, utišení, zvládnutí', alternatives: ['pohlcení', 'omezení'] },
              en: { contextual: 'cessation, restraint, stilling', alternatives: ['inhibition', 'control'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['zastavení'],
              cs_literal: ['utišení [zastavení]'],
              en_scholarly: ['is the stilling']
            }
          },
          dictionaryLookup: 'nirodha'
        }
      ],
      commentary_cs: 'Klíčový termín nirodha neznamená pouhé násilné potlačení, nýbrž rozpuštění myšlenkového víření zpět do klidového zdroje.',
      meter: 'Sūtra (aforismus – 9 slabik)',
      meter_notes: 'Rytmický aforismus o devíti slabikách.'
    },

    {
      id: 'pys_1_3',
      number: '1.3',
      book: 'Yogasūtra',
      chapter: '1. Samādhipāda',
      section: 'ys',
      source: {
        title: 'Patañjali: Yogasūtra 1.3',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Samādhi-pāda 1.3',
        note: 'Stav pozorovatele po utišení mysli'
      },
      scripts: {
        devanagari: {
          text: 'तदा द्रष्टुः स्वरूपेऽवस्थानम् ॥ १.३ ॥',
          mode: 'auto',
          lastAutoText: 'तदा द्रष्टुः स्वरूपेऽवस्थानम् ॥ १.३ ॥'
        },
        devanagari_padaccheda: {
          text: 'तदा द्रष्टुः स्व-रूपे अवस्थानम् ॥ १.३ ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'tadā draṣṭuḥ svarūpe \'vasthānam || 1.3 ||',
          mode: 'auto',
          lastAutoText: 'tadā draṣṭuḥ svarūpe \'vasthānam || 1.3 ||'
        },
        iast_padaccheda: {
          text: 'tadā draṣṭuḥ sva-rūpe avasthānam || 1.3 ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'tadá draštuh svarúpé \'vasthánam || 1.3 ||',
          mode: 'auto',
          lastAutoText: 'tadá draštuh svarúpé \'vasthánam || 1.3 ||'
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Tehdy pozorovatel spočívá ve své vlastní přirozené podstatě.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Tehdy [nastává] spočinutí [ustavení] zřícího [pozorovatele] ve vlastní formě [přirozenosti].'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Then the Seer abides in its own true nature.'
        }
      ],
      tokens: [
        {
          id: 't3_1',
          text: {
            devanagari: 'तदा',
            iast: 'tadā',
            cs_phonetic: 'tadá'
          },
          lemma: 'tadā',
          grammar: {
            pos: 'indeclinable',
            label_cs: 'časové příslovce (tehdy, v onom čase)',
            label_en: 'adverb of time (then)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'Tehdy, v té chvíli', alternatives: ['za toho stavu'] },
              en: { contextual: 'Then', alternatives: ['at that time'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['Tehdy'],
              cs_literal: ['Tehdy'],
              en_scholarly: ['Then']
            }
          },
          dictionaryLookup: 'tadA'
        },
        {
          id: 't3_2',
          text: {
            devanagari: 'द्रष्टुः',
            iast: 'draṣṭuḥ',
            cs_phonetic: 'draštuh'
          },
          lemma: 'draṣṭṛ',
          grammar: {
            pos: 'noun',
            root: '√dṛś',
            stem: 'draṣṭṛ',
            gender: 'masculine',
            case: 'genitive',
            number: 'singular',
            label_cs: 'm. gen. sg. (pozorovatele, zřícího, Puruši)',
            label_en: 'm. gen. sg. (of the Seer, Witness)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'zřící, svědek, pozorovatel (puruṣa)', alternatives: ['vnitřní zrak'] },
              en: { contextual: 'the Seer, pure consciousness', alternatives: ['the Witness'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['pozorovatel'],
              cs_literal: ['zřícího [pozorovatele]'],
              en_scholarly: ['the Seer']
            }
          },
          dictionaryLookup: 'drazwf'
        },
        {
          id: 't3_3',
          text: {
            devanagari: 'स्वरूपे',
            iast: 'svarūpe',
            cs_phonetic: 'svarúpé'
          },
          lemma: 'svarūpa',
          grammar: {
            pos: 'noun',
            stem: 'svarūpa',
            gender: 'neuter',
            case: 'locative',
            number: 'singular',
            label_cs: 'n. lok. sg. (ve vlastní podstatě / formě)',
            label_en: 'n. loc. sg. (in its own true form)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 've vlastní přirozenosti', alternatives: ['v pravé podstatě', 'v sobě samém'] },
              en: { contextual: 'in own nature', alternatives: ['in true identity'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['ve své vlastní přirozené podstatě'],
              cs_literal: ['ve vlastní formě [přirozenosti]'],
              en_scholarly: ['in its own true nature']
            }
          },
          dictionaryLookup: 'svarUpa'
        },
        {
          id: 't3_4',
          text: {
            devanagari: 'अवस्थानम्',
            iast: 'avasthānam',
            cs_phonetic: 'avasthánam'
          },
          lemma: 'avasthāna',
          grammar: {
            pos: 'noun',
            root: '√sthā',
            stem: 'avasthāna',
            gender: 'neuter',
            case: 'nominative',
            number: 'singular',
            label_cs: 'n. nom. sg. (spočinutí, setrvání, stav)',
            label_en: 'n. nom. sg. (abiding, remaining)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'spočinutí, ustavení', alternatives: ['pobývání', 'stabilita'] },
              en: { contextual: 'abiding, resting', alternatives: ['establishment'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['spočívá'],
              cs_literal: ['[nastává] spočinutí [ustavení]'],
              en_scholarly: ['abides']
            }
          },
          dictionaryLookup: 'avasTAna'
        }
      ],
      commentary_cs: 'Když je hladina mysli klidná, vědomí (draṣṭṛ) se již neztotožňuje s myšlenkami, nýbrž září ve své ryzí ryzosti.',
      meter: 'Sūtra (aforismus – 10 slabik)',
      meter_notes: 'Prozaická sūtra o deseti slabikách.'
    },

    // ==========================================
    // 2. BHAGAVADGĪTĀ (3 VERŠE)
    // ==========================================
    {
      id: 'bg_2_47',
      number: 'BG 2.47',
      book: 'Bhagavadgītā',
      chapter: '2. Sāṅkhyayoga',
      section: 'bg',
      source: {
        title: 'Bhagavadgītā 2.47',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Gītā 2.47 (Karma-yoga)',
        note: 'Kanonický verš nesobeckého jednání bez lpění na plodech'
      },
      scripts: {
        devanagari: {
          text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ २.४७ ॥',
          mode: 'auto',
          lastAutoText: ''
        },
        devanagari_padaccheda: {
          text: 'कर्मणि एव अधिकारः ते मा फलेषु कदाचन ।\nमा कर्म-फल-हेतुः भूः मा ते सङ्गः अस्तु अकर्मणि ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'karmaṇy evādhikāras te mā phaleṣu kadācana |\nmā karmaphalahetur bhūr mā te saṅgo \'stv akarmaṇi || 2.47 ||',
          mode: 'auto',
          lastAutoText: ''
        },
        iast_padaccheda: {
          text: 'karmaṇi eva adhikāraḥ te mā phaleṣu kadācana |\nmā karma-phala-hetuḥ bhūḥ mā te saṅgaḥ astu akarmaṇi ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'karmanj évádhikáras té má phaléšu kadáčana |\nmá karmaphalahétur bhúr má té saṅgó \'stv akarmani || 2.47 ||',
          mode: 'auto',
          lastAutoText: ''
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Máš právo pouze na čin samotný, nikdy však na jeho plody. Nechť plody činů nejsou tvým motivem a nechť nepropadneš nečinnosti.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'V činu [v jednání] pouze [jest] oprávnění tvé, ne v plodech kdykoliv; ať nejsi příčinou plodů jednání, ať tvé lnutí není k nečinnosti.'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'You have a right to perform your prescribed action alone, never to its fruits. Let not the fruit of action be your motive, nor let your attachment be to inaction.'
        }
      ],
      tokens: [
        {
          id: 't_bg_1',
          text: {
            devanagari: 'कर्मणि',
            iast: 'karmaṇi',
            cs_phonetic: 'karmani'
          },
          lemma: 'karman',
          grammar: {
            pos: 'noun',
            root: '√kṛ',
            stem: 'karman',
            gender: 'neuter',
            case: 'locative',
            number: 'singular',
            label_cs: 'n. lok. sg. (v jednání, v činu)',
            label_en: 'n. loc. sg.'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: {
                contextual: 'v jednání, v činu',
                alternatives: ['v konání', 'v práci', 'v povinnosti']
              },
              en: {
                contextual: 'in action, in duty',
                alternatives: ['in work', 'in deed']
              }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['čin'],
              cs_literal: ['V činu [v jednání]'],
              en_scholarly: ['prescribed action alone']
            }
          },
          dictionaryLookup: 'karman'
        },
        {
          id: 't_bg_2',
          text: {
            devanagari: 'एव',
            iast: 'eva',
            cs_phonetic: 'éva'
          },
          lemma: 'eva',
          grammar: {
            pos: 'indeclinable',
            label_cs: 'zdůrazňovací částice (pouze, právě)',
            label_en: 'emphatic particle'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'pouze, právě', alternatives: ['jen', 'vskutku'] },
              en: { contextual: 'only, indeed', alternatives: ['surely'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['pouze'],
              cs_literal: ['pouze'],
              en_scholarly: ['alone']
            }
          },
          dictionaryLookup: 'eva'
        },
        {
          id: 't_bg_3',
          text: {
            devanagari: 'अधिकारः',
            iast: 'adhikāraḥ',
            cs_phonetic: 'adhikárah'
          },
          lemma: 'adhikāra',
          grammar: {
            pos: 'noun',
            stem: 'adhikāra',
            gender: 'masculine',
            case: 'nominative',
            number: 'singular',
            label_cs: 'm. nom. sg. (právo, oprávnění)',
            label_en: 'm. nom. sg. (right)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'právo, způsobilost', alternatives: ['oprávnění', 'kompetence'] },
              en: { contextual: 'right, qualification', alternatives: ['privilege'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['právo'],
              cs_literal: ['oprávnění'],
              en_scholarly: ['a right']
            }
          },
          dictionaryLookup: 'adhikAra'
        }
      ],
      commentary_cs: 'Jádro karma-jógy: osvobození od lpění na výsledcích přináší vnitřní vyrovnanost a svobodu.',
      meter: 'Anuṣṭubh (Śloka – 4 × 8 slabik)',
      meter_notes: 'Klasická metrická sloka o 32 slabikách (čtyři osmičlenné pādy).'
    },

    {
      id: 'bg_4_7',
      number: 'BG 4.7',
      book: 'Bhagavadgītā',
      chapter: '4. Jñānayoga',
      section: 'bg',
      source: {
        title: 'Bhagavadgītā 4.7',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Gītā 4.7 (Jñāna-karma-sannyāsa-yoga)',
        note: 'Verš o sestupu božství k obnově dharmy'
      },
      scripts: {
        devanagari: {
          text: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥ ४.७ ॥',
          mode: 'auto',
          lastAutoText: ''
        },
        devanagari_padaccheda: {
          text: 'यदा यदा हि धर्मस्य ग्लानिः भवति भारत ।\nअभ्युत्थानम् अधर्मस्य तदा आत्मानम् सृजामि अहम् ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'yadā yadā hi dharmasya glānir bhavati bhārata |\nabhyutthānam adharmasya tadātmānaṁ sṛjāmy aham || 4.7 ||',
          mode: 'auto',
          lastAutoText: ''
        },
        iast_padaccheda: {
          text: 'yadā yadā hi dharmasya glāniḥ bhavati bhārata |\nabhyutthānam adharmasya tadā ātmānam sṛjāmi aham ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'jadá jadá hi dharmasja glánir bhavati bhárata |\nabhjutthánam adharmasja tadátmánam srdžámj aham || 4.7 ||',
          mode: 'auto',
          lastAutoText: ''
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Kdykoliv a kdekoliv dochází k úpadku dharmy a vzestupu bezpráví, ó Bhārato, tehdy sám sebe ztělesňuji.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Kdykoliv, kdykoliv vskutku [dochází] k úpadku spravedlnosti [dharmy], ó potomku Bharaty, [a] k povstání bezpráví, tehdy sám sebe tvořím [vtěluji].'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Whenever and wherever there is a decline in righteousness, O descendant of Bharata, and an increase in unrighteousness, at that time I manifest Myself.'
        }
      ],
      tokens: [
        {
          id: 't_bg4_1',
          text: {
            devanagari: 'धर्मस्य',
            iast: 'dharmasya',
            cs_phonetic: 'dharmasja'
          },
          lemma: 'dharma',
          grammar: {
            pos: 'noun',
            stem: 'dharma',
            gender: 'masculine',
            case: 'genitive',
            number: 'singular',
            label_cs: 'm. gen. sg. (dharmy, kosmického řádu, spravedlnosti)',
            label_en: 'm. gen. sg. (of righteousness)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'kosmický řád, dharma, spravedlnost', alternatives: ['povinnost', 'morální zákon'] },
              en: { contextual: 'righteousness, duty, moral order', alternatives: ['virtue'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['dharmy'],
              cs_literal: ['spravedlnosti [dharmy]'],
              en_scholarly: ['in righteousness']
            }
          },
          dictionaryLookup: 'dharma'
        },
        {
          id: 't_bg4_2',
          text: {
            devanagari: 'ग्लानिः',
            iast: 'glāniḥ',
            cs_phonetic: 'glánih'
          },
          lemma: 'glāni',
          grammar: {
            pos: 'noun',
            root: '√glai',
            stem: 'glāni',
            gender: 'feminine',
            case: 'nominative',
            number: 'singular',
            label_cs: 'f. nom. sg. (úpadek, ochabnutí, vyčerpání)',
            label_en: 'f. nom. sg. (decline, decay)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'úpadek, oslabení', alternatives: ['vyčerpání', 'zánik'] },
              en: { contextual: 'decline, decay', alternatives: ['decrease'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['úpadku'],
              cs_literal: ['k úpadku'],
              en_scholarly: ['a decline']
            }
          },
          dictionaryLookup: 'glAni'
        },
        {
          id: 't_bg4_3',
          text: {
            devanagari: 'भवति',
            iast: 'bhavati',
            cs_phonetic: 'bhavati'
          },
          lemma: 'bhū',
          grammar: {
            pos: 'verb',
            root: '√bhū',
            tense: 'present',
            mood: 'indicative',
            person: '3rd',
            number: 'singular',
            voice: 'active',
            label_cs: 'sloveso, préz. ind. akt. 3. os. sg. (stává se, nastává)',
            label_en: 'verb, pres. ind. act. 3sg'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'stává se, vzniká, jest', alternatives: ['děje se'] },
              en: { contextual: 'becomes, arises, happens', alternatives: ['is'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['dochází'],
              cs_literal: ['[dochází]'],
              en_scholarly: ['there is']
            }
          },
          dictionaryLookup: 'BU'
        }
      ],
      commentary_cs: 'Učení o avatārech: božský princip sestupuje v krizových chvílích, aby podpořil rovnováhu světa.',
      meter: 'Anuṣṭubh (Śloka – 4 × 8 slabik)',
      meter_notes: 'Klasická epická sloka Anuṣṭubh.'
    },

    {
      id: 'bg_18_66',
      number: 'BG 18.66',
      book: 'Bhagavadgītā',
      chapter: '18. Mokṣasannyāsayoga',
      section: 'bg',
      source: {
        title: 'Bhagavadgītā 18.66',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Gītā 18.66 (Mokṣa-sannyāsa-yoga)',
        note: 'Vrcholné poselství Gíty – carama-śloka (odevzdání se Nejvyššímu)'
      },
      scripts: {
        devanagari: {
          text: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥ १८.६६ ॥',
          mode: 'auto',
          lastAutoText: ''
        },
        devanagari_padaccheda: {
          text: 'सर्व-धर्मान् परित्यज्य माम् एकम् शरणम् व्रज ।\nअहम् त्वाम् सर्व-पापेभ्यः मोक्षयिष्यामि मा शुचः ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'sarvadharmān parityajya mām ekaṁ śaraṇaṁ vraja |\nahaṁ tvāṁ sarvapāpebhyo mokṣayiṣyāmi mā śucaḥ || 18.66 ||',
          mode: 'auto',
          lastAutoText: ''
        },
        iast_padaccheda: {
          text: 'sarva-dharmān parityajya mām ekam śaraṇam vraja |\naham tvām sarva-pāpebhyaḥ mokṣayiṣyāmi mā śucaḥ ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'sarvadharmán paritjadždža mám ékam šaranam vradža |\naham tvám sarvapápébhjó mókšajišjámi má šučah || 18.66 ||',
          mode: 'auto',
          lastAutoText: ''
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'Zanech všech dílčích povinností a odevzdej se mně jedinému jako své útočiště. Já tě osvobodím od všech pout a hříchů, nermuť se.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Všechny dharmy [náboženské povinnosti] opustiv, ke mně jedinému v útočiště vejdi; já tebe ze všech hříchů osvobodím, netruchli!'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Abandoning all varieties of duty, surrender unto Me alone. I shall deliver you from all sinful reactions; do not grieve.'
        }
      ],
      tokens: [
        {
          id: 't_bg18_1',
          text: {
            devanagari: 'शरणम्',
            iast: 'śaraṇam',
            cs_phonetic: 'šaranam'
          },
          lemma: 'śaraṇa',
          grammar: {
            pos: 'noun',
            stem: 'śaraṇa',
            gender: 'neuter',
            case: 'accusative',
            number: 'singular',
            label_cs: 'n. akuz. sg. (útočiště, ochrana)',
            label_en: 'n. acc. sg. (refuge)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'útočiště, ochrana, odevzdání', alternatives: ['záštita'] },
              en: { contextual: 'refuge, shelter, surrender', alternatives: ['protection'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['útočiště'],
              cs_literal: ['v útočiště'],
              en_scholarly: ['surrender']
            }
          },
          dictionaryLookup: 'SaraRa'
        },
        {
          id: 't_bg18_2',
          text: {
            devanagari: 'मोक्षयिष्यामि',
            iast: 'mokṣayiṣyāmi',
            cs_phonetic: 'mókšajišjámi'
          },
          lemma: 'mokṣ',
          grammar: {
            pos: 'verb',
            root: '√muc',
            tense: 'future',
            mood: 'indicative',
            person: '1st',
            number: 'singular',
            voice: 'active',
            label_cs: 'sloveso, fut. ind. akt. 1. os. sg. (osvobodím)',
            label_en: 'verb, fut. ind. act. 1sg (I shall deliver)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'osvobodím, propustím', alternatives: ['vykoupím'] },
              en: { contextual: 'I will liberate, deliver', alternatives: ['free'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['osvobodím'],
              cs_literal: ['osvobodím'],
              en_scholarly: ['shall deliver']
            }
          },
          dictionaryLookup: 'mokz'
        }
      ],
      commentary_cs: 'Konečný závěr Bhagavadgíty: svrchované odevzdání se (śaraṇāgati) překonává všechny obavy.',
      meter: 'Anuṣṭubh (Śloka – 4 × 8 slabik)',
      meter_notes: 'Sloka Anuṣṭubh.'
    },

    // ==========================================
    // 3. MAHĀBHĀRATA (2 VERŠE)
    // ==========================================
    {
      id: 'mbh_1_1_1',
      number: 'MBh 1.1.1',
      book: 'Mahābhārata',
      chapter: '1. Ādiparvan',
      section: 'mbh',
      source: {
        title: 'Mahābhārata 1.1.1 (Ādiparva)',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Mahābhārata, Ādi-parva 1.1.1',
        note: 'Tradiční maṅgalācaraṇa (zahajovací invokace celého eposu)'
      },
      scripts: {
        devanagari: {
          text: 'नारायणं नमस्कृत्य नरं चैव नरोत्तमम् ।\nदेवीं सरस्वतीं व्यासं ततो जयमुदीरयेत् ॥ १.१.१ ॥',
          mode: 'auto',
          lastAutoText: ''
        },
        devanagari_padaccheda: {
          text: 'नारायणम् नमस्कृत्य नरम् च एव नर-उत्तमम् ।\nदेवीम् सरस्वतीम् व्यासम् ततः जयम् उदीरयेत् ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'nārāyaṇaṁ namaskṛtya naraṁ caiva narottamam |\ndevīṁ sarasvatīṁ vyāsaṁ tato jayam udīrayet || 1.1.1 ||',
          mode: 'auto',
          lastAutoText: ''
        },
        iast_padaccheda: {
          text: 'nārāyaṇam namaskṛtya naram ca eva nara-uttamam |\ndevīm sarasvatīm vyāsam tataḥ jayam udīrayet ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'náráyanam namaskrtja naram čaiva naróttamam |\ndévím sarasvatím vjásam tató džajam udírajét || 1.1.1 ||',
          mode: 'auto',
          lastAutoText: ''
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'S poklonou Nārāyaṇovi, Narovi – nejlepšímu z lidí, bohyni Sarasvatī i mudrci Vyāsovi, nechť je vyřčena Píseň vítězství (Jaya).'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'Nārāyaṇovi poklonu vzdav, [i] Narovi též, lidem nejlepšímu, bohyni Sarasvatī [a] Vyāsovi, potom Vítězství [Mahābhāratu] ať pronese!'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Having bowed down to Nārāyaṇa and to Nara, the foremost of human beings, to the goddess Sarasvatī and to Vyāsa, one should utter the word Victory (Jaya).'
        }
      ],
      tokens: [
        {
          id: 't_mbh1_1',
          text: {
            devanagari: 'नारायणम्',
            iast: 'nārāyaṇam',
            cs_phonetic: 'náráyanam'
          },
          lemma: 'nārāyaṇa',
          grammar: {
            pos: 'noun',
            stem: 'nārāyaṇa',
            gender: 'masculine',
            case: 'accusative',
            number: 'singular',
            label_cs: 'm. akuz. sg. (Nārāyaṇa, Nejvyšší Pán)',
            label_en: 'm. acc. sg. (unto Narayana)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'Nārāyaṇa, božský zdroj', alternatives: ['Viṣṇu'] },
              en: { contextual: 'Narayana, Supreme Lord', alternatives: ['Vishnu'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['Nārāyaṇovi'],
              cs_literal: ['Nārāyaṇovi'],
              en_scholarly: ['Nārāyaṇa']
            }
          },
          dictionaryLookup: 'nArAyaRa'
        },
        {
          id: 't_mbh1_2',
          text: {
            devanagari: 'नमस्कृत्य',
            iast: 'namaskṛtya',
            cs_phonetic: 'namaskrtja'
          },
          lemma: 'namaskṛ',
          grammar: {
            pos: 'verb',
            root: '√kṛ',
            tense: 'absolutive',
            label_cs: 'gerundium / ustrnulý přechodník (pokloniv se, vzdav úctu)',
            label_en: 'absolutive / gerund (having bowed)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'vzdav poklonu, uctiv', alternatives: ['pokloniv se'] },
              en: { contextual: 'having bowed down, paying homage', alternatives: ['saluting'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['S poklonou'],
              cs_literal: ['poklonu vzdav'],
              en_scholarly: ['Having bowed down']
            }
          },
          dictionaryLookup: 'namaskf'
        },
        {
          id: 't_mbh1_3',
          text: {
            devanagari: 'जयम्',
            iast: 'jayam',
            cs_phonetic: 'džajam'
          },
          lemma: 'jaya',
          grammar: {
            pos: 'noun',
            root: '√ji',
            stem: 'jaya',
            gender: 'masculine',
            case: 'accusative',
            number: 'singular',
            label_cs: 'm. akuz. sg. (vítězství, původní název Mahābhāraty)',
            label_en: 'm. acc. sg. (Victory, epic Jaya)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'vítězství, epos Jaya', alternatives: ['triumf'] },
              en: { contextual: 'Victory, the poem Jaya', alternatives: ['triumph'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['Píseň vítězství (Jaya)'],
              cs_literal: ['Vítězství [Mahābhāratu]'],
              en_scholarly: ['Victory (Jaya)']
            }
          },
          dictionaryLookup: 'jaya'
        }
      ],
      commentary_cs: 'Starobylá invokace, jíž tradičně začíná každý recitátor přednes Mahābhāraty a Purán.',
      meter: 'Anuṣṭubh (Śloka – 4 × 8 slabik)',
      meter_notes: 'Tradiční sloka o 32 slabikách.'
    },

    {
      id: 'mbh_1_56_33',
      number: 'MBh 1.56.33',
      book: 'Mahābhārata',
      chapter: '1. Ādiparvan',
      section: 'mbh',
      source: {
        title: 'Mahābhārata 1.56.33',
        url: 'https://gretil.sub.uni-goettingen.de/',
        citation: 'Mahābhārata, Ādi-parva 1.56.33',
        note: 'Univerzální vymezení všezahrnující povahy Mahābhāraty'
      },
      scripts: {
        devanagari: {
          text: 'धर्मे चार्थे च कामे च मोक्षे च भरतर्षभ ।\nयदिहास्ति तदन्यत्र यन्नेहास्ति न तत्क्वचित् ॥ १.५६.३३ ॥',
          mode: 'auto',
          lastAutoText: ''
        },
        devanagari_padaccheda: {
          text: 'धर्मे च अर्थे च कामे च मोक्षे च भरत-ऋषभ ।\nयत् इह अस्ति तत् अन्यत्र यत् न इह अस्ति न तत् क्वचित् ॥',
          mode: 'manual',
          lastAutoText: ''
        },
        iast: {
          text: 'dharme cārthe ca kāme ca mokṣe ca bharatarṣabha |\nyad ihāsti tad anyatra yan nehāsti na tat kvacit || 1.56.33 ||',
          mode: 'auto',
          lastAutoText: ''
        },
        iast_padaccheda: {
          text: 'dharme ca arthe ca kāme ca mokṣe ca bharata-ṛṣabha |\nyat iha asti tat anyatra yat na iha asti na tat kvacit ||',
          mode: 'manual',
          lastAutoText: ''
        },
        cs_phonetic: {
          text: 'dharmé čárthé ča kámé ča mókšé ča bharataršabha |\njad ihásti tad anjatra jan néhásti na tat kvačit || 1.56.33 ||',
          mode: 'auto',
          lastAutoText: ''
        }
      },
      translations: [
        {
          id: 'cs_fluent',
          label: 'Plynulý český překlad',
          lang: 'cs',
          type: 'fluent',
          text: 'V otázkách ctnosti (dharma), bohatství (artha), potěšení (kāma) i osvobození (mokṣa), ó býku mezi Bharaty: co je zde, to je i jinde; a co zde není, to není nikde.'
        },
        {
          id: 'cs_literal',
          label: 'Doslovný rozbor (Čeština)',
          lang: 'cs',
          type: 'literal',
          text: 'V dharmě a v arthě a v kámě a v mokṣi, ó nejlepší z Bharatovců: co zde jest, to [najde se i] jinde; co však zde není, to není nikde.'
        },
        {
          id: 'en_scholarly',
          label: 'English Translation',
          lang: 'en',
          type: 'scholarly',
          text: 'Regarding righteousness, wealth, pleasure, and liberation, O best of the Bharatas: whatever is found here may be found elsewhere, but what is not here is nowhere else.'
        }
      ],
      tokens: [
        {
          id: 't_mbh2_1',
          text: {
            devanagari: 'धर्मे',
            iast: 'dharme',
            cs_phonetic: 'dharmé'
          },
          lemma: 'dharma',
          grammar: {
            pos: 'noun',
            stem: 'dharma',
            gender: 'masculine',
            case: 'locative',
            number: 'singular',
            label_cs: 'm. lok. sg. (v ctnosti, v povinnosti, v řádu)',
            label_en: 'm. loc. sg. (in virtue)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'v etice, v dharmě', alternatives: ['v řádu'] },
              en: { contextual: 'in duty, in righteousness', alternatives: ['in ethics'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['V otázkách ctnosti (dharma)'],
              cs_literal: ['V dharmě'],
              en_scholarly: ['Regarding righteousness']
            }
          },
          dictionaryLookup: 'dharma'
        },
        {
          id: 't_mbh2_2',
          text: {
            devanagari: 'मोक्षे',
            iast: 'mokṣe',
            cs_phonetic: 'mókšé'
          },
          lemma: 'mokṣa',
          grammar: {
            pos: 'noun',
            root: '√muc',
            stem: 'mokṣa',
            gender: 'masculine',
            case: 'locative',
            number: 'singular',
            label_cs: 'm. lok. sg. (v osvobození, v duchovní spáse)',
            label_en: 'm. loc. sg. (in liberation)'
          },
          vocabulary: {
            meanings_by_lang: {
              cs: { contextual: 'v osvobození, ve spáse', alternatives: ['v konečné svobodě'] },
              en: { contextual: 'in liberation, in freedom', alternatives: ['in salvation'] }
            }
          },
          alignment: {
            matched_words: {
              cs_fluent: ['i osvobození (mokṣa)'],
              cs_literal: ['a v mokṣi'],
              en_scholarly: ['and liberation']
            }
          },
          dictionaryLookup: 'mokza'
        }
      ],
      commentary_cs: 'Definující výrok Mahābhāraty: epos shrnuje celou lidskou zkušenost a čtyři životní cíle (puruṣārtha).',
      meter: 'Anuṣṭubh (Śloka – 4 × 8 slabik)',
      meter_notes: 'Klasická sloka Anuṣṭubh.'
    }
  ]
};
