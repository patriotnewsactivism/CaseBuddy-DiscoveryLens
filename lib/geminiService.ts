import { DiscoveryFile } from './types';

/**
 * Converts a File object to Base64 string (client-side only)
 */
export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a file by sending base64 to Next.js API route
 * The API route securely calls Gemini with the server-side API key
 */
export const analyzeFile = async (discoveryFile: DiscoveryFile): Promise<any> => {
  // Convert file to base64 in the browser
  const base64Data = await fileToBase64(discoveryFile.file);

  // Send to API route (which has access to the API key)
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data,
      mimeType: discoveryFile.mimeType,
      fileName: discoveryFile.name,
      batesNumber: discoveryFile.batesNumber.formatted,
      fileType: discoveryFile.type,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Analysis failed');
  }

  return response.json();
};

/**
 * Chat with discovery context via API route
 * The API route securely calls Gemini with the server-side API key
 */
export const chatWithDiscovery = async (
  query: string,
  allFiles: DiscoveryFile[],
  activeFileId: string | null
): Promise<string> => {
  // Build simplified context (summaries only, no large files)
  const filesContext = allFiles
    .filter(f => f.analysis)
    .map(f => ({
      batesNumber: f.batesNumber.formatted,
      name: f.name,
      evidenceType: f.analysis!.evidenceType,
      summary: f.analysis!.summary,
      relevantFacts: f.analysis!.relevantFacts,
    }));

  // If viewing a specific file, prepare its data
  let activeFile = undefined;
  if (activeFileId) {
    const file = allFiles.find(f => f.id === activeFileId);
    if (file) {
      activeFile = {
        batesNumber: file.batesNumber.formatted,
        transcription: file.analysis?.transcription,
      };

      // If no transcription available, send the file itself as base64
      if (!activeFile.transcription || activeFile.transcription.length < 50) {
        const base64Data = await fileToBase64(file.file);
        (activeFile as any).base64Data = base64Data;
        (activeFile as any).mimeType = file.mimeType;
      }
    }
  }

  // Send to API route
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      filesContext,
      activeFile,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Chat failed');
  }

  const data = await response.json();
  return data.response;
};
