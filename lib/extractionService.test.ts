import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { extractTextFromBase64, chunkText, normalizeText } from './extractionService';

const createSamplePdfBase64 = () => {
  const pdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 24 Tf
72 100 Td
(Hello PDF) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000254 00000 n 
0000000364 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
446
%%EOF`;
  return Buffer.from(pdf).toString('base64');
};

const createSampleDocxBase64 = async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Hello DOCX world</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return buffer.toString('base64');
};

const toBase64 = (content: string) => Buffer.from(content).toString('base64');

describe('extractionService', () => {
  it('extracts text from PDF', async () => {
    const base64 = createSamplePdfBase64();
    const result = await extractTextFromBase64(base64, 'application/pdf', 'sample.pdf');
    expect(result.text).toContain('Hello PDF');
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });

  it('extracts text from DOCX', async () => {
    const base64 = await createSampleDocxBase64();
    const result = await extractTextFromBase64(base64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'sample.docx');
    expect(result.text).toContain('Hello DOCX world');
    expect(result.mimeType).toContain('wordprocessingml');
  });

  it('sanitizes HTML input', async () => {
    const html = '<html><body><h1>Greeting</h1><script>alert(1)</script><p>Safe text</p></body></html>';
    const result = await extractTextFromBase64(toBase64(html), 'text/html', 'sample.html');
    expect(result.text).toContain('Greeting');
    expect(result.text).toContain('Safe text');
    expect(result.text).not.toContain('alert');
  });

  it('extracts XML content', async () => {
    const xml = '<?xml version="1.0"?><note><to>Alice</to><body>Hello XML</body></note>';
    const result = await extractTextFromBase64(toBase64(xml), 'application/xml', 'note.xml');
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('Hello XML');
  });

  it('extracts JSON content', async () => {
    const json = JSON.stringify({ hello: 'world', nested: { value: 1 } });
    const result = await extractTextFromBase64(toBase64(json), 'application/json', 'data.json');
    expect(result.text).toContain('hello');
    expect(result.text).toContain('nested');
  });

  it('chunks long text deterministically', () => {
    const text = 'a'.repeat(10000);
    const chunks = chunkText(text, 4000);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toHaveLength(4000);
    expect(chunks[2]).toHaveLength(2000);
  });

  it('normalizes line endings and nulls', () => {
    const raw = 'Line1\r\nLine2\u0000';
    expect(normalizeText(raw)).toBe('Line1\nLine2');
  });
});
