# 🕉️ Sanskrt na Web — WordPress Plugin

Oficiální WordPress plugin pro prezentaci a vkládání připravených bloků sanskrtských textů, manter a filosofických veršů do stránek a příspěvků.

Plugin je navržen výhradně pro **čtení a studium (Read-Only Viewer / Reader)** bez možnosti editace návštěvníkem. Umožňuje přesnou volbu viditelných vrstev a v základním nastavení **plně respektuje a přejímá vizuální styl a typografii aktivní šablony WordPressu**.

---

## ✨ Hlavní funkce

- 🎨 **Maximální respektování šablony webu (`skin="native"`)**:
  - Dědí rodiny písem, barvy textu, velikosti, řádkování a šířky kontejneru.
  - Zajišťuje správné zobrazení sanskrtských ligatur v Dévanágarí (`Tiro Devanagari Sanskrit`, `Noto Serif Devanagari`) bez zásahu do latinkového fontu vašeho tématu.
- 🎛️ **Granulární řízení viditelnosti vrstev**:
  - **Dévanágarí** (originální sanskrtské písmo)
  - **Padaccheda** (slovní rozbor a sandhiové rozčlenění)
  - **IAST** (mezinárodní vědecká transliterace)
  - **Český fonetický přepis** (přístupný zápis výslovnosti)
  - **Hlavní překlad** (plynulý český nebo anglický)
  - **Doslovný překlad** (analytický rozbor jednotlivých slov)
  - **Metrum / Čhandas** (např. *Anuṣṭubh*, *Triṣṭubh*, *Sūtra*)
  - **Tradiční komentáře** (výklady mistrů jako Vyāsa, Śaṅkarācārya, Rāmānuja, moderní indologické poznámky)
- 💡 **Obousměrný Cross-Highlighting**:
  - Najetím myší na sanskrtské slovo se automaticky podbarví odpovídající slovo v transliteraci i v českém/anglickém překladu (a naopak).
- 🔍 **Morfologický popup (kliknutí na slovo)**:
  - Otevře přístupné okno s lemmou (základním tvarem), gramatickou kategorií (pád, číslo, rod, čas) a lexikálními významy.
- 🏷️ **Přepínací lišta vrstev pro návštěvníky**:
  - Čtenář si může v reálném čase sám zapnout nebo vypnout vrstvy přímo v těle článku podle toho, zda se učí písmo, čte překlad nebo studuje komentáře.
- 🧱 **Gutenberg blok + Shortcodes**:
  - Blok `sanskrt/verse-viewer` s přehledným panelem v postranní liště.
  - Zkrácené kódy `[sanskrt_verse]` a `[sanskrt_reader]`.

---

## 🎭 Dostupné vizuální skiny

| Skin | Třída | Popis |
| :--- | :--- | :--- |
| **Šablona webu** *(Výchozí)* | `skin-native` | 100% průhledný, přejímá veškeré barvy, písma a rámečky z vaší šablony (Astra, Kadence, GeneratePress, Divi, Block themes). |
| **Pergamen / Svitek** | `skin-parchment` | Teplé krémové tóny slonové kosti, jemná sépiová linka, tradiční atmosféra rukopisu na palmovém listu. |
| **Ášram** | `skin-ashram` | Šafránový levý lem (`#d9531e`), hřejivé podtóny posvátné indické tradice. |
| **Akademický** | `skin-academic` | Decentní šedý rámeček, patková typografie ve stylu kritických indologických edicí. |
| **Tmavý védský** | `skin-dark` | Hluboké antracitové pozadí se zlatavým a jantarovým akcentem, ideální pro tmavé režimy webu. |

---

## 🚀 Použití v editoru Gutenberg

1. V editoru příspěvku nebo stránky klikněte na tlačítko **+** (Přidat blok).
2. Vyhledejte **Sanskrtský verš (SanskrtNaWeb)**.
3. V pravém postranním panelu (Inspector Controls) můžete:
   - Vybrat verš z připraveného kánonu (*Patañjaliho Yogasūtra 1.1*, *1.2*, *Bhagavadgītā 2.47* atd.).
   - Zvolit požadovaný **Skin**.
   - Jednoduše zaškrtnout nebo odškrtnout vrstvy, které mají být viditelné.
   - Povolit či zakázat křížové zvýrazňování nebo klientskou přepínací lištu.
   - Volitelně vložit vlastní JSON vyexportovaný z aplikace **SanskrtNaWeb Editor**.

---

## 📝 Použití pomocí Shortcode

### 1. Základní zobrazení verše
```text
[sanskrt_verse id="pys_1_1"]
```

### 2. Specifický skin a výběr vrstev
Například zobrazení Bhagavadgíty 2.47 se šafránovým skinem Ášram, bez fonetického přepisu a s komentáři:
```text
[sanskrt_verse id="bg_2_47" skin="ashram" show_devanagari="1" show_iast="1" show_cs_phonetic="0" show_translation="1" show_commentaries="1"]
```

### 3. Čtení celé sekvence veršů (Antologie / Reader)
```text
[sanskrt_reader ids="pys_1_1,pys_1_2,bg_2_47" skin="native"]
```

### 4. Vložení vlastního exportovaného JSON verše
Můžete vložit vlastní vygenerovaný verš přímo mezi značky:
```text
[sanskrt_verse skin="academic"]
{
  "id": "moje_mantra",
  "book": "Upaniṣad",
  "number": "1.1",
  "scripts": {
    "devanagari": "ॐ असतो मा सद्गमय।",
    "iast": "oṃ asato mā sadgamaya|"
  },
  "translations": [
    {
      "lang": "cs",
      "text": "Óm, veď mě od nepravdivého k pravdivému."
    }
  ]
}
[/sanskrt_verse]
```

---

## ⚙️ Parametry shortcodu `[sanskrt_verse]`

| Parametr | Výchozí hodnota | Možnosti | Popis |
| :--- | :--- | :--- | :--- |
| `id` | `pys_1_1` | `pys_1_1`, `pys_1_2`, `bg_2_47` | Identifikátor verše v kánonu |
| `skin` | `native` | `native`, `parchment`, `ashram`, `academic`, `dark` | Vzhledový motiv |
| `show_devanagari` | `1` | `1` / `0` | Zobrazit dévanágarí |
| `show_padaccheda` | `0` | `1` / `0` | Zobrazit slovní dělení sandhi |
| `show_iast` | `1` | `1` / `0` | Zobrazit IAST transliteraci |
| `show_cs_phonetic` | `0` | `1` / `0` | Zobrazit český fonetický přepis |
| `show_translation` | `1` | `1` / `0` | Zobrazit plynulý překlad |
| `show_literal` | `0` | `1` / `0` | Zobrazit doslovný rozbor slov |
| `show_meter` | `1` | `1` / `0` | Zobrazit odznak metra (čhandas) |
| `show_commentaries` | `1` | `1` / `0` | Zobrazit tradiční komentáře |
| `show_controls` | `1` | `1` / `0` | Zobrazit přepínací lištu vrstev pro čtenáře |
| `show_cross_highlight` | `1` | `1` / `0` | Zapnout obousměrné zvýrazňování slov |
| `trans_lang` | `cs` | `cs`, `en`, `all` | Filtrovat jazyk překladu |

---

## 📂 Struktura pluginu

```
wordpress-plugin/sanskrt-na-web/
├── assets/
│   ├── css/
│   │   ├── sanskrt-base.css      # Výchozí CSS plně respektující šablonu WP + layout
│   │   └── sanskrt-skins.css     # Stylové skiny (parchment, ashram, academic, dark)
│   └── js/
│       ├── sanskrt-frontend.js   # Klientský runtime: cross-highlighting, přepínání vrstev, modal
│       └── sanskrt-block.js      # Gutenberg blok s panely nastavení
├── includes/
│   ├── canon-data.php            # Kanonické verše, tokens, morfologie, komentáře
│   ├── class-sanskrt-renderer.php# Server-side HTML renderovací motor
│   ├── class-sanskrt-shortcode.php# Registrace a obsluha shortcodů
│   └── class-sanskrt-block.php   # Registrace Gutenberg bloku a editor skriptů
├── languages/                    # Překladové soubory (gettext POT)
├── readme.txt                    # Standardní WordPress.org readme
├── README.md                     # Tato podrobná dokumentace
└── sanskrt-na-web.php            # Hlavní vstupní soubor pluginu
```

---

## 🛠️ Instalace

1. Zkopírujte složku `wordpress-plugin/sanskrt-na-web` do `/wp-content/plugins/` vaší instalace WordPressu.
2. V administraci WordPress v menu **Pluginy** aktivujte plugin **Sanskrt na Web (Sanskrit Verse Reader)**.
3. Začněte vkládat bloky do příspěvků nebo stránek.
