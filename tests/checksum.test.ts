import { describe, it, expect } from 'vitest';
import { sha256FromBuffer } from '../lib/checksum';

const textToBuffer = (text: string) => new TextEncoder().encode(text).buffer;

describe('sha256FromBuffer', () => {
  it('produces deterministic hashes for the same input', async () => {
    const buffer = textToBuffer('discovery-lens');
    const first = await sha256FromBuffer(buffer);
    const second = await sha256FromBuffer(buffer);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distinguishes different inputs', async () => {
    const hashA = await sha256FromBuffer(textToBuffer('alpha'));
    const hashB = await sha256FromBuffer(textToBuffer('beta'));

    expect(hashA).not.toBe(hashB);
  });
});
