import {
  LLMConfig,
  LLMTaskType,
  LLMPromptContext,
  LLMExecutionResult,
  LLMTranslationResult,
  LLMAlignmentResult,
  LLMGrammarCheckResult
} from './llmTypes.ts';
import { Verse, Token, Grammar, getVerseCommentaries } from '../types/schema.ts';

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

  const langName = config.targetLanguage === 'en' ? 'English' : 'Czech';

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

  const lang = config.targetLanguage === 'en' ? 'en' : 'cs';
  const langLabel = lang === 'en' ? 'English' : 'Czech (čeština)';

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

/**
 * Execute LLM Chat Completion via standard OpenAI-compatible API
 */
export async function executeLLMTask<T = any>(
  taskType: LLMTaskType,
  context: LLMPromptContext,
  config: LLMConfig,
  customFetch: typeof fetch = window.fetch.bind(window)
): Promise<LLMExecutionResult<T>> {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(taskType, config);
  const userPrompt = buildUserPrompt(taskType, context, config);

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

  try {
    const res = await customFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      return {
        success: false,
        taskType,
        error: `Chyba LLM API (${res.status} ${res.statusText}): ${errText}`,
        promptUsed: userPrompt,
        latencyMs: Date.now() - startTime,
        modelUsed: config.model
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    if (!content) {
      return {
        success: false,
        taskType,
        error: 'LLM nevrátilo žádný obsah zprávy.',
        promptUsed: userPrompt,
        latencyMs: Date.now() - startTime,
        modelUsed: config.model
      };
    }

    let parsedData: T;
    if (taskType === 'custom') {
      try {
        parsedData = extractJsonFromResponse<T>(content);
      } catch {
        parsedData = content as unknown as T;
      }
    } else {
      parsedData = extractJsonFromResponse<T>(content);
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
    return {
      success: false,
      taskType,
      error: `Chyba spojení s LLM endpointem: ${err.message}`,
      promptUsed: userPrompt,
      latencyMs: Date.now() - startTime,
      modelUsed: config.model
    };
  }
}

/**
 * Helper to apply translation result directly to Verse
 */
export function applyTranslationToVerse(
  verse: Verse,
  result: LLMTranslationResult,
  targetLang: string = 'cs'
): Verse {
  const updatedTranslations = [...verse.translations];
  const existingIdx = updatedTranslations.findIndex((t) => t.lang === targetLang && t.type === 'fluent');

  const newEntry = {
    id: `${targetLang}_fluent`,
    label: targetLang === 'cs' ? 'Český plynulý překlad (LLM)' : 'English Fluent Translation (LLM)',
    lang: targetLang,
    type: 'fluent' as const,
    text: result.fluentTranslation,
    notes: result.commentary
  };

  if (existingIdx !== -1) {
    updatedTranslations[existingIdx] = newEntry;
  } else {
    updatedTranslations.push(newEntry);
  }

  // Also store literal if available
  if (result.literalTranslation) {
    const litIdx = updatedTranslations.findIndex((t) => t.lang === targetLang && t.type === 'literal');
    const litEntry = {
      id: `${targetLang}_literal`,
      label: targetLang === 'cs' ? 'Doslovný překlad (LLM)' : 'Literal Translation (LLM)',
      lang: targetLang,
      type: 'literal' as const,
      text: result.literalTranslation
    };
    if (litIdx !== -1) {
      updatedTranslations[litIdx] = litEntry;
    } else {
      updatedTranslations.push(litEntry);
    }
  }

  // Update commentary
  let commentaryCs = verse.commentary_cs;
  if (result.commentary) {
    commentaryCs = commentaryCs
      ? `${commentaryCs}\n\n[LLM Komentář]: ${result.commentary}`
      : `[LLM Komentář]: ${result.commentary}`;
  }

  return {
    ...verse,
    translations: updatedTranslations,
    commentary_cs: commentaryCs
  };
}

/**
 * Helper to apply token alignments to Verse
 */
export function applyAlignmentsToVerse(
  verse: Verse,
  alignResult: LLMAlignmentResult,
  targetLang: string = 'cs'
): Verse {
  const alignmentMap = new Map<string, string[]>();
  for (const a of alignResult.alignments || []) {
    if (a.tokenId && Array.isArray(a.matchedWords)) {
      alignmentMap.set(a.tokenId, a.matchedWords);
    }
  }

  const updatedTokens: Token[] = verse.tokens.map((tk) => {
    const matched = alignmentMap.get(tk.id);
    if (!matched) return tk;

    const currentMatches = { ...(tk.alignment?.matched_words || {}) };
    currentMatches[targetLang] = matched;

    return {
      ...tk,
      alignment: {
        matched_words: currentMatches
      }
    };
  });

  return {
    ...verse,
    tokens: updatedTokens
  };
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
    if (corr.suggestedIast) {
      updatedText.iast = corr.suggestedIast;
    }

    const updatedGrammar: Grammar = {
      ...(tk.grammar || {}),
      ...(corr.grammar || {})
    };

    return {
      ...tk,
      text: updatedText,
      lemma: corr.suggestedLemma || tk.lemma,
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
