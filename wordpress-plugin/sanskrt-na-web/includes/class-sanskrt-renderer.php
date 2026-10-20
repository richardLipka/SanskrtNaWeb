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
			$decoded = json_decode( trim( $custom_json ), true );
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
		$verse_id       = esc_attr( isset( $verse['id'] ) ? $verse['id'] : 'verse_' . wp_rand() );
		$skin_class     = 'skin-' . esc_attr( $attrs['skin'] );
		$custom_class   = ! empty( $attrs['class_name'] ) ? ' ' . esc_attr( $attrs['class_name'] ) : '';
		$highlight_attr = $attrs['show_cross_highlight'] ? 'true' : 'false';

		ob_start();
		?>
		<div class="sanskrt-verse-container <?php echo esc_attr( $skin_class . $custom_class ); ?>"
			id="sanskrt-<?php echo esc_attr( $verse_id ); ?>"
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
		$style_hidden = ( ! $show_fluent && ! $show_literal ) ? 'display: none;' : '';

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
		<div class="sanskrt-layer sanskrt-layer-translation-group" data-layer-name="translation" style="<?php echo esc_attr( $style_hidden ); ?>">
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
						self::render_aligned_translation( $tr['text'], $tokens, isset( $tr['lang'] ) ? $tr['lang'] : 'cs' );
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
							<?php echo wp_kses_post( nl2br( $comm['text'] ) ); ?>
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
	 * @param string $full_text Full verse text.
	 * @param array  $tokens    Array of tokens.
	 * @param string $script    'devanagari' or 'iast'.
	 */
	protected static function render_tokenized_script( $full_text, $tokens, $script ) {
		// Split full_text into lines if multiline.
		$lines = explode( "\n", $full_text );
		$is_multiline = count( $lines ) > 1;

		// For each token, prepare replacement.
		$rendered = esc_html( $full_text );

		foreach ( $tokens as $t ) {
			$token_id   = esc_attr( $t['id'] );
			$token_text = isset( $t['text'][ $script ] ) ? $t['text'][ $script ] : '';
			if ( empty( $token_text ) ) {
				continue;
			}

			$grammar_label = isset( $t['grammar']['label_cs'] ) ? $t['grammar']['label_cs'] : '';
			$lemma         = isset( $t['lemma'] ) ? $t['lemma'] : '';
			$meaning_cs    = isset( $t['meaning_cs'] ) ? $t['meaning_cs'] : '';
			$meaning_en    = isset( $t['meaning_en'] ) ? $t['meaning_en'] : '';

			$span = sprintf(
				'<span class="sanskrt-token" data-token-id="%1$s" data-lemma="%2$s" data-grammar="%3$s" data-meaning-cs="%4$s" data-meaning-en="%5$s" tabindex="0" role="button" aria-haspopup="dialog" aria-label="%6$s">%7$s</span>',
				$token_id,
				esc_attr( $lemma ),
				esc_attr( $grammar_label ),
				esc_attr( $meaning_cs ),
				esc_attr( $meaning_en ),
				esc_attr( $lemma . ( $grammar_label ? ': ' . $grammar_label : '' ) ),
				esc_html( $token_text )
			);

			// Safe replace exact occurrence.
			$pos = mb_strpos( $rendered, esc_html( $token_text ) );
			if ( false !== $pos ) {
				$rendered = mb_substr( $rendered, 0, $pos ) . $span . mb_substr( $rendered, $pos + mb_strlen( esc_html( $token_text ) ) );
			}
		}

		// Highlight verse numbers and dandas nicely.
		$rendered = preg_replace( '/(\|\|?\s*[\d\.]+\s*\|\|?|॥\s*[\d\.०-९]+\s*॥)/u', '<span class="sanskrt-verse-danda">$1</span>', $rendered );

		// Preserve linebreaks.
		echo nl2br( $rendered ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Helper: renders translation text with words wrapped in cross-highlighting spans.
	 *
	 * @param string $translation_text Translation string.
	 * @param array  $tokens           Tokens with alignments.
	 * @param string $lang             Language code ('cs' or 'en').
	 */
	protected static function render_aligned_translation( $translation_text, $tokens, $lang ) {
		$rendered = esc_html( $translation_text );

		foreach ( $tokens as $t ) {
			if ( empty( $t['alignment'][ $lang ] ) ) {
				continue;
			}
			$token_id = esc_attr( $t['id'] );
			$words    = (array) $t['alignment'][ $lang ];

			foreach ( $words as $word ) {
				if ( empty( $word ) ) {
					continue;
				}
				$pattern = '/\b(' . preg_quote( esc_html( $word ), '/' ) . ')\b/iu';
				$replacement = '<span class="sanskrt-aligned-word" data-token-id="' . $token_id . '">$1</span>';
				$rendered = preg_replace( $pattern, $replacement, $rendered, 1 );
			}
		}

		echo $rendered; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
