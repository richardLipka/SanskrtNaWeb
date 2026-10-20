<?php
/**
 * Plugin Name: Sanskrt na Web (Sanskrit Verse Reader)
 * Plugin URI:  https://github.com/richardLipka/SanskrtNaWeb
 * Description: Vkládání připravených bloků sanskrtských textů a veršů do stránek a příspěvků. Umožňuje přesné nastavení viditelných vrstev (Dévanágarí, IAST přepis, slovní rozbor Padaccheda, překlad, čhandas, komentáře). V základu plně respektuje aktivní šablonu WordPressu a obsahuje volitelné vizuální skiny.
 * Version:     1.0.0
 * Author:      Richard Lipka
 * Author URI:  https://github.com/richardLipka
 * License:     MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: sanskrt-na-web
 * Domain Path: /languages
 *
 * @package SanskrtNaWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SANSKRT_VERSION', '1.0.0' );
define( 'SANSKRT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SANSKRT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Load includes.
require_once SANSKRT_PLUGIN_DIR . 'includes/canon-data.php';
require_once SANSKRT_PLUGIN_DIR . 'includes/class-sanskrt-renderer.php';
require_once SANSKRT_PLUGIN_DIR . 'includes/class-sanskrt-shortcode.php';
require_once SANSKRT_PLUGIN_DIR . 'includes/class-sanskrt-block.php';

/**
 * Register frontend and editor styles and scripts.
 */
function sanskrt_register_assets() {
	// Base CSS - respects active WP theme, handles layout, typography variables, cross-highlighting.
	wp_register_style(
		'sanskrt-base',
		SANSKRT_PLUGIN_URL . 'assets/css/sanskrt-base.css',
		array(),
		SANSKRT_VERSION
	);

	// Skins CSS - optional visual skins (parchment, ashram, academic, dark).
	wp_register_style(
		'sanskrt-skins',
		SANSKRT_PLUGIN_URL . 'assets/css/sanskrt-skins.css',
		array( 'sanskrt-base' ),
		SANSKRT_VERSION
	);

	// Frontend script - interactive cross-highlighting, layer pill toggles, and word popup modal.
	wp_register_script(
		'sanskrt-frontend',
		SANSKRT_PLUGIN_URL . 'assets/js/sanskrt-frontend.js',
		array(),
		SANSKRT_VERSION,
		true
	);

	// Localize strings for frontend popup.
	wp_localize_script(
		'sanskrt-frontend',
		'sanskrtL10n',
		array(
			'modalTitle'        => __( 'Morfologický a lexikální rozbor slova', 'sanskrt-na-web' ),
			'lemma'             => __( 'Základní tvar (Lemma):', 'sanskrt-na-web' ),
			'grammar'           => __( 'Gramatická kategorie:', 'sanskrt-na-web' ),
			'meaningCs'         => __( 'Český význam:', 'sanskrt-na-web' ),
			'meaningEn'         => __( 'Anglický význam:', 'sanskrt-na-web' ),
			'close'             => __( 'Zavřít (Esc)', 'sanskrt-na-web' ),
			'showLayer'         => __( 'Zobrazit vrstvu %s', 'sanskrt-na-web' ),
			'hideLayer'         => __( 'Skrýt vrstvu %s', 'sanskrt-na-web' ),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'sanskrt_register_assets' );
add_action( 'admin_enqueue_scripts', 'sanskrt_register_assets' );

/**
 * Initialize components.
 */
function sanskrt_init_plugin() {
	// Initialize shortcodes.
	Sanskrt_Shortcode::init();

	// Initialize Gutenberg block.
	Sanskrt_Block::init();
}
add_action( 'init', 'sanskrt_init_plugin' );

/**
 * Add link to plugin settings / GitHub repo on plugins page.
 *
 * @param array $links Plugin action links.
 * @return array
 */
function sanskrt_plugin_action_links( $links ) {
	$custom_links = array(
		'<a href="https://github.com/richardLipka/SanskrtNaWeb" target="_blank" rel="noopener noreferrer">' . __( 'Dokumentace', 'sanskrt-na-web' ) . '</a>',
	);
	return array_merge( $custom_links, $links );
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'sanskrt_plugin_action_links' );
