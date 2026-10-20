<?php
/**
 * Canonical Sanskrit verses catalog for SanskrtNaWeb WordPress Plugin
 *
 * @package SanskrtNaWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns default canonical Sanskrit verses.
 *
 * @return array<string, array>
 */
function sanskrt_get_canonical_verses() {
	return array(
		'pys_1_1' => array(
			'id'           => 'pys_1_1',
			'number'       => '1.1',
			'book'         => 'Yogasūtra',
			'chapter'      => '1. Samādhipāda',
			'source'       => array(
				'title'    => 'Patañjali: Yogasūtra 1.1',
				'citation' => 'Samādhi-pāda 1.1',
				'url'      => 'https://gretil.sub.uni-goettingen.de/',
			),
			'scripts'      => array(
				'devanagari'             => 'अथ योगानुशासनम् ॥ १.१ ॥',
				'devanagari_padaccheda'  => 'अथ योग-अनुशासनम् ॥ १.१ ॥',
				'iast'                   => 'atha yogānuśāsanam || 1.1 ||',
				'iast_padaccheda'        => 'atha yoga-anuśāsanam || 1.1 ||',
				'cs_phonetic'            => 'atha jógánušásanam || 1.1 ||',
			),
			'meter'        => 'Sūtra (Próza)',
			'translations' => array(
				array(
					'id'    => 'tr_cs_fluent',
					'lang'  => 'cs',
					'type'  => 'fluent',
					'label' => 'Český překlad',
					'text'  => 'Nyní následuje výklad jógy.',
				),
				array(
					'id'    => 'tr_cs_literal',
					'lang'  => 'cs',
					'type'  => 'literal',
					'label' => 'Doslovný rozbor',
					'text'  => 'Nyní [započne] tradiční předání a ukáznění jógy.',
				),
				array(
					'id'    => 'tr_en_fluent',
					'lang'  => 'en',
					'type'  => 'fluent',
					'label' => 'English Translation',
					'text'  => 'Now, the authoritative exposition of Yoga begins.',
				),
			),
			'tokens'       => array(
				array(
					'id'         => 't_1_1_1',
					'text'       => array( 'devanagari' => 'अथ', 'iast' => 'atha' ),
					'lemma'      => 'atha',
					'grammar'    => array( 'pos' => 'indcl', 'label_cs' => 'neproměnné slůvko (zahájení díla)' ),
					'meaning_cs' => 'nyní, tehdy (iniciační slůvko označující začátek posvátného textu)',
					'meaning_en' => 'now, auspicious beginning',
					'alignment'  => array( 'cs' => array( 'Nyní', 'započne' ), 'en' => array( 'Now', 'begins' ) ),
				),
				array(
					'id'         => 't_1_1_2',
					'text'       => array( 'devanagari' => 'योग', 'iast' => 'yoga' ),
					'lemma'      => 'yoga',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'm', 'case' => 'comp', 'label_cs' => 'podst. jm., člen složeniny' ),
					'meaning_cs' => 'jóga, sjednocení, ztišení mysli',
					'meaning_en' => 'yoga, spiritual union, integration',
					'alignment'  => array( 'cs' => array( 'jógy' ), 'en' => array( 'Yoga' ) ),
				),
				array(
					'id'         => 't_1_1_3',
					'text'       => array( 'devanagari' => 'अनुशासनम्', 'iast' => 'anuśāsanam' ),
					'lemma'      => 'anuśāsana',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'n', 'case' => 'nom', 'number' => 'sg', 'label_cs' => 'stř. rod, 1. pád sg.' ),
					'meaning_cs' => 'instrukce, předání tradičního učení, ukáznění',
					'meaning_en' => 'authoritative instruction, exposition',
					'alignment'  => array( 'cs' => array( 'výklad', 'předání', 'ukáznění' ), 'en' => array( 'authoritative', 'exposition' ) ),
				),
			),
			'commentaries' => array(
				array(
					'id'                 => 'comm_vyasa_1_1',
					'author'             => 'Vyāsa',
					'tradition'          => 'Sāṅkhya-Yoga',
					'title'              => 'Yogabhāṣya',
					'lang'               => 'sa',
					'text'               => 'योगः समाधिः। स च सार्वभौमश्चित्तस्य धर्मः।',
					'source'             => 'Yogabhāṣya 1.1',
					'isOriginalSanskrit' => true,
				),
				array(
					'id'                 => 'comm_cs_1_1',
					'author'             => 'Poznámka k překladu',
					'tradition'          => 'Klasická jóga',
					'lang'               => 'cs',
					'text'               => 'Slovo „atha“ indikuje, že žák již prošel přípravnou očistnou fází a nyní je způsobilý k hlubšímu vhledu.',
					'isOriginalSanskrit' => false,
				),
			),
		),

		'pys_1_2' => array(
			'id'           => 'pys_1_2',
			'number'       => '1.2',
			'book'         => 'Yogasūtra',
			'chapter'      => '1. Samādhipāda',
			'source'       => array(
				'title'    => 'Patañjali: Yogasūtra 1.2',
				'citation' => 'Samādhi-pāda 1.2',
				'url'      => 'https://gretil.sub.uni-goettingen.de/',
			),
			'scripts'      => array(
				'devanagari'             => 'योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥',
				'devanagari_padaccheda'  => 'योगः चित्त-वृत्ति-निरोधः ॥ १.२ ॥',
				'iast'                   => 'yogaś citta-vṛtti-nirodhaḥ || 1.2 ||',
				'iast_padaccheda'        => 'yogaḥ citta-vṛtti-nirodhaḥ || 1.2 ||',
				'cs_phonetic'            => 'jógaš čitta-vrtti-niródhah || 1.2 ||',
			),
			'meter'        => 'Sūtra (Definiční)',
			'translations' => array(
				array(
					'id'    => 'tr_cs_fluent_1_2',
					'lang'  => 'cs',
					'type'  => 'fluent',
					'label' => 'Český překlad',
					'text'  => 'Jóga je zastavení víření mysli.',
				),
				array(
					'id'    => 'tr_cs_literal_1_2',
					'lang'  => 'cs',
					'type'  => 'literal',
					'label' => 'Doslovný rozbor',
					'text'  => 'Jóga [je] ovládnutí a utišení proměn vědomí.',
				),
				array(
					'id'    => 'tr_en_fluent_1_2',
					'lang'  => 'en',
					'type'  => 'fluent',
					'label' => 'English Translation',
					'text'  => 'Yoga is the cessation of the modifications of the mind.',
				),
			),
			'tokens'       => array(
				array(
					'id'         => 't_1_2_1',
					'text'       => array( 'devanagari' => 'योगः', 'iast' => 'yogaḥ' ),
					'lemma'      => 'yoga',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'm', 'case' => 'nom', 'number' => 'sg', 'label_cs' => 'muž. rod, 1. pád sg.' ),
					'meaning_cs' => 'jóga, ztišení',
					'meaning_en' => 'yoga, stilling',
					'alignment'  => array( 'cs' => array( 'Jóga' ), 'en' => array( 'Yoga' ) ),
				),
				array(
					'id'         => 't_1_2_2',
					'text'       => array( 'devanagari' => 'चित्त', 'iast' => 'citta' ),
					'lemma'      => 'citta',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'n', 'case' => 'comp', 'label_cs' => 'stř. rod, člen složeniny' ),
					'meaning_cs' => 'mysl, vědomí, psychika',
					'meaning_en' => 'mind, consciousness, chitta',
					'alignment'  => array( 'cs' => array( 'mysli', 'vědomí' ), 'en' => array( 'mind' ) ),
				),
				array(
					'id'         => 't_1_2_3',
					'text'       => array( 'devanagari' => 'वृत्ति', 'iast' => 'vṛtti' ),
					'lemma'      => 'vṛtti',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'f', 'case' => 'comp', 'label_cs' => 'žen. rod, člen složeniny' ),
					'meaning_cs' => 'víření, fluktuace, pohyb, proměny',
					'meaning_en' => 'modifications, fluctuations, whirlpools',
					'alignment'  => array( 'cs' => array( 'víření', 'proměn' ), 'en' => array( 'modifications' ) ),
				),
				array(
					'id'         => 't_1_2_4',
					'text'       => array( 'devanagari' => 'निरोधः', 'iast' => 'nirodhaḥ' ),
					'lemma'      => 'nirodha',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'm', 'case' => 'nom', 'number' => 'sg', 'label_cs' => 'muž. rod, 1. pád sg.' ),
					'meaning_cs' => 'zastavení, zklidnění, rozpouštění',
					'meaning_en' => 'cessation, restraint, quietening',
					'alignment'  => array( 'cs' => array( 'zastavení', 'ovládnutí', 'utišení' ), 'en' => array( 'cessation' ) ),
				),
			),
			'commentaries' => array(
				array(
					'id'                 => 'comm_vyasa_1_2',
					'author'             => 'Vyāsa',
					'tradition'          => 'Yogabhāṣya',
					'lang'               => 'sa',
					'text'               => 'चित्तं हि प्रख्याप्रवृत्तिस्थितिशीलत्वात् त्रिगुणम्। निरुद्धे चित्ते न सन्त्येव वृत्तयः।',
					'source'             => 'Yogabhāṣya 1.2',
					'isOriginalSanskrit' => true,
				),
				array(
					'id'                 => 'comm_vacaspati_1_2',
					'author'             => 'Vācaspati Miśra',
					'tradition'          => 'Tattvavaiśāradī',
					'lang'               => 'sa',
					'text'               => 'निरोधो नाम चित्तस्य एकाग्रतावस्थायां वृत्तीनां संस्कारमात्रशेषता।',
					'source'             => 'Tattvavaiśāradī 1.2',
					'isOriginalSanskrit' => true,
				),
				array(
					'id'                 => 'comm_cs_1_2',
					'author'             => 'Filologická poznámka',
					'tradition'          => 'Česká indologie',
					'lang'               => 'cs',
					'text'               => 'Nirodha neznamená násilné potlačení, ale přirozené navrácení mentálních vírů do klidového stavu (pratisamādhāna).',
					'isOriginalSanskrit' => false,
				),
			),
		),

		'bg_2_47' => array(
			'id'           => 'bg_2_47',
			'number'       => '2.47',
			'book'         => 'Bhagavadgītā',
			'chapter'      => '2. Sāṅkhyayoga',
			'source'       => array(
				'title'    => 'Mahābhārata / Bhagavadgītā 2.47',
				'citation' => 'Gītā 2.47',
				'url'      => 'https://gretil.sub.uni-goettingen.de/',
			),
			'scripts'      => array(
				'devanagari'             => "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ २.४७ ॥",
				'devanagari_padaccheda'  => "कर्मणि एव अधिकारः ते मा फलेषु कदाचन ।\nमा कर्म-फल-हेतुः भूः मा ते सङ्गः अस्तु अकर्मणि ॥ २.४७ ॥",
				'iast'                   => "karmaṇy evādhikāras te mā phaleṣu kadācana |\nmā karmaphalahetur bhūr mā te saṅgo 'stv akarmaṇi || 2.47 ||",
				'iast_padaccheda'        => "karmaṇi eva adhikāraḥ te mā phaleṣu kadācana |\nmā karma-phala-hetuḥ bhūḥ mā te saṅgaḥ astu akarmaṇi || 2.47 ||",
				'cs_phonetic'            => "karmanj évádhikáras té má phaléšu kadáčana |\nmá karma-phala-hétur bhúr má té sangó 'stv akarmani || 2.47 ||",
			),
			'meter'        => 'Anuṣṭubh (Śloka 4x8 slabik)',
			'translations' => array(
				array(
					'id'    => 'tr_cs_fluent_2_47',
					'lang'  => 'cs',
					'type'  => 'fluent',
					'label' => 'Český přebásněný překlad',
					'text'  => 'Máš právo pouze na čin, nikdy však na jeho plody. Nechť plody tvých činů nejsou tvou pohnutkou, a nechť nepropadneš nečinnosti.',
				),
				array(
					'id'    => 'tr_cs_literal_2_47',
					'lang'  => 'cs',
					'type'  => 'literal',
					'label' => 'Doslovný rozbor (Sargeant styl)',
					'text'  => 'V činu samotném je tvé právo, nikoli v plodech kdykoliv; nebuď příčinou plodů činů, aniž měj zalíbení v nečinnosti.',
				),
				array(
					'id'    => 'tr_en_fluent_2_47',
					'lang'  => 'en',
					'type'  => 'fluent',
					'label' => 'English Translation',
					'text'  => 'You have a right to action alone, never to its fruits. Let not the fruit of action be your motive, nor let your attachment be to inaction.',
				),
			),
			'tokens'       => array(
				array(
					'id'         => 't_2_47_1',
					'text'       => array( 'devanagari' => 'कर्मणि', 'iast' => 'karmaṇi' ),
					'lemma'      => 'karman',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'n', 'case' => 'loc', 'number' => 'sg', 'label_cs' => 'stř. rod, 7. pád (lokativ) sg.' ),
					'meaning_cs' => 'v činu, při konání práce',
					'meaning_en' => 'in action, in work',
					'alignment'  => array( 'cs' => array( 'čin', 'činu', 'činů' ), 'en' => array( 'action' ) ),
				),
				array(
					'id'         => 't_2_47_2',
					'text'       => array( 'devanagari' => 'एव', 'iast' => 'eva' ),
					'lemma'      => 'eva',
					'grammar'    => array( 'pos' => 'indcl', 'label_cs' => 'zdůrazňovací částice' ),
					'meaning_cs' => 'pouze, jenom, právě',
					'meaning_en' => 'only, indeed, alone',
					'alignment'  => array( 'cs' => array( 'pouze', 'samotném' ), 'en' => array( 'alone' ) ),
				),
				array(
					'id'         => 't_2_47_3',
					'text'       => array( 'devanagari' => 'अधिकारः', 'iast' => 'adhikāraḥ' ),
					'lemma'      => 'adhikāra',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'm', 'case' => 'nom', 'number' => 'sg', 'label_cs' => 'muž. rod, 1. pád sg.' ),
					'meaning_cs' => 'nárok, oprávnění, způsobilost, právo',
					'meaning_en' => 'right, authority, sphere of duty',
					'alignment'  => array( 'cs' => array( 'právo' ), 'en' => array( 'right' ) ),
				),
				array(
					'id'         => 't_2_47_4',
					'text'       => array( 'devanagari' => 'ते', 'iast' => 'te' ),
					'lemma'      => 'yuṣmad',
					'grammar'    => array( 'pos' => 'pron', 'case' => 'gen', 'number' => 'sg', 'label_cs' => 'zájmeno, 2./6. pád sg.' ),
					'meaning_cs' => 'tvůj, pro tebe',
					'meaning_en' => 'your, to you',
					'alignment'  => array( 'cs' => array( 'Máš', 'tvé' ), 'en' => array( 'You', 'your' ) ),
				),
				array(
					'id'         => 't_2_47_5',
					'text'       => array( 'devanagari' => 'मा', 'iast' => 'mā' ),
					'lemma'      => 'mā',
					'grammar'    => array( 'pos' => 'indcl', 'label_cs' => 'záporka pro zákaz a žádost' ),
					'meaning_cs' => 'nikoli, ne-, ať ne',
					'meaning_en' => 'not, let not',
					'alignment'  => array( 'cs' => array( 'nikdy', 'nechť', 'ne-' ), 'en' => array( 'never', 'not' ) ),
				),
				array(
					'id'         => 't_2_47_6',
					'text'       => array( 'devanagari' => 'फलेषु', 'iast' => 'phaleṣu' ),
					'lemma'      => 'phala',
					'grammar'    => array( 'pos' => 'noun', 'gender' => 'n', 'case' => 'loc', 'number' => 'pl', 'label_cs' => 'stř. rod, 7. pád (lokativ) pl.' ),
					'meaning_cs' => 'v plodech, na výsledcích činů',
					'meaning_en' => 'in fruits, on results',
					'alignment'  => array( 'cs' => array( 'plody', 'plodech' ), 'en' => array( 'fruits' ) ),
				),
				array(
					'id'         => 't_2_47_7',
					'text'       => array( 'devanagari' => 'कदाचन', 'iast' => 'kadācana' ),
					'lemma'      => 'kadācana',
					'grammar'    => array( 'pos' => 'indcl', 'label_cs' => 'časové příslovce' ),
					'meaning_cs' => 'kdykoli (se záporkou: nikdy)',
					'meaning_en' => 'at any time, ever',
					'alignment'  => array( 'cs' => array( 'však', 'kdykoliv' ), 'en' => array( 'ever' ) ),
				),
			),
			'commentaries' => array(
				array(
					'id'                 => 'comm_sankara_2_47',
					'author'             => 'Śaṅkarācārya',
					'tradition'          => 'Advaita Vedānta',
					'title'              => 'Śāṅkarabhāṣya',
					'lang'               => 'sa',
					'text'               => 'कर्मण्येव अधिकारः न ज्ञाननिष्ठायां ते। फलतृष्णा मा भूत्। फलहेतुश्चेत् कर्मणः स्याः ततो फलप्राप्तेर्हेतुः स्याः। तन्मा भूः।',
					'source'             => 'Gītābhāṣya 2.47',
					'isOriginalSanskrit' => true,
				),
				array(
					'id'                 => 'comm_ramanuja_2_47',
					'author'             => 'Rāmānujācārya',
					'tradition'          => 'Viśiṣṭādvaita',
					'title'              => 'Rāmānujabhāṣya',
					'lang'               => 'sa',
					'text'               => 'नित्याभ्यासयुक्तस्य कर्मयोग एव प्रथमम् अधिकृतस्य श्रेयस्करः। फलानि ममैव स्युरिति ममतां त्यक्त्वा भगवदाराधनबुद्ध्या कर्तव्यम्।',
					'source'             => 'Gītābhāṣya 2.47',
					'isOriginalSanskrit' => true,
				),
				array(
					'id'                 => 'comm_filipsky_2_47',
					'author'             => 'Jan Filipský & Jaroslav Vacek',
					'tradition'          => 'Česká indologie',
					'title'              => 'Poznámka k Bhagavadgítě',
					'lang'               => 'cs',
					'text'               => 'Klíčový verš koncepce niṣkāmakarmy – nezištného jednání osvobozeného od kalkulace zisku či ztráty. Vnitřní motivace nesmí vycházet z touhy po ovoci činu.',
					'source'             => 'Bhagavadgíta (Odeon, 1976), s. 182',
					'isOriginalSanskrit' => false,
				),
			),
		),
	);
}

/**
 * Returns a single canonical verse by its ID, or null if not found.
 *
 * @param string $id Verse ID.
 * @return array|null
 */
function sanskrt_get_verse_by_id( $id ) {
	$verses = sanskrt_get_canonical_verses();
	return isset( $verses[ $id ] ) ? $verses[ $id ] : null;
}

/**
 * Returns options list for admin select controls.
 *
 * @return array<array{value: string, label: string}>
 */
function sanskrt_get_verse_options() {
	$verses  = sanskrt_get_canonical_verses();
	$options = array();

	foreach ( $verses as $id => $verse ) {
		$label = sprintf(
			'%s %s - %s (%s)',
			isset( $verse['book'] ) ? $verse['book'] : '',
			isset( $verse['number'] ) ? $verse['number'] : '',
			isset( $verse['scripts']['iast'] ) ? mb_substr( $verse['scripts']['iast'], 0, 35 ) . '...' : $id,
			isset( $verse['meter'] ) ? $verse['meter'] : ''
		);
		$options[] = array(
			'value' => $id,
			'label' => trim( $label ),
		);
	}

	return $options;
}
