import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'stream';
import { transcodeToMonoWav, validateMediaSize, getMaxMediaBytes } from './mediaTranscoder';

vi.mock('child_process', () => {
  const spawnMock = vi.fn(() => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const stdin = new PassThrough();
    const events: Record<string, ((code?: number) => void)[]> = {};

    const on = (event: string, handler: (code?: number) => void) => {
      if (!events[event]) events[event] = [];
      events[event].push(handler);
    };

    const emit = (event: string, code?: number) => {
      (events[event] || []).forEach(fn => fn(code));
    };

    // Simulate ffmpeg processing asynchronously
    setImmediate(() => {
      stdout.write(Buffer.from('downsampled-audio'));
      stdout.end();
      stderr.end();
      emit('close', 0);
    });

    return {
      stdin,
      stdout,
      stderr,
      on,
      kill: vi.fn(),
    } as any;
  });

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

  it('validateMediaSize enforces limits', () => {
    expect(() => validateMediaSize(1024, 2048, 'Test')).not.toThrow();
    expect(() => validateMediaSize(4096, 2048, 'Test')).toThrow('Test exceeds maximum size');
  });
});
