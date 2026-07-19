import { analysisCache, LRUCache } from './cache';
import { SYSTEM_INSTRUCTION_CHAT, SYSTEM_INSTRUCTION_ANALYZER, EVIDENCE_CATEGORIES } from './constants';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_CHAT_MODEL = process.env.MISTRAL_CHAT_MODEL || 'mistral-large-latest';
const MISTRAL_ANALYSIS_MODEL = process.env.MISTRAL_ANALYSIS_MODEL || 'mistral-large-latest';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

if (!MISTRAL_API_KEY) {
  console.warn('[mistralServerService] MISTRAL_API_KEY not set; Mistral provider will be unavailable.');
}

export function isMistralConfigured(): boolean {
  return Boolean(MISTRAL_API_KEY);
}

const ENABLE_CACHING = process.env.AI_ENABLE_CACHE !== 'false';
const CACHE_TTL_MS = parseInt(process.env.AI_CACHE_TTL_MS || '3600000', 10);

interface ChatFileContext {
  batesNumber: string;
  name: string;
  evidenceType: string;
  summary: string;
  relevantFacts: string[];
}

interface ActiveFileContext {
  batesNumber: string;
  transcription?: string;
  base64Data?: string;
  mimeType?: string;
}

const createChatCacheKey = (query: string, filesHash: string, casePerspective?: string): string => {
  return LRUCache.createKey('chat-mistral', query, filesHash, casePerspective || 'default');
};

const createAnalysisCacheKey = (batesNumber: string, contentHash: string, casePerspective?: string): string => {
  return LRUCache.createKey('analyze-mistral', batesNumber, contentHash, casePerspective || 'default');
};

/**
 * Text-based discovery document analysis via Mistral. Mistral's chat-completions
 * endpoint used here is text-only (no image/audio inlineData) — callers with a
 * scanned image/no extracted text should fall back to a multimodal provider
 * (OpenAI's gpt-4o vision path) instead.
 */
export async function analyzeFileServer({
  base64Data,
  mimeType,
  fileName,
  batesNumber,
  fileType,
  casePerspective,
  textContent,
  textChunks,
  metadata,
  contentHash,
}: {
  base64Data?: string;
  mimeType?: string;
  fileName: string;
  batesNumber: string;
  fileType: string;
  casePerspective?: string;
  textContent?: string;
  textChunks?: string[];
  metadata?: Record<string, unknown>;
  contentHash?: string;
}): Promise<Record<string, unknown>> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral is not configured. Set MISTRAL_API_KEY.');
  }

  const hashForCache = contentHash || LRUCache.hashContent(
    textContent || textChunks?.join('') || base64Data || batesNumber + fileName
  );
  const cacheKey = createAnalysisCacheKey(batesNumber, hashForCache, casePerspective);

  if (ENABLE_CACHING) {
    const cached = await analysisCache.getCachedAnalysis<Record<string, unknown>>(cacheKey);
    if (cached !== null) return cached;
  }

  const perspectiveText =
    casePerspective === 'defense_support'
      ? 'You are assisting defense counsel. A "hostile" sentiment means it harms the defense; "cooperative" means it supports the defense.'
      : casePerspective === 'plaintiff_support'
        ? 'You are assisting a plaintiff/litigator. A "hostile" sentiment means it harms the plaintiff; "cooperative" means it supports the plaintiff.'
        : 'You are reviewing materials in your own matter. Treat sentiment as friendly/hostile relative to the user.';

  const contentParts: string[] = [
    `Analyze this discovery file.\nBates Number: ${batesNumber}.\nFilename: ${fileName}.\nFile Type: ${fileType}.\nCase Perspective: ${perspectiveText}`,
  ];

  if (metadata) {
    contentParts.push(`File metadata: ${JSON.stringify(metadata)}`);
  }

  if (textChunks && textChunks.length > 0) {
    textChunks.forEach((chunk, idx) => {
      contentParts.push(`[Document Chunk ${idx + 1}]\n${chunk}`);
    });
  } else if (textContent) {
    contentParts.push(`DOCUMENT CONTENT:\n${textContent}`);
  } else {
    contentParts.push('Note: No text content could be extracted. Provide a general analysis based on file metadata.');
  }

  contentParts.push(
    'INSTRUCTIONS:\n- Extract key facts, entities, dates, and relevant legal information\n- Classify the "evidenceType" accurately from the provided list\n- Provide a concise summary of the content\n- Identify sentiment/tone if applicable'
  );

  const evidenceCategoriesList = EVIDENCE_CATEGORIES.join(', ');

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_ANALYSIS_MODEL,
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_INSTRUCTION_ANALYZER}\n\nValid evidence types: ${evidenceCategoriesList}\n\nRespond with a JSON object containing: summary (string), evidenceType (one of the valid types), entities (string array), dates (string array), timelineEvents (array of {date: string, description: string} pairs), relevantFacts (string array), sentiment (one of: Hostile, Cooperative, Neutral).`,
        },
        { role: 'user', content: contentParts.join('\n\n') },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const responseText = json?.choices?.[0]?.message?.content || '{}';
  const analysisResult = JSON.parse(responseText);

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, analysisResult, CACHE_TTL_MS);
  }

  return analysisResult;
}

/**
 * Text-only chat via Mistral. Note: unlike geminiServerService's version,
 * this does NOT support image/audio inlineData (Mistral's chat-completions
 * endpoint used here is text-only) — if activeFile has non-text media without
 * a transcription, that media context will be dropped. Caller should keep
 * Gemini as the path for multimodal review; this is intended for the
 * text-in/text-out chat case, which is the common path.
 */
export async function chatWithDiscoveryServer(
  query: string,
  filesContext: ChatFileContext[],
  activeFile?: ActiveFileContext,
  casePerspective?: string
): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral is not configured. Set MISTRAL_API_KEY.');
  }

  let contextString = 'Here is the summary of the discovery files available:\n';
  filesContext.forEach(f => {
    contextString += `\n--- File: ${f.batesNumber} (${f.name}) ---\n`;
    contextString += `Type: ${f.evidenceType}\n`;
    contextString += `Summary: ${f.summary}\n`;
    contextString += `Key Facts: ${f.relevantFacts.join('; ')}\n`;
  });

  const filesHash = LRUCache.hashContent(contextString);
  const cacheKey = createChatCacheKey(query, filesHash, casePerspective);

  if (ENABLE_CACHING) {
    const cached = await analysisCache.getCachedAnalysis<string>(cacheKey);
    if (cached !== null) return cached;
  }

  const perspectiveText =
    casePerspective === 'defense_support'
      ? 'You are assisting defense counsel; highlight items that harm the defense as hostile and items that support the defense as cooperative.'
      : casePerspective === 'plaintiff_support'
        ? 'You are assisting a plaintiff/litigator; treat items harmful to the plaintiff as hostile and those supporting the plaintiff as cooperative.'
        : 'You are reviewing materials in your own case; align hostility/friendliness to the user perspective.';

  const userContentParts: string[] = [`CASE PERSPECTIVE: ${perspectiveText}`, contextString];

  if (activeFile) {
    userContentParts.push(`\nUSER IS CURRENTLY VIEWING FILE: ${activeFile.batesNumber}. Focus on this file.`);
    if (activeFile.transcription && activeFile.transcription.length > 50) {
      userContentParts.push(`TRANSCRIPTION OF VIEWED FILE:\n${activeFile.transcription}`);
    }
  }

  userContentParts.push(`\nUSER QUESTION: ${query}`);

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION_CHAT },
        { role: 'user', content: userContentParts.join('\n\n') },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const result = json?.choices?.[0]?.message?.content || 'I could not generate a response based on the available evidence.';

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
  }

  return result;
}
