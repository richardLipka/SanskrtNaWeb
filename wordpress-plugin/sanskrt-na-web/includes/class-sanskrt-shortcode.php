<?php
/**
 * Shortcodes registration and handling for SanskrtNaWeb.
 *
 * @package SanskrtNaWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Sanskrt_Shortcode
 */
class Sanskrt_Shortcode {

	/**
	 * Register WordPress shortcodes.
	 */
	public static function init() {
		add_shortcode( 'sanskrt_verse', array( __CLASS__, 'handle_verse_shortcode' ) );
		add_shortcode( 'sanskrt_reader', array( __CLASS__, 'handle_reader_shortcode' ) );
	}

	/**
	 * Handle [sanskrt_verse] shortcode.
	 *
	 * Examples:
	 * [sanskrt_verse id="pys_1_1"]
	 * [sanskrt_verse id="bg_2_47" skin="parchment" show_commentaries="0"]
	 * [sanskrt_verse skin="academic"]{"id":"custom", ...}[/sanskrt_verse]
	 *
	 * @param array|string $atts    Shortcode attributes.
	 * @param string|null  $content Optional inner content (e.g. custom JSON).
	 * @return string Rendered HTML.
	 */
	public static function handle_verse_shortcode( $atts, $content = null ) {
		return Sanskrt_Renderer::render( $atts, $content );
	}

	/**
	 * Handle [sanskrt_reader] shortcode for rendering multiple verses in a reading sequence.
	 *
	 * Example:
	 * [sanskrt_reader ids="pys_1_1,pys_1_2" skin="native"]
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string Rendered HTML.
	 */
	public static function handle_reader_shortcode( $atts ) {
		$parsed_atts = is_array( $atts ) ? $atts : array();
		$ids_raw     = isset( $parsed_atts['ids'] ) ? $parsed_atts['ids'] : '';
		$ids         = array_filter( array_map( 'trim', explode( ',', $ids_raw ) ) );

		if ( empty( $ids ) ) {
			// If no IDs given, render all canonical verses.
			$canon = sanskrt_get_canonical_verses();
			$ids   = array_keys( $canon );
		}

		$output = '<div class="sanskrt-reader-wrapper">';
		foreach ( $ids as $verse_id ) {
			$verse_atts       = $parsed_atts;
			$verse_atts['id'] = $verse_id;
			$output          .= Sanskrt_Renderer::render( $verse_atts );
		}
		$output .= '</div>';

		return $output;
	}
}
