// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { SAMPLE_DOCUMENT } from '../../data/sampleVerses.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  extractJsonFromResponse,
  executeLLMTask,
  applyTranslationToVerse,
  applyAlignmentsToVerse,
  applyGrammarCorrectionsToVerse,
  LLM_PROVIDER_PRESETS
} from '../llm/llmService.ts';
import { LLMConfig, LLMPromptContext } from '../llm/llmTypes.ts';
import {
  SanskritEditorElement,
  registerSanskritEditor
} from '../../components/SanskritEditor.ts';
import { registerSanskritVerse } from '../../components/SanskritVerse.ts';

describe('LLM Translation & Philological Assistant Integration', () => {
  beforeAll(() => {
    registerSanskritVerse();
    registerSanskritEditor();
  });

  const baseConfig: LLMConfig = {
    endpoint: 'https://api.openai.com/v1',
    apiKey: 'test-api-key',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    contextVersesCount: 1,
    includeGlossary: true,
    targetLanguage: 'cs',
    customSystemPrompt: '',
    providerPreset: 'openai'
  };

  describe('1. Prompt Generation & Configuration', () => {
    it('builds system prompts for all supported tasks in Czech and English', () => {
      const sysCs = buildSystemPrompt('translate', baseConfig);
      expect(sysCs).toContain('Czech');
      expect(sysCs).toContain('fluentTranslation');
      expect(sysCs).toContain('literalTranslation');

      const sysEn = buildSystemPrompt('translate', { ...baseConfig, targetLanguage: 'en' });
      expect(sysEn).toContain('English');

      const sysAlign = buildSystemPrompt('align', baseConfig);
      expect(sysAlign).toContain('alignments');
      expect(sysAlign).toContain('tokenId');

      const sysGrammar = buildSystemPrompt('grammar_check', baseConfig);
      expect(sysGrammar).toContain('tokenCorrections');
      expect(sysGrammar).toContain('vibhakti');

      const sysCritique = buildSystemPrompt('critique', baseConfig);
      expect(sysCritique).toContain('qualityScore');
      expect(sysCritique).toContain('strengths');
    });

    it('builds user prompt with context verses, token breakdown, and glossary', () => {
      const verse = SAMPLE_DOCUMENT.verses[1]; // Verse 1.2
      const prevVerse = SAMPLE_DOCUMENT.verses[0];
      const nextVerse = SAMPLE_DOCUMENT.verses[2];

      const context: LLMPromptContext = {
        verse,
        targetTranslationText: 'Jóga je zastavení myšlenkových pochodů.',
        targetLang: 'cs',
        previousVerses: [prevVerse],
        followingVerses: [nextVerse],
        glossary: {
          nirodha: {
            stem: 'nirodha',
            devanagari: 'निरोध',
            translationCs: 'zastavení, ztišení',
            translationEn: 'cessation, restraint'
          }
        }
      };

      const userPrompt = buildUserPrompt('translate', context, baseConfig);

      // Verify verse content
      expect(userPrompt).toContain('1.2');
      expect(userPrompt).toContain('citta');
      expect(userPrompt).toContain('vṛtti');

      // Verify context verses
      expect(userPrompt).toContain('PREVIOUS VERSE 1.1');
      expect(userPrompt).toContain('FOLLOWING VERSE 1.3');

      // Verify glossary
      expect(userPrompt).toContain('nirodha');
      expect(userPrompt).toContain('zastavení, ztišení');
    });
  });

  describe('2. Structured Output Parsing & Resiliency', () => {
    it('parses direct JSON responses', () => {
      const raw = '{"fluentTranslation": "Zde začíná výklad jógy.", "literalTranslation": "Nyní výklad jógy."}';
      const parsed = extractJsonFromResponse<{ fluentTranslation: string }>(raw);
      expect(parsed.fluentTranslation).toBe('Zde začíná výklad jógy.');
    });

    it('extracts JSON enclosed in markdown code fences or surrounded by commentary', () => {
      const rawWithFences = `Zde je analýza:
\`\`\`json
{
  "alignments": [
    { "tokenId": "t1", "tokenIast": "atha", "matchedWords": ["nyní"] }
  ],
  "confidence": 0.98
}
\`\`\`
Doufám, že to pomůže!`;

      const parsed = extractJsonFromResponse<{ confidence: number; alignments: any[] }>(rawWithFences);
      expect(parsed.confidence).toBe(0.98);
      expect(parsed.alignments[0].tokenIast).toBe('atha');
    });

    it('throws helpful error on malformed JSON', () => {
      expect(() => extractJsonFromResponse('Toto není JSON')).toThrow('Selhalo parsování JSON');
    });
  });

  describe('3. Execution via Mocked OpenAI-compatible API', () => {
    it('executes translation task and returns structured result', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                fluentTranslation: 'Jóga je ztišením proměn mysli.',
                literalTranslation: 'Jóga [je] zastavení vírů vědomí.',
                alternativeTranslations: ['Sjednocení je překonáním mentálních fluktuací.'],
                commentary: 'Klíčový verš klasické jógy definující pojem citta-vṛtti.'
              })
            }
          }
        ],
        model: 'gpt-4o-mini'
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const verse = SAMPLE_DOCUMENT.verses[1];
      const result = await executeLLMTask(
        'translate',
        { verse },
        baseConfig,
        mockFetch as unknown as typeof fetch
      );

      expect(result.success).toBe(true);
      expect(result.data.fluentTranslation).toContain('ztišením proměn mysli');
      expect(result.data.commentary).toContain('citta-vṛtti');

      // Verify request payload sent to fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.openai.com/v1/chat/completions');
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('handles HTTP error gracefully without crashing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Neplatný API klíč' } })
      });

      const verse = SAMPLE_DOCUMENT.verses[0];
      const result = await executeLLMTask(
        'translate',
        { verse },
        baseConfig,
        mockFetch as unknown as typeof fetch
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chyba LLM API (401 Unauthorized)');
      expect(result.error).toContain('Neplatný API klíč');
    });
  });

  describe('4. Applying LLM Results to Verse Model', () => {
    it('applies suggested translation and commentary to verse', () => {
      const verse = SAMPLE_DOCUMENT.verses[0];
      const updated = applyTranslationToVerse(
        verse,
        {
          fluentTranslation: 'Nyní začíná posvátné poučení o józe.',
          literalTranslation: 'Nyní výklad jógy.',
          commentary: 'Předpona anu- indikuje autoritativní tradici.'
        },
        'cs'
      );

      const fluent = updated.translations.find((t) => t.type === 'fluent' && t.lang === 'cs');
      expect(fluent?.text).toBe('Nyní začíná posvátné poučení o józe.');
      expect(updated.commentary_cs).toContain('autoritativní tradici');
    });

    it('applies suggested word alignments to verse tokens', () => {
      const verse = SAMPLE_DOCUMENT.verses[0];
      const updated = applyAlignmentsToVerse(
        verse,
        {
          alignments: [
            { tokenId: 't1_1', tokenIast: 'atha', matchedWords: ['Nyní'] },
            { tokenId: 't1_2', tokenIast: 'yoga', matchedWords: ['józe', 'jógy'] }
          ]
        },
        'cs'
      );

      const tkAtha = updated.tokens.find((t) => t.id === 't1_1');
      expect(tkAtha?.alignment.matched_words.cs).toEqual(['Nyní']);

      const tkYoga = updated.tokens.find((t) => t.id === 't1_2');
      expect(tkYoga?.alignment.matched_words.cs).toEqual(['józe', 'jógy']);
    });

    it('applies grammar and diacritic corrections to tokens', () => {
      const verse = SAMPLE_DOCUMENT.verses[0];
      const updated = applyGrammarCorrectionsToVerse(verse, {
        tokenCorrections: [
          {
            tokenId: 't1_1',
            tokenIast: 'atha',
            suggestedIast: 'atha',
            suggestedLemma: 'atha',
            grammar: { pos: 'indeclinable' },
            explanation: 'Tradiční mangala úvodní částice'
          }
        ],
        meterNotes: 'Prozaická sūtra bez veršového metra'
      });

      const tkAtha = updated.tokens.find((t) => t.id === 't1_1');
      expect(tkAtha?.grammar?.pos).toBe('indeclinable');
      expect(tkAtha?.sandhi_note).toContain('Tradiční mangala úvodní částice');
      expect(updated.meter_notes).toBe('Prozaická sūtra bez veršového metra');
    });
  });

  describe('5. GUI Integration in <sanskrit-editor>', () => {
    it('toggles LLM assistant panel open and closed', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(editor);

      const toggleBtn = editor.querySelector('#btn-toggle-llm-panel') as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();
      expect(editor.querySelector('.cat-llm-panel')).toBeNull();

      // Open panel
      toggleBtn.click();
      const panel = editor.querySelector('.cat-llm-panel');
      expect(panel).not.toBeNull();
      expect(editor.innerHTML).toContain('Filologický &amp; Překladatelský Asistent (LLM)');

      // Close panel
      const closeBtn = editor.querySelector('#btn-close-llm-panel') as HTMLButtonElement;
      closeBtn.click();
      expect(editor.querySelector('.cat-llm-panel')).toBeNull();

      document.body.removeChild(editor);
    });

    it('switches between LLM sub-tasks and configures presets in Settings tab', () => {
      const editor = document.createElement('sanskrit-editor') as SanskritEditorElement;
      editor.document = SAMPLE_DOCUMENT;
      editor.verse = SAMPLE_DOCUMENT.verses[0];
      document.body.appendChild(editor);

      // Open panel
      (editor.querySelector('#btn-toggle-llm-panel') as HTMLButtonElement).click();

      // Switch to Settings tab
      const settingsTabBtn = editor.querySelector('[data-llm-task="custom"]') as HTMLButtonElement;
      settingsTabBtn.click();

      // Verify settings controls
      const presetSelect = editor.querySelector('#llm-preset-select') as HTMLSelectElement;
      const endpointInput = editor.querySelector('#llm-endpoint-input') as HTMLInputElement;
      const modelInput = editor.querySelector('#llm-model-input') as HTMLInputElement;
      expect(presetSelect).not.toBeNull();
      expect(endpointInput).not.toBeNull();
      expect(modelInput).not.toBeNull();

      // Change preset to Ollama (local)
      presetSelect.value = 'ollama';
      presetSelect.dispatchEvent(new Event('change'));

      // Check auto-filled endpoint & model
      const updatedEndpoint = (editor.querySelector('#llm-endpoint-input') as HTMLInputElement).value;
      const updatedModel = (editor.querySelector('#llm-model-input') as HTMLInputElement).value;
      expect(updatedEndpoint).toBe(LLM_PROVIDER_PRESETS.ollama.endpoint);
      expect(updatedModel).toBe(LLM_PROVIDER_PRESETS.ollama.defaultModel);

      document.body.removeChild(editor);
    });
  });
});
