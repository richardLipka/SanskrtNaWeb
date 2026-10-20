<?php
/**
 * Gutenberg Block Registration for SanskrtNaWeb.
 *
 * @package SanskrtNaWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Sanskrt_Block
 */
class Sanskrt_Block {

	/**
	 * Register Gutenberg block.
	 */
	public static function init() {
		// init() itself runs on the 'init' hook. A callback added to a hook while that hook
		// is executing at the same priority is not called any more, so register directly.
		if ( did_action( 'init' ) ) {
			self::register_block();
		} else {
			add_action( 'init', array( __CLASS__, 'register_block' ) );
		}
	}

	/**
	 * Register the sanskrt/verse-viewer block.
	 */
	public static function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		// Register block editor script.
		wp_register_script(
			'sanskrt-block-editor',
			SANSKRT_PLUGIN_URL . 'assets/js/sanskrt-block.js',
			array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n' ),
			SANSKRT_VERSION,
			true
		);

		// Pass canonical verses metadata to Gutenberg editor.
		wp_localize_script(
			'sanskrt-block-editor',
			'sanskrtBlockData',
			array(
				'options' => sanskrt_get_verse_options(),
				'verses'  => sanskrt_get_canonical_verses(),
				'i18n'    => array(
					'title'              => __( 'Sanskrtský verš (SanskrtNaWeb)', 'sanskrt-na-web' ),
					'description'        => __( 'Vložení sanskrtského verše s volitelnými vrstvami a respektováním šablony webu.', 'sanskrt-na-web' ),
					'selectVerse'        => __( 'Vybrat připravený verš z kánonu:', 'sanskrt-na-web' ),
					'skinSettings'       => __( 'Nastavení vzhledu (Skin)', 'sanskrt-na-web' ),
					'skinLabel'          => __( 'Styl a barevné schéma:', 'sanskrt-na-web' ),
					'skinNative'         => __( 'Šablona webu (Výchozí - plně respektuje WP téma)', 'sanskrt-na-web' ),
					'skinParchment'      => __( 'Pergamen / Svitek (Tradiční teplé tóny)', 'sanskrt-na-web' ),
					'skinAshram'         => __( 'Ášram (Šafránové a okrové odstíny)', 'sanskrt-na-web' ),
					'skinAcademic'       => __( 'Akademický (Kritické indologické vydání)', 'sanskrt-na-web' ),
					'skinDark'           => __( 'Tmavý védský (Zlato na tmavém břidlicovém podkladu)', 'sanskrt-na-web' ),
					'layerSettings'      => __( 'Viditelnost vrstev', 'sanskrt-na-web' ),
					'showDevanagari'     => __( 'Dévanágarí písmo', 'sanskrt-na-web' ),
					'showPadaccheda'     => __( 'Padaccheda (slovní rozbor)', 'sanskrt-na-web' ),
					'showIast'           => __( 'IAST transliterace', 'sanskrt-na-web' ),
					'showCsPhonetic'     => __( 'Český fonetický přepis', 'sanskrt-na-web' ),
					'showTranslation'    => __( 'Hlavní překlad (plynulý)', 'sanskrt-na-web' ),
					'showLiteral'        => __( 'Doslovný překlad / rozbor', 'sanskrt-na-web' ),
					'showMeter'          => __( 'Metrum a forma (Čhandas)', 'sanskrt-na-web' ),
					'showCommentaries'   => __( 'Tradiční komentáře (Bhāṣya)', 'sanskrt-na-web' ),
					'showControls'       => __( 'Přepínací lišta vrstev pro čtenáře', 'sanskrt-na-web' ),
					'showCrossHighlight' => __( 'Křížové zvýrazňování slov při najetí myší', 'sanskrt-na-web' ),
					'advancedSettings'   => __( 'Vlastní data a jazyk', 'sanskrt-na-web' ),
					'transLang'          => __( 'Jazyk překladu:', 'sanskrt-na-web' ),
					'customJsonLabel'    => __( 'Vlastní JSON data verše (přepíše výběr kánonu):', 'sanskrt-na-web' ),
				),
			)
		);

		register_block_type(
			'sanskrt/verse-viewer',
			array(
				'api_version'     => 2,
				'editor_script'   => 'sanskrt-block-editor',
				'editor_style'    => 'sanskrt-base',
				'style'           => array( 'sanskrt-base', 'sanskrt-skins' ),
				'script'          => 'sanskrt-frontend',
				'render_callback' => array( __CLASS__, 'render_block' ),
				'attributes'      => array(
					'id'                 => array(
						'type'    => 'string',
						'default' => 'pys_1_1',
					),
					'skin'               => array(
						'type'    => 'string',
						'default' => 'native',
					),
					'showDevanagari'     => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showPadaccheda'     => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'showIast'           => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showCsPhonetic'     => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'showTranslation'    => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showLiteral'        => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'showMeter'          => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showCommentaries'   => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showControls'       => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'showCrossHighlight' => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'transLang'          => array(
						'type'    => 'string',
						'default' => 'cs',
					),
					'commentaryFilter'   => array(
						'type'    => 'string',
						'default' => 'all',
					),
					'customJson'         => array(
						'type'    => 'string',
						'default' => '',
					),
					'className'          => array(
						'type'    => 'string',
						'default' => '',
					),
				),
			)
		);
	}

	/**
	 * Gutenberg dynamic block render callback.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Block inner content.
	 * @return string Rendered HTML.
	 */
	public static function render_block( $attributes, $content = '' ) {
		// Map camelCase Gutenberg attributes to snake_case for the renderer.
		$renderer_attrs = array(
			'id'                   => isset( $attributes['id'] ) ? $attributes['id'] : 'pys_1_1',
			'skin'                 => isset( $attributes['skin'] ) ? $attributes['skin'] : 'native',
			'show_devanagari'      => isset( $attributes['showDevanagari'] ) ? $attributes['showDevanagari'] : true,
			'show_padaccheda'      => isset( $attributes['showPadaccheda'] ) ? $attributes['showPadaccheda'] : false,
			'show_iast'            => isset( $attributes['showIast'] ) ? $attributes['showIast'] : true,
			'show_cs_phonetic'     => isset( $attributes['showCsPhonetic'] ) ? $attributes['showCsPhonetic'] : false,
			'show_translation'     => isset( $attributes['showTranslation'] ) ? $attributes['showTranslation'] : true,
			'show_literal'         => isset( $attributes['showLiteral'] ) ? $attributes['showLiteral'] : false,
			'show_meter'           => isset( $attributes['showMeter'] ) ? $attributes['showMeter'] : true,
			'show_commentaries'    => isset( $attributes['showCommentaries'] ) ? $attributes['showCommentaries'] : true,
			'show_controls'        => isset( $attributes['showControls'] ) ? $attributes['showControls'] : true,
			'show_cross_highlight' => isset( $attributes['showCrossHighlight'] ) ? $attributes['showCrossHighlight'] : true,
			'trans_lang'           => isset( $attributes['transLang'] ) ? $attributes['transLang'] : 'cs',
			'commentary_filter'    => isset( $attributes['commentaryFilter'] ) ? $attributes['commentaryFilter'] : 'all',
			'custom_json'          => isset( $attributes['customJson'] ) ? $attributes['customJson'] : '',
			'class_name'           => isset( $attributes['className'] ) ? $attributes['className'] : '',
		);

		return Sanskrt_Renderer::render( $renderer_attrs, $content );
	}
}
