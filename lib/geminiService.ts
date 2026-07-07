import { CasePerspective, CaseHighlight, DiscoveryFile, FileType } from './types';

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

/**
 * Transcribe an audio/video discovery file via the ffmpeg + Deepgram
 * (fallback: AssemblyAI) pipeline before analysis. Returns null on any
 * failure so callers can gracefully fall back to sending the raw file to
 * the multimodal LLM instead - transcription is a quality/cost/speed
 * optimization, not a hard requirement for analysis to proceed.
 */
export const transcribeMediaFile = async (
  discoveryFile: DiscoveryFile
): Promise<{ transcription: string; provider?: string } | null> => {
  try {
    const formData = new FormData();
    if (discoveryFile.file) {
      formData.append('file', discoveryFile.file, discoveryFile.name);
    } else if (discoveryFile.signedUrl) {
      // Cloud-hydrated file with no live browser File handle (e.g. resumed
      // from a previous session) - let the server pull it from storage.
      formData.append('mediaUrl', discoveryFile.signedUrl);
    } else {
      return null;
    }
    formData.append('fileName', discoveryFile.name);
    formData.append('batesNumber', discoveryFile.batesNumber.formatted);

    const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        `[transcribeMediaFile] Transcription failed for ${discoveryFile.name} (${discoveryFile.batesNumber.formatted}), falling back to multimodal analysis:`,
        errorData?.details || errorData?.error || response.statusText
      );
      return null;
    }

    const data = await response.json();
    if (!data?.transcription) return null;
    return { transcription: data.transcription as string, provider: data.provider as string | undefined };
  } catch (error) {
    console.warn(`[transcribeMediaFile] Transcription request errored for ${discoveryFile.name}:`, error);
    return null;
  }
};

export const analyzeFile = async (
  discoveryFile: DiscoveryFile,
  casePerspective: CasePerspective
): Promise<any> => {
  let transcriptionResult: { transcription: string; provider?: string } | null = null;

  // For audio/video, run the dedicated ffmpeg + Deepgram/AssemblyAI pipeline
  // first. A verbatim ASR transcript is faster, cheaper, and more reliable
  // for legal citation purposes than asking the LLM to transcribe raw media
  // itself, and it lets the analysis step run on plain text like any
  // document instead of a large multimodal payload.
  if (discoveryFile.type === FileType.AUDIO || discoveryFile.type === FileType.VIDEO) {
    transcriptionResult = await transcribeMediaFile(discoveryFile);
  }

  const payload = await buildAnalyzePayload(discoveryFile, casePerspective);

  if (transcriptionResult?.transcription) {
    payload.extractedText = transcriptionResult.transcription;
    // Skip shipping the full media payload once we already have an accurate
    // verbatim transcript - keeps the /api/analyze request small and fast.
    payload.base64Data = undefined;
  }

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

  const analysis = await response.json();

  if (transcriptionResult?.transcription) {
    // The ASR transcript is authoritative verbatim text - prefer it over
    // whatever the analysis model produced (or omitted) for the
    // `transcription` field.
    analysis.transcription = transcriptionResult.transcription;
  }

  return analysis;
};

/**
 * Synthesize the most case-critical facts across every analyzed document -
 * admissions, contradictions, smoking guns, credibility issues - each cited
 * back to its source Bates number(s). Requires at least a few analyzed files
 * to be worth running.
 */
export const generateCaseHighlights = async (
  allFiles: DiscoveryFile[],
  casePerspective: CasePerspective
): Promise<CaseHighlight[]> => {
  const files = allFiles
    .filter(f => f.analysis)
    .map(f => ({
      batesNumber: f.batesNumber.formatted,
      name: f.name,
      evidenceType: f.analysis!.evidenceType,
      summary: f.analysis!.summary,
      relevantFacts: f.analysis!.relevantFacts,
      sentiment: f.analysis!.sentiment,
    }));

  if (files.length === 0) return [];

  const response = await fetch('/api/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, casePerspective }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error || 'Failed to generate case highlights');
  }

  const data = await response.json();
  return (data.highlights || []) as CaseHighlight[];
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
