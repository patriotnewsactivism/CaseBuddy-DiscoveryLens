import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION_ANALYZER, SYSTEM_INSTRUCTION_CHAT, EVIDENCE_CATEGORIES } from "../constants";
import { DiscoveryFile } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string for Gemini
 */
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a single file to extract metadata, categorization, and transcription.
 */
export const analyzeFile = async (discoveryFile: DiscoveryFile): Promise<any> => {
  // Use the general multimodal model for all file types (Audio, Video, Images, Documents).
  // The 'native-audio' model is primarily for Live API streams, whereas 'generateContent' works best with the core multimodal models.
  const modelName = 'gemini-3-flash-preview';
  
  const base64Part = await fileToGenerativePart(discoveryFile.file);

  const prompt = `
    Analyze this discovery file. 
    Bates Number: ${discoveryFile.batesNumber.formatted}.
    Filename: ${discoveryFile.name}.
    File Type: ${discoveryFile.type}.

    CRITICAL INSTRUCTION:
    If this is an AUDIO or VIDEO file, provide a detailed, timestamped (if possible) transcription in the "transcription" field.
    Classify the "evidenceType" accurately from the provided list.
  `;

  // Schema for structured output
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

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [base64Part, { text: prompt }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ANALYZER,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing file:", error);
    throw error;
  }
};

/**
 * Chat with the context of analyzed files.
 */
export const chatWithDiscovery = async (
  query: string,
  allFiles: DiscoveryFile[],
  activeFileId: string | null
): Promise<string> => {
  
  // 1. Build context from summaries of ALL files
  let contextString = "Here is the summary of the discovery files available:\n";
  allFiles.forEach(f => {
    if (f.analysis) {
      contextString += `\n--- File: ${f.batesNumber.formatted} (${f.name}) ---\n`;
      contextString += `Type: ${f.analysis.evidenceType}\n`;
      contextString += `Summary: ${f.analysis.summary}\n`;
      contextString += `Key Facts: ${f.analysis.relevantFacts.join('; ')}\n`;
    }
  });

  const contentParts: any[] = [{ text: contextString }];

  // 2. If a specific file is "Active" (viewing), include its full content/transcription for deep dive
  if (activeFileId) {
    const activeFile = allFiles.find(f => f.id === activeFileId);
    if (activeFile) {
      contentParts.push({ text: `\nUSER IS CURRENTLY VIEWING FILE: ${activeFile.batesNumber.formatted}. Focus on this file.` });
      
      // If we have a transcription, inject it as text context to save tokens/processing for the image/audio model
      if (activeFile.analysis?.transcription && activeFile.analysis.transcription.length > 50) {
         contentParts.push({ text: `TRANSCRIPTION OF VIEWED FILE:\n${activeFile.analysis.transcription}`});
      } else {
         // Fallback to sending the file itself if no transcription is ready
         const base64Part = await fileToGenerativePart(activeFile.file);
         contentParts.push(base64Part);
      }
    }
  }

  contentParts.push({ text: `\nUSER QUESTION: ${query}` });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: contentParts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CHAT
      }
    });

    return response.text || "I could not generate a response based on the available evidence.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Error processing your legal query. Please check your API key and connection.";
  }
};