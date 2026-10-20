# Sanskrt Na Web (Sanskrit Web Platform)

[![Build & Test](https://img.shields.io/badge/tests-131%20passed-brightgreen.svg)](https://github.com/richardLipka/SanskrtNaWeb)
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
│   • Pāṇiniovský derivační strom│   • LLM překladatel & kritika (OpenAI)│
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
  transliterateText,
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
  callLLM,
  
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

---

## 2. 👁️ Vizualizační aplikace (Sanskrit Reader)

Plně responzivní čtečka dostupná buď jako webová aplikace na `tab-interactive`, nebo jako lehký Custom Element `<sanskrit-reader>` a `<sanskrit-verse>`:

```html
<sanskrit-reader></sanskrit-reader>
```

### Klíčové vlastnosti:
1. **5-vrstvé zobrazení**:
   - **1. Dévanágarí**: Tradiční písmo s ligaturami i verze s rozpadem spřežek (*padaccheda*).
   - **2. Transliterace**: Akademická IAST, český fonetický přepis (podle prof. Dušana Zbavitele) nebo Harvard-Kyoto.
   - **3. Překlad**: Plynulý umělecký překlad i doslovný studijní meziřádkový překlad.
   - **4. Metrum & rytmus (*Chandas*)**: Automatické určení metra (např. *Anuṣṭubh / Śloka*, *Triṣṭubh*, *Indravajrā*) a vizualizace váhy slabik (*laghu* $\cup$ a *guru* —) přímo pod veršem.
   - **5. Komentáře & Tradiční výklady (*Bhāṣya & Ṭīkā*)**: Současné zobrazení více komentářů vedle sebe (např. *Śaṅkarācārya*, *Rāmānujācārya*, *Madhva* a poznámky českých překladatelů).
2. **Obousměrné křížové zvýrazňování (Cross-Highlighting)**: Najetí myší na sanskrtské slovo zvýrazní odpovídající slovo v dévanágarí, IAST i v českém překladu.
3. **Morfologický popup a Pāṇiniovský derivační strom**: Kliknutí na slovo otevře kartu s mluvnickým rozborem, kořenem (*dhātu*), kmenem (*prātipadika*), odkazy do slovníků a přesnými súframi z Pāṇiniho *Aṣṭādhyāyī* (pomocí `vidyut-prakriya`).

---

## 3. ✏️ Překladová aplikace (Sanskrit CAT Workstation)

Profesionální prostředí pro překladatele a indology inspirované moderními CAT nástroji (memoQ, Trados), přístupné v záložce `tab-editor` nebo přes `<sanskrit-editor>`:

### Funkce pro překladatele:
1. **Dvojitý náhled (Split-View)**: Živý náhled formátovaného verše v pravém sloupci se okamžitě aktualizuje při psaní.
2. **Virtuální klávesnice s diakritikou**:
   - **IAST lišta**: Rychlé vkládání znaků s makrony a tečkami na pozici kurzoru (`ā`, `ī`, `ū`, `ṛ`, `ṝ`, `ḷ`, `ṭ`, `ḍ`, `ṇ`, `ś`, `ṣ`, `ṅ`, `ñ`, `ṃ`, `ḥ`).
   - **Živý přepis (IME)**: Možnost psát běžnou latinkou s automatickou konverzí do dévanágarí v reálném čase.
   - **Pāṇiniovská vizuální klávesnice**: Uspořádaná podle tradičních artikulačních tříd (*kaṇṭhya*, *tālavya*, *mūrdhanya*, *dantya*, *oṣṭhya*).
3. **Nástroj pro párování slov (Word Alignment)**:
   - Kliknutím na sanskrtský token a následně na odpovídající české/anglické slovo v překladu vytvoříte vazbu pro cross-highlighting.
   - Tlačítko pro automatický návrh vazeb na základě slovníkové shody.
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

# Spuštění kompletní testovací sady (14 sad, 131 testů)
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

## 📄 Licence

Tento projekt je licencován pod licencí [MIT](LICENSE).
Použité moduly a data projektu [Ambuda Vidyut](https://github.com/ambuda-org/vidyut) podléhají licencím Apache 2.0 a MIT.
Slovníková data z Kolínské univerzity podléhají podmínkám projektu [Cologne Sanskrit Dictionaries](https://www.sanskrit-lexicon.uni-koeln.de/).
