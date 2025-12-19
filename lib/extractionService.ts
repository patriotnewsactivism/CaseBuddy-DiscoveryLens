import fileType from 'file-type';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import { lookup as mimeLookup } from 'mime-types';

export interface ExtractionResult {
  text: string;
  mimeType: string;
  metadata: Record<string, unknown>;
  chunks: string[];
}

const DEFAULT_CHUNK_SIZE = 8000;

const isProbablyText = (mime?: string | null) => {
  if (!mime) return false;
  return mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html');
};

export const normalizeText = (text: string): string => {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
};

export const chunkText = (text: string, size: number = DEFAULT_CHUNK_SIZE): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + size));
    index += size;
  }
  return chunks;
};

const detectMimeType = async (buffer: Buffer, provided?: string, fileName?: string) => {
  if (provided) return provided;
  const detected = await fileType.fromBuffer(buffer);
  if (detected?.mime) return detected.mime;
  if (fileName) {
    const mime = mimeLookup(fileName);
    if (mime) return mime;
  }
  return 'application/octet-stream';
};

const extractFromPdf = async (buffer: Buffer) => {
  const pdfParseImport = await import('pdf-parse');
  const PDFParse = (pdfParseImport as any).PDFParse;
  if (!PDFParse) {
    throw new Error('PDF parser unavailable');
  }

  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  if (typeof parser.destroy === 'function') {
    await parser.destroy();
  }
  return normalizeText(data.text || '');
};

const extractFromDocx = async (buffer: Buffer) => {
  const { value } = await mammoth.extractRawText({ buffer });
  return normalizeText(value || '');
};

const extractFromStructuredText = (buffer: Buffer) => {
  const decoded = buffer.toString('utf-8');
  return normalizeText(decoded);
};

const extractFromHtmlOrXml = (buffer: Buffer) => {
  const decoded = buffer.toString('utf-8');
  const sanitized = sanitizeHtml(decoded, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text: string) => text,
  });
  return normalizeText(sanitized);
};

const extractFromJson = (buffer: Buffer) => {
  try {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    return normalizeText(JSON.stringify(parsed, null, 2));
  } catch {
    return extractFromStructuredText(buffer);
  }
};

export const extractTextFromBase64 = async (
  base64Data: string,
  providedMimeType?: string,
  fileName?: string,
): Promise<ExtractionResult> => {
  const buffer = Buffer.from(base64Data, 'base64');
  const mimeType = await detectMimeType(buffer, providedMimeType, fileName);

  let text = '';
  if (mimeType.includes('pdf')) {
    text = await extractFromPdf(buffer);
  } else if (mimeType.includes('wordprocessingml') || mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    text = await extractFromDocx(buffer);
  } else if (mimeType.includes('json')) {
    text = extractFromJson(buffer);
  } else if (mimeType.includes('xml')) {
    text = extractFromHtmlOrXml(buffer);
  } else if (mimeType.includes('html') || mimeType === 'text/html') {
    text = extractFromHtmlOrXml(buffer);
  } else if (isProbablyText(mimeType)) {
    text = extractFromStructuredText(buffer);
  } else {
    text = extractFromStructuredText(buffer);
  }

  const normalized = normalizeText(text);
  const chunks = chunkText(normalized);

  return {
    text: normalized,
    mimeType,
    metadata: {
      mimeType,
      fileName,
      byteLength: buffer.byteLength,
      wordCount: normalized ? normalized.split(/\s+/).length : 0,
      chunkCount: chunks.length,
    },
    chunks,
  };
};
