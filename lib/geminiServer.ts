import { GoogleGenAI, Schema, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from './constants';
import { transcribeWithAssembly } from './assemblyTranscriber';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.0-pro-exp-02-05';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || ANALYSIS_MODEL;

interface TranscribeInput {
  input: Buffer | string;
  mimeType: string;
  fileName: string;
  batesNumber: string;
  isBase64?: boolean;
}

interface AnalyzeInput {
  base64Data?: string;
  mimeType?: string;
  fileName: string;
  batesNumber: string;
  fileType: string;
  casePerspective?: string;
  textContent?: string;
  textChunks?: string[];
  metadata?: Record<string, unknown>;
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

export async function transcribeAudioServer({
  input,
  mimeType,
  fileName,
  batesNumber,
  isBase64 = true,
}: TranscribeInput) {
  return transcribeWithAssembly({ input, mimeType, fileName, batesNumber, isBase64 });
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
}: AnalyzeInput) {
  let transcription = '';
  if (!textContent && (fileType === 'AUDIO' || fileType === 'VIDEO') && base64Data && mimeType) {
    try {
      transcription = await transcribeAudioServer({
        input: base64Data,
        mimeType,
        fileName,
        batesNumber,
        isBase64: true,
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

  const response = await withModelFallback(ANALYSIS_MODEL, async chosenModel =>
    ai.models.generateContent({
      model: chosenModel,
      contents: { parts: contentParts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ANALYZER,
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    })
  );

  const analysisResult = response.text ? JSON.parse(response.text) : {};

  if (transcription && !analysisResult.transcription) {
    analysisResult.transcription = transcription;
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
      contentParts.push({ inlineData: { data: activeFile.base64Data, mimeType: activeFile.mimeType } });
    }
  }

  contentParts.push({ text: `\nUSER QUESTION: ${query}` });

  const response = await withModelFallback(CHAT_MODEL, async chosenModel =>
    ai.models.generateContent({
      model: chosenModel,
      contents: { parts: contentParts },
      config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
    })
  );

  return response.text || 'I could not generate a response based on the available evidence.';
}
