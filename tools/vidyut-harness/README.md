# Vidyut WebAssembly Integration & Architecture Reference

Tento dokument a adresář obsahují detailní analýzu modulů knihovny **[Ambuda Vidyut](https://github.com/ambuda-org/vidyut)**, postupy pro aktualizaci a kompilaci do WebAssembly (WASM), popis derivačního stromu (*vidyut-prakriya*), metrické vrstvy (*vidyut-chandas*) a podrobnou odpověď ohledně dostupnosti slovníkových dat pro *vidyut-cheda* a *vidyut-kosha*.

---

## 1. Důkladná analýza modulů Ambuda Vidyut

Projekt **Vidyut (विद्युत्)** je špičková moderní sanskrtská knihovna vyvíjená v jazyce **Rust** pod licencí **MIT** neziskovou organizací **[Ambuda.org](https://ambuda.org)** (hlavní autor: Arun Prasad a přispěvatelé). Poskytuje modulární ekosystém pokrývající celou škálu sanskrtské lingvistiky:

### 1.1 `vidyut-lipi` (Transliterace)
- **Co poskytuje:** Extrémně rychlý, bezeztrátový převod mezi více než 40 písmy a schématy (Dévanágarí, IAST, SLP1, Harvard-Kyoto, Velthuis, Grantha, Bengálské, Telugské, Malajálamské písmo atd.).
- **Využití v projektu:** Integrováno přes `transliterateLipi()` v [`vidyutAdapter.ts`](file:///f:/Vyvoj/AI/SanskrtNaWeb/src/core/lemmatizer/vidyutAdapter.ts) a zaregistrováno jako výchozí modul pro převod Dévanágarí do IAST v [`engine.ts`](file:///f:/Vyvoj/AI/SanskrtNaWeb/src/core/transliteration/engine.ts). Má přednost před statickou tabulkou, přičemž uživatelská ruční editace i tabulka znaků zůstávají plně zachovány pro ladění a speciální ligatury.

### 1.2 `vidyut-akshara` (Fonetika a slabikování)
- **Co poskytuje:** Přesné dělení sanskrtského textu na slabiky (*akṣara*), rozlišení samohlásek (*svara*), souhlásek (*vyañjana*), spřežek (*saṃyuktākṣara*), přízvuků (*udātta*, *anudātta*, *svarita*) a výpočet rytmické váhy slabiky:
  - **Laghu (∪ / L)**: lehká / krátká slabika (např. *a*, *i*, *u* bez následující spřežky).
  - **Guru (— / G)**: těžká / dlouhá slabika (dlouhé samohlásky *ā*, *ī*, *ū*, diftongy *e*, *ai*, *o*, *au*, nebo krátká samohláska následovaná spřežkou, anasvárou či visargou).
- **Využití v projektu:** Metoda `segmentAksharas()` v [`vidyutAdapter.ts`](file:///f:/Vyvoj/AI/SanskrtNaWeb/src/core/lemmatizer/vidyutAdapter.ts) rozkládá verš na přesné slabiky zobrazené v metrické vrstvě verše pro nácvik recitace, mantry a pránájámu.

### 1.3 `vidyut-prakriya` (Pāṇiniovská generativní gramatika)
- **Co poskytuje:** Kompletní implementaci generativního systému gramatika Pāṇiniho (*Aṣṭādhyāyī* – cca 4 000 gramatických súter). Na rozdíl od pouhých statických tabulek odvozuje tvary krok za krokem z primárních kořenů (*dhātu*) a kmenů (*prātipadika*).
- **Jaké informace poskytuje:**
  - Jmenné tvary (*subanta*): pád (*vibhakti* 1–8), číslo (*vacana* jednotné/dvojné/množné), rod (*liṅga*).
  - Slovesné tvary (*tiṅanta*): slovesná třída (*gaṇa* 1–10), čas a způsob (*lakāra* – Laṭ, Liṭ, Luṭ, Lṛṭ, Loṭ, Laṅ, Vidhiliṅ...), slovesný rod (*prayoga* – kartari, karmani, bhave).
  - **Derivační strom (Derivation History)**: pole kroků, kde každý krok obsahuje:
    1. Kód sútry (např. `1.2.45`, `4.1.2`, `7.1.12`, `8.4.68`).
    2. Zdrojové dílo (*Aṣṭādhyāyī*).
    3. Mutované morfologické členy (např. `yoga + ṅas` $\rightarrow$ `yoga + as` $\rightarrow$ `yoga + sya` $\rightarrow$ `yogasya`).
    4. Indikaci, který člen byl změněn (`wasChanged: true`).
- **Využití v projektu:**
  - Metoda `derivePrakriyaTree()` generuje kompletní Pāṇinian derivation tree.
  - V modálním okně detailu slova i v panelu lemmatizátoru se po kliknutí na slovo zobrazí interaktivní strom kroků, přičemž každé číslo sútry je **aktivním klikatelným odkazem na výklad pravidla na portálu [Ashtadhyayi.com](https://ashtadhyayi.com)**.

### 1.4 `vidyut-chandas` (Metrická analýza sanskrtských veršů)
- **Co poskytuje:** Automatickou identifikaci klasických a védských sanskrtských metrů (Anuṣṭubh, Triṣṭubh, Jagatī, Vasantatilakā, Śārdūlavikrīḍita, Mandākrāntā, Mālini, Upajāti, Gāyatrī atd.).
- **Využití v projektu:** Tvoří základ pro **novou 4. vizualizační vrstvu** naší aplikace.

### 1.5 `vidyut-sandhi` (Sandhiový analyzátor a rozkladač)
- **Co poskytuje:** Pravidlové rozdělování (*sandhi splitAll*) a spojování (*sandhi join*) sandhiových alternací.
- **Využití v projektu:** Okamžitý rozpad složenin a spřežek v reálném čase přímo ve WebAssembly.

---

## 2. Jsou k dispozici slovníky pro `vidyut-cheda` a `vidyut-kosha`?

### Odpověď: **ANO, slovníková data jsou k dispozici a jsou oficiálně publikována projektem Ambuda.**

#### Kde se data nacházejí a co obsahují:
1. **Oficiální distribuce:**
   - Projekt Ambuda uvolňuje zkompilované binární datové balíčky v GitHub Releases:
     - `https://github.com/ambuda-org/vidyut/releases` (např. balíček `data-0.4.0.zip` nebo `data-0.2.0.zip`).
     - Balíčky jsou rovněž šířeny v rámci Python distribuce na PyPI (`vidyut-cheda` a `vidyut-kosha`).
2. **Obsah a formát dat:**
   - Datový archiv obsahuje předsestavené stavové automaty a komprimované trie stromy (**Finite State Transducers – FST**):
     - `kosha.tsv` / binární FST soubory.
     - Spojuje v sobě digitalizované hesláře klasických tištěných slovníků: **Monier-Williams (1899)**, **V.S. Apte (1957)**, **Śabda-Sāgara**, a **Vācaspatyam**.
     - Navíc obsahuje **přes 10 milionů vygenerovaných ohýbaných tvarů** (inflected forms) vytvořených modulem `vidyut-prakriya` se všemi gramatickými tagy.
3. **Velikost dat:**
   - Komprimovaný ZIP: cca **18 až 20 MB**.
   - Rozbalená binární FST data: cca **50 až 60 MB**.

#### Proč tato data nejsou součástí základního `@siva-sh/vidyut` WebAssembly balíčku?
- Standardní `@siva-sh/vidyut` WASM balíček, který jsme integrovali do našeho frontendu, má velikost **pouze ~1 MB**.
- Ambuda záměrně vyčlenila 50 MB slovníková data z výchozího webového bundle, aby se webové stránky načítaly okamžitě (sub-sekundový cold start) a nestahovaly desítky megabajtů před zobrazením veršů.
- Moduly `vidyut-lipi`, `vidyut-akshara`, `vidyut-prakriya`, `vidyut-chandas` a `vidyut-sandhi` fungují **zcela autonomně a bez 50 MB datového souboru**.

#### Možnosti nasazení `vidyut-kosha` a `vidyut-cheda`:
1. **Klient-side on-demand stahování a IndexedDB mezipaměť (Implementováno v aplikaci):**
   - V aplikaci je k dispozici komponenta **Plná offline slovníková databáze (Vidyut-Kosha & Cheda)** s explicitním upozorněním na velikost (~18,5 MB ZIP / ~55 MB v paměti) a dobu stahování (5–40 sekund).
   - Pomocí tlačítka **📥 Stáhnout slovník do prohlížeče** se streamovaně stahuje archiv `data-0.4.0.zip`, zobrazuje se live progress bar a po stažení se archiv uloží do **IndexedDB** (`VidyutOfflineKoshaDB`).
   - Při dalších návštěvách je slovník ihned k dispozici bez nutnosti nového stahování.
   - Součástí je i tlačítko pro uložení ZIPu na disk (**💾 Uložit ZIP na disk**), nahrání vlastního souboru z disku (**📂 Vybrat ZIP z disku**) a vymazání mezipaměti (**🗑️ Vymazat mezipaměť**).
2. **Lokální / Serverový sidecar:**
   - Pro těžší analýzy (např. automatické dělení celých kapitol knih) lze spustit lokální Node.js/Python server, který má `vidyut-cheda` načtenou s plnými 50 MB FST daty.
3. **Naše současná hybridní architektura (Doporučeno pro web):**
   - V naší aplikaci jsme zvolili optimální hybrid:
     - **Vidyut WASM (1 MB)** zajišťuje bleskovou transliteraci, sandhi rozklad, metrickou analýzu a generování Pāṇiniho derivačního stromu.
     - **Místní vestavěný jógový slovník (Sargeant + Apte + Monier-Williams)** poskytuje okamžité překlady bez zátěže sítě.

---

## 3. Nová vizualizační vrstva (Vrstva 4: Metrum & Chandas)

V aplikaci je nově zavedena **4. vizualizační vrstva: Metrum & rytmus (Chandas)**:
- **Zobrazení:**
  - Název metra (např. *Anuṣṭubh (Śloka – 4 × 8 slabik)*, *Triṣṭubh*, *Sūtra*, *Vasantatilakā*...).
  - Počet slabik a rozpad na jednotlivé p划dy (*pāda*).
  - Vizuální zobrazení každé slabiky v dévanágarí i IAST s rytmickou značkou:
    - **Laghu (∪)** pro lehké slabiky.
    - **Guru (—)** pro těžké/dlouhé slabiky zvýrazněné zlatým rámečkem.
- **Možnost uživatelské volby:**
  - Tlačítko **✏️ Upravit druh metra** u každého verše umožňuje uživateli ručně nastavit či přepsat druh verše (např. pokud jde o specifický prozaický aforismus, mantru nebo nestandardní védské metrum).
  - Zvolený metr se ukládá do datového schématu verše (`verse.meter`).

---

## 4. Postup aktualizace a testování Vidyut

### Rychlá aktualizace WASM balíčku:
```bash
# Kontrola nového commitu upstream repozitáře
node tools/vidyut-harness/check-upstream.mjs

# Aktualizace balíčku
npm update @siva-sh/vidyut

# Spuštění integračních a jednotkových testů
npm test
node tools/vidyut-harness/harness-test.mjs
```

### Překlad přímo ze zdrojového kódu Rustu:
```powershell
# Na Windows:
powershell -ExecutionPolicy Bypass -File tools/vidyut-harness/build-wasm-from-source.ps1

# Na Linux/macOS:
./tools/vidyut-harness/build-wasm-from-source.sh
```
