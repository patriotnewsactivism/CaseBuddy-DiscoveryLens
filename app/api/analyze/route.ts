import { NextRequest, NextResponse } from 'next/server';
import { analyzeFileServer } from '@/lib/geminiServer';
import { chunkText, extractTextFromBase64 } from '@/lib/extractionService';

export const maxDuration = 300; // 5 minutes for long file analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, mimeType, fileName, batesNumber, fileType, casePerspective, extractedText } = body;

    if (!base64Data && !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields: base64Data or extractedText' },
        { status: 400 }
      );
    }

    let cleanedText = extractedText as string | undefined;
    let detectedMime = mimeType as string | undefined;
    let metadata: Record<string, unknown> | undefined;
    let chunks: string[] = [];

    if (!cleanedText && base64Data) {
      const extraction = await extractTextFromBase64(base64Data, mimeType, fileName);
      cleanedText = extraction.text;
      detectedMime = extraction.mimeType;
      metadata = extraction.metadata;
      chunks = extraction.chunks;
    } else if (cleanedText) {
      chunks = chunkText(cleanedText);
      metadata = {
        mimeType: mimeType || 'text/plain',
        fileName,
        wordCount: cleanedText ? cleanedText.split(/\s+/).length : 0,
        chunkCount: chunks.length,
      };
    }

    const analysis = await analyzeFileServer({
      mimeType: detectedMime || mimeType,
      fileName: fileName || 'Unknown',
      batesNumber: batesNumber || 'UNKNOWN',
      fileType: fileType || 'DOCUMENT',
      casePerspective,
      textContent: cleanedText,
      textChunks: chunks,
      metadata,
      base64Data,
    });

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze file',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
