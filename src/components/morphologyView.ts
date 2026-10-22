/**
 * Shared rendering of a word's morphological structure (prefixes, root/stem, suffixes,
 * ending) from a verified Pāṇinian derivation. The rule-by-rule derivation is available on
 * demand in a collapsed <details> element; only Aṣṭādhyāyī sūtras are linked.
 */

import { WordDerivationTree } from '../core/adapters/languageAdapter.ts';
import { SupportedLanguage } from '../core/i18n/types.ts';
import { escapeHtml, safeUrl } from '../core/utils/html.ts';

export function renderMorphologyHtml(
  tree: WordDerivationTree | null | undefined,
  lang: SupportedLanguage = 'cs',
  options: { emptyMessage?: boolean } = {}
): string {
  const cs = lang === 'cs';
  if (!tree || !tree.verified || !tree.morphemes?.length) {
    if (options.emptyMessage === false) return '';
    return `<p class="cat-hint-text">${cs
      ? 'Pro tento tvar není k dispozici ověřené odvození (Vidyut ho z rozpoznaného kmene či kořene neodvodí). Upravte lemma nebo rozdělte složeninu.'
      : 'No verified derivation for this form (Vidyut does not derive it from the recognised stem or root). Adjust the lemma or split the compound.'}</p>`;
  }

  return `
    <div class="morph-chain">
      ${tree.morphemes.map((m) => `
        <div class="morph-item morph-${escapeHtml(m.role)}">
          <div class="morph-surface">${escapeHtml(m.surface)}</div>
          <div class="morph-upadesha">${escapeHtml(m.forms.join(' → '))}</div>
          <div class="morph-label">${escapeHtml(m.label)}</div>
        </div>`).join('<div class="morph-plus">+</div>')}
      <div class="morph-plus">=</div>
      <div class="morph-item morph-result">
        <div class="morph-surface">${escapeHtml(tree.targetTranslit)}</div>
        <div class="morph-label">${escapeHtml(tree.linguisticNotes?.type || '')}</div>
      </div>
    </div>
    <details class="morph-steps">
      <summary>${cs ? `Postup podle pravidel (${tree.steps.length} kroků)` : `Rule-by-rule derivation (${tree.steps.length} steps)`}</summary>
      <ol>
        ${tree.steps.map((s) => {
          const url = safeUrl(s.ruleUrl);
          return `
          <li>
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.ruleCode)}</a>` : escapeHtml(s.ruleCode)}
            <small>${escapeHtml(s.ruleSource)}</small>
            <span>${escapeHtml(s.termsIast || s.termsText)}</span>
          </li>`;
        }).join('')}
      </ol>
    </details>
  `;
}
