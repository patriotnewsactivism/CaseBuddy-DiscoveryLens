/**
 * Deepgram prerecorded transcription client.
 *
 * Deepgram's Nova-3 model is currently the fastest + most accurate
 * general-purpose speech-to-text model available (sub-300ms streaming
 * latency, ~5% WER on batch audio). This module always receives
 * pre-extracted mono/16kHz audio (see mediaTranscoder.ts, which strips
 * audio out of video via ffmpeg first) so it stays fast on large video
 * files rather than shipping the whole container to Deepgram.
 */

export interface DeepgramTranscribeInput {
  audioBuffer: Buffer;
  audioMimeType: string;
  fileName: string;
  batesNumber: string;
}

export interface DeepgramTranscribeResult {
  text: string;
  confidence?: number;
  speakerCount?: number;
  raw?: unknown;
}

const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || 'nova-3';
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface DeepgramUtterance {
  speaker?: number;
  transcript: string;
  start: number;
  end: number;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
}

export function isDeepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY?.trim());
}

/**
 * Format diarized utterances into a readable speaker-labeled transcript,
 * e.g. "[Speaker 1]: ...\n[Speaker 2]: ...". Falls back to the flat
 * transcript when diarization didn't produce multiple distinct speakers.
 */
function formatTranscript(payload: DeepgramResponse): { text: string; speakerCount: number } {
  const utterances = payload.results?.utterances;
  const flatTranscript = payload.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';

  if (!utterances || utterances.length === 0) {
    return { text: flatTranscript, speakerCount: flatTranscript ? 1 : 0 };
  }

  const speakerIds = new Set(utterances.map(u => u.speaker ?? 0));

  if (speakerIds.size <= 1) {
    return { text: flatTranscript || utterances.map(u => u.transcript).join(' '), speakerCount: speakerIds.size };
  }

  const formatted = utterances
    .map(u => `[Speaker ${(u.speaker ?? 0) + 1}]: ${u.transcript.trim()}`)
    .join('\n');

  return { text: formatted, speakerCount: speakerIds.size };
}

export async function transcribeWithDeepgram({
  audioBuffer,
  audioMimeType,
  fileName,
  batesNumber,
}: DeepgramTranscribeInput): Promise<DeepgramTranscribeResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing DEEPGRAM_API_KEY environment variable');
  }

  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    smart_format: 'true',
    punctuate: 'true',
    diarize: 'true',
    utterances: 'true',
    numerals: 'true',
    // Legal audio (depositions, 911 calls, bodycam) often runs long; Deepgram
    // handles this natively, no chunking required.
  });

  const response = await fetch(`${DEEPGRAM_API_URL}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': audioMimeType || 'audio/wav',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Deepgram transcription failed for ${fileName} [${batesNumber}]: ${response.status} ${response.statusText} ${errorBody}`.trim()
    );
  }

  const payload = (await response.json()) as DeepgramResponse;
  const { text, speakerCount } = formatTranscript(payload);

  if (!text) {
    throw new Error(`Deepgram returned no transcript text for ${fileName} [${batesNumber}]`);
  }

  const confidence = payload.results?.channels?.[0]?.alternatives?.[0]?.confidence;

  return {
    text,
    confidence,
    speakerCount,
    raw: payload,
  };
}
