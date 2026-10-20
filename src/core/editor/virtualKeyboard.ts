import { transliterateLipi } from '../lemmatizer/vidyutAdapter.ts';

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
    title: 'Ṭa-varga (Cerebrální / Mūrdhanya)',
    category: 'consonants',
    items: [
      { char: 'ट' }, { char: 'ठ' }, { char: 'ड' }, { char: 'ढ' }, { char: 'ण' }
    ]
  },
  {
    title: 'Ta-varga (Zubní / Dantya)',
    category: 'consonants',
    items: [
      { char: 'त' }, { char: 'थ' }, { char: 'द' }, { char: 'ध' }, { char: 'न' }
    ]
  },
  {
    title: 'Pa-varga (Retní / Oṣṭhya)',
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
 * Attaches a live Latin (IAST) -> Devanāgarī IME to a target textarea or input element.
 *
 * The Latin letters of the word being typed are kept in a buffer and the whole buffer is
 * re-transliterated after every keystroke, so "y", "yo", "yog", "yoga" become
 * य् → यो → योग् → योग (instead of transliterating each letter in isolation).
 * Backspace removes the last Latin letter of the buffer. Typing "|" produces a daṇḍa (।),
 * a second "|" turns it into a double daṇḍa (॥). Any other input, a click or cursor
 * movement ends the current word.
 */
export function attachDevanagariIME(
  target: HTMLInputElement | HTMLTextAreaElement,
  initiallyEnabled = false
): IMEController {
  let enabled = initiallyEnabled;
  let dispatching = false;
  let buffer = '';
  let spanStart = -1;
  let spanLength = 0;

  const LATIN_LETTER = /^[a-zA-ZāīūṛṝḷḹṅñṭḍṇśṣṃṁḥĀĪŪṚṜḶḸṄÑṬḌṆŚṢṂṀḤ']$/;

  const reset = () => {
    buffer = '';
    spanStart = -1;
    spanLength = 0;
  };

  const notify = () => {
    dispatching = true;
    try {
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      dispatching = false;
    }
  };

  /** Replaces [spanStart, removeEnd) with the transliterated buffer and places the caret after it. */
  const renderBuffer = (removeEnd: number) => {
    const deva = buffer ? transliterateLipi(buffer, 'iast', 'devanagari') : '';
    const value = target.value;
    target.value = value.slice(0, spanStart) + deva + value.slice(removeEnd);
    spanLength = deva.length;
    const caret = spanStart + deva.length;
    target.setSelectionRange(caret, caret);
    if (!buffer) reset();
    notify();
  };

  function onInput(e: Event) {
    if (!enabled || dispatching) return;
    const inputEvt = e as InputEvent;
    if (inputEvt.isComposing) return; // the OS input method is active

    const pos = target.selectionStart ?? target.value.length;
    const data = inputEvt.data ?? '';

    // Letter typed: extend (or start) the word being composed
    if (inputEvt.inputType === 'insertText' && data.length === 1 && LATIN_LETTER.test(data)) {
      const insertedAt = pos - 1;
      if (spanStart >= 0 && insertedAt === spanStart + spanLength) {
        buffer += data;
      } else {
        buffer = data;
        spanStart = insertedAt;
        spanLength = 0;
      }
      // Remove the raw Latin letter, then rewrite the composed span
      target.value = target.value.slice(0, insertedAt) + target.value.slice(pos);
      renderBuffer(spanStart + spanLength);
      return;
    }

    // Daṇḍa shortcuts
    if (inputEvt.inputType === 'insertText' && data === '|') {
      const before = target.value.slice(0, pos - 1);
      const after = target.value.slice(pos);
      const doubled = before.endsWith('।');
      target.value = doubled ? `${before.slice(0, -1)}॥${after}` : `${before}।${after}`;
      const caret = doubled ? pos - 1 : pos;
      target.setSelectionRange(caret, caret);
      reset();
      notify();
      return;
    }

    // Backspace inside the composed word: drop the last Latin letter instead of one code unit
    if (inputEvt.inputType === 'deleteContentBackward' && buffer && spanStart >= 0 && pos === spanStart + spanLength - 1) {
      buffer = buffer.slice(0, -1);
      renderBuffer(pos);
      return;
    }

    reset();
  }

  target.addEventListener('input', onInput);
  target.addEventListener('mousedown', reset);
  target.addEventListener('blur', reset);
  const onKeyDown = (e: Event) => {
    const key = (e as KeyboardEvent).key;
    if (key.startsWith('Arrow') || key === 'Home' || key === 'End' || key === 'Escape') reset();
  };
  target.addEventListener('keydown', onKeyDown);

  return {
    enable() {
      enabled = true;
    },
    disable() {
      enabled = false;
      reset();
    },
    toggle() {
      enabled = !enabled;
      reset();
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    destroy() {
      target.removeEventListener('input', onInput);
      target.removeEventListener('mousedown', reset);
      target.removeEventListener('blur', reset);
      target.removeEventListener('keydown', onKeyDown);
    }
  };
}
