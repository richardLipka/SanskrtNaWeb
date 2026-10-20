/**
 * SanskrtNaWeb - Gutenberg Block Editor
 * 
 * Registers 'sanskrt/verse-viewer' block with rich layer visibility controls and skin selection.
 * Uses vanilla wp.element.createElement (no build step required).
 */

(function () {
	'use strict';

	const el = window.wp.element.createElement;
	const { registerBlockType } = window.wp.blocks;
	const { InspectorControls } = window.wp.blockEditor || window.wp.editor;
	const { PanelBody, SelectControl, ToggleControl, TextareaControl, Notice } = window.wp.components;
	const data = window.sanskrtBlockData || { options: [], verses: {}, i18n: {} };
	const i18n = data.i18n || {};

	registerBlockType('sanskrt/verse-viewer', {
		title: i18n.title || 'Sanskrtský verš (SanskrtNaWeb)',
		description: i18n.description || 'Vložení sanskrtského verše s volitelnými vrstvami.',
		icon: 'book-alt',
		category: 'widgets',
		keywords: ['sanskrit', 'sanskrt', 'joga', 'gita', 'verse'],
		supports: {
			html: false,
			align: ['wide', 'full'],
		},

		edit: function (props) {
			const { attributes, setAttributes } = props;
			const {
				id,
				skin,
				showDevanagari,
				showPadaccheda,
				showIast,
				showCsPhonetic,
				showTranslation,
				showLiteral,
				showMeter,
				showCommentaries,
				showControls,
				showCrossHighlight,
				transLang,
				customJson,
			} = attributes;

			// Find selected canonical verse data for editor preview
			let currentVerse = (data.verses && data.verses[id]) ? data.verses[id] : null;

			if (customJson && customJson.trim()) {
				try {
					currentVerse = JSON.parse(customJson.trim());
				} catch (e) {
					// Keep canonical preview on JSON parse error
				}
			}

			// Sidebar Settings
			const inspector = el(
				InspectorControls,
				{ key: 'inspector' },
				// Panel 1: Verse Selection
				el(
					PanelBody,
					{ title: 'Výběr textu z kánonu', initialOpen: true },
					el(SelectControl, {
						label: i18n.selectVerse || 'Vybrat připravený verš z kánonu:',
						value: id,
						options: data.options || [],
						onChange: function (val) {
							setAttributes({ id: val });
						},
					})
				),

				// Panel 2: Skin Selection
				el(
					PanelBody,
					{ title: i18n.skinSettings || 'Nastavení vzhledu (Skin)', initialOpen: true },
					el(SelectControl, {
						label: i18n.skinLabel || 'Styl a barevné schéma:',
						value: skin,
						options: [
							{ value: 'native', label: i18n.skinNative || 'Šablona webu (Výchozí - plně respektuje WP téma)' },
							{ value: 'parchment', label: i18n.skinParchment || 'Pergamen / Svitek (Tradiční teplé tóny)' },
							{ value: 'ashram', label: i18n.skinAshram || 'Ášram (Šafránové a okrové odstíny)' },
							{ value: 'academic', label: i18n.skinAcademic || 'Akademický (Kritické indologické vydání)' },
							{ value: 'dark', label: i18n.skinDark || 'Tmavý védský (Zlato na tmavém podkladu)' },
						],
						onChange: function (val) {
							setAttributes({ skin: val });
						},
					})
				),

				// Panel 3: Layer Visibility Settings
				el(
					PanelBody,
					{ title: i18n.layerSettings || 'Viditelnost vrstev', initialOpen: true },
					el(ToggleControl, {
						label: i18n.showDevanagari || 'Dévanágarí písmo',
						checked: showDevanagari,
						onChange: function (val) {
							setAttributes({ showDevanagari: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showPadaccheda || 'Padaccheda (slovní rozbor)',
						checked: showPadaccheda,
						onChange: function (val) {
							setAttributes({ showPadaccheda: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showIast || 'IAST transliterace',
						checked: showIast,
						onChange: function (val) {
							setAttributes({ showIast: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showCsPhonetic || 'Český fonetický přepis',
						checked: showCsPhonetic,
						onChange: function (val) {
							setAttributes({ showCsPhonetic: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showTranslation || 'Hlavní překlad (plynulý)',
						checked: showTranslation,
						onChange: function (val) {
							setAttributes({ showTranslation: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showLiteral || 'Doslovný překlad / rozbor',
						checked: showLiteral,
						onChange: function (val) {
							setAttributes({ showLiteral: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showMeter || 'Metrum a forma (Čhandas)',
						checked: showMeter,
						onChange: function (val) {
							setAttributes({ showMeter: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showCommentaries || 'Tradiční komentáře (Bhāṣya)',
						checked: showCommentaries,
						onChange: function (val) {
							setAttributes({ showCommentaries: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showControls || 'Přepínací lišta vrstev pro čtenáře',
						checked: showControls,
						onChange: function (val) {
							setAttributes({ showControls: val });
						},
					}),
					el(ToggleControl, {
						label: i18n.showCrossHighlight || 'Křížové zvýrazňování slov při najetí',
						checked: showCrossHighlight,
						onChange: function (val) {
							setAttributes({ showCrossHighlight: val });
						},
					})
				),

				// Panel 4: Advanced
				el(
					PanelBody,
					{ title: i18n.advancedSettings || 'Vlastní data a jazyk', initialOpen: false },
					el(SelectControl, {
						label: i18n.transLang || 'Jazyk překladu:',
						value: transLang,
						options: [
							{ value: 'cs', label: 'Pouze čeština' },
							{ value: 'en', label: 'Only English' },
							{ value: 'all', label: 'Všechny jazyky' },
						],
						onChange: function (val) {
							setAttributes({ transLang: val });
						},
					}),
					el(TextareaControl, {
						label: i18n.customJsonLabel || 'Vlastní JSON data verše:',
						help: 'Zde můžete vložit kompletní JSON exportovaný ze SanskrtNaWeb editoru.',
						value: customJson,
						onChange: function (val) {
							setAttributes({ customJson: val });
						},
						rows: 6,
					})
				)
			);

			// Editor Canvas Preview
			const previewElements = [];

			previewElements.push(
				el(
					Notice,
					{ status: 'info', isDismissible: false, className: 'sanskrt-editor-notice', key: 'notice' },
					'🕉️ SanskrtNaWeb čtečka veršů (Režim pouze pro zobrazení — bez editačních funkcí na front-endu)'
				)
			);

			if (currentVerse) {
				const cardChildren = [];

				// Header
				cardChildren.push(
					el(
						'div',
						{ className: 'sanskrt-verse-header', key: 'header' },
						el(
							'div',
							{ className: 'sanskrt-verse-identity' },
							el('span', { className: 'sanskrt-book-name' }, currentVerse.book || ''),
							el('span', { className: 'sanskrt-verse-num' }, currentVerse.number || ''),
							currentVerse.chapter ? el('span', { className: 'sanskrt-chapter-name' }, currentVerse.chapter) : null
						),
						showMeter && currentVerse.meter
							? el('span', { className: 'sanskrt-badge sanskrt-badge-meter' }, currentVerse.meter)
							: null
					)
				);

				// Devanagari
				if (showDevanagari && currentVerse.scripts && currentVerse.scripts.devanagari) {
					cardChildren.push(
						el(
							'div',
							{ className: 'sanskrt-layer sanskrt-layer-devanagari', key: 'deva' },
							el('div', { className: 'sanskrt-script-text sanskrt-font-devanagari' }, currentVerse.scripts.devanagari)
						)
					);
				}

				// Padaccheda
				if (showPadaccheda && currentVerse.scripts && currentVerse.scripts.devanagari_padaccheda) {
					cardChildren.push(
						el(
							'div',
							{ className: 'sanskrt-layer sanskrt-layer-padaccheda', key: 'pada' },
							el('div', { className: 'sanskrt-layer-label' }, 'Padaccheda:'),
							el('div', { className: 'sanskrt-pada-line sanskrt-font-devanagari' }, currentVerse.scripts.devanagari_padaccheda)
						)
					);
				}

				// IAST
				if (showIast && currentVerse.scripts && currentVerse.scripts.iast) {
					cardChildren.push(
						el(
							'div',
							{ className: 'sanskrt-layer sanskrt-layer-iast', key: 'iast' },
							el('div', { className: 'sanskrt-script-text sanskrt-font-iast' }, currentVerse.scripts.iast)
						)
					);
				}

				// Phonetic
				if (showCsPhonetic && currentVerse.scripts && currentVerse.scripts.cs_phonetic) {
					cardChildren.push(
						el(
							'div',
							{ className: 'sanskrt-layer sanskrt-layer-cs-phonetic', key: 'phonetic' },
							el('div', { className: 'sanskrt-script-text sanskrt-font-phonetic' }, currentVerse.scripts.cs_phonetic)
						)
					);
				}

				// Translations
				if ((showTranslation || showLiteral) && currentVerse.translations && currentVerse.translations.length) {
					const transElements = currentVerse.translations
						.filter(function (tr) {
							if (tr.type === 'literal') return showLiteral;
							return showTranslation;
						})
						.map(function (tr, idx) {
							return el(
								'div',
								{ className: 'sanskrt-translation-item ' + (tr.type === 'literal' ? 'is-literal' : 'is-fluent'), key: 'tr-' + idx },
								el('div', { className: 'sanskrt-trans-label' }, tr.label || 'Překlad'),
								el('div', { className: 'sanskrt-translation-text' }, tr.text)
							);
						});

					if (transElements.length) {
						cardChildren.push(
							el('div', { className: 'sanskrt-layer-translation-group', key: 'trans-group' }, transElements)
						);
					}
				}

				// Commentaries
				if (showCommentaries && currentVerse.commentaries && currentVerse.commentaries.length) {
					cardChildren.push(
						el(
							'div',
							{ className: 'sanskrt-layer-commentaries', key: 'comm-group' },
							el('div', { className: 'sanskrt-layer-heading' }, 'Tradiční komentáře (Bhāṣya) — ' + currentVerse.commentaries.length + ' dostupné'),
							currentVerse.commentaries.map(function (comm, idx) {
								return el(
									'div',
									{ className: 'sanskrt-commentary-card', key: 'comm-' + idx },
									el('strong', null, comm.author || ''),
									comm.title ? el('span', { className: 'sanskrt-comm-title' }, ' — ' + comm.title) : null,
									el('div', { className: 'sanskrt-commentary-body' }, comm.text)
								);
							})
						)
					);
				}

				previewElements.push(
					el(
						'div',
						{
							className: 'sanskrt-verse-container skin-' + skin,
							key: 'card',
						},
						cardChildren
					)
				);
			}

			return el('div', { className: 'sanskrt-block-editor-wrap' }, inspector, previewElements);
		},

		save: function () {
			// Dynamic block rendered server-side by Sanskrt_Block::render_block
			return null;
		},
	});
})();
