# Sanskrt Na Web (Sanskrit Web Platform)

[![Build & Test](https://img.shields.io/badge/tests-184%20passed-brightgreen.svg)](https://github.com/richardLipka/SanskrtNaWeb)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-Ambuda%20Vidyut-orange.svg)](https://github.com/ambuda-org/vidyut)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sanskrt Na Web** je moderní, modulární platforma a knihovna pro práci s klasickým sanskrtem v prohlížeči. Spojuje akademickou filologickou přesnost (Pāṇiniho gramatika, metrika *chandas*, sanskrtské slovníky a tradiční komentáře) s moderními webovými komponentami, vizualizační čtečkou a překladatelským CAT editorem s asistencí LLM.

---

## 🏛️ Tři hlavní části projektu

Platforma je rozdělena do 3 samostatně využitelných celků:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Sanskrt Na Web Platform                         │
├────────────────────────────────┬───────────────────────────────────────┤
│   👁️ VIZUALIZAČNÍ APLIKACE      │      ✏️ PŘEKLADOVÁ CAT APLIKACE       │
│      (<sanskrit-reader>)       │         (<sanskrit-editor>)           │
│   • 5-vrstvé zobrazení         │   • Split-view překladové studio      │
│   • Metrum & slabiky (Chandas) │   • Pāṇiniovská klávesnice & IME      │
│   • Křížové zvýrazňování       │   • Interaktivní párování slov        │
│   • Víceautorské výklady       │   • Správa knih, kapitol a glosářů    │
│   • Morfologická stavba (Pāṇini)│   • LLM překladatel & kritika (OpenAI)│
├────────────────────────────────┴───────────────────────────────────────┤
│                    📦 SAMOTNÁ KNIHOVNA (Core Library)                  │
│                     import { ... } from 'sanskrt-na-web'               │
│   • Jazykově agnostický adaptér (LanguageAdapter)                      │
│   • Vidyut WebAssembly integrace (Prakriyā, Lipi, Chandas)             │
│   • Obousměrný fonetický transliterátor (Dévanágarí ↔ IAST ↔ Čeština)  │
│   • Zod schémata, validátory a normalizace víceautorských komentářů    │
│   • Slovníkový integrátor (Cologne Monier-Williams, Apte, Wisdomlib)   │
│   • Vyhledávač konkordancí a generátor Index Verborum                  │
│   • Správa projektových balíčků (.sanskrit-project.json)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. 📦 Samotná knihovna (Core Sanskrit Library)

Knihovna je navržena jako samostatný modul bez nutnosti běžícího backendu. Běží 100% na straně klienta i v Node.js prostředí.

### Instalace a import

```bash
npm install sanskrt-na-web
```

```typescript
import {
  // Schémata a typy
  Verse,
  CommentaryItem,
  getVerseCommentaries,
  
  // Adaptéry a lemmatizace
  defaultSanskritAdapter,
  analyzeSanskritWord,
  loadVidyutWasm,
  
  // Transliterace
  transliterate,
  transliterateLipi,
  devanagariToIast,
  iastToCzechPhonetic,
  createCzechRules,
  
  // Analýza a konkordance
  findWordConcordance,
  generateIndexVerborum,
  tokenizeTranslation,
  toggleWordBinding,
  
  // LLM asistent
  buildUserPrompt,
  executeLLMTask,
  
  // Webové komponenty
  registerSanskritVerse,
  registerSanskritReader,
  registerSanskritEditor
} from 'sanskrt-na-web';
```

### Sestavení knihovny (`build:lib`)

Pro sestavení knihovny jako standalone balíčku do složky `dist/lib/`:
```bash
npm run build:lib
```
Vygeneruje:
- `dist/lib/sanskrt-core.es.js` (ES Module pro moderní bundlery)
- `dist/lib/sanskrt-core.umd.js` (UMD bundle pro přímé vložení do prohlížeče)
- `dist/lib/types/` (TypeScript deklarace, odkazované z `types` v `package.json`)

Balík `@siva-sh/vidyut` (WebAssembly) zůstává externí závislostí a není do knihovny vkládán.

---

## 2. 👁️ Vizualizační aplikace (Sanskrit Reader)

Plně responzivní čtečka dostupná buď jako webová aplikace na `tab-interactive`, nebo jako lehký Custom Element `<sanskrit-reader>` a `<sanskrit-verse>`:

```html
<sanskrit-reader></sanskrit-reader>
```

### Klíčové vlastnosti:
1. **5-vrstvé zobrazení**:
   - **1. Dévanágarí**: Tradiční písmo s ligaturami i verze s rozpadem spřežek (*padaccheda*).
   - **2. Transliterace**: Akademická IAST (i s padacchedou), český fonetický přepis (podle prof. Dušana Zbavitele, s nastavitelnými pravidly), Harvard-Kyoto nebo SLP1.
   - **3. Překlad**: Plynulý umělecký překlad i doslovný studijní meziřádkový překlad.
   - **4. Metrum & rytmus (*Chandas*)**: Automatické určení metra (např. *Anuṣṭubh / Śloka*, *Triṣṭubh*, *Indravajrā*) a vizualizace váhy slabik (*laghu* $\cup$ a *guru* —) přímo pod veršem.
   - **5. Komentáře & Tradiční výklady (*Bhāṣya & Ṭīkā*)**: Současné zobrazení více komentářů vedle sebe (např. *Śaṅkarācārya*, *Rāmānujācārya*, *Madhva* a poznámky českých překladatelů).
2. **Obousměrné křížové zvýrazňování (Cross-Highlighting)**: Najetí myší na sanskrtské slovo zvýrazní odpovídající slovo v dévanágarí, IAST i v českém překladu.
3. **Morfologický popup a morfologická stavba slova**: Kliknutí na slovo otevře kartu s mluvnickým rozborem, odkazy do slovníků a – pokud ho `vidyut-prakriya` dokáže z rozpoznaného kmene či kořene skutečně odvodit – rozkladem na předpony, kořen (*dhātu*) nebo kmen (*prātipadika*), kmenotvornou příponu (*vikaraṇa*) a koncovku (např. √bhū + śap + laṭ→tip = bhav-a-ti). Postup podle jednotlivých súter *Aṣṭādhyāyī* je k dispozici na vyžádání s odkazy na [ashtadhyayi.com](https://ashtadhyayi.com/sutraani/1/1/1).

---

## 3. ✏️ Překladová aplikace (Sanskrit CAT Workstation)

Profesionální prostředí pro překladatele a indology inspirované moderními CAT nástroji (memoQ, Trados), přístupné v záložce `tab-editor` nebo přes `<sanskrit-editor>`:

### Funkce pro překladatele:
1. **Pracovní plocha na celou šířku obrazovky**: tři sloupce – zdrojový text (dévanágarí, IAST, metrum, kontext), překlad s tabulí vazeb a nápověda ke zvolenému slovu (rozbor, slovník, glosář, rozdělení složeniny, morfologie). Náhled verše v čtečce se otevírá na vyžádání v překryvném panelu (tlačítko „Náhled“, zavření klávesou Esc).
2. **Virtuální klávesnice s diakritikou**:
   - **IAST lišta**: Rychlé vkládání znaků s makrony a tečkami na pozici kurzoru (`ā`, `ī`, `ū`, `ṛ`, `ṝ`, `ḷ`, `ṭ`, `ḍ`, `ṇ`, `ś`, `ṣ`, `ṅ`, `ñ`, `ṃ`, `ḥ`).
   - **Živý přepis (IME)**: Psaní v IAST s průběžnou konverzí celého rozepsaného slova do dévanágarí (`yoga` → योग, Backspace maže poslední latinské písmeno, `|` → ।, `||` → ॥).
   - **Pāṇiniovská vizuální klávesnice**: Uspořádaná podle tradičních artikulačních tříd (*kaṇṭhya*, *tālavya*, *mūrdhanya*, *dantya*, *oṣṭhya*).
3. **Tabule vazeb slov (Word Alignment)**:
   - Tři řádky – dévanágarí, IAST a slova překladu; nad slovem v dévanágarí se zobrazí transliterace, lemma, gramatika a význam.
   - Kliknutím na sanskrtské slovo a poté na slovo překladu vznikne vazba, opětovným kliknutím se zruší; Shift + klik přiřadí celý úsek. Vazby jsou barevně odlišené a jejich seznam umožňuje jednotlivé vazby odebrat.
   - Tlačítko pro automatický návrh vazeb na základě slovníkové shody.
   - **Složeniny a sandhi**: návrh rozdělení slova na všechny členy (kṛṣṇārjunasaṃvādaḥ → kṛṣṇa + arjuna + saṃvāda), ruční rozdělení („dharma + kṣetre“) i zpětné spojení; každý člen má vlastní slovníková hesla a vazby. Slova se spojovníkem (dharma-kṣetre) se při dělení verše na slova rozdělí automaticky. Vše běží v prohlížeči bez serveru a bez online služeb: WebAssembly balík Vidyut obsahuje jen rozdělovač sandhi (segmentátor *vidyut-cheda* ani lexikon *vidyut-kosha* v něm nejsou), proto má aplikace vlastní segmentátor ([`compoundService.ts`](src/core/lemmatizer/compoundService.ts), [`compoundSegmenter.ts`](src/core/lemmatizer/compoundSegmenter.ts)). Nejdřív nabídne rozdělení doložená v *Digital Corpus of Sanskrit*, jinak Vidyut navrhne místa řezu s obráceným sandhi a členy se ověří a seřadí podle statického lexikonu dodávaného s aplikací ([`public/lexicon/`](public/lexicon/), 3,9 MB: hesla Monier-Williams, četnosti, časté slovní tvary a pravidla koncovek z DCS). Rozdělí i slova spojená sandhi (pāṇḍavāścaiva → pāṇḍavāḥ + ca + eva, loko'sti → lokaḥ + asti) a pozná jednoduchá slova (devānām → deva). Stažený offline slovník Vidyut (`data-0.4.0.zip`, [`kosha/`](src/core/lemmatizer/kosha/)) je volitelný. Segmentátor se dál vyvíjí v samostatném repozitáři *sanskrit-splitter* (viz *Lexikon pro dělení složenin* níže).
4. **Správa a editace víceautorských komentářů**:
   - Rychlé předvolby komentátorů (*Śaṅkara*, *Rāmānuja*, *Śrīdhara*, *Madhva*, *Filipský & Vacek*).
   - In-place editace textu výkladu, tradice i citace pramene.
   - Filtrování zobrazení podle autora.
5. **LLM Překladatelský asistent (OpenAI, Gemini, Groq, Ollama)**:
   - Překlad verše s ohledem na okolní kontext (předchozí a následující verše), glosář i tradiční komentáře.
   - Automatické párování slov pomocí LLM.
   - Gramatická korektura a filologická oponentura překladu.
   - Možnost vložit výstup z LLM přímo jako nový komentář k verši.
6. **Správa celých knih a korpusu**:
   - Hromadný import textů (knihy, kapitoly, číslování veršů).
   - Vyhledávání v konkordancích a generování rejstříku slov (*Index Verborum*).
   - Ukládání a obnovení kompletního rozpracovaného projektu včetně glosáře (`.sanskrit-project.json`).

---

## 📚 Použité zdroje pro sanskrt a akademické licence

Projekt staví na renomovaných mezinárodních a českých indologických zdrojích:

| Zdroj / Projekt | Autor / Instituce | Popis & Využití | Licence / Odkaz |
| :--- | :--- | :--- | :--- |
| **Ambuda Vidyut** | Ambuda.org (Arun Prasad et al.) | WebAssembly enginy pro morfologii, transliteraci (`vidyut-lipi`), metriku (`vidyut-chandas`), rozklad sandhi a Pāṇiniho derivaci (`vidyut-prakriya`). | [Apache 2.0 / MIT](https://github.com/ambuda-org/vidyut) |
| **Cologne Digital Sanskrit Dictionaries** | University of Cologne (Thomas Malten, Jim Funderburk) | *Monier-Williams Sanskrit-English Dictionary* (1899) a *V. S. Apte Practical Sanskrit-English Dictionary* (1957). | [CDSL Open Access](https://www.sanskrit-lexicon.uni-koeln.de/) |
| **Winthrop Sargeant** | SUNY Press (2009) | Meziřádkový gramatický layout a slovníkové glosy Bhagavadgíty. | *The Bhagavad Gītā*, Revised Edition |
| **Filipský & Vacek** | Jan Filipský, Jaroslav Vacek (Odeon, 1976) | Klasický český přebásněný i filologický překlad Bhagavadgíty, terminologie *niṣkāmakarmy*. | Odeon 1976 / Česká indologie |
| **GRETIL** | Göttingen Register of Electronic Texts | Elektronické edice sanskrtských kánonických textů (Yogasūtra, Mahābhārata, Upaniṣady). | [GRETIL Archive](http://gretil.sub.uni-goettingen.de/) |
| **Digital Corpus of Sanskrit (DCS)** | Oliver Hellwig | Lemmatizovaný korpus s rozdělenými složeninami: četnosti členů, pravidla koncovek a doložená rozdělení v `public/lexicon/`. | [CC BY 4.0](https://github.com/OliverHellwig/sanskrit) |
| **Wikisource Sanskrit** | Wikimedia Commons | Tradiční sanskrtské komentáře (*Śāṅkarabhāṣya*, *Rāmānujabhāṣya*, *Subodhinī*). | [sa.wikisource.org](https://sa.wikisource.org/) |

---

## 🛠️ Vývoj, sestavení a testy

### Požadavky
- **Node.js** v18+ a **npm**
- Moderní webový prohlížeč s podporou WebAssembly

### Příkazy

```bash
# Instalace závislostí
npm install

# Spuštění vývojového serveru (HMR na http://localhost:5173/)
npm run dev

# Spuštění kompletní testovací sady (16 sad, 184 testů)
npm test

# Spuštění testů ve sledovacím režimu
npm run test:watch

# Kompletní produkční sestavení (Webová aplikace + Knihovna)
npm run build

# Sestavení pouze webové aplikace
npm run build:app

# Sestavení pouze samostatné knihovny (dist/lib/)
npm run build:lib

# Kontrola a test Vidyut WASM aktualizačního harnessu
npm run vidyut:check
npm run vidyut:test
```

---

## 🤖 Konfigurace LLM asistentů

Překladový editor podporuje jakéhokoliv poskytovatele s OpenAI-kompatibilním rozhraním:
- **Google Gemini**: endpoint `https://generativelanguage.googleapis.com/v1beta/openai` (model `gemini-2.5-flash`)
- **OpenAI**: endpoint `https://api.openai.com/v1` (model `gpt-4o`, `gpt-4o-mini`)
- **Groq Cloud**: endpoint `https://api.groq.com/openai/v1` (model `llama-3.3-70b-versatile`)
- **Ollama (Lokální běh na vlastním PC zdarma)**: endpoint `http://localhost:11434/v1` (model `llama3:latest`)
- **LM Studio**: endpoint `http://localhost:1234/v1`

---

## 4. 🔌 WordPress Plugin (Sanskrt na Web)

Samostatný WordPress plugin pro vkládání připravených bloků sanskrtských textů do stránek a příspěvků.
- **Umístění:** [`wordpress-plugin/sanskrt-na-web/`](file:///f:/Vyvoj/AI/SanskrtNaWeb/wordpress-plugin/sanskrt-na-web/)
- **Čistě pro čtení (Read-Only):** Zabezpečená prezentace bez editačních zásahů ze strany návštěvníků.
- **Respektování šablony webu (Skin Native):** Ve výchozím stavu 100% přejímá písma, barvy a styl vašeho WordPress tématu.
- **Volitelné vizuální skiny:** *Pergamen*, *Ášram* (šafrán), *Akademický* (indologický), *Tmavý védský*.
- **Gutenberg blok & Shortcodes:** Blok `sanskrt/verse-viewer` s postranní lištou nastavení viditelnosti vrstev a shortcode `[sanskrt_verse id="..."]` / `[sanskrt_reader ids="..."]`.
- **Interaktivita:** Křížové zvýrazňování slov při najetí myší (Dévanágarí ↔ IAST ↔ Překlad) a morfologický popup s lemmou a gramatikou po kliknutí.

---

### Lexikon pro dělení složenin

Segmentátor složenin a sandhi se vyvíjí v samostatném (zatím neveřejném) repozitáři **sanskrit-splitter** ([gitlab.kiv.zcu.cz/lipka/sanskrit-splitter](https://gitlab.kiv.zcu.cz/lipka/sanskrit-splitter)). Tam jsou nástroje pro sestavení lexikonu ze zdrojů (Monier-Williams z [csl-orig](https://github.com/sanskrit-lexicon/csl-orig), DCS z [OliverHellwig/sanskrit](https://github.com/OliverHellwig/sanskrit)), jeho vyhodnocení, výzkumná zpráva a plán benchmarků. Aplikace obsahuje zmrazenou kopii segmentátoru ([`src/core/lemmatizer/`](src/core/lemmatizer/)) a lexikonu ([`public/lexicon/`](public/lexicon/)) z doby oddělení (SanskrtNaWeb `5c0c056`), dokud knihovna nevyjde; pak na ni aplikace přejde jako na závislost.

## 📄 Licence

Tento projekt je licencován pod licencí [MIT](LICENSE).
Použité moduly a data projektu [Ambuda Vidyut](https://github.com/ambuda-org/vidyut) podléhají licencím Apache 2.0 a MIT.
Slovníková data z Kolínské univerzity podléhají podmínkám projektu [Cologne Sanskrit Dictionaries](https://www.sanskrit-lexicon.uni-koeln.de/).
Datové soubory lexikonu v `public/lexicon/` jsou odvozeny z Monier-Williams (csl-orig, CC BY-SA 4.0) a z Digital Corpus of Sanskrit (O. Hellwig, CC BY 4.0) a šíří se pod CC BY-SA 4.0 (viz [`public/lexicon/SOURCES.md`](public/lexicon/SOURCES.md)).
