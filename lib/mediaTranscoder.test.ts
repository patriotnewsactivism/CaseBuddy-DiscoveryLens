import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'stream';
import { transcodeToMonoWav, validateMediaSize, getMaxMediaBytes } from './mediaTranscoder';

type MockProcessOptions = {
  stdoutData?: string;
  exitCode?: number;
  error?: NodeJS.ErrnoException;
};

const createMockProcess = ({ stdoutData = 'downsampled-audio', exitCode = 0, error }: MockProcessOptions = {}) => {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  const events: Record<string, ((payload?: unknown) => void)[]> = {};

  const on = (event: string, handler: (payload?: unknown) => void) => {
    if (!events[event]) events[event] = [];
    events[event].push(handler);
  };

  const emit = (event: string, payload?: unknown) => {
    (events[event] || []).forEach(fn => fn(payload));
  };

  setImmediate(() => {
    if (error) {
      emit('error', error);
      return;
    }
    stdout.write(Buffer.from(stdoutData));
    stdout.end();
    stderr.end();
    emit('close', exitCode);
  });

  return {
    stdin,
    stdout,
    stderr,
    on,
    kill: vi.fn(),
  } as any;
};

vi.mock('child_process', () => {
  const spawnMock = vi.fn(() => createMockProcess());

  return { spawn: spawnMock };
});

import { spawn } from 'child_process';
const mockedSpawn = vi.mocked(spawn);

describe('mediaTranscoder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('downsamples audio input and returns wav buffer', async () => {
    const input = Buffer.from('audio-input');
    const result = await transcodeToMonoWav({ inputBuffer: input, mimeType: 'audio/mpeg' });

    expect(result.audioMimeType).toBe('audio/wav');
    expect(result.audioBuffer.toString()).toContain('downsampled-audio');
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });

  it('extracts audio from video input', async () => {
    const input = Buffer.from('video-input');
    const result = await transcodeToMonoWav({ inputBuffer: input, mimeType: 'video/mp4' });

    expect(result.audioBuffer.length).toBeGreaterThan(0);
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });

  it('throws for oversized input media', async () => {
    const huge = Buffer.alloc(getMaxMediaBytes() + 1);

    await expect(transcodeToMonoWav({ inputBuffer: huge, mimeType: 'audio/wav' })).rejects.toThrow('Input media exceeds maximum size');
  });

  it('falls back to original audio when ffmpeg is missing', async () => {
    mockedSpawn.mockImplementationOnce(() =>
      createMockProcess({
        error: Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }),
      })
    );

    const input = Buffer.from('audio-input');
    const result = await transcodeToMonoWav({ inputBuffer: input, mimeType: 'audio/wav' });

    expect(result.audioMimeType).toBe('audio/wav');
    expect(result.audioBuffer.toString()).toBe('audio-input');
  });

  it('validateMediaSize enforces limits', () => {
    expect(() => validateMediaSize(1024, 2048, 'Test')).not.toThrow();
    expect(() => validateMediaSize(4096, 2048, 'Test')).toThrow('Test exceeds maximum size');
  });
});
