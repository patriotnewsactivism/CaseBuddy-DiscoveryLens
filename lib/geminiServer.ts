import { GoogleGenAI, Schema, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from './constants';
import { transcodeToMonoWav } from './mediaTranscoder';
import { withRateLimit, estimateTokensForRequest } from './rateLimiter';
import { analysisCache, LRUCache } from './cache';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.0-pro-exp-02-05';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || ANALYSIS_MODEL;
const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-2.0-flash-001';

const ENABLE_CACHING = process.env.GEMINI_ENABLE_CACHE !== 'false';
const ENABLE_RATE_LIMITING = process.env.GEMINI_ENABLE_RATE_LIMIT !== 'false';
const CACHE_TTL_MS = parseInt(process.env.GEMINI_CACHE_TTL_MS || '3600000', 10);

interface TranscribeInput {
  base64Data: string;
  mimeType: string;
  fileName: string;
  batesNumber: string;
}

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

type ContentPart = { text?: string; inlineData?: { data: string; mimeType: string } };

const withModelFallback = async <T>(
  model: string,
  generator: (chosenModel: string) => Promise<T>,
  fallbackModel = 'gemini-2.0-flash-thinking-exp-1219'
): Promise<T> => {
  try {
    return await generator(model);
  } catch (primaryError) {
    console.warn(`Primary model ${model} failed, falling back to ${fallbackModel}:`, primaryError);
    if (fallbackModel === model) throw primaryError;
    return generator(fallbackModel);
  }
};

const createTranscriptionCacheKey = (
  batesNumber: string,
  fileName: string,
  audioHash: string
): string => {
  return LRUCache.createKey('transcribe', batesNumber, fileName, audioHash);
};

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

export async function transcribeAudioServer({
  base64Data,
  mimeType,
  fileName,
  batesNumber,
}: TranscribeInput) {
  const prompt = `
    You are transcribing audio/video evidence for legal discovery.
    Bates Number: ${batesNumber}
    Filename: ${fileName}

    INSTRUCTIONS:
    - Provide a COMPLETE, ACCURATE, VERBATIM transcription of all spoken content
    - Include speaker labels if multiple speakers are detected (e.g., "Speaker 1:", "Speaker 2:")
    - Include timestamps in format [MM:SS] at regular intervals
    - Note any significant non-verbal sounds in brackets [door slam], [phone rings], etc.
    - Do NOT summarize or paraphrase - transcribe every word spoken
    - If audio is unclear, mark as [inaudible]

    Return ONLY the transcription text. Do not add commentary or analysis.
  `;

  const sourceBuffer = Buffer.from(base64Data, 'base64');
  const { audioBuffer, audioMimeType } = await transcodeToMonoWav({ inputBuffer: sourceBuffer, mimeType });
  
  const audioHash = LRUCache.hashContent(audioBuffer);
  const cacheKey = createTranscriptionCacheKey(batesNumber, fileName, audioHash);

  const cached = await analysisCache.getCachedAnalysis<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const response = await withModelFallback(TRANSCRIBE_MODEL, async chosenModel => {
    if (ENABLE_RATE_LIMITING) {
      return withRateLimit(chosenModel, () =>
        ai.models.generateContent({
          model: chosenModel,
          contents: {
            parts: [
              { inlineData: { data: audioBuffer.toString('base64'), mimeType: audioMimeType } },
              { text: prompt }
            ]
          },
          config: {
            systemInstruction: 'You are a professional legal transcription service. Provide accurate, verbatim transcriptions with timestamps and speaker labels.',
            maxOutputTokens: 2048,
            responseMimeType: 'text/plain',
          }
        })
      );
    }
    return ai.models.generateContent({
      model: chosenModel,
      contents: {
        parts: [
          { inlineData: { data: audioBuffer.toString('base64'), mimeType: audioMimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: 'You are a professional legal transcription service. Provide accurate, verbatim transcriptions with timestamps and speaker labels.',
        maxOutputTokens: 2048,
        responseMimeType: 'text/plain',
      }
    });
  });

  const result = response.text || '[Transcription failed]';
  
  analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
  
  return result;
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

  let transcription = '';
  if (!textContent && (fileType === 'AUDIO' || fileType === 'VIDEO') && base64Data && mimeType) {
    try {
      transcription = await transcribeAudioServer({
        base64Data,
        mimeType,
        fileName,
        batesNumber,
      });
    } catch (error) {
      console.error('Transcription failed:', error);
      transcription = '[Transcription unavailable]';
    }
  }

  const perspectiveText =
    casePerspective === 'defense_support'
      ? 'You are assisting defense counsel. A "hostile" sentiment means it harms the defense; "cooperative" means it supports the defense.'
      : casePerspective === 'plaintiff_support'
        ? 'You are assisting a plaintiff/litigator. A "hostile" sentiment means it harms the plaintiff; "cooperative" means it supports the plaintiff.'
        : 'You are reviewing materials in your own matter. Treat sentiment as friendly/hostile relative to the user.';

  const contentParts: ContentPart[] = [
    { text: `Analyze this discovery file.\nBates Number: ${batesNumber}.\nFilename: ${fileName}.\nFile Type: ${fileType}.\nCase Perspective: ${perspectiveText}` },
  ];

  if (metadata) {
    contentParts.push({ text: `File metadata: ${JSON.stringify(metadata)}` });
  }

  if (transcription) {
    contentParts.push({ text: `TRANSCRIPTION:\n${transcription}` });
  }

  if (textChunks && textChunks.length > 0) {
    textChunks.forEach((chunk, idx) => {
      contentParts.push({ text: `[Document Chunk ${idx + 1}]\n${chunk}` });
    });
  } else if (textContent) {
    contentParts.push({ text: `DOCUMENT CONTENT:\n${textContent}` });
  } else if (base64Data && mimeType) {
    contentParts.push({ inlineData: { data: base64Data, mimeType } });
  }

  contentParts.push({
    text: 'INSTRUCTIONS:\n- Extract key facts, entities, dates, and relevant legal information\n- Classify the "evidenceType" accurately from the provided list\n- Provide a concise summary of the content\n- Identify sentiment/tone if applicable',
  });

  if (!transcription && (fileType === 'AUDIO' || fileType === 'VIDEO')) {
    contentParts.push({ text: '- For audio/video without transcription, describe observable details.' });
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      evidenceType: { type: Type.STRING, enum: EVIDENCE_CATEGORIES },
      entities: { type: Type.ARRAY, items: { type: Type.STRING } },
      dates: { type: Type.ARRAY, items: { type: Type.STRING } },
      relevantFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
      transcription: { type: Type.STRING },
      sentiment: { type: Type.STRING, enum: ['Hostile', 'Cooperative', 'Neutral'] },
    },
    required: ['summary', 'evidenceType', 'entities', 'relevantFacts'],
  };

  const estimatedTokens = estimateTokensForRequest(contentParts);

  const response = await withModelFallback(ANALYSIS_MODEL, async chosenModel => {
    if (ENABLE_RATE_LIMITING) {
      return withRateLimit(chosenModel, () =>
        ai.models.generateContent({
          model: chosenModel,
          contents: { parts: contentParts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_ANALYZER,
            responseMimeType: 'application/json',
            responseSchema: schema,
          }
        }), { estimatedTokens }
      );
    }
    return ai.models.generateContent({
      model: chosenModel,
      contents: { parts: contentParts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ANALYZER,
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });
  });

  const analysisResult = response.text ? JSON.parse(response.text) : {};

  if (transcription && !analysisResult.transcription) {
    analysisResult.transcription = transcription;
  }

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

  const contentParts: ContentPart[] = [
    { text: `CASE PERSPECTIVE: ${perspectiveText}` },
    { text: contextString },
  ];

  if (activeFile) {
    contentParts.push({ text: `\nUSER IS CURRENTLY VIEWING FILE: ${activeFile.batesNumber}. Focus on this file.` });

    if (activeFile.transcription && activeFile.transcription.length > 50) {
      contentParts.push({ text: `TRANSCRIPTION OF VIEWED FILE:\n${activeFile.transcription}` });
    } else if (activeFile.base64Data && activeFile.mimeType) {
      contentParts.push({
        inlineData: { data: activeFile.base64Data, mimeType: activeFile.mimeType }
      });
    }
  }

  contentParts.push({ text: `\nUSER QUESTION: ${query}` });

  const estimatedTokens = estimateTokensForRequest(contentParts);

  const response = await withModelFallback(CHAT_MODEL, async chosenModel => {
    if (ENABLE_RATE_LIMITING) {
      return withRateLimit(chosenModel, () =>
        ai.models.generateContent({
          model: chosenModel,
          contents: { parts: contentParts },
          config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
        }), { estimatedTokens }
      );
    }
    return ai.models.generateContent({
      model: chosenModel,
      contents: { parts: contentParts },
      config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
    });
  });

  const result = response.text || 'I could not generate a response based on the available evidence.';
  
  if (ENABLE_CACHING) {
    analysisCache.cacheAnalysis(cacheKey, result, CACHE_TTL_MS);
  }
  
  return result;
}