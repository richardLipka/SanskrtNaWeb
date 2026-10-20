<?php
/**
 * HTML Renderer for SanskrtNaWeb WordPress Plugin
 *
 * @package SanskrtNaWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Sanskrt_Renderer
 * Responsible for rendering semantic, accessible, theme-respecting Sanskrit verse blocks.
 */
class Sanskrt_Renderer {

	/**
	 * Default render attributes.
	 *
	 * @var array<string, mixed>
	 */
	/**
	 * Counter making container ids unique when a verse is embedded more than once per page.
	 *
	 * @var int
	 */
	protected static $instance_counter = 0;

	protected static $default_attributes = array(
		'id'                  => 'pys_1_1',
		'custom_json'         => '',
		'skin'                => 'native',
		'show_devanagari'     => true,
		'show_padaccheda'     => false,
		'show_iast'           => true,
		'show_cs_phonetic'    => false,
		'show_translation'    => true,
		'show_literal'        => false,
		'show_meter'          => true,
		'show_commentaries'   => true,
		'show_controls'       => true,
		'show_cross_highlight'=> true,
		'trans_lang'          => 'cs',
		'commentary_filter'   => 'all',
		'class_name'          => '',
	);

	/**
	 * Normalize attributes from shortcodes or Gutenberg blocks.
	 *
	 * @param array $raw_attrs Input attributes.
	 * @return array
	 */
	public static function normalize_attributes( $raw_attrs ) {
		$attrs = wp_parse_args( (array) $raw_attrs, self::$default_attributes );

		$boolean_keys = array(
			'show_devanagari',
			'show_padaccheda',
			'show_iast',
			'show_cs_phonetic',
			'show_translation',
			'show_literal',
			'show_meter',
			'show_commentaries',
			'show_controls',
			'show_cross_highlight',
		);

		foreach ( $boolean_keys as $key ) {
			if ( isset( $attrs[ $key ] ) ) {
				$val = $attrs[ $key ];
				if ( is_string( $val ) ) {
					$attrs[ $key ] = ! in_array( strtolower( trim( $val ) ), array( 'false', '0', 'no', 'off', '' ), true );
				} else {
					$attrs[ $key ] = (bool) $val;
				}
			}
		}

		$allowed_skins = array( 'native', 'parchment', 'ashram', 'academic', 'dark' );
		if ( ! in_array( $attrs['skin'], $allowed_skins, true ) ) {
			$attrs['skin'] = 'native';
		}

		return $attrs;
	}

	/**
	 * Render a verse block.
	 *
	 * @param array       $raw_attrs Attributes.
	 * @param string|null $content   Optional nested content (e.g. custom JSON).
	 * @return string Rendered HTML.
	 */
	public static function render( $raw_attrs = array(), $content = null ) {
		$attrs = self::normalize_attributes( $raw_attrs );

		// Resolve verse data.
		$verse = null;

		// 1. Check if custom JSON was provided.
		$custom_json = ! empty( $attrs['custom_json'] ) ? $attrs['custom_json'] : $content;
		if ( ! empty( $custom_json ) ) {
			$decoded = self::decode_custom_json( $custom_json );
			if ( is_array( $decoded ) && ( isset( $decoded['scripts'] ) || isset( $decoded['id'] ) ) ) {
				$verse = $decoded;
			}
		}

		// 2. Fall back to canonical verse lookup.
		if ( ! $verse && ! empty( $attrs['id'] ) ) {
			$verse = sanskrt_get_verse_by_id( sanitize_text_field( $attrs['id'] ) );
		}

		// 3. Fallback default verse if still not resolved.
		if ( ! $verse ) {
			$verse = sanskrt_get_verse_by_id( 'pys_1_1' );
		}

		if ( ! $verse ) {
			return '<!-- SanskrtNaWeb: Žádný verš nebyl nalezen. -->';
		}

		$verse = self::normalize_verse( $verse );

		// Enqueue assets if not already enqueued.
		wp_enqueue_style( 'sanskrt-base' );
		wp_enqueue_style( 'sanskrt-skins' );
		wp_enqueue_script( 'sanskrt-frontend' );

		return self::render_verse_html( $verse, $attrs );
	}

	/**
	 * Render semantic HTML for a single verse.
	 *
	 * @param array $verse Verse data structure.
	 * @param array $attrs Normalized attributes.
	 * @return string
	 */
	protected static function render_verse_html( $verse, $attrs ) {
		$verse_id       = isset( $verse['id'] ) ? (string) $verse['id'] : 'verse_' . wp_rand();
		$dom_id         = 'sanskrt-' . sanitize_html_class( $verse_id, 'verse' ) . '-' . ( ++self::$instance_counter );
		$skin_class     = 'skin-' . esc_attr( $attrs['skin'] );
		$custom_class   = ! empty( $attrs['class_name'] ) ? ' ' . esc_attr( $attrs['class_name'] ) : '';
		$highlight_attr = $attrs['show_cross_highlight'] ? 'true' : 'false';

		ob_start();
		?>
		<div class="sanskrt-verse-container <?php echo esc_attr( $skin_class . $custom_class ); ?>"
			id="<?php echo esc_attr( $dom_id ); ?>"
			data-verse-id="<?php echo esc_attr( $verse_id ); ?>"
			data-cross-highlight="<?php echo esc_attr( $highlight_attr ); ?>"
			role="region"
			aria-label="<?php echo esc_attr( sprintf( __( 'Sanskrit text: %1$s %2$s', 'sanskrt-na-web' ), isset( $verse['book'] ) ? $verse['book'] : '', isset( $verse['number'] ) ? $verse['number'] : '' ) ); ?>">

			<?php
			// 1. Header (Book, Number, Meter, Source).
			self::render_header( $verse, $attrs );

			// 2. Interactive layer visibility toggle controls (if enabled).
			if ( $attrs['show_controls'] ) {
				self::render_controls_bar( $attrs );
			}
			?>

			<div class="sanskrt-layers-body">
				<?php
				// 3. Devanagari Layer.
				if ( ! empty( $verse['scripts']['devanagari'] ) ) {
					self::render_devanagari_layer( $verse, $attrs );
				}

				// 4. Padaccheda Layer (Word-by-word division).
				if ( ! empty( $verse['scripts']['devanagari_padaccheda'] ) || ! empty( $verse['scripts']['iast_padaccheda'] ) ) {
					self::render_padaccheda_layer( $verse, $attrs );
				}

				// 5. IAST Layer.
				if ( ! empty( $verse['scripts']['iast'] ) ) {
					self::render_iast_layer( $verse, $attrs );
				}

				// 6. Czech Phonetic Layer.
				if ( ! empty( $verse['scripts']['cs_phonetic'] ) ) {
					self::render_cs_phonetic_layer( $verse, $attrs );
				}

				// 7. Translations Layer.
				if ( ! empty( $verse['translations'] ) ) {
					self::render_translations_layer( $verse, $attrs );
				}

				// 8. Commentaries Layer.
				if ( ! empty( $verse['commentaries'] ) ) {
					self::render_commentaries_layer( $verse, $attrs );
				}
				?>
			</div>

			<?php
			// 9. Vocabulary / Token Morphology Data payload for client-side popups.
			self::render_tokens_json( $verse );
			?>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render verse header metadata.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_header( $verse, $attrs ) {
		$has_book    = ! empty( $verse['book'] );
		$has_number  = ! empty( $verse['number'] );
		$has_meter   = $attrs['show_meter'] && ! empty( $verse['meter'] );
		$has_source  = ! empty( $verse['source']['title'] );

		if ( ! $has_book && ! $has_number && ! $has_meter && ! $has_source ) {
			return;
		}
		?>
		<header class="sanskrt-verse-header">
			<div class="sanskrt-verse-identity">
				<?php if ( $has_book || $has_number ) : ?>
					<h3 class="sanskrt-verse-title">
						<?php if ( $has_book ) : ?>
							<span class="sanskrt-book-name"><?php echo esc_html( $verse['book'] ); ?></span>
						<?php endif; ?>
						<?php if ( $has_number ) : ?>
							<span class="sanskrt-verse-num"><?php echo esc_html( $verse['number'] ); ?></span>
						<?php endif; ?>
					</h3>
				<?php endif; ?>

				<?php if ( ! empty( $verse['chapter'] ) ) : ?>
					<span class="sanskrt-chapter-name"><?php echo esc_html( $verse['chapter'] ); ?></span>
				<?php endif; ?>
			</div>

			<div class="sanskrt-verse-meta">
				<?php if ( $has_meter ) : ?>
					<span class="sanskrt-badge sanskrt-badge-meter" title="<?php esc_attr_e( 'Metrická forma verše / styl textu', 'sanskrt-na-web' ); ?>">
						<svg class="sanskrt-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M4 6h16M4 18h8"/></svg>
						<?php echo esc_html( $verse['meter'] ); ?>
					</span>
				<?php endif; ?>

				<?php if ( $has_source ) : ?>
					<?php if ( ! empty( $verse['source']['url'] ) ) : ?>
						<a href="<?php echo esc_url( $verse['source']['url'] ); ?>" class="sanskrt-badge sanskrt-badge-source" target="_blank" rel="noopener noreferrer">
							<?php echo esc_html( $verse['source']['title'] ); ?>
						</a>
					<?php else : ?>
						<span class="sanskrt-badge sanskrt-badge-source">
							<?php echo esc_html( $verse['source']['title'] ); ?>
						</span>
					<?php endif; ?>
				<?php endif; ?>
			</div>
		</header>
		<?php
	}

	/**
	 * Render visitor interactive layer toggle bar.
	 *
	 * @param array $attrs Attributes.
	 */
	protected static function render_controls_bar( $attrs ) {
		?>
		<div class="sanskrt-controls-bar" aria-label="<?php esc_attr_e( 'Přepínače viditelnosti vrstev', 'sanskrt-na-web' ); ?>">
			<span class="sanskrt-controls-label"><?php esc_html_e( 'Vrstvy:', 'sanskrt-na-web' ); ?></span>
			<div class="sanskrt-pill-group">
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_devanagari'] ? 'is-active' : ''; ?>" data-target-layer="devanagari" aria-pressed="<?php echo $attrs['show_devanagari'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Dévanágarí', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_padaccheda'] ? 'is-active' : ''; ?>" data-target-layer="padaccheda" aria-pressed="<?php echo $attrs['show_padaccheda'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Padaccheda', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_iast'] ? 'is-active' : ''; ?>" data-target-layer="iast" aria-pressed="<?php echo $attrs['show_iast'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'IAST', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_cs_phonetic'] ? 'is-active' : ''; ?>" data-target-layer="cs-phonetic" aria-pressed="<?php echo $attrs['show_cs_phonetic'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Český přepis', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_translation'] ? 'is-active' : ''; ?>" data-target-layer="translation" aria-pressed="<?php echo $attrs['show_translation'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Překlad', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_literal'] ? 'is-active' : ''; ?>" data-target-layer="literal" aria-pressed="<?php echo $attrs['show_literal'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Doslovný rozbor', 'sanskrt-na-web' ); ?>
				</button>
				<button type="button" class="sanskrt-pill-toggle <?php echo $attrs['show_commentaries'] ? 'is-active' : ''; ?>" data-target-layer="commentaries" aria-pressed="<?php echo $attrs['show_commentaries'] ? 'true' : 'false'; ?>">
					<?php esc_html_e( 'Komentáře', 'sanskrt-na-web' ); ?>
				</button>
			</div>
		</div>
		<?php
	}

	/**
	 * Render Devanagari layer with interactive token spans.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_devanagari_layer( $verse, $attrs ) {
		$style_hidden = ! $attrs['show_devanagari'] ? 'display: none;' : '';
		$tokens       = isset( $verse['tokens'] ) ? $verse['tokens'] : array();
		?>
		<div class="sanskrt-layer sanskrt-layer-devanagari" data-layer-name="devanagari" style="<?php echo esc_attr( $style_hidden ); ?>" lang="sa" dir="ltr">
			<div class="sanskrt-script-text sanskrt-font-devanagari">
				<?php
				if ( ! empty( $tokens ) ) {
					self::render_tokenized_script( $verse['scripts']['devanagari'], $tokens, 'devanagari' );
				} else {
					echo esc_html( $verse['scripts']['devanagari'] );
				}
				?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render Padaccheda (word breakdown) layer.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_padaccheda_layer( $verse, $attrs ) {
		$style_hidden = ! $attrs['show_padaccheda'] ? 'display: none;' : '';
		$deva_pada    = isset( $verse['scripts']['devanagari_padaccheda'] ) ? $verse['scripts']['devanagari_padaccheda'] : '';
		$iast_pada    = isset( $verse['scripts']['iast_padaccheda'] ) ? $verse['scripts']['iast_padaccheda'] : '';
		?>
		<div class="sanskrt-layer sanskrt-layer-padaccheda" data-layer-name="padaccheda" style="<?php echo esc_attr( $style_hidden ); ?>">
			<div class="sanskrt-layer-header">
				<span class="sanskrt-layer-label"><?php esc_html_e( 'Padaccheda (slovní rozdělení):', 'sanskrt-na-web' ); ?></span>
			</div>
			<?php if ( ! empty( $deva_pada ) ) : ?>
				<div class="sanskrt-pada-line sanskrt-font-devanagari" lang="sa"><?php echo esc_html( $deva_pada ); ?></div>
			<?php endif; ?>
			<?php if ( ! empty( $iast_pada ) ) : ?>
				<div class="sanskrt-pada-line sanskrt-font-iast" lang="sa-Latn"><?php echo esc_html( $iast_pada ); ?></div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Render IAST transliteration layer.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_iast_layer( $verse, $attrs ) {
		$style_hidden = ! $attrs['show_iast'] ? 'display: none;' : '';
		$tokens       = isset( $verse['tokens'] ) ? $verse['tokens'] : array();
		?>
		<div class="sanskrt-layer sanskrt-layer-iast" data-layer-name="iast" style="<?php echo esc_attr( $style_hidden ); ?>" lang="sa-Latn">
			<div class="sanskrt-script-text sanskrt-font-iast">
				<?php
				if ( ! empty( $tokens ) ) {
					self::render_tokenized_script( $verse['scripts']['iast'], $tokens, 'iast' );
				} else {
					echo esc_html( $verse['scripts']['iast'] );
				}
				?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render Czech phonetic transcription layer.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_cs_phonetic_layer( $verse, $attrs ) {
		$style_hidden = ! $attrs['show_cs_phonetic'] ? 'display: none;' : '';
		?>
		<div class="sanskrt-layer sanskrt-layer-cs-phonetic" data-layer-name="cs-phonetic" style="<?php echo esc_attr( $style_hidden ); ?>" lang="cs">
			<div class="sanskrt-layer-header">
				<span class="sanskrt-layer-label"><?php esc_html_e( 'Český fonetický přepis:', 'sanskrt-na-web' ); ?></span>
			</div>
			<div class="sanskrt-script-text sanskrt-font-phonetic">
				<?php echo esc_html( $verse['scripts']['cs_phonetic'] ); ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render translation layer (fluent and literal).
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_translations_layer( $verse, $attrs ) {
		$show_fluent  = $attrs['show_translation'];
		$show_literal = $attrs['show_literal'];

		// Filter translations by requested language.
		$filtered_translations = array();
		$lang_filter           = $attrs['trans_lang'];

		foreach ( $verse['translations'] as $tr ) {
			if ( 'all' === $lang_filter || ! isset( $tr['lang'] ) || $tr['lang'] === $lang_filter ) {
				$filtered_translations[] = $tr;
			}
		}

		if ( empty( $filtered_translations ) ) {
			$filtered_translations = $verse['translations'];
		}

		$tokens = isset( $verse['tokens'] ) ? $verse['tokens'] : array();
		?>
		<div class="sanskrt-layer sanskrt-layer-translation-group">
			<?php
			foreach ( $filtered_translations as $tr ) :
				$is_literal = ( isset( $tr['type'] ) && 'literal' === $tr['type'] );
				$is_visible = $is_literal ? $show_literal : $show_fluent;
				$line_style = ! $is_visible ? 'display: none;' : '';
				$layer_attr = $is_literal ? 'literal' : 'translation';
				?>
				<div class="sanskrt-translation-item <?php echo $is_literal ? 'is-literal' : 'is-fluent'; ?>" data-layer-name="<?php echo esc_attr( $layer_attr ); ?>" style="<?php echo esc_attr( $line_style ); ?>">
					<div class="sanskrt-translation-meta">
						<span class="sanskrt-trans-label"><?php echo esc_html( isset( $tr['label'] ) ? $tr['label'] : ( $is_literal ? __( 'Doslovný rozbor', 'sanskrt-na-web' ) : __( 'Překlad', 'sanskrt-na-web' ) ) ); ?></span>
						<?php if ( ! empty( $tr['lang'] ) ) : ?>
							<span class="sanskrt-lang-tag"><?php echo esc_html( strtoupper( $tr['lang'] ) ); ?></span>
						<?php endif; ?>
					</div>
					<div class="sanskrt-translation-text">
						<?php
						self::render_aligned_translation( $tr, $tokens );
						?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}

	/**
	 * Render traditional commentaries (Bhāṣya) layer.
	 *
	 * @param array $verse Verse data.
	 * @param array $attrs Attributes.
	 */
	protected static function render_commentaries_layer( $verse, $attrs ) {
		$style_hidden = ! $attrs['show_commentaries'] ? 'display: none;' : '';
		$filter       = $attrs['commentary_filter'];
		$commentaries = array();

		foreach ( $verse['commentaries'] as $comm ) {
			if ( 'all' === $filter ) {
				$commentaries[] = $comm;
			} elseif ( isset( $comm['id'] ) && strtolower( $comm['id'] ) === strtolower( $filter ) ) {
				$commentaries[] = $comm;
			} elseif ( isset( $comm['author'] ) && stripos( $comm['author'], $filter ) !== false ) {
				$commentaries[] = $comm;
			}
		}

		if ( empty( $commentaries ) ) {
			return;
		}
		?>
		<div class="sanskrt-layer sanskrt-layer-commentaries" data-layer-name="commentaries" style="<?php echo esc_attr( $style_hidden ); ?>">
			<div class="sanskrt-layer-header">
				<h4 class="sanskrt-layer-heading">
					<svg class="sanskrt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
					<?php esc_html_e( 'Tradiční komentáře a výklad (Bhāṣya)', 'sanskrt-na-web' ); ?>
				</h4>
			</div>

			<div class="sanskrt-commentaries-list">
				<?php foreach ( $commentaries as $idx => $comm ) : ?>
					<article class="sanskrt-commentary-card <?php echo ! empty( $comm['isOriginalSanskrit'] ) ? 'is-original-sanskrit' : ''; ?>">
						<header class="sanskrt-commentary-header">
							<span class="sanskrt-comm-author"><?php echo esc_html( isset( $comm['author'] ) ? $comm['author'] : '' ); ?></span>
							<?php if ( ! empty( $comm['tradition'] ) ) : ?>
								<span class="sanskrt-comm-tradition"><?php echo esc_html( $comm['tradition'] ); ?></span>
							<?php endif; ?>
							<?php if ( ! empty( $comm['title'] ) ) : ?>
								<span class="sanskrt-comm-title">— <?php echo esc_html( $comm['title'] ); ?></span>
							<?php endif; ?>
						</header>
						<div class="sanskrt-commentary-body <?php echo ( ! empty( $comm['lang'] ) && 'sa' === $comm['lang'] ) ? 'sanskrt-font-devanagari' : ''; ?>">
							<?php echo nl2br( esc_html( isset( $comm['text'] ) ? $comm['text'] : '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>
						<?php if ( ! empty( $comm['source'] ) ) : ?>
							<footer class="sanskrt-commentary-footer">
								<cite><?php echo esc_html( $comm['source'] ); ?></cite>
							</footer>
						<?php endif; ?>
					</article>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Helper: renders tokens in script with interactive data attributes.
	 *
	 * Tokens are located left to right in the raw text, each search starting after the
	 * previous token, so a token can never match inside markup inserted for an earlier one.
	 *
	 * @param string $full_text Full verse text.
	 * @param array  $tokens    Array of tokens.
	 * @param string $script    'devanagari' or 'iast'.
	 */
	protected static function render_tokenized_script( $full_text, $tokens, $script ) {
		$full_text = (string) $full_text;
		$rendered  = '';
		$cursor    = 0;

		foreach ( $tokens as $t ) {
			$token_text = isset( $t['text'][ $script ] ) ? (string) $t['text'][ $script ] : '';
			if ( '' === $token_text || empty( $t['id'] ) ) {
				continue;
			}
			$pos = mb_strpos( $full_text, $token_text, $cursor );
			if ( false === $pos ) {
				continue; // Sandhi form differs from the token form – leave the text as is.
			}

			$grammar_label = isset( $t['grammar']['label_cs'] ) ? $t['grammar']['label_cs'] : '';
			$lemma         = isset( $t['lemma'] ) ? $t['lemma'] : '';
			$meaning_cs    = isset( $t['meaning_cs'] ) ? $t['meaning_cs'] : '';
			$meaning_en    = isset( $t['meaning_en'] ) ? $t['meaning_en'] : '';

			$rendered .= esc_html( mb_substr( $full_text, $cursor, $pos - $cursor ) );
			$rendered .= sprintf(
				'<span class="sanskrt-token" data-token-id="%1$s" data-lemma="%2$s" data-grammar="%3$s" data-meaning-cs="%4$s" data-meaning-en="%5$s" tabindex="0" role="button" aria-haspopup="dialog" aria-label="%6$s">%7$s</span>',
				esc_attr( $t['id'] ),
				esc_attr( $lemma ),
				esc_attr( $grammar_label ),
				esc_attr( $meaning_cs ),
				esc_attr( $meaning_en ),
				esc_attr( $lemma . ( $grammar_label ? ': ' . $grammar_label : '' ) ),
				esc_html( $token_text )
			);
			$cursor = $pos + mb_strlen( $token_text );
		}
		$rendered .= esc_html( mb_substr( $full_text, $cursor ) );

		// Highlight verse numbers and dandas nicely.
		$rendered = preg_replace( '/(\|\|?\s*[\d\.]+\s*\|\|?|॥\s*[\d\.०-९]+\s*॥)/u', '<span class="sanskrt-verse-danda">$1</span>', $rendered );

		// Preserve linebreaks.
		echo nl2br( $rendered ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Helper: renders translation text with aligned words wrapped in cross-highlighting spans.
	 *
	 * Alignments come from the app format (`matched_words` keyed by translation id) or the
	 * plugin format (keyed by language). Matching is done on the raw text with Unicode-aware
	 * word boundaries (Czech diacritics), and the result is escaped segment by segment.
	 *
	 * @param array $translation Translation entry (id, lang, text).
	 * @param array $tokens      Tokens with alignments.
	 */
	protected static function render_aligned_translation( $translation, $tokens ) {
		$text  = isset( $translation['text'] ) ? (string) $translation['text'] : '';
		$tr_id = isset( $translation['id'] ) ? (string) $translation['id'] : '';
		$lang  = isset( $translation['lang'] ) ? (string) $translation['lang'] : 'cs';

		$phrases = array();
		foreach ( $tokens as $t ) {
			if ( empty( $t['id'] ) ) {
				continue;
			}
			$words = array();
			if ( '' !== $tr_id && ! empty( $t['alignment_by_translation'][ $tr_id ] ) ) {
				$words = (array) $t['alignment_by_translation'][ $tr_id ];
			} elseif ( ! empty( $t['alignment'][ $lang ] ) ) {
				$words = (array) $t['alignment'][ $lang ];
			}
			foreach ( $words as $word ) {
				$word = trim( (string) $word );
				if ( '' !== $word ) {
					$phrases[] = array( $word, (string) $t['id'] );
				}
			}
		}

		// Longer phrases first; each phrase takes its first free occurrence.
		usort(
			$phrases,
			function ( $a, $b ) {
				return mb_strlen( $b[0] ) - mb_strlen( $a[0] );
			}
		);

		$ranges = array();
		foreach ( $phrases as $phrase ) {
			list( $word, $token_id ) = $phrase;
			$lead    = preg_match( '/^[\p{L}\p{N}\p{M}]/u', $word ) ? '(?<![\p{L}\p{N}\p{M}])' : '';
			$trail   = preg_match( '/[\p{L}\p{N}\p{M}]$/u', $word ) ? '(?![\p{L}\p{N}\p{M}])' : '';
			$pattern = '/' . $lead . preg_quote( $word, '/' ) . $trail . '/iu';
			if ( ! preg_match_all( $pattern, $text, $matches, PREG_OFFSET_CAPTURE ) ) {
				continue;
			}
			foreach ( $matches[0] as $m ) {
				$start = $m[1];
				$end   = $start + strlen( $m[0] );
				$free  = true;
				foreach ( $ranges as $r ) {
					if ( $start < $r[1] && $end > $r[0] ) {
						$free = false;
						break;
					}
				}
				if ( $free ) {
					$ranges[] = array( $start, $end, $token_id );
					break;
				}
			}
		}

		usort(
			$ranges,
			function ( $a, $b ) {
				return $a[0] - $b[0];
			}
		);

		$rendered = '';
		$cursor   = 0;
		foreach ( $ranges as $r ) {
			$rendered .= esc_html( substr( $text, $cursor, $r[0] - $cursor ) );
			$rendered .= '<span class="sanskrt-aligned-word" data-token-id="' . esc_attr( $r[2] ) . '">' . esc_html( substr( $text, $r[0], $r[1] - $r[0] ) ) . '</span>';
			$cursor    = $r[1];
		}
		$rendered .= esc_html( substr( $text, $cursor ) );

		echo $rendered; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Decodes custom verse JSON from a block attribute or shortcode content.
	 * Shortcode content passes through wpautop/wptexturize, which add <p>/<br> tags,
	 * HTML entities and typographic quotes – those are undone before decoding.
	 *
	 * @param string $raw Raw JSON text.
	 * @return array|null
	 */
	protected static function decode_custom_json( $raw ) {
		$raw     = trim( (string) $raw );
		$decoded = json_decode( $raw, true );
		if ( is_array( $decoded ) ) {
			return $decoded;
		}
		$clean   = html_entity_decode( wp_strip_all_tags( $raw ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$clean   = str_replace( array( '“', '”', '„', '″', '«', '»' ), '"', $clean );
		$clean   = str_replace( array( '‘', '’', '′' ), "'", $clean );
		$decoded = json_decode( trim( $clean ), true );
		return is_array( $decoded ) ? $decoded : null;
	}

	/**
	 * Returns plain text of a script entry, which may be a string or an app-format
	 * object { text, mode, lastAutoText }.
	 *
	 * @param mixed $entry Script entry.
	 * @return string
	 */
	protected static function script_text( $entry ) {
		if ( is_array( $entry ) ) {
			return isset( $entry['text'] ) ? (string) $entry['text'] : '';
		}
		return is_string( $entry ) ? $entry : '';
	}

	/**
	 * Normalizes verse data exported from the SanskrtNaWeb app (scripts as objects,
	 * meanings in `vocabulary`, alignments in `alignment.matched_words` keyed by translation
	 * id, legacy commentary fields) to the structure used by this renderer.
	 *
	 * @param array $verse Verse data.
	 * @return array
	 */
	public static function normalize_verse( $verse ) {
		if ( ! is_array( $verse ) ) {
			return $verse;
		}

		// Scripts.
		$scripts = isset( $verse['scripts'] ) && is_array( $verse['scripts'] ) ? $verse['scripts'] : array();
		foreach ( $scripts as $key => $entry ) {
			$scripts[ $key ] = self::script_text( $entry );
		}
		$verse['scripts'] = $scripts;

		// Translations.
		$translations = array();
		$lang_by_id   = array();
		foreach ( isset( $verse['translations'] ) && is_array( $verse['translations'] ) ? $verse['translations'] : array() as $tr ) {
			if ( ! is_array( $tr ) || ! isset( $tr['text'] ) ) {
				continue;
			}
			$tr['lang'] = isset( $tr['lang'] ) ? (string) $tr['lang'] : 'cs';
			if ( isset( $tr['id'] ) ) {
				$lang_by_id[ (string) $tr['id'] ] = $tr['lang'];
			}
			$translations[] = $tr;
		}
		$verse['translations'] = $translations;

		// Tokens.
		$tokens = array();
		foreach ( isset( $verse['tokens'] ) && is_array( $verse['tokens'] ) ? $verse['tokens'] : array() as $t ) {
			if ( ! is_array( $t ) ) {
				continue;
			}
			$vocab = isset( $t['vocabulary'] ) && is_array( $t['vocabulary'] ) ? $t['vocabulary'] : array();
			foreach ( array( 'cs', 'en' ) as $lang ) {
				if ( empty( $t[ 'meaning_' . $lang ] ) ) {
					if ( ! empty( $vocab['meanings_by_lang'][ $lang ]['contextual'] ) ) {
						$t[ 'meaning_' . $lang ] = $vocab['meanings_by_lang'][ $lang ]['contextual'];
					} elseif ( ! empty( $vocab[ 'contextual_meaning_' . $lang ] ) ) {
						$t[ 'meaning_' . $lang ] = $vocab[ 'contextual_meaning_' . $lang ];
					}
				}
			}
			if ( isset( $t['alignment']['matched_words'] ) && is_array( $t['alignment']['matched_words'] ) ) {
				$by_tr   = $t['alignment']['matched_words'];
				$by_lang = array();
				foreach ( $by_tr as $tr_id => $words ) {
					$lang = isset( $lang_by_id[ $tr_id ] ) ? $lang_by_id[ $tr_id ] : strtok( (string) $tr_id, '_' );
					$by_lang[ $lang ] = array_values( array_unique( array_merge( isset( $by_lang[ $lang ] ) ? $by_lang[ $lang ] : array(), (array) $words ) ) );
				}
				$t['alignment_by_translation'] = $by_tr;
				$t['alignment']                = $by_lang;
			}
			$tokens[] = $t;
		}
		$verse['tokens'] = $tokens;

		// Commentaries: structured list, falling back to legacy fields.
		if ( empty( $verse['commentaries'] ) ) {
			$commentaries = array();
			if ( ! empty( $verse['commentary_by_lang'] ) && is_array( $verse['commentary_by_lang'] ) ) {
				foreach ( $verse['commentary_by_lang'] as $lang => $text ) {
					if ( '' !== trim( (string) $text ) ) {
						$commentaries[] = array(
							'id'                 => 'comm_' . $lang,
							'author'             => 'sa' === $lang ? 'Tradiční komentář' : 'Komentář k verši',
							'lang'               => $lang,
							'text'               => trim( (string) $text ),
							'isOriginalSanskrit' => 'sa' === $lang,
						);
					}
				}
			} elseif ( ! empty( $verse['commentary_cs'] ) ) {
				$commentaries[] = array(
					'id'     => 'comm_cs',
					'author' => 'Český komentář',
					'lang'   => 'cs',
					'text'   => trim( (string) $verse['commentary_cs'] ),
				);
			}
			$verse['commentaries'] = $commentaries;
		}

		if ( isset( $verse['source'] ) && ! is_array( $verse['source'] ) ) {
			unset( $verse['source'] );
		}

		return $verse;
	}

	/**
	 * Render hidden JSON element containing token definitions for instant client-side lookup modal.
	 *
	 * @param array $verse Verse data.
	 */
	protected static function render_tokens_json( $verse ) {
		if ( empty( $verse['tokens'] ) ) {
			return;
		}
		?>
		<script type="application/json" class="sanskrt-tokens-data">
			<?php echo wp_json_encode( $verse['tokens'] ); ?>
		</script>
		<?php
	}
}
