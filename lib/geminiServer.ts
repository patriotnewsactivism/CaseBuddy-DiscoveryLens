import { GoogleGenAI, Type, Schema } from '@google/genai';
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from './constants';

// Initialize with server-side API key (only available on server)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Server-side function to transcribe audio/video files
 * Optimized for lightweight transcription without heavy analysis
 */
export async function transcribeAudioServer({
  base64Data,
  mimeType,
  fileName,
  batesNumber,
}: {
  base64Data: string;
  mimeType: string;
  fileName: string;
  batesNumber: string;
}) {
  const modelName = 'gemini-2.0-flash-exp';

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

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: 'You are a professional legal transcription service. Provide accurate, verbatim transcriptions with timestamps and speaker labels.',
    }
  });

  return response.text || '[Transcription failed]';
}

/**
 * Server-side function to analyze a file
 * Receives base64 data from client and sends to Gemini
 */
export async function analyzeFileServer({
  base64Data,
  mimeType,
  fileName,
  batesNumber,
  fileType,
}: {
  base64Data: string;
  mimeType: string;
  fileName: string;
  batesNumber: string;
  fileType: string;
}) {
  const modelName = 'gemini-2.0-flash-exp';

  // For audio/video files, get transcription separately using the dedicated transcription function
  let transcription = '';
  if (fileType === 'AUDIO' || fileType === 'VIDEO') {
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

  const prompt = `
    Analyze this discovery file.
    Bates Number: ${batesNumber}.
    Filename: ${fileName}.
    File Type: ${fileType}.

    ${transcription ? `TRANSCRIPTION:\n${transcription}\n\n` : ''}

    INSTRUCTIONS:
    - Extract key facts, entities, dates, and relevant legal information
    - Classify the "evidenceType" accurately from the provided list
    - Provide a concise summary of the content
    - Identify sentiment/tone if applicable
    ${!transcription && (fileType === 'AUDIO' || fileType === 'VIDEO') ? '- For audio/video without transcription, describe what you can observe' : ''}
  `;

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
    required: ['summary', 'evidenceType', 'entities', 'relevantFacts']
  };

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_ANALYZER,
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  const analysisResult = JSON.parse(response.text || '{}');

  // Ensure transcription is included in the result
  if (transcription && !analysisResult.transcription) {
    analysisResult.transcription = transcription;
  }

  return analysisResult;
}

/**
 * Server-side function to chat with discovery context
 * Receives simplified context from client
 */
export async function chatWithDiscoveryServer(
  query: string,
  filesContext: Array<{
    batesNumber: string;
    name: string;
    evidenceType: string;
    summary: string;
    relevantFacts: string[];
  }>,
  activeFile?: {
    batesNumber: string;
    transcription?: string;
    base64Data?: string;
    mimeType?: string;
  }
) {
  // Build context from all file summaries
  let contextString = 'Here is the summary of the discovery files available:\n';
  filesContext.forEach(f => {
    contextString += `\n--- File: ${f.batesNumber} (${f.name}) ---\n`;
    contextString += `Type: ${f.evidenceType}\n`;
    contextString += `Summary: ${f.summary}\n`;
    contextString += `Key Facts: ${f.relevantFacts.join('; ')}\n`;
  });

  const contentParts: any[] = [{ text: contextString }];

  // If viewing a specific file, add its detailed info
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: { parts: contentParts },
    config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
  });

  return response.text || 'I could not generate a response based on the available evidence.';
}
