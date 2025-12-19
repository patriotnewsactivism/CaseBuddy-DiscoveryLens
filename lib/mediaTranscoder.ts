import { spawn } from 'child_process';
import { PassThrough } from 'stream';

const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25MB raw input limit
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB after downsampling

export interface MediaBufferResult {
  audioBuffer: Buffer;
  audioMimeType: string;
}

export function getMaxMediaBytes() {
  return MAX_MEDIA_BYTES;
}

export function getMaxAudioBytes() {
  return MAX_AUDIO_BYTES;
}

export function validateMediaSize(bytes: number, limit: number, label: string) {
  if (bytes > limit) {
    throw new Error(`${label} exceeds maximum size of ${Math.round(limit / (1024 * 1024))}MB`);
  }
}

export async function downloadMediaBuffer(mediaUrl: string, sizeLimit = MAX_MEDIA_BYTES): Promise<{ buffer: Buffer; mimeType: string | undefined; fileName?: string; }> {
  const url = new URL(mediaUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http/https media URLs are allowed');
  }

  const response = await fetch(mediaUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
  }

  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    downloaded += value.length;
    validateMediaSize(downloaded, sizeLimit, 'Input media');
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  const contentType = response.headers.get('content-type') || undefined;

  return { buffer, mimeType: contentType, fileName: url.pathname.split('/').pop() || undefined };
}

export async function transcodeToMonoWav({ inputBuffer, mimeType, sizeLimit = MAX_AUDIO_BYTES }: { inputBuffer: Buffer; mimeType: string; sizeLimit?: number; }): Promise<MediaBufferResult> {
  validateMediaSize(inputBuffer.byteLength, MAX_MEDIA_BYTES, 'Input media');

  if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
    throw new Error('Invalid file type. Only audio and video files are supported.');
  }

  const ffmpegArgs = ['-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'wav', 'pipe:1'];
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  return new Promise<MediaBufferResult>((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    let stdoutSize = 0;
    const stderr = new PassThrough();

    ffmpeg.stdout.on('data', chunk => {
      const bufferChunk = Buffer.from(chunk as Buffer);
      stdoutChunks.push(bufferChunk);
      stdoutSize += bufferChunk.length;
      try {
        validateMediaSize(stdoutSize, sizeLimit, 'Downsampled audio');
      } catch (err) {
        ffmpeg.kill('SIGKILL');
        reject(err);
      }
    });

    ffmpeg.stderr.pipe(stderr);
    const errorChunks: Buffer[] = [];
    stderr.on('data', chunk => errorChunks.push(chunk as Buffer));

    ffmpeg.on('error', err => reject(err));

    ffmpeg.on('close', code => {
      if (code !== 0) {
        const errorMessage = Buffer.concat(errorChunks).toString() || `ffmpeg exited with code ${code}`;
        reject(new Error(errorMessage.trim()));
        return;
      }

      const audioBuffer = Buffer.concat(stdoutChunks);
      validateMediaSize(audioBuffer.byteLength, sizeLimit, 'Downsampled audio');

      resolve({ audioBuffer, audioMimeType: 'audio/wav' });
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}
