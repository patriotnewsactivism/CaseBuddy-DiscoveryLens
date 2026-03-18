import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from './constants';
import { analysisCache, LRUCache } from './cache';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.0-flash';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';

if (!GEMINI_API_KEY) {
  console.warn('[geminiServerService] GEMINI_API_KEY not set; Gemini provider will be unavailable.');
}

let genaiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini is not configured. Set GEMINI_API_KEY.');
  }
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return genaiClient;
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

const createAnalysisCacheKey = (
  batesNumber: string,
  contentHash: string,
  casePerspective?: string
): string => {
  return LRUCache.createKey('analyze', batesNumber, contentHash, casePerspective || 'default');
};

const createChatCacheKey = (
  query: string,
  filesHash: string,
  casePerspective?: string
): string => {
  return LRUCache.createKey('chat', query, filesHash, casePerspective || 'default');
};

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
}) {
  const hashForCache = contentHash || LRUCache.hashContent(
    textContent || textChunks?.join('') || base64Data || batesNumber + fileName
  );
  const cacheKey = createAnalysisCacheKey(batesNumber, hashForCache, casePerspective);

  if (ENABLE_CACHING) {
    const cached = await analysisCache.getCachedAnalysis<Record<string, unknown>>(cacheKey);
    if (cached !== null) {
      return cached;
    }
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
  } else if (base64Data && mimeType) {
    contentParts.push('Note: File provided. Use the content to extract information.');
  } else {
    contentParts.push('Note: No text content could be extracted. Provide a general analysis based on file metadata.');
  }

  contentParts.push(
    'INSTRUCTIONS:\n- Extract key facts, entities, dates, and relevant legal information\n- Classify the "evidenceType" accurately from the provided list\n- Provide a concise summary of the content\n- Identify sentiment/tone if applicable'
  );

  if (fileType === 'AUDIO' || fileType === 'VIDEO') {
    contentParts.push('- For audio/video without transcription, describe observable details.');
  }

  const evidenceCategoriesList = EVIDENCE_CATEGORIES.join(', ');

  const systemInstruction = `${SYSTEM_INSTRUCTION_ANALYZER}\n\nValid evidence types: ${evidenceCategoriesList}\n\nRespond with a JSON object containing: summary (string), evidenceType (one of the valid types), entities (string array), dates (string array), relevantFacts (string array), sentiment (one of: Hostile, Cooperative, Neutral).`;

  const parts: any[] = [{ text: contentParts.join('\n\n') }];

  if (base64Data && mimeType && !textContent && (!textChunks || textChunks.length === 0)) {
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }

  const client = getGenAIClient();
  const response = await client.models.generateContent({
    model: GEMINI_ANALYSIS_MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  const responseText = response.text || '{}';
  const analysisResult = JSON.parse(responseText);

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, analysisResult, CACHE_TTL_MS);
  }

  return analysisResult;
}

export async function chatWithDiscoveryServer(
  query: string,
  filesContext: ChatFileContext[],
  activeFile?: ActiveFileContext,
  casePerspective?: string
) {
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
    if (cached !== null) {
      return cached;
    }
  }

  const perspectiveText =
    casePerspective === 'defense_support'
      ? 'You are assisting defense counsel; highlight items that harm the defense as hostile and items that support the defense as cooperative.'
      : casePerspective === 'plaintiff_support'
        ? 'You are assisting a plaintiff/litigator; treat items harmful to the plaintiff as hostile and those supporting the plaintiff as cooperative.'
        : 'You are reviewing materials in your own case; align hostility/friendliness to the user perspective.';

  const textContentParts: string[] = [
    `CASE PERSPECTIVE: ${perspectiveText}`,
    contextString,
  ];

  if (activeFile) {
    textContentParts.push(`\nUSER IS CURRENTLY VIEWING FILE: ${activeFile.batesNumber}. Focus on this file.`);
    if (activeFile.transcription && activeFile.transcription.length > 50) {
      textContentParts.push(`TRANSCRIPTION OF VIEWED FILE:\n${activeFile.transcription}`);
    }
  }

  textContentParts.push(`\nUSER QUESTION: ${query}`);

  const parts: any[] = [{ text: textContentParts.join('\n\n') }];

  if (activeFile?.base64Data && activeFile.mimeType?.startsWith('image/')) {
    parts.push({ inlineData: { mimeType: activeFile.mimeType, data: activeFile.base64Data } });
  }

  const client = getGenAIClient();
  const response = await client.models.generateContent({
    model: GEMINI_CHAT_MODEL,
    contents: [{ role: 'user', parts }],
    config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT },
  });

  const result = response.text || 'I could not generate a response based on the available evidence.';

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
  }

  return result;
}

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}
