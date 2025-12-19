import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const { AssemblyAIMock, mockTranscribe } = vi.hoisted(() => {
  const mockTranscribe = vi.fn();
  class AssemblyAIMock {
    transcripts = { transcribe: mockTranscribe };

    constructor(_: { apiKey: string }) {}
  }

  return { AssemblyAIMock, mockTranscribe };
});

vi.mock('assemblyai', () => ({
  AssemblyAI: AssemblyAIMock,
  __esModule: true,
}));

vi.mock('../lib/mediaTranscoder', () => ({
  transcodeToMonoWav: vi.fn(async ({ inputBuffer }: { inputBuffer: Buffer }) => ({
    audioBuffer: Buffer.from(inputBuffer),
    audioMimeType: 'audio/wav',
  })),
}));

import { transcribeWithAssembly } from '../lib/assemblyTranscriber';
import { transcodeToMonoWav } from '../lib/mediaTranscoder';

describe('transcribeWithAssembly', () => {
  const originalKey = process.env.ASSEMBLYAI_API_KEY;

  beforeEach(() => {
    process.env.ASSEMBLYAI_API_KEY = 'test-key';
    mockTranscribe.mockReset();
  });

  afterEach(() => {
    process.env.ASSEMBLYAI_API_KEY = originalKey;
  });

  it('uploads downsampled audio and returns completed transcript text', async () => {
    mockTranscribe.mockResolvedValue({ status: 'completed', text: 'Hello world' });

    const base64 = Buffer.from('audio-bytes').toString('base64');
    const result = await transcribeWithAssembly({
      input: base64,
      mimeType: 'audio/mp3',
      fileName: 'clip.mp3',
      batesNumber: 'ABC-0001',
    });

    expect(result).toBe('Hello world');
    expect(transcodeToMonoWav).toHaveBeenCalled();
    expect(mockTranscribe).toHaveBeenCalledWith({
      audio: expect.any(Buffer),
      speech_model: 'universal',
      speaker_labels: true,
    });
  });

  it('throws when transcript is missing or errored', async () => {
    mockTranscribe.mockResolvedValue({ status: 'error', error: 'bad audio' });

    await expect(
      transcribeWithAssembly({
        input: Buffer.from('bad'),
        mimeType: 'audio/wav',
        fileName: 'bad.wav',
        batesNumber: 'ABC-0002',
        isBase64: false,
      })
    ).rejects.toThrow(/AssemblyAI transcription failed: bad audio/);
  });

  it('throws when API key is missing', async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    await expect(
      transcribeWithAssembly({
        input: Buffer.from('audio'),
        mimeType: 'audio/wav',
        fileName: 'file.wav',
        batesNumber: 'ABC-0003',
      })
    ).rejects.toThrow('Missing ASSEMBLYAI_API_KEY environment variable');
  });
});
