/**
 * SanskrtNaWeb - Frontend Runtime Script
 * 
 * Provides:
 * 1. Bidirectional Cross-Highlighting (hovering Devanagari/IAST highlights translation words & vice versa)
 * 2. Visitor Layer Visibility Controls (toggling Devanagari, IAST, Padaccheda, Translation, Commentaries)
 * 3. Word Morphology & Lexicon Lookup Modal Dialog
 */

(function () {
	'use strict';

	/**
	 * Localized strings fallback.
	 */
	const l10n = window.sanskrtL10n || {
		modalTitle: 'Morfologický a lexikální rozbor slova',
		lemma: 'Základní tvar (Lemma):',
		grammar: 'Gramatická kategorie:',
		meaningCs: 'Český význam:',
		meaningEn: 'Anglický význam:',
		close: 'Zavřít (Esc)',
	};

	let activeModal = null;
	let lastFocusedElement = null;

	/**
	 * Initialize all Sanskrt verse containers on the page.
	 */
	function initSanskrtContainers() {
		const containers = document.querySelectorAll('.sanskrt-verse-container:not([data-sanskrt-initialized])');
		containers.forEach((container) => {
			container.setAttribute('data-sanskrt-initialized', 'true');
			setupCrossHighlighting(container);
			setupLayerControls(container);
			setupTokenInteractions(container);
		});
	}

	/**
	 * 1. Bidirectional Cross-Highlighting
	 */
	function setupCrossHighlighting(container) {
		const crossEnabled = container.getAttribute('data-cross-highlight') !== 'false';
		if (!crossEnabled) return;

		container.addEventListener('mouseover', handleHighlightEvent);
		container.addEventListener('mouseout', handleHighlightEvent);
		container.addEventListener('focusin', handleHighlightEvent);
		container.addEventListener('focusout', handleHighlightEvent);
	}

	function handleHighlightEvent(e) {
		const target = e.target.closest('[data-token-id]');
		if (!target) return;

		const container = target.closest('.sanskrt-verse-container');
		if (!container) return;

		const tokenId = target.getAttribute('data-token-id');
		if (!tokenId) return;

		const isEntering = (e.type === 'mouseover' || e.type === 'focusin');
		const matchedElements = container.querySelectorAll('[data-token-id="' + CSS.escape(tokenId) + '"]');

		matchedElements.forEach((el) => {
			if (isEntering) {
				el.classList.add('sanskrt-cross-active');
			} else {
				el.classList.remove('sanskrt-cross-active');
			}
		});
	}

	/**
	 * 2. Visitor Layer Visibility Controls
	 */
	function setupLayerControls(container) {
		const pills = container.querySelectorAll('.sanskrt-pill-toggle');
		if (!pills.length) return;

		pills.forEach((pill) => {
			pill.addEventListener('click', () => {
				const layerName = pill.getAttribute('data-target-layer');
				if (!layerName) return;

				const isCurrentlyActive = pill.classList.contains('is-active');
				const nextActive = !isCurrentlyActive;

				pill.classList.toggle('is-active', nextActive);
				pill.setAttribute('aria-pressed', nextActive ? 'true' : 'false');

				// Find targets with matching data-layer-name
				const targetElements = container.querySelectorAll('[data-layer-name="' + CSS.escape(layerName) + '"]');
				targetElements.forEach((el) => {
					el.style.display = nextActive ? '' : 'none';
				});
			});
		});
	}

	/**
	 * 3. Token click -> Word morphology lookup modal
	 */
	function setupTokenInteractions(container) {
		container.addEventListener('click', (e) => {
			const tokenEl = e.target.closest('.sanskrt-token');
			if (!tokenEl) return;

			e.preventDefault();
			openTokenModal(tokenEl, container);
		});

		container.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				const tokenEl = e.target.closest('.sanskrt-token');
				if (tokenEl) {
					e.preventDefault();
					openTokenModal(tokenEl, container);
				}
			}
		});
	}

	/**
	 * Open morphology modal for a clicked token.
	 */
	function openTokenModal(tokenEl, container) {
		lastFocusedElement = tokenEl;

		const tokenId = tokenEl.getAttribute('data-token-id');
		const wordDeva = tokenEl.textContent || '';
		let tokenData = null;

		// Try loading full token data from embedded JSON if available
		const jsonScript = container.querySelector('.sanskrt-tokens-data');
		if (jsonScript && tokenId) {
			try {
				const allTokens = JSON.parse(jsonScript.textContent);
				if (Array.isArray(allTokens)) {
					tokenData = allTokens.find((t) => t.id === tokenId);
				}
			} catch (err) {
				// Fallback to data attributes
			}
		}

		const lemma = (tokenData && tokenData.lemma) || tokenEl.getAttribute('data-lemma') || '';
		const grammar = (tokenData && tokenData.grammar && tokenData.grammar.label_cs) || tokenEl.getAttribute('data-grammar') || '';
		const meaningCs = (tokenData && tokenData.meaning_cs) || tokenEl.getAttribute('data-meaning-cs') || '';
		const meaningEn = (tokenData && tokenData.meaning_en) || tokenEl.getAttribute('data-meaning-en') || '';
		const iast = (tokenData && tokenData.text && tokenData.text.iast) || '';

		// Build modal markup
		closeTokenModal();

		const backdrop = document.createElement('div');
		backdrop.className = 'sanskrt-modal-backdrop';
		backdrop.setAttribute('role', 'dialog');
		backdrop.setAttribute('aria-modal', 'true');
		backdrop.setAttribute('aria-label', l10n.modalTitle);

		let contentHtml = `
			<div class="sanskrt-modal-dialog">
				<header class="sanskrt-modal-header">
					<div class="sanskrt-modal-title">
						<span class="sanskrt-modal-word-deva">${escapeHtml(wordDeva)}</span>
						${iast ? `<span class="sanskrt-modal-word-iast">${escapeHtml(iast)}</span>` : ''}
					</div>
					<button type="button" class="sanskrt-modal-close" aria-label="${escapeHtml(l10n.close)}">&times;</button>
				</header>
				<div class="sanskrt-modal-body">
					${lemma ? `
						<div class="sanskrt-modal-row">
							<span class="sanskrt-modal-label">${escapeHtml(l10n.lemma)}</span>
							<span class="sanskrt-modal-value"><strong>${escapeHtml(lemma)}</strong></span>
						</div>
					` : ''}
					${grammar ? `
						<div class="sanskrt-modal-row">
							<span class="sanskrt-modal-label">${escapeHtml(l10n.grammar)}</span>
							<span class="sanskrt-grammar-tag">${escapeHtml(grammar)}</span>
						</div>
					` : ''}
					${meaningCs ? `
						<div class="sanskrt-modal-row">
							<span class="sanskrt-modal-label">${escapeHtml(l10n.meaningCs)}</span>
							<span class="sanskrt-modal-value">${escapeHtml(meaningCs)}</span>
						</div>
					` : ''}
					${meaningEn ? `
						<div class="sanskrt-modal-row">
							<span class="sanskrt-modal-label">${escapeHtml(l10n.meaningEn)}</span>
							<span class="sanskrt-modal-value">${escapeHtml(meaningEn)}</span>
						</div>
					` : ''}
				</div>
			</div>
		`;

		backdrop.innerHTML = contentHtml;
		document.body.appendChild(backdrop);
		activeModal = backdrop;

		// Focus close button
		const closeBtn = backdrop.querySelector('.sanskrt-modal-close');
		if (closeBtn) {
			closeBtn.focus();
			closeBtn.addEventListener('click', closeTokenModal);
		}

		backdrop.addEventListener('click', (e) => {
			if (e.target === backdrop) {
				closeTokenModal();
			}
		});

		document.addEventListener('keydown', handleModalKeyDown);
	}

	function handleModalKeyDown(e) {
		if (e.key === 'Escape' && activeModal) {
			e.preventDefault();
			closeTokenModal();
		}
	}

	function closeTokenModal() {
		if (activeModal) {
			document.removeEventListener('keydown', handleModalKeyDown);
			activeModal.remove();
			activeModal = null;
			if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
				lastFocusedElement.focus();
			}
		}
	}

	function escapeHtml(str) {
		if (!str) return '';
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Auto-initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initSanskrtContainers);
	} else {
		initSanskrtContainers();
	}

	// Also support dynamic themes and AJAX page loads
	window.addEventListener('sanskrt:refresh', initSanskrtContainers);
})();
