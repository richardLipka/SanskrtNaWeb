import { transliterateLipi } from '../lemmatizer/vidyutAdapter.ts';
import { defaultSanskritAdapter } from '../adapters/sanskritAdapter.ts';

/**
 * Inserts a string at the current cursor position of an input or textarea element,
 * maintaining proper cursor location and dispatching input events.
 */
export function insertAtCursor(
  target: HTMLInputElement | HTMLTextAreaElement,
  textToInsert: string
): void {
  if (!target) return;

  target.focus();
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;

  if (typeof target.setRangeText === 'function') {
    target.setRangeText(textToInsert, start, end, 'end');
  } else {
    const val = target.value;
    target.value = val.slice(0, start) + textToInsert + val.slice(end);
    const newPos = start + textToInsert.length;
    target.setSelectionRange(newPos, newPos);
  }

  // Dispatch standard events so frameworks/listeners detect the change
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * IAST Sanskrit diacritic characters for the virtual diacritic toolbar.
 */
export const IAST_CHARS = [
  // Lowercase
  'ā', 'ī', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ',
  'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ',
  'ś', 'ṣ',
  'ṃ', 'ḥ',
  '।', '॥', 'ऽ',
  // Uppercase
  'Ā', 'Ī', 'Ū', 'Ṛ', 'Ṅ', 'Ñ', 'Ṭ', 'Ḍ', 'Ṇ', 'Ś', 'Ṣ', 'Ṃ', 'Ḥ'
];

/**
 * Pāṇinian phonetic organization of the Devanāgarī alphabet.
 */
export interface PaninianKeyboardSection {
  title: string;
  category: 'vowels' | 'matras' | 'consonants' | 'specials' | 'numerals';
  items: Array<{ char: string; label?: string }>;
}

export const PANINIAN_SECTIONS: PaninianKeyboardSection[] = [
  {
    title: 'Samohlásky (Svara)',
    category: 'vowels',
    items: [
      { char: 'अ' }, { char: 'आ' }, { char: 'इ' }, { char: 'ई' },
      { char: 'उ' }, { char: 'ऊ' }, { char: 'ऋ' }, { char: 'ॠ' },
      { char: 'ऌ' }, { char: 'ॡ' }, { char: 'ए' }, { char: 'ऐ' },
      { char: 'ओ' }, { char: 'औ' }
    ]
  },
  {
    title: 'Znaky samohlásek (Mātrā)',
    category: 'matras',
    items: [
      { char: 'ा', label: 'ā' }, { char: 'ि', label: 'i' }, { char: 'ी', label: 'ī' },
      { char: 'ु', label: 'u' }, { char: 'ू', label: 'ū' }, { char: 'ृ', label: 'ṛ' },
      { char: 'ॄ', label: 'ṝ' }, { char: 'ॢ', label: 'ḷ' }, { char: 'े', label: 'e' },
      { char: 'ै', label: 'ai' }, { char: 'ो', label: 'o' }, { char: 'ौ', label: 'au' }
    ]
  },
  {
    title: 'Zvláštní znaky & Halanta',
    category: 'specials',
    items: [
      { char: '्', label: 'virāma (bez a)' },
      { char: 'ं', label: 'anusvāra (ṃ)' },
      { char: 'ः', label: 'visarga (ḥ)' },
      { char: 'ँ', label: 'candrabindu' },
      { char: 'ऽ', label: 'avagraha' },
      { char: '।', label: 'daṇḍa' },
      { char: '॥', label: 'double daṇḍa' }
    ]
  },
  {
    title: 'Ka-varga (Hrdelní / Kaṇṭhya)',
    category: 'consonants',
    items: [
      { char: 'क' }, { char: 'ख' }, { char: 'ग' }, { char: 'घ' }, { char: 'ङ' }
    ]
  },
  {
    title: 'Ca-varga (Patrové / Tālavya)',
    category: 'consonants',
    items: [
      { char: 'च' }, { char: 'छ' }, { char: 'ज' }, { char: 'झ' }, { char: 'ञ' }
    ]
  },
  {
    title: 'Ṭa-varga (Dásňové / Mūrdhanya)',
    category: 'consonants',
    items: [
      { char: 'ट' }, { char: 'ठ' }, { char: 'ड' }, { char: 'ढ' }, { char: 'ण' }
    ]
  },
  {
    title: 'Ta-varga (Zubné / Dantya)',
    category: 'consonants',
    items: [
      { char: 'त' }, { char: 'थ' }, { char: 'द' }, { char: 'ध' }, { char: 'न' }
    ]
  },
  {
    title: 'Pa-varga (Retné / Oṣṭhya)',
    category: 'consonants',
    items: [
      { char: 'प' }, { char: 'फ' }, { char: 'ब' }, { char: 'भ' }, { char: 'म' }
    ]
  },
  {
    title: 'Polosamohlásky (Antaḥstha) & Úžinové (Ūṣman)',
    category: 'consonants',
    items: [
      { char: 'य' }, { char: 'र' }, { char: 'ल' }, { char: 'व' },
      { char: 'श' }, { char: 'ष' }, { char: 'स' }, { char: 'ह' }
    ]
  },
  {
    title: 'Tradiční ligatury (Samyukta)',
    category: 'consonants',
    items: [
      { char: 'क्ष', label: 'kṣa' },
      { char: 'ज्ञ', label: 'jña' },
      { char: 'त्र', label: 'tra' },
      { char: 'श्र', label: 'śra' },
      { char: 'द्य', label: 'dya' }
    ]
  },
  {
    title: 'Číslice',
    category: 'numerals',
    items: [
      { char: '०' }, { char: '१' }, { char: '२' }, { char: '३' }, { char: '४' },
      { char: '५' }, { char: '६' }, { char: '७' }, { char: '८' }, { char: '९' }
    ]
  }
];

export interface IMEController {
  enable(): void;
  disable(): void;
  toggle(): boolean;
  isEnabled(): boolean;
  destroy(): void;
}

/**
 * Attaches a live Latin -> Devanāgarī IME to a target textarea or input element.
 * When enabled, typing Latin characters (IAST or Harvard-Kyoto) transliterates
 * the active word buffer to Devanāgarī dynamically.
 */
export function attachDevanagariIME(
  target: HTMLInputElement | HTMLTextAreaElement,
  initiallyEnabled = false
): IMEController {
  let enabled = initiallyEnabled;
  let isComposing = false;

  function onInput(e: Event) {
    if (!enabled || isComposing) return;

    // Check if input was text insertion
    const inputEvt = e as InputEvent;
    if (inputEvt.inputType && !inputEvt.inputType.startsWith('insert')) {
      return;
    }

    const cursorPos = target.selectionStart ?? target.value.length;
    const textBefore = target.value.slice(0, cursorPos);
    const textAfter = target.value.slice(cursorPos);

    // Find the current Latin word boundary immediately preceding cursor
    const wordMatch = textBefore.match(/([a-zA-ZāīūṛṝḷḹṅñṭḍṇśṣṃḥĀĪŪṚṄÑṬḌṆŚṢṂḤ|.]+)\s*$/);
    if (!wordMatch || !wordMatch[1]) {
      return;
    }

    const latinWord = wordMatch[1];
    // Do not transliterate if it is only a danda or whitespace
    if (latinWord.trim().length === 0) return;

    let devanagariWord = '';
    try {
      devanagariWord = transliterateLipi(latinWord, 'Iast', 'Devanagari');
    } catch {
      devanagariWord = defaultSanskritAdapter.transliterate(latinWord, 'iast', 'devanagari');
    }

    if (devanagariWord && devanagariWord !== latinWord) {
      isComposing = true;
      const wordStart = cursorPos - latinWord.length;
      target.value = target.value.slice(0, wordStart) + devanagariWord + textAfter;
      const newPos = wordStart + devanagariWord.length;
      target.setSelectionRange(newPos, newPos);
      isComposing = false;

      // Dispatch change notifications
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  target.addEventListener('input', onInput);

  return {
    enable() {
      enabled = true;
    },
    disable() {
      enabled = false;
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    destroy() {
      target.removeEventListener('input', onInput);
    }
  };
}
