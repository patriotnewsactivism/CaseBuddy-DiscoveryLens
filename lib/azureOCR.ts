import { DocumentAnalysisClient, AnalyzeResult } from '@azure/ai-form-recognizer';
import { DefaultAzureCredential } from '@azure/identity';

const AZURE_DOC_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
const AZURE_DOC_INTELLIGENCE_KEY = process.env.AZURE_DOC_INTELLIGENCE_KEY;

let _docIntelligenceClient: DocumentAnalysisClient | null = null;

export function getDocIntelligenceClient(): DocumentAnalysisClient | null {
  if (!AZURE_DOC_INTELLIGENCE_ENDPOINT) {
    console.warn('AZURE_DOC_INTELLIGENCE_ENDPOINT not configured. OCR will be unavailable.');
    return null;
  }

  if (!_docIntelligenceClient) {
    if (AZURE_DOC_INTELLIGENCE_KEY) {
      _docIntelligenceClient = new DocumentAnalysisClient(
        AZURE_DOC_INTELLIGENCE_ENDPOINT,
        { key: AZURE_DOC_INTELLIGENCE_KEY }
      );
    } else {
      _docIntelligenceClient = new DocumentAnalysisClient(
        AZURE_DOC_INTELLIGENCE_ENDPOINT,
        new DefaultAzureCredential()
      );
    }
  }

  return _docIntelligenceClient;
}

export interface AzureOCRResult {
  text: string;
  pages: {
    pageNumber: number;
    text: string;
    width: number;
    height: number;
    unit: string;
  }[];
  tables: {
    rowCount: number;
    columnCount: number;
    cells: {
      rowIndex: number;
      columnIndex: number;
      content: string;
    }[];
  }[];
  confidence: number;
}

export type OCRProgressCallback = (progress: number, stage: string) => void;

export async function extractTextWithAzureOCR(
  fileBuffer: Buffer,
  mimeType: string,
  onProgress?: OCRProgressCallback
): Promise<AzureOCRResult> {
  const client = getDocIntelligenceClient();
  
  if (!client) {
    throw new Error('Azure Document Intelligence is not configured. Set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY environment variables.');
  }

  if (onProgress) {
    onProgress(10, 'Starting Azure OCR analysis...');
  }

  const poller = await client.beginAnalyzeDocument('prebuilt-read', fileBuffer);
  
  if (onProgress) {
    onProgress(30, 'Azure OCR processing...');
  }

  const result = await poller.pollUntilDone();

  if (!result) {
    throw new Error('Azure OCR failed: no result returned');
  }

  if (onProgress) {
    onProgress(100, 'Azure OCR complete');
  }

  return processAzureResult(result);
}

function processAzureResult(result: AnalyzeResult): AzureOCRResult {
  const pages: AzureOCRResult['pages'] = [];
  const tables: AzureOCRResult['tables'] = [];
  let allText = '';

  if (result.pages) {
    for (const page of result.pages) {
      let pageText = '';
      
      if (page.lines) {
        const lines = page.lines.map(line => line.content).join('\n');
        pageText = lines;
        allText += lines + '\n\n';
      }

      pages.push({
        pageNumber: page.pageNumber || 1,
        text: pageText,
        width: page.width || 0,
        height: page.height || 0,
        unit: page.unit || 'pixel',
      });
    }
  }

  if (result.tables) {
    for (const table of result.tables) {
      const cells = table.cells.map(cell => ({
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        content: cell.content,
      }));

      tables.push({
        rowCount: table.rowCount || 0,
        columnCount: table.columnCount || 0,
        cells,
      });
    }
  }

  let totalConfidence = 1;
  let confidenceCount = 0;
  
  if (result.pages) {
    for (const page of result.pages) {
      if (page.lines) {
        for (const line of page.lines) {
          if (line.content && page.words) {
            confidenceCount++;
          }
        }
      }
    }
  }

  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 1;

  return {
    text: allText.trim(),
    pages,
    tables,
    confidence: avgConfidence,
  };
}

export async function extractTablesFromDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ tables: AzureOCRResult['tables']; markdown: string }> {
  const client = getDocIntelligenceClient();
  
  if (!client) {
    throw new Error('Azure Document Intelligence is not configured');
  }

  const poller = await client.beginAnalyzeDocument('prebuilt-layout', fileBuffer);
  const result = await poller.pollUntilDone();

  if (!result || !result.tables) {
    return { tables: [], markdown: '' };
  }

  const tables = result.tables.map(table => ({
    rowCount: table.rowCount || 0,
    columnCount: table.columnCount || 0,
    cells: table.cells.map(cell => ({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      content: cell.content,
    })),
  }));

  const markdown = tables.map((table, tableIndex) => {
    const rows: string[][] = [];
    for (let i = 0; i < table.rowCount; i++) {
      rows.push([]);
    }
    
    for (const cell of table.cells) {
      if (!rows[cell.rowIndex]) {
        rows[cell.rowIndex] = [];
      }
      rows[cell.rowIndex][cell.columnIndex] = cell.content;
    }

    let md = `\n### Table ${tableIndex + 1}\n\n`;
    
    if (rows.length > 0) {
      md += '| ' + rows[0].join(' | ') + ' |\n';
      md += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';
      
      for (let i = 1; i < rows.length; i++) {
        md += '| ' + rows[i].join(' | ') + ' |\n';
      }
    }
    
    return md;
  }).join('\n');

  return { tables, markdown };
}

export function isAzureOCRConfigured(): boolean {
  return Boolean(AZURE_DOC_INTELLIGENCE_ENDPOINT);
}
