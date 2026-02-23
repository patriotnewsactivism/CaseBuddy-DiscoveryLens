import OpenAI from 'openai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from './constants';
import { analysisCache, LRUCache } from './cache';

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please add your OpenAI API key to .env');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (error?.status === 429 || error?.message?.includes('429')) {
        const match = error?.message?.match(/try again in ([\d.]+)s/i);
        const waitTime = match 
          ? Math.ceil(parseFloat(match[1]) * 1000) + 500
          : initialDelayMs * Math.pow(2, attempt);
        
        console.log(`[retryWithBackoff] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitTime);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

const ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';

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
  console.log('[analyzeFileServer] Starting analysis:', {
    fileName,
    batesNumber,
    fileType,
    mimeType,
    hasTextContent: !!textContent,
    textContentLength: textContent?.length || 0,
    hasTextChunks: !!textChunks,
    chunkCount: textChunks?.length || 0,
    hasBase64Data: !!base64Data,
    base64DataLength: base64Data?.length || 0,
    casePerspective,
  });

  const hashForCache = contentHash || LRUCache.hashContent(
    textContent || textChunks?.join('') || base64Data || batesNumber + fileName
  );
  const cacheKey = createAnalysisCacheKey(batesNumber, hashForCache, casePerspective);

  if (ENABLE_CACHING) {
    const cached = await analysisCache.getCachedAnalysis<Record<string, unknown>>(cacheKey);
    if (cached !== null) {
      console.log('[analyzeFileServer] Returning cached result');
      return cached;
    }
  }

  // Check if we have any content to analyze
  const hasTextContent = (textContent && textContent.length > 0) || (textChunks && textChunks.length > 0);
  const isImage = mimeType?.startsWith('image/');
  const hasBinaryData = base64Data && base64Data.length > 0;

  if (!hasTextContent && !isImage && !hasBinaryData) {
    console.warn('[analyzeFileServer] No content available for analysis:', {
      fileName,
      batesNumber,
      mimeType,
    });
    // Return a minimal analysis result with a warning
    return {
      summary: `Unable to extract text content from ${fileName}. The file may be a binary format that requires OCR or transcription.`,
      evidenceType: 'Uncategorized',
      entities: [],
      dates: [],
      relevantFacts: ['Document content could not be extracted for analysis.'],
      sentiment: 'Neutral' as const,
    };
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
  } else if (!isImage) {
    contentParts.push('Note: No text content could be extracted. Provide a general analysis based on file metadata.');
  }

  contentParts.push(
    'INSTRUCTIONS:\n- Extract key facts, entities, dates, and relevant legal information\n- Classify the "evidenceType" accurately from the provided list\n- Provide a concise summary of the content\n- Identify sentiment/tone if applicable'
  );

  if (fileType === 'AUDIO' || fileType === 'VIDEO') {
    contentParts.push('- For audio/video without transcription, describe observable details.');
  }

  const evidenceCategoriesList = EVIDENCE_CATEGORIES.join(', ');

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_INSTRUCTION_ANALYZER}\n\nValid evidence types: ${evidenceCategoriesList}\n\nRespond with a JSON object containing: summary (string), evidenceType (one of the valid types), entities (string array), dates (string array), relevantFacts (string array), sentiment (one of: Hostile, Cooperative, Neutral).`,
    },
    {
      role: 'user',
      content: contentParts.join('\n\n'),
    },
  ];

  if (base64Data && mimeType?.startsWith('image/')) {
    messages[1] = {
      role: 'user',
      content: [
        { type: 'text', text: contentParts.join('\n\n') },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
      ],
    };
  }

  console.log('[analyzeFileServer] Sending request to OpenAI, message count:', messages.length);
  
  const response = await getOpenAIClient().chat.completions.create({
    model: ANALYSIS_MODEL,
    messages,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content || '{}';
  console.log('[analyzeFileServer] Received response, length:', responseText.length);
  
  const analysisResult = JSON.parse(responseText);
  console.log('[analyzeFileServer] Parsed result:', {
    hasSummary: !!analysisResult.summary,
    evidenceType: analysisResult.evidenceType,
    entityCount: analysisResult.entities?.length || 0,
  });

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

  const textContent = [
    `CASE PERSPECTIVE: ${perspectiveText}`,
    contextString,
  ];

  if (activeFile) {
    textContent.push(`\nUSER IS CURRENTLY VIEWING FILE: ${activeFile.batesNumber}. Focus on this file.`);

    if (activeFile.transcription && activeFile.transcription.length > 50) {
      textContent.push(`TRANSCRIPTION OF VIEWED FILE:\n${activeFile.transcription}`);
    } else if (activeFile.base64Data && activeFile.mimeType?.startsWith('image/')) {
      const imageContent: OpenAI.ChatCompletionContentPart[] = [
        { type: 'text', text: textContent.join('\n\n') },
        { type: 'image_url', image_url: { url: `data:${activeFile.mimeType};base64,${activeFile.base64Data}` } },
      ];
      
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_INSTRUCTION_CHAT },
        { role: 'user', content: imageContent },
      ];

      const response = await getOpenAIClient().chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_tokens: 4096,
      });

      const result = response.choices[0]?.message?.content || 'I could not generate a response based on the available evidence.';
      
      if (ENABLE_CACHING) {
        analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
      }
      
      return result;
    }
  }

  textContent.push(`\nUSER QUESTION: ${query}`);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION_CHAT },
    { role: 'user', content: textContent.join('\n\n') },
  ];

  const response = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    max_tokens: 4096,
  });

  const result = response.choices[0]?.message?.content || 'I could not generate a response based on the available evidence.';

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
  }

  return result;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
