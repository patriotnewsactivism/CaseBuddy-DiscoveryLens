/**
 * Azure Document Intelligence (formerly Form Recognizer) Service
 * Provides high-accuracy OCR and document analysis for legal discovery files
 */

import { analysisCache, LRUCache } from './cache';

const ENDPOINT = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT?.replace(/\/$/, '');
const KEY = process.env.AZURE_DOC_INTELLIGENCE_KEY;

if (!ENDPOINT) {
  console.warn('[documentIntelligenceService] AZURE_DOC_INTELLIGENCE_ENDPOINT not set; OCR will be unavailable.');
}
if (!KEY) {
  console.warn('[documentIntelligenceService] AZURE_DOC_INTELLIGENCE_KEY not set; OCR will be unavailable.');
}

export interface DocumentIntelligenceResult {
  text: string;
  tables?: TableData[];
  pages: number;
  language: string;
  confidence: number;
}

export interface TableData {
  content: string;
  rowCount: number;
  columnCount: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes a document using Azure Document Intelligence
 * Supports PDFs, images, Word docs, Excel, etc.
 * Returns extracted text, tables, and structure
 */
export async function extractTextWithDocumentIntelligence(
  base64Data: string,
  mimeType: string,
  fileName: string,
  batesNumber: string
): Promise<DocumentIntelligenceResult> {
  if (!ENDPOINT || !KEY) {
    throw new Error('Document Intelligence is not configured. Set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY.');
  }

  // Check cache first
  const cacheKey = LRUCache.createKey('docintell', batesNumber, LRUCache.hashContent(base64Data));
  const cached = await analysisCache.getCachedAnalysis<DocumentIntelligenceResult>(cacheKey);
  if (cached) {
    console.log(`[documentIntelligence] Cache hit for ${batesNumber}`);
    return cached;
  }

  console.log(`[documentIntelligence] Analyzing ${fileName} (${batesNumber})...`);

  // Convert base64 to binary
  const binaryData = Buffer.from(base64Data, 'base64');

  // Map MIME type to Document Intelligence content-type
  const contentType = mapMimeToDocIntellContentType(mimeType);

  // Step 1: POST to /analyzeResults with document
  const analyzeUrl = `${ENDPOINT}/documentintelligence/documentmodels/prebuilt-read:analyze?api-version=2024-02-29-preview`;

  console.log(`[documentIntelligence] Posting document to: ${analyzeUrl.replace(ENDPOINT, '[ENDPOINT]')}`);

  const analyzeResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': contentType,
    },
    body: binaryData,
  });

  if (!analyzeResponse.ok) {
    throw new Error(
      `Document Intelligence analysis failed: ${analyzeResponse.status} ${analyzeResponse.statusText}`
    );
  }

  // Extract operation location from response header
  const operationLocation = analyzeResponse.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('No operation-location header in Document Intelligence response');
  }

  console.log(`[documentIntelligence] Analysis started, polling: ${operationLocation.replace(ENDPOINT, '[ENDPOINT]')}`);

  // Step 2: Poll for results
  const result = await pollForResults(operationLocation);

  // Step 3: Extract text and tables from result
  const extracted = extractFromDocIntelligenceResult(result);

  // Cache the result
  analysisCache.cacheAnalysis(cacheKey, extracted, 3600000); // 1 hour TTL

  console.log(`[documentIntelligence] Extraction complete: ${extracted.text.length} chars, ${extracted.pages} pages`);

  return extracted;
}

/**
 * Poll the Document Intelligence operation results endpoint until completion
 */
async function pollForResults(operationLocation: string, maxRetries = 30): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': KEY!,
        },
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Check status
      if (result.status === 'succeeded') {
        console.log(`[documentIntelligence] Analysis succeeded after ${attempt + 1} polls`);
        return result.analyzeResult;
      }

      if (result.status === 'failed') {
        throw new Error(`Document Intelligence analysis failed: ${result.error?.message || 'Unknown error'}`);
      }

      // Still running, wait and retry
      const waitMs = 1000 * Math.min(attempt + 1, 5); // Back off up to 5 seconds
      console.log(`[documentIntelligence] Status: ${result.status}, retrying in ${waitMs}ms...`);
      await sleep(waitMs);
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await sleep(1000);
      }
    }
  }

  throw lastError || new Error('Document Intelligence polling timed out');
}

/**
 * Extract text and tables from Document Intelligence result
 */
function extractFromDocIntelligenceResult(analyzeResult: any): DocumentIntelligenceResult {
  let fullText = '';
  const tables: TableData[] = [];
  let pageCount = 0;
  let avgConfidence = 0;

  if (!analyzeResult) {
    return { text: '', pages: 0, language: 'unknown', confidence: 0 };
  }

  // Extract text from pages
  if (analyzeResult.pages) {
    pageCount = analyzeResult.pages.length;

    analyzeResult.pages.forEach((page: any) => {
      if (page.lines) {
        page.lines.forEach((line: any) => {
          fullText += (line.content || '') + '\n';
        });
      }
    });

    // Calculate average confidence
    const allWords: any[] = [];
    analyzeResult.pages.forEach((page: any) => {
      if (page.words) {
        allWords.push(...page.words);
      }
    });
    if (allWords.length > 0) {
      avgConfidence =
        allWords.reduce((sum, w) => sum + (w.confidence || 0), 0) / allWords.length;
    }
  }

  // Extract tables
  if (analyzeResult.tables) {
    analyzeResult.tables.forEach((table: any) => {
      const cells = table.cells || [];
      const rowCount = Math.max(...cells.map((c: any) => c.rowIndex + 1), 0);
      const colCount = Math.max(...cells.map((c: any) => c.columnIndex + 1), 0);
      const content = cells.map((c: any) => c.content).join(' ');

      tables.push({
        content,
        rowCount,
        columnCount: colCount,
      });

      fullText += `\n[TABLE: ${rowCount}x${colCount}]\n${content}\n`;
    });
  }

  // Detect language
  let language = 'en';
  if (analyzeResult.languages && analyzeResult.languages.length > 0) {
    language = analyzeResult.languages[0].locale || 'en';
  }

  return {
    text: fullText.trim(),
    tables,
    pages: pageCount,
    language,
    confidence: avgConfidence,
  };
}

/**
 * Map MIME type to Document Intelligence content-type header
 */
function mapMimeToDocIntellContentType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'application/pdf';
  if (mimeType.includes('image/jpeg')) return 'image/jpeg';
  if (mimeType.includes('image/png')) return 'image/png';
  if (mimeType.includes('image/tiff')) return 'image/tiff';
  if (mimeType.includes('image/bmp')) return 'image/bmp';
  if (mimeType.includes('image/webp')) return 'image/webp';
  if (mimeType.includes('word')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (mimeType.includes('excel')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (mimeType.includes('powerpoint')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  // Default to generic binary
  return 'application/octet-stream';
}

/**
 * Check if Document Intelligence is configured
 */
export function isDocumentIntelligenceConfigured(): boolean {
  return Boolean(ENDPOINT && KEY);
}
