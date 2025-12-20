import { NextRequest, NextResponse } from 'next/server';
import { analyzeFileServer } from '@/lib/geminiServer';
import { chunkText, extractTextFromBase64 } from '@/lib/extractionService';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

async function downloadStorageObject(storagePath: string, signedUrl?: string) {
  const supabase = getSupabaseAdmin();

  const url = signedUrl
    ? signedUrl
    : (await supabase.storage.from('discovery-files').createSignedUrl(storagePath, 300)).data?.signedUrl;

  if (!url) {
    throw new Error('Unable to generate signed URL for storage object');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download storage object: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const maxDuration = 300; // 5 minutes for long file analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, mimeType, fileName, batesNumber, fileType, casePerspective, extractedText, storagePath, signedUrl } = body;

    if (!base64Data && !extractedText && !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: storagePath, base64Data, or extractedText' },
        { status: 400 }
      );
    }

    let cleanedText = extractedText as string | undefined;
    let detectedMime = mimeType as string | undefined;
    let metadata: Record<string, unknown> | undefined;
    let chunks: string[] = [];
    let payloadBase64 = base64Data as string | undefined;

    if (!payloadBase64 && storagePath) {
      payloadBase64 = (await downloadStorageObject(storagePath as string, signedUrl)).toString('base64');
    }

    if (!cleanedText && payloadBase64) {
      const extraction = await extractTextFromBase64(payloadBase64, mimeType, fileName);
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

    if ((!cleanedText || cleanedText.length === 0) && (base64Data || storagePath) && mimeType) {
      metadata = {
        ...metadata,
        inlineDataProvided: Boolean(base64Data),
        storageBacked: Boolean(storagePath),
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
      base64Data: payloadBase64,
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
