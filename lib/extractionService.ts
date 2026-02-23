import 'pdf-parse/worker';
import { fileTypeFromBuffer } from 'file-type';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import { lookup as mimeLookup } from 'mime-types';
import { PDFParse } from 'pdf-parse';
import { extractTextWithAzureOCR, isAzureOCRConfigured } from './azureOCR';

export interface ExtractionResult {
  text: string;
  mimeType: string;
  metadata: Record<string, unknown>;
  chunks: string[];
  isScanned?: boolean;
  chunkMetadata?: ChunkMetadata[];
}

export interface ChunkMetadata {
  index: number;
  charStart: number;
  charEnd: number;
  sentenceCount: number;
}

export type ProgressCallback = (progress: number, stage: string) => void;

const DEFAULT_CHUNK_SIZE = 8000;
const MIN_CHUNK_SIZE = 1000;
const SENTENCE_TERMINATORS = /[.!?。！？]+/;

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

const findSentenceBoundary = (text: string, startIndex: number, maxSize: number): number => {
  const searchStart = Math.max(startIndex + MIN_CHUNK_SIZE, startIndex);
  const searchEnd = Math.min(startIndex + maxSize, text.length);
  
  if (searchEnd >= text.length) return text.length;
  
  let lastBoundary = searchEnd;
  for (let i = searchStart; i < searchEnd; i++) {
    if (SENTENCE_TERMINATORS.test(text[i])) {
      lastBoundary = i + 1;
    }
  }
  
  if (lastBoundary === searchEnd) {
    for (let i = searchEnd; i < Math.min(searchEnd + 500, text.length); i++) {
      if (text[i] === ' ' || text[i] === '\n') {
        return i;
      }
    }
  }
  
  return lastBoundary;
};

export const chunkTextSentenceAware = (
  text: string,
  maxSize: number = DEFAULT_CHUNK_SIZE
): { chunks: string[]; metadata: ChunkMetadata[] } => {
  if (!text) return { chunks: [], metadata: [] };
  
  const chunks: string[] = [];
  const metadata: ChunkMetadata[] = [];
  let index = 0;
  let chunkIndex = 0;
  
  while (index < text.length) {
    const boundary = findSentenceBoundary(text, index, maxSize);
    const chunkText = text.slice(index, boundary);
    
    const sentenceCount = (chunkText.match(SENTENCE_TERMINATORS) || []).length;
    
    chunks.push(chunkText);
    metadata.push({
      index: chunkIndex,
      charStart: index,
      charEnd: boundary,
      sentenceCount,
    });
    
    index = boundary;
    chunkIndex++;
  }
  
  return { chunks, metadata };
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

const extractFromPdf = async (
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<{ text: string; isScanned: boolean }> => {
  if (onProgress) onProgress(0, 'Starting PDF extraction');
  
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    
    const text = result.text || '';
    const normalizedText = normalizeText(text);
    const pageCount = result.total || 1;
    
    if (onProgress) onProgress(50, `Extracted text from ${pageCount} pages`);
    
    const isScanned = normalizedText.length < 100;
    
    if (isScanned && isAzureOCRConfigured()) {
      if (onProgress) {
        onProgress(50, 'PDF appears to be scanned, using Azure OCR...');
      }
      
      try {
        const ocrResult = await extractTextWithAzureOCR(buffer, 'application/pdf', (progress, stage) => {
          if (onProgress) {
            onProgress(50 + progress * 0.5, stage);
          }
        });
        
        await parser.destroy();
        return { 
          text: ocrResult.text, 
          isScanned: true 
        };
      } catch (ocrError) {
        console.warn('Azure OCR failed, falling back to extracted text:', ocrError);
      }
    }
    
    if (onProgress) onProgress(100, 'Extraction complete');
    
    await parser.destroy();
    
    return { 
      text: normalizedText, 
      isScanned 
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`);
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
  onProgress?: ProgressCallback
): Promise<ExtractionResult> => {
  const buffer = Buffer.from(base64Data, 'base64');
  const mimeType = await detectMimeType(buffer, providedMimeType, fileName);

  let text = '';
  let isScanned = false;
  let metadata: Record<string, unknown> = {};

  if (mimeType.includes('pdf')) {
    if (onProgress) onProgress(0, 'Starting PDF extraction');
    const pdfResult = await extractFromPdf(buffer, onProgress);
    text = pdfResult.text;
    isScanned = pdfResult.isScanned;
    if (isScanned) {
      metadata.isScannedPdf = true;
    }
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
  const { chunks, metadata: chunkMetadata } = chunkTextSentenceAware(normalized);

  if (onProgress) onProgress(100, 'Extraction complete');

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
    isScanned,
    chunkMetadata,
  };
};