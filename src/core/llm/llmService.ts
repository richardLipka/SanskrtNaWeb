import {
  LLMConfig,
  LLMTaskType,
  LLMPromptContext,
  LLMExecutionResult,
  LLMTranslationResult,
  LLMAlignmentResult,
  LLMGrammarCheckResult
} from './llmTypes.ts';
import { Verse, Token, Grammar, GrammarSchema, getVerseCommentaries } from '../types/schema.ts';
import { iastToDevanagari } from '../transliteration/engine.ts';

const LANGUAGE_NAMES: Record<string, string> = {
  cs: 'Czech',
  en: 'English',
  sk: 'Slovak',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pl: 'Polish',
  ru: 'Russian'
};

function languageName(code: string | undefined): string {
  const key = (code || 'cs').toLowerCase();
  return LANGUAGE_NAMES[key] || key;
}

export const LLM_PROVIDER_PRESETS: Record<
  string,
  { name: string; endpoint: string; defaultModel: string; note: string }
> = {
  openai: {
    name: 'OpenAI (GPT-4o, GPT-4o-mini)',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    note: 'Oficiální OpenAI API (vyžaduje OpenAI API klíč)'
  },
  gemini: {
    name: 'Google Gemini (OpenAI Compat)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    note: 'Google AI Studio klíč kompatibilní s OpenAI protokolem'
  },
  groq: {
    name: 'Groq Cloud (Llama 3.3, Mixtral)',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    note: 'Extrémně rychlá inference modelů Llama 3 & Mixtral'
  },
  openrouter: {
    name: 'OpenRouter (Multi-model)',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    note: 'Přístup k desítkám modelů (Claude, Llama, Gemini, DeepSeek)'
  },
  ollama: {
    name: 'Ollama (Lokální běh na PC)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    note: 'Zcela zdarma a offline na vašem vlastním počítači bez odesílání dat'
  },
  lmstudio: {
    name: 'LM Studio (Lokální běh)',
    endpoint: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    note: 'Lokální server běžící v LM Studio'
  },
  custom: {
    name: 'Vlastní OpenAI-kompatibilní endpoint',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    note: 'Libovolný vlastní proxy nebo vLLM server'
  }
};

/**
 * Build rigorous system prompt for philological Sanskrit tasks
 */
export function buildSystemPrompt(taskType: LLMTaskType, config: LLMConfig): string {
  if (config.customSystemPrompt && config.customSystemPrompt.trim()) {
    return config.customSystemPrompt.trim();
  }

  const langName = languageName(config.targetLanguage);

  const basePreamble = `You are an elite academic Sanskritologist, classical philologist, and expert literary translator.
You have native-level command of classical Sanskrit (Pāṇinian grammar, Aṣṭādhyāyī, Sandhi rules, Chandas metrics) and modern literary ${langName}.
You provide rigorous, accurate, context-aware analyses without hallucinating grammar or vocabulary.
CRITICAL INSTRUCTION: You MUST return strictly valid JSON matching the requested schema. Do not include markdown code block backticks unless strictly required, and do not include commentary outside the JSON object.`;

  switch (taskType) {
    case 'translate':
      return `${basePreamble}
Your task is to provide an accurate, nuanced translation of the Sanskrit verse into ${langName}.
Provide:
1. "fluentTranslation": Elegant literary translation respecting natural ${langName} syntax and cadence.
2. "literalTranslation": Precise word-for-word scholarly translation.
3. "alternativeTranslations": Array of alternative interpretive nuances.
4. "commentary": Detailed philological and philosophical commentary explaining key concepts (e.g. citta-vṛtti, dharma, yoga).
5. "wordByWord": Array of objects { "tokenText": string, "meaning": string, "grammar": string }.`;

    case 'align':
      return `${basePreamble}
Your task is to establish exact word-level alignments (pairings) between Sanskrit source tokens and the words in the provided translation text.
For each Sanskrit token (identified by its tokenId and IAST text), list the exact corresponding word or words that translate it in the target text.
Respond with JSON matching:
{
  "alignments": [
    { "tokenId": "token_id_string", "tokenIast": "iast_word", "matchedWords": ["word1", "word2"] }
  ],
  "confidence": 0.95,
  "notes": "brief alignment commentary"
}`;

    case 'grammar_check':
      return `${basePreamble}
Your task is to proofread Sanskrit orthography, Sandhi word-boundaries, and grammatical analyses (vibhakti case 1-8, gender, number, verbal lakāra) for tokens in the verse.
DO NOT change the source meaning. Only correct inaccuracies in token splits, IAST diacritics, or morphological labels.
Respond with JSON matching:
{
  "tokenCorrections": [
    {
      "tokenId": "token_id",
      "tokenIast": "current_iast",
      "suggestedIast": "corrected_iast",
      "suggestedLemma": "canonical_stem_or_root",
      "grammar": {
        "pos": "noun|verb|adjective|indeclinable|pronoun|participle|prefix|particle",
        "case": "nominative|accusative|instrumental|dative|ablative|genitive|locative|vocative|stem_in_compound",
        "gender": "masculine|feminine|neuter|any",
        "number": "singular|dual|plural",
        "person": "1st|2nd|3rd",
        "voice": "active|middle|passive",
        "tense": "present|imperfect|perfect|future|aorist"
      },
      "explanation": "philological rationale"
    }
  ],
  "meterNotes": "notes on meter / chandas",
  "sandhiNotes": "notes on sandhi splitting",
  "orthographyNotes": "notes on IAST diacritics"
}`;

    case 'critique':
      return `${basePreamble}
Your task is to review and critique an existing translation of the verse.
Analyze faithfulness, terminological consistency, philosophical depth, and naturalness in ${langName}.
Respond with JSON matching:
{
  "qualityScore": 88,
  "strengths": ["point 1", "point 2"],
  "suggestions": ["improvement 1", "improvement 2"],
  "philosophicalContext": "relevant context",
  "meterAnalysis": "rhythm and poetic resonance"
}`;

    case 'custom':
    default:
      return `${basePreamble}
Respond to the user prompt with helpful, scholarly insights in structured JSON or clean Markdown as appropriate.`;
  }
}

/**
 * Build contextual user prompt with previous/next verses and glossary
 */
export function buildUserPrompt(
  taskType: LLMTaskType,
  context: LLMPromptContext,
  config: LLMConfig
): string {
  const v = context.verse;
  const deva = typeof v.scripts.devanagari === 'string' ? v.scripts.devanagari : v.scripts.devanagari?.text || '';
  const iast = typeof v.scripts.iast === 'string' ? v.scripts.iast : v.scripts.iast?.text || '';

  const lang = (config.targetLanguage || 'cs').toLowerCase();
  const langLabel = lang === 'cs' ? 'Czech (čeština)' : languageName(lang);

  // Build token summary
  const tokenLines = (v.tokens || []).map((t) => {
    const gram = t.grammar
      ? `[${t.grammar.pos || ''} ${t.grammar.case || ''} ${t.grammar.gender || ''} ${t.grammar.number || ''}]`.trim()
      : '';
    const meaning = t.vocabulary?.meanings_by_lang?.[lang]?.contextual ||
      (lang === 'cs' ? t.vocabulary?.contextual_meaning_cs : t.vocabulary?.contextual_meaning_en) ||
      '';
    return `- Token ID: "${t.id}", IAST: "${t.text.iast}", Devanāgarī: "${t.text.devanagari}", Lemma: "${t.lemma || ''}", Grammar: ${gram}, Meanings: "${meaning}"`;
  }).join('\n');

  // Build context verses (N-1, N+1)
  let contextSection = '';
  if (config.contextVersesCount > 0) {
    const prevs = context.previousVerses || [];
    const nexts = context.followingVerses || [];

    if (prevs.length > 0 || nexts.length > 0) {
      contextSection += '\n--- BROADER CONTEXT (Surrounding Verses) ---\n';
      for (const pv of prevs) {
        const pDeva = typeof pv.scripts.devanagari === 'string' ? pv.scripts.devanagari : pv.scripts.devanagari?.text || '';
        const pIast = typeof pv.scripts.iast === 'string' ? pv.scripts.iast : pv.scripts.iast?.text || '';
        const pTrans = pv.translations?.find((tr) => tr.lang === lang)?.text || pv.translations?.[0]?.text || '';
        contextSection += `[PREVIOUS VERSE ${pv.number}]\nDevanāgarī: ${pDeva}\nIAST: ${pIast}\nTranslation: ${pTrans}\n\n`;
      }
      for (const nv of nexts) {
        const nDeva = typeof nv.scripts.devanagari === 'string' ? nv.scripts.devanagari : nv.scripts.devanagari?.text || '';
        const nIast = typeof nv.scripts.iast === 'string' ? nv.scripts.iast : nv.scripts.iast?.text || '';
        const nTrans = nv.translations?.find((tr) => tr.lang === lang)?.text || nv.translations?.[0]?.text || '';
        contextSection += `[FOLLOWING VERSE ${nv.number}]\nDevanāgarī: ${nDeva}\nIAST: ${nIast}\nTranslation: ${nTrans}\n\n`;
      }
    }
  }

  // Build glossary section
  let glossarySection = '';
  if (config.includeGlossary && context.glossary && Object.keys(context.glossary).length > 0) {
    const terms = Object.values(context.glossary)
      .slice(0, 30)
      .map((g) => `- Stem: "${g.stem}" (${g.devanagari}) => CS: "${g.translationCs}", EN: "${g.translationEn}"${g.notes ? ` (${g.notes})` : ''}`)
      .join('\n');
    glossarySection = `\n--- ESTABLISHED PROJECT GLOSSARY ---\nMaintain consistency with these established terms:\n${terms}\n`;
  }

  // Existing commentaries section (traditional & modern scholarly exegesis)
  let commentariesSection = '';
  const comms = getVerseCommentaries(v);
  if (comms.length > 0) {
    commentariesSection = '\n--- TRADITIONAL COMMENTARIES & SCHOLARLY EXEGESIS ---\n' +
      comms.map((c) => `[${c.author}${c.tradition ? ` - ${c.tradition}` : ''}${c.title ? ` - ${c.title}` : ''} (${c.lang.toUpperCase()})]:\n${c.text}`).join('\n\n') + '\n';
  }

  // Current translation text
  const currentTrans = context.targetTranslationText ||
    v.translations?.find((tr) => tr.lang === lang)?.text ||
    v.translations?.[0]?.text ||
    '';

  let specificPrompt = '';
  switch (taskType) {
    case 'translate':
      specificPrompt = `TASK: Translate Verse ${v.number} into ${langLabel}.
${currentTrans ? `Current draft translation to consider and improve:\n"${currentTrans}"\n` : 'Create a fresh high-quality translation.\n'}
Return strictly JSON with keys:
"fluentTranslation" (string), "literalTranslation" (string), "alternativeTranslations" (array of strings), "commentary" (string), "wordByWord" (array of objects { tokenText, meaning, grammar }).`;
      break;

    case 'align':
      specificPrompt = `TASK: Pair Sanskrit tokens to the words in this translation text:
TRANSLATION TEXT: "${currentTrans}"

Tokens to align:
${tokenLines}

Return strictly JSON with key "alignments" containing:
[{ "tokenId": "string", "tokenIast": "string", "matchedWords": ["word1", "word2"] }].
Ensure every significant Sanskrit token is mapped to its translation words in the text.`;
      break;

    case 'grammar_check':
      specificPrompt = `TASK: Check and proofread the Sanskrit grammar, orthography, and Sandhi for Verse ${v.number}.
Tokens to verify:
${tokenLines}

Return strictly JSON with key "tokenCorrections" (list of corrections needed, empty if fully correct), "meterNotes", "sandhiNotes", "orthographyNotes".`;
      break;

    case 'critique':
      specificPrompt = `TASK: Review and critique this translation against the original Sanskrit:
TRANSLATION TEXT: "${currentTrans}"

Analyze accuracy, tone, fidelity to classical Indian philosophy, and style in ${langLabel}.
Return strictly JSON with keys: "qualityScore" (number 0-100), "strengths" (array), "suggestions" (array), "philosophicalContext" (string), "meterAnalysis" (string).`;
      break;

    case 'custom':
    default:
      specificPrompt = context.customInstruction || `Analyze verse ${v.number} and provide insights in ${langLabel}.`;
      break;
  }

  return `=== SANSKRIT TARGET VERSE ===
Book / Chapter: ${v.book || context.bookTitle || ''} ${v.chapter || context.chapterTitle || ''}
Verse Number: ${v.number}
Meter: ${v.meter || 'Unknown'}

Devanāgarī:
${deva}

IAST:
${iast}

Tokens Breakdown:
${tokenLines}
${contextSection}${glossarySection}${commentariesSection}
=== TASK INSTRUCTION ===
${specificPrompt}`;
}

/**
 * Safely parse JSON from LLM response (handling ```json code blocks or extra whitespace)
 */
export function extractJsonFromResponse<T = any>(text: string): T {
  if (!text || typeof text !== 'string') {
    throw new Error('Prázdná odpověď od LLM.');
  }

  let cleaned = text.trim();

  // Strip Markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();
  }

  // If there's extra text before/after JSON object or array, extract the main JSON block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    throw new Error(`Selhalo parsování JSON odpovědi od LLM: ${err.message}\nOdpověď byla: ${text.slice(0, 300)}...`);
  }
}

export interface LLMRequestOptions {
  /** Abort signal to cancel the request (e.g. when the user navigates away) */
  signal?: AbortSignal;
  /** Request timeout in milliseconds (default 120 s, 0 disables) */
  timeoutMs?: number;
}

/**
 * Execute LLM Chat Completion via standard OpenAI-compatible API
 */
export async function executeLLMTask<T = any>(
  taskType: LLMTaskType,
  context: LLMPromptContext,
  config: LLMConfig,
  customFetch?: typeof fetch,
  options: LLMRequestOptions = {}
): Promise<LLMExecutionResult<T>> {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(taskType, config);
  const userPrompt = buildUserPrompt(taskType, context, config);
  const doFetch: typeof fetch = customFetch || globalThis.fetch.bind(globalThis);

  const fail = (error: string, rawResponse?: string): LLMExecutionResult<T> => ({
    success: false,
    taskType,
    error,
    rawResponse,
    promptUsed: userPrompt,
    latencyMs: Date.now() - startTime,
    modelUsed: config.model
  });

  // Normalize endpoint URL (strip trailing slashes)
  let endpoint = (config.endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey && config.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  // Request payload conforming to OpenAI Chat Completions API
  const body: any = {
    model: config.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: config.temperature ?? 0.2
  };

  // Enable JSON mode if not a custom freeform prompt
  if (taskType !== 'custom') {
    body.response_format = { type: 'json_object' };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = options.timeoutMs ?? 120000;
  const timer = controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const onExternalAbort = () => controller?.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  const post = (payload: any) => doFetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller?.signal
  });

  const readError = async (res: Response): Promise<string> => {
    let text = '';
    try {
      if (typeof res.text === 'function') {
        text = await res.text();
        const json = JSON.parse(text);
        return json?.error?.message || JSON.stringify(json);
      }
      const json = await res.json();
      return json?.error?.message || JSON.stringify(json);
    } catch {
      return text;
    }
  };

  try {
    let res = await post(body);

    // Some OpenAI-compatible servers (e.g. LM Studio, older vLLM) reject JSON mode;
    // retry once without response_format and rely on the prompt + JSON extraction.
    if (!res.ok && res.status === 400 && body.response_format) {
      const errText = await readError(res);
      if (/response_format|json_object|json mode/i.test(errText)) {
        const { response_format: _omit, ...withoutJsonMode } = body;
        res = await post(withoutJsonMode);
      } else {
        return fail(`Chyba LLM API (${res.status} ${res.statusText}): ${errText}`);
      }
    }

    if (!res.ok) {
      return fail(`Chyba LLM API (${res.status} ${res.statusText}): ${await readError(res)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    if (!content) {
      return fail('LLM nevrátilo žádný obsah zprávy.');
    }

    let parsedData: T;
    try {
      parsedData = extractJsonFromResponse<T>(content);
    } catch (parseErr: any) {
      if (taskType !== 'custom') {
        return fail(parseErr.message, content);
      }
      parsedData = content as unknown as T;
    }

    return {
      success: true,
      taskType,
      data: parsedData,
      rawResponse: content,
      promptUsed: userPrompt,
      latencyMs: Date.now() - startTime,
      modelUsed: data?.model || config.model
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return fail(options.signal?.aborted
        ? 'Požadavek na LLM byl zrušen.'
        : `Vypršel časový limit požadavku na LLM (${Math.round(timeoutMs / 1000)} s).`);
    }
    return fail(`Chyba spojení s LLM endpointem: ${err?.message || err}`);
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Helper to apply translation result directly to Verse
 */
export function applyTranslationToVerse(
  verse: Verse,
  result: LLMTranslationResult,
  targetLang: string = 'cs',
  options: { translationId?: string; model?: string } = {}
): Verse {
  const updatedTranslations = [...verse.translations];
  const isCs = targetLang === 'cs';

  // Update the active (or first fluent) translation in place, keeping its id, label and
  // author so that word alignments keyed by the translation id stay valid.
  const fluentIdx = options.translationId
    ? updatedTranslations.findIndex((t) => t.id === options.translationId)
    : updatedTranslations.findIndex((t) => t.lang === targetLang && t.type === 'fluent');

  if (result.fluentTranslation) {
    if (fluentIdx !== -1) {
      updatedTranslations[fluentIdx] = {
        ...updatedTranslations[fluentIdx],
        text: result.fluentTranslation
      };
    } else {
      updatedTranslations.push({
        id: `${targetLang}_fluent`,
        label: isCs ? 'Český plynulý překlad (LLM)' : `Fluent Translation (LLM, ${targetLang})`,
        lang: targetLang,
        type: 'fluent',
        text: result.fluentTranslation
      });
    }
  }

  // Also store literal if available
  if (result.literalTranslation) {
    const litIdx = updatedTranslations.findIndex((t) => t.lang === targetLang && t.type === 'literal');
    if (litIdx !== -1) {
      updatedTranslations[litIdx] = { ...updatedTranslations[litIdx], text: result.literalTranslation };
    } else {
      updatedTranslations.push({
        id: `${targetLang}_literal`,
        label: isCs ? 'Doslovný překlad (LLM)' : `Literal Translation (LLM, ${targetLang})`,
        lang: targetLang,
        type: 'literal',
        text: result.literalTranslation
      });
    }
  }

  // LLM commentary becomes a structured commentary entry (legacy fields are materialized
  // first, otherwise they would be hidden once the structured list is non-empty).
  let commentaries = verse.commentaries;
  if (result.commentary) {
    commentaries = [
      ...getVerseCommentaries(verse),
      {
        id: `comm_llm_${Date.now()}`,
        author: options.model ? `LLM (${options.model})` : 'AI / LLM Asistent',
        tradition: isCs ? 'Filologická syntéza (LLM)' : 'Philological synthesis (LLM)',
        title: isCs ? 'Výklad verše' : 'Verse commentary',
        lang: targetLang,
        text: result.commentary,
        isOriginalSanskrit: false
      }
    ];
  }

  return {
    ...verse,
    translations: updatedTranslations,
    commentaries
  };
}

/**
 * Resolves the alignment key for a verse: alignments are keyed by translation id
 * (e.g. "cs_fluent"). A language code is mapped to that language's fluent translation.
 */
export function resolveAlignmentKey(verse: Verse, translationIdOrLang: string): string {
  if (verse.translations.some((t) => t.id === translationIdOrLang)) return translationIdOrLang;
  const sameLang = verse.translations.filter((t) => t.lang === translationIdOrLang);
  const preferred = sameLang.find((t) => t.type === 'fluent') || sameLang[0];
  return preferred ? preferred.id : translationIdOrLang;
}

/**
 * Helper to apply token alignments to Verse
 */
export function applyAlignmentsToVerse(
  verse: Verse,
  alignResult: LLMAlignmentResult,
  translationIdOrLang: string = 'cs'
): Verse {
  const key = resolveAlignmentKey(verse, translationIdOrLang);
  const alignmentMap = new Map<string, string[]>();
  for (const a of alignResult.alignments || []) {
    if (a.tokenId && Array.isArray(a.matchedWords)) {
      alignmentMap.set(a.tokenId, a.matchedWords.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim()));
    }
  }

  const updatedTokens: Token[] = verse.tokens.map((tk) => {
    const matched = alignmentMap.get(tk.id);
    if (!matched) return tk;

    return {
      ...tk,
      alignment: {
        matched_words: { ...(tk.alignment?.matched_words || {}), [key]: matched }
      }
    };
  });

  return {
    ...verse,
    tokens: updatedTokens
  };
}

/**
 * Keeps only grammar fields whose values are valid according to GrammarSchema,
 * so that a hallucinated value (e.g. pos "adverb") cannot make the document invalid.
 */
function sanitizeGrammar(raw: unknown): Partial<Grammar> {
  if (!raw || typeof raw !== 'object') return {};
  const shape = GrammarSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;
  const clean: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    const validator = shape[field];
    if (!validator || value === null || value === undefined || value === '') continue;
    const parsed = validator.safeParse(value);
    if (parsed.success && parsed.data !== undefined) clean[field] = parsed.data;
  }
  return clean as Partial<Grammar>;
}

/**
 * Helper to apply grammatical corrections to Verse tokens
 */
export function applyGrammarCorrectionsToVerse(
  verse: Verse,
  grammarResult: LLMGrammarCheckResult
): Verse {
  const correctionMap = new Map<string, any>();
  for (const c of grammarResult.tokenCorrections || []) {
    if (c.tokenId) {
      correctionMap.set(c.tokenId, c);
    }
  }

  const updatedTokens: Token[] = verse.tokens.map((tk) => {
    const corr = correctionMap.get(tk.id);
    if (!corr) return tk;

    const updatedText = { ...tk.text };
    if (typeof corr.suggestedIast === 'string' && corr.suggestedIast.trim() && corr.suggestedIast.trim() !== tk.text.iast) {
      updatedText.iast = corr.suggestedIast.trim();
      // Keep the Devanagari form in sync with the corrected IAST
      updatedText.devanagari = iastToDevanagari(updatedText.iast);
    }

    const updatedGrammar: Grammar = {
      ...(tk.grammar || {}),
      ...sanitizeGrammar(corr.grammar)
    };

    return {
      ...tk,
      text: updatedText,
      lemma: (typeof corr.suggestedLemma === 'string' && corr.suggestedLemma.trim()) || tk.lemma,
      grammar: updatedGrammar,
      sandhi_note: corr.explanation ? `Oprava: ${corr.explanation}` : tk.sandhi_note
    };
  });

  return {
    ...verse,
    tokens: updatedTokens,
    meter_notes: grammarResult.meterNotes || verse.meter_notes
  };
}
