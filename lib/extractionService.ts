import { fileTypeFromBuffer } from 'file-type';
import JSZip from 'jszip';
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
    mime.includes('html') ||
    mime.includes('csv') ||
    mime.includes('tsv') ||
    mime.includes('yaml') ||
    mime.includes('yml') ||
    mime.includes('rtf') ||
    mime.includes('rfc822') ||
    mime.includes('markdown');
};

export const normalizeText = (text: string): string => {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\s+|\s+$/g, '');
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
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime) return detected.mime;
  if (fileName) {
    const mime = mimeLookup(fileName);
    if (mime) return mime;
  }
  return 'application/octet-stream';
};

const extractFromPdf = async (buffer: Buffer) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
  const { getDocument, GlobalWorkerOptions } = pdfjs as any;

  if (GlobalWorkerOptions) {
    // Use the packaged ESM worker to avoid relying on Node canvas bindings.
    const workerSrc = (worker as any).default || 'pdfjs-dist/build/pdf.worker.min.mjs';
    GlobalWorkerOptions.workerSrc = typeof workerSrc === 'string' ? workerSrc : 'pdfjs-dist/build/pdf.worker.min.mjs';
  }

  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  try {
    let combined = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str || '').join(' ');
      combined += `${strings}\n`;
    }

    return normalizeText(combined);
  } finally {
    await pdf.cleanup();
    loadingTask.destroy();
  }
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

const extractFromCsvOrTsv = (buffer: Buffer) => {
  const decoded = buffer.toString('utf-8');
  const rows = decoded
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.trim());
  return normalizeText(rows.join('\n'));
};

const stripRtfFormatting = (text: string) => {
  const decodedHex = text.replace(/\\'([0-9a-fA-F]{2})/g, (_match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  const withoutControls = decodedHex
    .replace(/\{\\\*?[^}]+\}/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\\~/g, ' ')
    .replace(/\\-|\\_/g, ' ');

  return normalizeText(withoutControls);
};

const extractFromRtf = (buffer: Buffer) => {
  const decoded = buffer.toString('utf-8');
  return stripRtfFormatting(decoded);
};

const extractFromEmail = (buffer: Buffer) => {
  const decoded = buffer.toString('utf-8');
  // Preserve headers but strip excessive whitespace for readability
  return normalizeText(decoded);
};

const extractFromZip = async (buffer: Buffer) => {
  const zip = new JSZip();
  const archive = await zip.loadAsync(buffer);
  const textEntries: string[] = [];
  const entryNames: string[] = [];

  const textLikeExtensions = ['txt', 'csv', 'tsv', 'json', 'xml', 'html', 'md', 'rtf', 'yaml', 'yml'];

  for (const [path, entry] of Object.entries(archive.files)) {
    if (entry.dir) continue;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (!textLikeExtensions.includes(ext)) continue;

    const content = await entry.async('string');
    textEntries.push(`--- ${path} ---\n${content}`);
    entryNames.push(path);
  }

  const combined = textEntries.join('\n\n');
  return {
    text: normalizeText(combined),
    metadata: {
      archiveEntries: textEntries.length,
      archiveFileNames: entryNames,
    },
  };
};

export const extractTextFromBase64 = async (
  base64Data: string,
  providedMimeType?: string,
  fileName?: string,
): Promise<ExtractionResult> => {
  const buffer = Buffer.from(base64Data, 'base64');
  const mimeType = await detectMimeType(buffer, providedMimeType, fileName);

  let text = '';
  let metadata: Record<string, unknown> = {};

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
  } else if (mimeType.includes('csv') || mimeType.includes('tsv')) {
    text = extractFromCsvOrTsv(buffer);
  } else if (mimeType.includes('yaml') || mimeType.includes('yml')) {
    text = extractFromStructuredText(buffer);
  } else if (mimeType.includes('rtf')) {
    text = extractFromRtf(buffer);
  } else if (mimeType.includes('rfc822')) {
    text = extractFromEmail(buffer);
  } else if (mimeType.includes('zip')) {
    const zipResult = await extractFromZip(buffer);
    text = zipResult.text;
    metadata = { ...metadata, ...zipResult.metadata };
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
      ...metadata,
    },
    chunks,
  };
};
