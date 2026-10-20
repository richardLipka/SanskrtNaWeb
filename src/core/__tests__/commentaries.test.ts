// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  Verse,
  getVerseCommentaries,
  CommentaryItemSchema,
  VerseSchema
} from '../types/schema.ts';
import { SanskritVerseElement, registerSanskritVerse } from '../../components/SanskritVerse.ts';
import { SanskritEditorElement, registerSanskritEditor } from '../../components/SanskritEditor.ts';
import { buildUserPrompt } from '../llm/llmService.ts';

describe('Multi-Author Multilingual Commentaries (Bhāṣya & Ṭīkā)', () => {
  beforeAll(() => {
    registerSanskritVerse();
    registerSanskritEditor();
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const sampleVerseWithCommentaries: Verse = {
    id: 'gita_2_47',
    number: '2.47',
    book: 'Bhagavadgītā',
    chapter: '2',
    scripts: {
      devanagari: { text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', mode: 'auto' },
      iast: { text: 'karmaṇy evādhikāras te mā phaleṣu kadācana |', mode: 'auto' }
    },
    translations: [
      {
        id: 'tr_cs_1',
        lang: 'cs',
        label: 'Český překlad',
        type: 'fluent',
        text: 'Máš právo pouze na čin, nikdy na jeho plody.'
      }
    ],
    tokens: [],
    commentaries: [
      {
        id: 'comm_sankara_2_47',
        author: 'Śaṅkarācārya',
        tradition: 'Advaita Vedānta',
        title: 'Śāṅkarabhāṣya',
        lang: 'sa',
        text: 'कर्मण्येव अधिकारः न ज्ञाननिष्ठायाम्। फलतृष्णा मा भूत्।',
        source: 'Gītābhāṣya 2.47',
        isOriginalSanskrit: true
      },
      {
        id: 'comm_ramanuja_2_47',
        author: 'Rāmānujācārya',
        tradition: 'Viśiṣṭādvaita',
        title: 'Rāmānujabhāṣya',
        lang: 'sa',
        text: 'नित्याभ्यासयुक्तस्य कर्मयोग एव प्रथमम् अधिकृतस्य श्रेयस्करः।',
        source: 'Śrībhāṣya / Gītābhāṣya',
        isOriginalSanskrit: true
      },
      {
        id: 'comm_cs_note_2_47',
        author: 'Jan Filipský & Jaroslav Vacek',
        tradition: 'Česká indologie',
        title: 'Poznámky k překladu',
        lang: 'cs',
        text: 'Základní formulace niṣkāmakarmy – jednání bez ulpívání na plodech.',
        source: 'Bhagavadgíta, Odeon 1976',
        isOriginalSanskrit: false
      }
    ]
  };

  describe('Schema & Normalization', () => {
    it('validates structured multi-author commentaries', () => {
      const comm = sampleVerseWithCommentaries.commentaries![0];
      const parsed = CommentaryItemSchema.parse(comm);
      expect(parsed.author).toBe('Śaṅkarācārya');
      expect(parsed.tradition).toBe('Advaita Vedānta');
      expect(parsed.lang).toBe('sa');
      expect(parsed.isOriginalSanskrit).toBe(true);
    });

    it('getVerseCommentaries extracts all structured commentaries', () => {
      const comms = getVerseCommentaries(sampleVerseWithCommentaries);
      expect(comms.length).toBe(3);
      expect(comms[0].author).toBe('Śaṅkarācārya');
      expect(comms[1].author).toBe('Rāmānujācārya');
      expect(comms[2].author).toBe('Jan Filipský & Jaroslav Vacek');
    });

    it('getVerseCommentaries seamlessly falls back to legacy commentary_cs', () => {
      const legacyVerse: Verse = {
        id: 'legacy_1',
        number: '1',
        scripts: {
          devanagari: { text: 'तत्त्वमसि', mode: 'auto' },
          iast: { text: 'tat tvam asi', mode: 'auto' }
        },
        translations: [],
        tokens: [],
        commentary_cs: 'Mahāvākya z Čhándógjopanišady.'
      };

      const comms = getVerseCommentaries(legacyVerse);
      expect(comms.length).toBe(1);
      expect(comms[0].author).toBe('Český komentář');
      expect(comms[0].lang).toBe('cs');
      expect(comms[0].text).toBe('Mahāvākya z Čhándógjopanišady.');
    });

    it('getVerseCommentaries seamlessly falls back to legacy commentary_by_lang', () => {
      const legacyMultilingualVerse: Verse = {
        id: 'legacy_2',
        number: '2',
        scripts: {
          devanagari: { text: 'सत्यमेव जयते', mode: 'auto' },
          iast: { text: 'satyameva jayate', mode: 'auto' }
        },
        translations: [],
        tokens: [],
        commentary_by_lang: {
          sa: 'सत्यस्यैव जयो भवति न त्वनृतस्य।',
          en: 'Truth alone triumphs, not falsehood.'
        }
      };

      const comms = getVerseCommentaries(legacyMultilingualVerse);
      expect(comms.length).toBe(2);
      const saComm = comms.find(c => c.lang === 'sa');
      const enComm = comms.find(c => c.lang === 'en');
      expect(saComm).toBeDefined();
      expect(saComm?.isOriginalSanskrit).toBe(true);
      expect(enComm).toBeDefined();
      expect(enComm?.text).toBe('Truth alone triumphs, not falsehood.');
    });
  });

  describe('<sanskrit-verse> Simultaneous Commentary Display', () => {
    it('renders multiple commentaries simultaneously side-by-side in a responsive grid', () => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = sampleVerseWithCommentaries;
      verseEl.layerVisibility = { commentary: true };
      document.body.appendChild(verseEl);

      const commentarySection = verseEl.querySelector('.verse-commentaries');
      expect(commentarySection).not.toBeNull();

      // Check that all 3 commentaries are rendered simultaneously
      const cards = verseEl.querySelectorAll('.commentary-card');
      expect(cards.length).toBe(3);

      // Verify content of first commentary (Śaṅkarācārya)
      expect(verseEl.innerHTML).toContain('Śaṅkarācārya');
      expect(verseEl.innerHTML).toContain('Advaita Vedānta');
      expect(verseEl.innerHTML).toContain('Śāṅkarabhāṣya');
      expect(verseEl.innerHTML).toContain('कर्मण्येव अधिकारः');

      // Verify content of second commentary (Rāmānujācārya)
      expect(verseEl.innerHTML).toContain('Rāmānujācārya');
      expect(verseEl.innerHTML).toContain('Viśiṣṭādvaita');

      // Verify content of third commentary (Filipský & Vacek)
      expect(verseEl.innerHTML).toContain('Jan Filipský &amp; Jaroslav Vacek');
      expect(verseEl.innerHTML).toContain('Česká indologie');

      // Verify grid container exists
      const grid = verseEl.querySelector('.commentaries-grid');
      expect(grid).not.toBeNull();

      document.body.removeChild(verseEl);
    });

    it('toggles commentary layer via local pill button', () => {
      const verseEl = document.createElement('sanskrit-verse') as SanskritVerseElement;
      verseEl.verse = sampleVerseWithCommentaries;
      document.body.appendChild(verseEl);

      const commPill = verseEl.querySelector('[data-toggle-layer="commentary"]') as HTMLButtonElement;
      expect(commPill).not.toBeNull();
      expect(commPill.classList.contains('active')).toBe(true);
      expect(verseEl.querySelector('.verse-commentaries')).not.toBeNull();

      // Click to toggle off
      commPill.click();
      expect(verseEl.querySelector('.verse-commentaries')).toBeNull();
      const toggledPill = verseEl.querySelector('[data-toggle-layer="commentary"]') as HTMLButtonElement;
      expect(toggledPill.classList.contains('active')).toBe(false);

      // Click to toggle back on
      toggledPill.click();
      expect(verseEl.querySelector('.verse-commentaries')).not.toBeNull();

      document.body.removeChild(verseEl);
    });
  });

  describe('SanskritEditor Interactive Commentary Management', () => {
    let editor: SanskritEditorElement;

    beforeEach(() => {
      window.confirm = () => true;
      editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.verse = JSON.parse(JSON.stringify(sampleVerseWithCommentaries));
      document.body.appendChild(editor);
    });

    it('renders commentaries management card with presets and author filter', () => {
      const card = editor.querySelector('#card-commentaries');
      expect(card).not.toBeNull();
      expect(editor.innerHTML).toContain('Komentáře &amp; Tradiční výklady');

      // Check author filter select
      const filterSelect = editor.querySelector('#select-comm-filter-author');
      expect(filterSelect).not.toBeNull();

      // Open add form to reveal presets
      const btnToggle = editor.querySelector('#btn-toggle-add-commentary') as HTMLButtonElement;
      expect(btnToggle).not.toBeNull();
      btnToggle.click();

      // Check preset buttons
      const presets = editor.querySelectorAll('.btn-comm-preset');
      expect(presets.length).toBeGreaterThan(3);
    });

    it('adds a new commentary to the verse', () => {
      // Click open add commentary form
      const btnOpenAdd = editor.querySelector('#btn-toggle-add-commentary') as HTMLButtonElement;
      expect(btnOpenAdd).not.toBeNull();
      btnOpenAdd.click();

      // Check inputs are visible
      const authorInput = editor.querySelector('#new-comm-author') as HTMLInputElement;
      const langSelect = editor.querySelector('#new-comm-lang') as HTMLSelectElement;
      const textInput = editor.querySelector('#new-comm-text') as HTMLTextAreaElement;
      const btnSave = editor.querySelector('#btn-confirm-add-commentary') as HTMLButtonElement;

      expect(authorInput).not.toBeNull();
      expect(textInput).not.toBeNull();

      authorInput.value = 'Madhvācārya';
      langSelect.value = 'sa';
      textInput.value = 'द्वैतवेदान्ते परमेश्वरस्य सर्वकर्तृत्वम्।';

      btnSave.click();

      // Verify verse now has 4 commentaries
      const currentVerse = editor.verse!;
      expect(currentVerse.commentaries?.length).toBe(4);
      const added = currentVerse.commentaries?.find(c => c.author === 'Madhvācārya');
      expect(added).toBeDefined();
      expect(added?.text).toContain('द्वैतवेदान्ते');
      expect(added?.lang).toBe('sa');
    });

    it('edits an existing commentary in-place', () => {
      // Find edit button for first commentary
      const editBtn = editor.querySelector('.btn-edit-comm') as HTMLButtonElement;
      expect(editBtn).not.toBeNull();
      editBtn.click();

      // Check edit textarea appeared
      const textarea = editor.querySelector('#edit-comm-text') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      textarea.value = 'Upravený text komentáře.';

      // Save
      const saveBtn = editor.querySelector('.btn-save-edit-comm') as HTMLButtonElement;
      saveBtn.click();

      expect(editor.verse!.commentaries![0].text).toBe('Upravený text komentáře.');
    });

    it('deletes a commentary with confirmation', () => {
      const initialCount = editor.verse!.commentaries!.length;
      const deleteBtn = editor.querySelector('.btn-del-comm') as HTMLButtonElement;
      expect(deleteBtn).not.toBeNull();

      deleteBtn.click();

      expect(editor.verse!.commentaries!.length).toBe(initialCount - 1);
    });
  });

  describe('LLM Context & Commentaries', () => {
    it('injects traditional commentaries into LLM prompt', () => {
      const cfg = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        contextVersesCount: 1,
        includeGlossary: true,
        targetLanguage: 'cs',
        customSystemPrompt: '',
        providerPreset: 'openai' as const
      };
      const prompt = buildUserPrompt(
        'translate',
        { verse: sampleVerseWithCommentaries },
        cfg
      );
      expect(prompt).toContain('TRADITIONAL COMMENTARIES & SCHOLARLY EXEGESIS');
      expect(prompt).toContain('Śaṅkarācārya');
      expect(prompt).toContain('Śāṅkarabhāṣya');
      expect(prompt).toContain('Advaita Vedānta');
      expect(prompt).toContain('Rāmānujācārya');
      expect(prompt).toContain('Jan Filipský & Jaroslav Vacek');
    });
  });

  describe('JSON Serialization & Deserialization', () => {
    it('roundtrips verses with full commentaries intact', () => {
      const json = JSON.stringify(sampleVerseWithCommentaries);
      const restored = VerseSchema.parse(JSON.parse(json));

      expect(restored.commentaries?.length).toBe(3);
      expect(restored.commentaries![0].author).toBe('Śaṅkarācārya');
      expect(restored.commentaries![0].tradition).toBe('Advaita Vedānta');
      expect(restored.commentaries![1].author).toBe('Rāmānujācārya');
      expect(restored.commentaries![2].author).toBe('Jan Filipský & Jaroslav Vacek');
    });
  });
});
