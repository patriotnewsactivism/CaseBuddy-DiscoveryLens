import { CasePerspective, DiscoveryFile } from './types';

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

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      extractedText,
      mimeType: discoveryFile.mimeType,
      fileName: discoveryFile.name,
      batesNumber: discoveryFile.batesNumber.formatted,
      fileType: discoveryFile.type,
      storagePath: discoveryFile.storagePath,
      signedUrl: discoveryFile.signedUrl,
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
