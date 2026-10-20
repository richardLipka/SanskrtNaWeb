=== Sanskrt na Web (Sanskrit Verse Reader) ===
Contributors: richardlipka
Tags: sanskrit, sanskrt, devanagari, iast, yoga, bhagavadgita, reader, indology
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Vkládání připravených bloků sanskrtských textů a veršů do stránek. Respektuje aktivní šablonu WordPressu a nabízí volitelné vrstvy a skiny.

== Description ==

**Sanskrt na Web** je lehký, elegantní WordPress plugin určený pro vkládání a zobrazení sanskrtských veršů, manter a filosofických textů (např. *Patañjaliho Yogasūtra*, *Bhagavadgītā*) do příspěvků a stránek.

Plugin je navržen výhradně pro **čtení a prezentaci (bez editačních funkcí na front-endu)**. Umožňuje přesnou konfiguraci toho, co má návštěvník vidět, a v základu **maximálně respektuje typografii, barvy a styl vaší aktivní šablony WordPressu**.

### Klíčové vlastnosti:

* **Plná integrace s WordPress šablonou (Skin: Native):** Výchozí vzhled automaticky přejímá písmo, velikost textu, barvy a mezery z vašeho tématu bez narušení jednotného vzhledu webu.
* **Podpora vrstev s detailním nastavením viditelnosti:**
  - Dévanágarí (tradiční indické písmo s optimalizovanými ligaturami)
  - Padaccheda (slovní rozdělení sandhiových spojení)
  - IAST (mezinárodní vědecká transliterace)
  - Český fonetický přepis (usnadnění pro české čtenáře)
  - Hlavní překlad (plynulý český nebo anglický)
  - Doslovný překlad / gramatický rozbor
  - Metrum a forma (Čhandas: např. Anuṣṭubh, Triṣṭubh, Sūtra)
  - Tradiční komentáře (Bhāṣya: Vyāsa, Śaṅkara, Rāmānuja a další)
* **Křížové zvýrazňování (Cross-highlighting):** Najetím myší na sanskrtské slovo se automaticky podbarví odpovídající slovo v transliteraci i v překladu.
* **Interaktivní morfologický popup:** Po kliknutí na sanskrtské slovo se otevře přehledné okno s kořenem (lemmatem), gramatickým pádem, číslem a významem.
* **Přepínací lišta vrstev pro čtenáře:** Možnost nechat návštěvníka dynamicky zapínat a vypínat jednotlivé vrstvy pomocí tlačítek přímo v těle článku.
* **Gutenberg blok + Shortcodes:** Plná podpora moderního blokového editoru i klasických zkrácených kódů (`[sanskrt_verse]` a `[sanskrt_reader]`).
* **Stylové skiny (volitelné):**
  - *Native* (výchozí — 100% čisté respektování aktivního WP tématu)
  - *Pergamen / Svitek* (teplé krémové odstíny, tradiční sepia)
  - *Ášram* (šafránový a okrový rámec, duchovní atmosféra)
  - *Akademický* (čisté patkové písmo, styl kritického indologického vydání)
  - *Tmavý védský* (zlatavé písmo na tmavě břidlicovém pozadí)

== Installation ==

1. Stáhněte zip archiv nebo nahrajte složku `sanskrt-na-web` do adresáře `/wp-content/plugins/`.
2. V administraci WordPressu přejděte do sekce **Pluginy** a aktivujte **Sanskrt na Web**.
3. V editoru Gutenberg vložte blok **Sanskrtský verš (SanskrtNaWeb)**, nebo použijte shortcode.

== Shortcode Usage ==

### Základní vložení verše:
`[sanskrt_verse id="pys_1_1"]`

### Vložení s vlastním skinem a nastavením vrstev:
`[sanskrt_verse id="bg_2_47" skin="ashram" show_devanagari="1" show_iast="1" show_translation="1" show_commentaries="1"]`

### Čtení více veršů za sebou (Antologie):
`[sanskrt_reader ids="pys_1_1,pys_1_2,bg_2_47" skin="native"]`

== Frequently Asked Questions ==

= Umožňuje plugin návštěvníkům měnit texty? =
Ne. Plugin je navržen čistě jako čtecí komponenta (Reader/Viewer). Texty jsou zabezpečené a neměnné.

= Bude zobrazení odpovídat mému fontu na webu? =
Ano! Při volbě skinu "Native" plugin dědí veškeré rodiny písem, barvy a řádkování z vaší šablony. Pouze pro Dévanágarí písmo je zajištěna fallback sada fontů (Tiro Devanagari Sanskrit, Noto Serif Devanagari), aby se správně vykreslovaly ligatury a spřežky.

== Changelog ==

= 1.0.0 =
* První verze pluginu.
* Gutenberg blok `sanskrt/verse-viewer` s postranní lištou nastavení.
* Shortcode `[sanskrt_verse]` a `[sanskrt_reader]`.
* 5 vizuálních skinů (Native, Pergamen, Ášram, Akademický, Tmavý).
* Obousměrný cross-highlighting a morfologický popup.
