import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, SYSTEM_INSTRUCTION_INSIGHTS, EVIDENCE_CATEGORIES } from './constants';
import { analysisCache, LRUCache } from './cache';
import { sanitizeHighlights, buildInsightsPrompt, type CaseHighlight, type InsightsFileContext } from './insightsTypes';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-2.5-flash is the model version proven working in production across
// CaseBuddy (lexsim) and case-companion's OCR fallback path. Keep DiscoveryLens
// in sync with that rather than the older 2.0 line. Override via env if needed.
const GEMINI_ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-flash-latest';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-flash-latest';

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

/**
 * Robust JSON parsing with corrective retry
 */
async function robustJsonParseAndRetry<T>(
  jsonText: string,
  client: GoogleGenAI,
  model: string,
  systemInstruction: string,
  originalContents: any[]
): Promise<T> {
  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.warn('[robustJsonParseAndRetry] First JSON parse attempt failed. Retrying with corrective prompt...');
    try {
      const retryResponse = await client.models.generateContent({
        model,
        contents: [
          ...originalContents,
          { role: 'model', parts: [{ text: jsonText }] },
          { role: 'user', parts: [{ text: 'Your previous response was not valid JSON. Please correct it and return ONLY valid JSON without markdown wrapping.' }] }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        }
      });
      const retryText = retryResponse.text || '{}';
      return JSON.parse(retryText) as T;
    } catch (retryError) {
      console.error('[robustJsonParseAndRetry] Corrective retry also failed:', retryError);
      throw error; // Throw the original parse error or let this throw
    }
  }
}

/**
 * Helper to process an array in batches with limited concurrency
 */
async function batchWithConcurrency<T, R>(
  items: T[],
  batchSize: number,
  concurrencyLimit: number,
  fn: (batch: T[], batchIdx: number) => Promise<R>
): Promise<R[]> {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const results: R[] = [];
  for (let i = 0; i < batches.length; i += concurrencyLimit) {
    const currentBatches = batches.slice(i, i + concurrencyLimit);
    const chunkPromises = currentBatches.map((batch, offset) => fn(batch, i + offset));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  return results;
}

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

  const evidenceCategoriesList = EVIDENCE_CATEGORIES.join(', ');
  const systemInstruction = `${SYSTEM_INSTRUCTION_ANALYZER}\n\nValid evidence types: ${evidenceCategoriesList}\n\nRespond with a JSON object containing: summary (string), evidenceType (one of the valid types), entities (string array), dates (string array), timelineEvents (array of {date: string, description: string} pairs - one per distinct event, see instructions above), relevantFacts (string array), sentiment (one of: Hostile, Cooperative, Neutral).`;

  const client = getGenAIClient();

  // Threshold for Map-Reduce: > 15 chunks
  if (textChunks && textChunks.length > 15) {
    console.log(`[analyzeFileServer] Chunks (${textChunks.length}) exceed threshold of 15. Initiating Map-Reduce architecture...`);
    
    // Batch size: 12 chunks (approx 96K characters, well within single-call safety bounds)
    // Concurrency: 3 simultaneous requests to avoid rate limits
    const partialResults = await batchWithConcurrency<string, any>(
      textChunks,
      12,
      3,
      async (batchChunks, idx) => {
        const batchContent = [
          `Analyze this discovery file segment (Batch ${idx + 1}).\nBates Number: ${batesNumber}.\nFilename: ${fileName}.\nFile Type: ${fileType}.\nCase Perspective: ${perspectiveText}`,
        ];
        if (metadata) {
          batchContent.push(`File metadata: ${JSON.stringify(metadata)}`);
        }
        batchChunks.forEach((chunk, chunkIdx) => {
          batchContent.push(`[Document Chunk ${chunkIdx + 1}]\n${chunk}`);
        });

        batchContent.push(
          'INSTRUCTIONS:\n- Extract key facts, entities, dates, and relevant legal information from this batch.\n- Provide a concise summary of the content.'
        );

        const batchSystemInstruction = `You are a helper segment analyzer. Extract a list of: key facts (string array), entities (string array), dates (string array), timelineEvents (array of {date: string, description: string} pairs), and a summary of this batch. Return ONLY valid JSON format with keys: "summary", "entities", "dates", "timelineEvents", "relevantFacts".`;

        const response = await client.models.generateContent({
          model: GEMINI_ANALYSIS_MODEL,
          contents: [{ role: 'user', parts: [{ text: batchContent.join('\n\n') }] }],
          config: {
            systemInstruction: batchSystemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        return robustJsonParseAndRetry<any>(text, client, GEMINI_ANALYSIS_MODEL, batchSystemInstruction, [
          { role: 'user', parts: [{ text: batchContent.join('\n\n') }] }
        ]);
      }
    );

    console.log(`[analyzeFileServer] Map phase completed with ${partialResults.length} partial summaries. Executing Reduce phase...`);

    // Combine partial summaries and extractions for the final synthesis call
    const reducePromptContent: string[] = [
      `Synthesize these partial analyses into a single, unified, cohesive document-level analysis.\nBates Number: ${batesNumber}.\nFilename: ${fileName}.\nFile Type: ${fileType}.\nCase Perspective: ${perspectiveText}\n\nHere are the partial batch results:`,
    ];

    partialResults.forEach((result, idx) => {
      reducePromptContent.push(`[Batch ${idx + 1} Partial Summary]:\n${result.summary || ''}`);
      if (result.relevantFacts && result.relevantFacts.length > 0) {
        reducePromptContent.push(`[Batch ${idx + 1} Key Facts]:\n${JSON.stringify(result.relevantFacts)}`);
      }
      if (result.timelineEvents && result.timelineEvents.length > 0) {
        reducePromptContent.push(`[Batch ${idx + 1} Timeline Events]:\n${JSON.stringify(result.timelineEvents)}`);
      }
      if (result.entities && result.entities.length > 0) {
        reducePromptContent.push(`[Batch ${idx + 1} Entities]:\n${JSON.stringify(result.entities)}`);
      }
      if (result.dates && result.dates.length > 0) {
        reducePromptContent.push(`[Batch ${idx + 1} Dates]:\n${JSON.stringify(result.dates)}`);
      }
    });

    reducePromptContent.push(
      'FINAL INSTRUCTIONS:\n- Synthesize, clean, deduplicate, and merge these parts into a unified document-level summary, entity list, date list, timelineEvents, and key facts.\n- Ensure the overall analysis reads continuously and matches the requested perspective.'
    );

    const reduceContents = [{ role: 'user', parts: [{ text: reducePromptContent.join('\n\n') }] }];
    const response = await client.models.generateContent({
      model: GEMINI_ANALYSIS_MODEL,
      contents: reduceContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const finalResultText = response.text || '{}';
    const analysisResult = await robustJsonParseAndRetry<Record<string, unknown>>(
      finalResultText,
      client,
      GEMINI_ANALYSIS_MODEL,
      systemInstruction,
      reduceContents
    );

    if (ENABLE_CACHING) {
      analysisCache.cacheAnalysis(cacheKey, analysisResult, CACHE_TTL_MS);
    }

    return analysisResult;
  }

  // Fast path for small files (or non-chunked / multimedia files)
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

  const parts: any[] = [{ text: contentParts.join('\n\n') }];

  if (base64Data && mimeType && !textContent && (!textChunks || textChunks.length === 0)) {
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }

  const contents = [{ role: 'user', parts }];
  const response = await client.models.generateContent({
    model: GEMINI_ANALYSIS_MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  const responseText = response.text || '{}';
  const analysisResult = await robustJsonParseAndRetry<Record<string, unknown>>(
    responseText,
    client,
    GEMINI_ANALYSIS_MODEL,
    systemInstruction,
    contents
  );

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

export async function generateInsightsServer(
  files: InsightsFileContext[],
  casePerspective?: string
): Promise<CaseHighlight[]> {
  const filesHash = LRUCache.hashContent(JSON.stringify(files.map(f => [f.batesNumber, f.summary])));
  const cacheKey = LRUCache.createKey('insights', filesHash, casePerspective || 'default');

  if (ENABLE_CACHING) {
    const cached = await analysisCache.getCachedAnalysis<CaseHighlight[]>(cacheKey);
    if (cached !== null) return cached;
  }

  const client = getGenAIClient();

  // If we have a large number of files (e.g. > 15 files), run a Map-Reduce synthesis on them
  if (files.length > 15) {
    console.log(`[generateInsightsServer] Files (${files.length}) exceed threshold of 15. Initiating Map-Reduce architecture for Insights...`);
    
    // Map phase: chunk files array into sub-batches of 10 files
    const partialHighlights = await batchWithConcurrency<InsightsFileContext, CaseHighlight[]>(
      files,
      10,
      3,
      async (batchFiles) => {
        const prompt = buildInsightsPrompt(batchFiles, casePerspective);
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];
        const response = await client.models.generateContent({
          model: GEMINI_ANALYSIS_MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_INSIGHTS,
            responseMimeType: 'application/json',
          },
        });
        const text = response.text || '{}';
        const parsed = await robustJsonParseAndRetry<any>(
          text,
          client,
          GEMINI_ANALYSIS_MODEL,
          SYSTEM_INSTRUCTION_INSIGHTS,
          contents
        );
        return sanitizeHighlights(parsed);
      }
    );

    console.log(`[generateInsightsServer] Map phase completed. Reducer merging ${partialHighlights.length} batches...`);

    // Reduce phase: Combine/synthesize the highlights from all batches
    const flattenedHighlights = partialHighlights.flat();
    
    // Construct synthesis reduction prompt
    const reducePrompt = `You are an expert trial lawyer. Review these key insights extracted from multiple batches of discovery files in this matter.
Deduplicate, consolidate, and prioritize them into a single, cohesive, high-impact final set of highlights matching the case perspective.

Case Perspective: ${casePerspective || 'Neutral review.'}

Partial highlights input:
${JSON.stringify(flattenedHighlights)}

FINAL INSTRUCTIONS:
Return a JSON array of final, deduplicated, consolidated CaseHighlight objects matching the exact shape expected:
Array of objects containing: batesNumber (string), description (string), evidenceType (string), weight (number: 1-10), tag (one of: CRITICAL, HELPFUL, HOSTILE, INADMISSIBLE, HEARSAY).`;

    const contents = [{ role: 'user', parts: [{ text: reducePrompt }] }];
    const response = await client.models.generateContent({
      model: GEMINI_ANALYSIS_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_INSIGHTS,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const parsed = await robustJsonParseAndRetry<any>(
      text,
      client,
      GEMINI_ANALYSIS_MODEL,
      SYSTEM_INSTRUCTION_INSIGHTS,
      contents
    );
    const highlights = sanitizeHighlights(parsed);

    if (ENABLE_CACHING) {
      analysisCache.cacheAnalysis(cacheKey, highlights, CACHE_TTL_MS);
    }

    return highlights;
  }

  const prompt = buildInsightsPrompt(files, casePerspective);
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  const response = await client.models.generateContent({
    model: GEMINI_ANALYSIS_MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_INSIGHTS,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text || '{}';
  const parsed = await robustJsonParseAndRetry<any>(
    text,
    client,
    GEMINI_ANALYSIS_MODEL,
    SYSTEM_INSTRUCTION_INSIGHTS,
    contents
  );
  const highlights = sanitizeHighlights(parsed);

  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, highlights, CACHE_TTL_MS);
  }

  return highlights;
}
