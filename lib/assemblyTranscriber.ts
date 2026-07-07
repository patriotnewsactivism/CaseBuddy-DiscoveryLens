import { AssemblyAI, TranscribeParams } from 'assemblyai';
import { transcodeToMonoWav } from './mediaTranscoder';

export interface AssemblyTranscribeInput {
  input: Buffer | string;
  mimeType: string;
  fileName: string;
  batesNumber: string;
  isBase64?: boolean;
}

const DEFAULT_SPEECH_MODEL = (process.env.ASSEMBLYAI_SPEECH_MODEL || 'universal') as TranscribeParams['speech_model'];

export function isAssemblyAIConfigured(): boolean {
  return Boolean(process.env.ASSEMBLYAI_API_KEY?.trim());
}

/**
 * Transcribe already-extracted mono audio (used by transcriptionProvider.ts
 * as a fallback path when Deepgram is unavailable/fails, avoiding a second
 * ffmpeg extraction pass on the same source file).
 */
export async function transcribeAudioBufferWithAssembly(
  audioBuffer: Buffer,
  _fileName: string,
  _batesNumber: string
): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ASSEMBLYAI_API_KEY environment variable');
  }

  const client = new AssemblyAI({ apiKey });

  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speech_model: DEFAULT_SPEECH_MODEL,
    speaker_labels: true,
  });

  if (transcript.status !== 'completed' || !transcript.text) {
    const details = transcript.error || 'AssemblyAI did not return transcript text';
    throw new Error(`AssemblyAI transcription failed: ${details}`);
  }

  return transcript.text;
}

export async function transcribeWithAssembly({
  input,
  mimeType,
  fileName,
  batesNumber,
  isBase64 = true,
}: AssemblyTranscribeInput): Promise<string> {
  const sourceBuffer =
    typeof input === 'string' && isBase64 ? Buffer.from(input, 'base64') : Buffer.from(input as Buffer);

  const { audioBuffer } = await transcodeToMonoWav({ inputBuffer: sourceBuffer, mimeType });

  return transcribeAudioBufferWithAssembly(audioBuffer, fileName, batesNumber);
}
