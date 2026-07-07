/**
 * Unified transcription pipeline for audio/video discovery files.
 *
 * Flow: raw audio/video buffer -> ffmpeg extracts + downsamples to mono
 * 16kHz WAV (mediaTranscoder.ts) -> routed to Deepgram (nova-3, fast +
 * accurate) by default, falling back to AssemblyAI if Deepgram is
 * unavailable/misconfigured/errors. This mirrors the aiProvider.ts pattern
 * used for the analysis/chat providers so the whole app is configured the
 * same way: pick a primary provider, auto-detect from available keys, allow
 * an explicit override, fall back gracefully.
 */

import { transcodeToMonoWav } from './mediaTranscoder';
import { transcribeWithDeepgram, isDeepgramConfigured } from './deepgramTranscriber';
import { transcribeAudioBufferWithAssembly, isAssemblyAIConfigured } from './assemblyTranscriber';

export type TranscriptionProvider = 'deepgram' | 'assemblyai';

export interface TranscribeMediaInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  batesNumber: string;
}

export interface TranscribeMediaResult {
  text: string;
  provider: TranscriptionProvider;
  confidence?: number;
  speakerCount?: number;
}

const normalizeProvider = (value?: string): TranscriptionProvider | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'deepgram') return 'deepgram';
  if (normalized === 'assemblyai' || normalized === 'assembly') return 'assemblyai';
  return null;
};

export function getConfiguredTranscriptionProvider(): TranscriptionProvider {
  const preferred = normalizeProvider(process.env.TRANSCRIPTION_PROVIDER);

  if (preferred === 'deepgram') {
    if (!isDeepgramConfigured()) {
      throw new Error('TRANSCRIPTION_PROVIDER is set to deepgram but DEEPGRAM_API_KEY is missing.');
    }
    return 'deepgram';
  }
  if (preferred === 'assemblyai') {
    if (!isAssemblyAIConfigured()) {
      throw new Error('TRANSCRIPTION_PROVIDER is set to assemblyai but ASSEMBLYAI_API_KEY is missing.');
    }
    return 'assemblyai';
  }

  // Auto-detect: Deepgram (fastest + most accurate general-purpose model,
  // per Deepgram Nova-3 benchmarks) is preferred; AssemblyAI is the fallback.
  if (isDeepgramConfigured()) return 'deepgram';
  if (isAssemblyAIConfigured()) return 'assemblyai';

  throw new Error(
    'No transcription provider configured. Set DEEPGRAM_API_KEY (recommended) or ASSEMBLYAI_API_KEY.'
  );
}

export function isTranscriptionConfigured(): boolean {
  return isDeepgramConfigured() || isAssemblyAIConfigured();
}

/**
 * Transcribe an audio or video buffer end-to-end: strip/downsample audio
 * via ffmpeg once, then send to the configured provider. If the primary
 * provider fails at request time (network error, quota, etc.) and a second
 * provider is configured, automatically retries with the fallback so a
 * single vendor outage doesn't block discovery processing.
 */
export async function transcribeMedia({
  buffer,
  mimeType,
  fileName,
  batesNumber,
}: TranscribeMediaInput): Promise<TranscribeMediaResult> {
  if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
    throw new Error('transcribeMedia only supports audio/* and video/* mime types.');
  }

  const { audioBuffer, audioMimeType } = await transcodeToMonoWav({ inputBuffer: buffer, mimeType });

  const primary = getConfiguredTranscriptionProvider();
  const fallback: TranscriptionProvider | null =
    primary === 'deepgram' && isAssemblyAIConfigured()
      ? 'assemblyai'
      : primary === 'assemblyai' && isDeepgramConfigured()
        ? 'deepgram'
        : null;

  const runProvider = async (provider: TranscriptionProvider): Promise<TranscribeMediaResult> => {
    if (provider === 'deepgram') {
      const result = await transcribeWithDeepgram({ audioBuffer, audioMimeType, fileName, batesNumber });
      return { text: result.text, provider: 'deepgram', confidence: result.confidence, speakerCount: result.speakerCount };
    }
    const text = await transcribeAudioBufferWithAssembly(audioBuffer, fileName, batesNumber);
    return { text, provider: 'assemblyai' };
  };

  try {
    return await runProvider(primary);
  } catch (primaryError) {
    if (!fallback) throw primaryError;
    console.warn(
      `[transcriptionProvider] ${primary} failed for ${fileName} [${batesNumber}], falling back to ${fallback}:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );
    return runProvider(fallback);
  }
}
