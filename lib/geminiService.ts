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

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const readFileAsBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  return arrayBufferToBase64(buffer);
};

export const buildAnalyzePayload = async (
  discoveryFile: DiscoveryFile,
  casePerspective: CasePerspective
): Promise<Record<string, unknown>> => {
  let extractedText: string | undefined;
  let base64Data: string | undefined;

  // Only try to extract text from file if it exists and is a text-based format
  if (discoveryFile.file) {
    extractedText = await extractClientText(discoveryFile.file, discoveryFile.mimeType);
  }

  // Prepare base64 data if we don't have extracted text AND we don't have a storage path
  // If storagePath exists, the server will download from there
  if (!extractedText && !discoveryFile.storagePath && discoveryFile.file) {
    base64Data = await readFileAsBase64(discoveryFile.file);
  }

  console.log('[buildAnalyzePayload] Prepared payload:', {
    hasExtractedText: !!extractedText,
    extractedTextLength: extractedText?.length || 0,
    hasBase64Data: !!base64Data,
    base64DataLength: base64Data?.length || 0,
    hasStoragePath: !!discoveryFile.storagePath,
    hasSignedUrl: !!discoveryFile.signedUrl,
    mimeType: discoveryFile.mimeType,
    fileName: discoveryFile.name,
  });

  return {
    extractedText,
    base64Data,
    mimeType: discoveryFile.mimeType,
    fileName: discoveryFile.name,
    batesNumber: discoveryFile.batesNumber.formatted,
    fileType: discoveryFile.type,
    storagePath: discoveryFile.storagePath,
    signedUrl: discoveryFile.signedUrl,
    casePerspective,
  };
};

export const analyzeFile = async (
  discoveryFile: DiscoveryFile,
  casePerspective: CasePerspective
): Promise<any> => {
  const payload = await buildAnalyzePayload(discoveryFile, casePerspective);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const message = errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error || 'Analysis failed';
    throw new Error(message);
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
