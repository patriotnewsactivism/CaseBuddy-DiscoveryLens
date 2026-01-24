import { describe, expect, it } from 'vitest';
import { arrayBufferToBase64, buildAnalyzePayload } from '../lib/geminiService';
import { CasePerspective, FileType, type DiscoveryFile } from '../lib/types';

const makeFile = (content: string, type: string): File =>
  ({
    name: 'sample.txt',
    type,
    size: content.length,
    arrayBuffer: async () => new TextEncoder().encode(content).buffer,
    text: async () => content,
  }) as File;

const makeDiscoveryFile = (file: File, mimeType: string, fileType: FileType): DiscoveryFile => ({
  id: 'file-1',
  file,
  name: file.name,
  type: fileType,
  batesNumber: {
    prefix: 'DEF',
    number: 1,
    formatted: 'DEF-0001',
  },
  previewUrl: 'blob://preview',
  isProcessing: false,
  analysis: null,
  mimeType,
});

describe('geminiService helpers', () => {
  it('arrayBufferToBase64 encodes binary data', () => {
    const buffer = new TextEncoder().encode('audio-bytes').buffer;
    const encoded = arrayBufferToBase64(buffer);
    expect(encoded).toBe(Buffer.from('audio-bytes').toString('base64'));
  });

  it('buildAnalyzePayload includes base64 for non-text when storage is missing', async () => {
    const file = makeFile('audio-bytes', 'audio/wav');
    const discoveryFile = makeDiscoveryFile(file, 'audio/wav', FileType.AUDIO);

    const payload = await buildAnalyzePayload(discoveryFile, CasePerspective.CLIENT);

    expect(payload.extractedText).toBeUndefined();
    expect(payload.base64Data).toBe(Buffer.from('audio-bytes').toString('base64'));
  });

  it('buildAnalyzePayload prefers extracted text for text files', async () => {
    const file = makeFile('text-content', 'text/plain');
    const discoveryFile = makeDiscoveryFile(file, 'text/plain', FileType.DOCUMENT);

    const payload = await buildAnalyzePayload(discoveryFile, CasePerspective.CLIENT);

    expect(payload.extractedText).toBe('text-content');
    expect(payload.base64Data).toBeUndefined();
  });
});
