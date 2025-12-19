import { CasePerspective, DiscoveryFile } from './types';

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

const extractClientText = async (file: File, mimeType: string): Promise<string | undefined> => {
  const textualMime = mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html');
  if (!textualMime) return undefined;

  try {
    const text = await file.text();
    return text;
  } catch {
    return undefined;
  }
};

export const analyzeFile = async (
  discoveryFile: DiscoveryFile,
  casePerspective: CasePerspective
): Promise<any> => {
  const extractedText = await extractClientText(discoveryFile.file, discoveryFile.mimeType);
  const base64Data = extractedText ? undefined : await fileToBase64(discoveryFile.file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data,
      extractedText,
      mimeType: discoveryFile.mimeType,
      fileName: discoveryFile.name,
      batesNumber: discoveryFile.batesNumber.formatted,
      fileType: discoveryFile.type,
      casePerspective,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Analysis failed');
  }

  return response.json();
};

export const chatWithDiscovery = async (
  query: string,
  allFiles: DiscoveryFile[],
  activeFileId: string | null,
  casePerspective: CasePerspective
): Promise<string> => {
  const filesContext = allFiles
    .filter(f => f.analysis)
    .map(f => ({
      batesNumber: f.batesNumber.formatted,
      name: f.name,
      evidenceType: f.analysis!.evidenceType,
      summary: f.analysis!.summary,
      relevantFacts: f.analysis!.relevantFacts,
    }));

  let activeFile = undefined;
  if (activeFileId) {
    const file = allFiles.find(f => f.id === activeFileId);
    if (file) {
      activeFile = {
        batesNumber: file.batesNumber.formatted,
        transcription: file.analysis?.transcription,
      };

      if (!activeFile.transcription || activeFile.transcription.length < 50) {
        const base64Data = await fileToBase64(file.file);
        (activeFile as any).base64Data = base64Data;
        (activeFile as any).mimeType = file.mimeType;
      }
    }
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      filesContext,
      activeFile,
      casePerspective,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Chat failed');
  }

  const data = await response.json();
  return data.response;
};
