import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { chunkText, extractTextFromBase64, normalizeText } from '../lib/extractionService';

const toBase64 = (text: string) => Buffer.from(text, 'utf-8').toString('base64');

describe('extractionService', () => {
  it('normalizes and chunks CSV/TSV style text', async () => {
    const csv = 'col1,col2\nvalue1,value2';
    const result = await extractTextFromBase64(toBase64(csv), 'text/csv', 'data.csv');

    expect(result.mimeType).toContain('csv');
    expect(result.text).toContain('value1,value2');
    expect(result.metadata.wordCount).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('strips RTF control sequences down to readable text', async () => {
    const rtf = '{\\rtf1\\ansi\n{\\fonttbl\\f0\\fswiss Helvetica;}\n\\f0\\pard This is \\b bold\\b0  and plain.}';
    const result = await extractTextFromBase64(toBase64(rtf), 'application/rtf', 'note.rtf');

    expect(result.text).toContain('This is');
    expect(result.text).toContain('bold');
    expect(result.text).toContain('plain');
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });

  it('extracts text entries from zip archives', async () => {
    const zip = new JSZip();
    zip.file('evidence/alpha.txt', 'alpha content');
    zip.file('beta.md', '# beta content');
    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    const result = await extractTextFromBase64(zipBase64, 'application/zip', 'bundle.zip');

    expect(result.text).toContain('alpha content');
    expect(result.text).toContain('beta content');
    expect(result.metadata.archiveEntries).toBe(2);
  });

  it('normalizes text and chunks consistently', () => {
    const messy = '\nline1\r\nline2\u0000line3';
    const normalized = normalizeText(messy);
    expect(normalized).toBe('line1\nline2line3');

    const chunks = chunkText('a'.repeat(9000), 4000);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toHaveLength(4000);
  });
});
