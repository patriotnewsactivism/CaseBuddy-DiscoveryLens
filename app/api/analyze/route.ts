import { NextRequest, NextResponse } from 'next/server';
import { analyzeFileServer } from '@/lib/openAIService';
import { chunkText, extractTextFromBase64 } from '@/lib/extractionService';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

async function downloadStorageObject(storagePath: string, signedUrl?: string) {
  const supabase = getSupabaseAdmin();

  console.log('[downloadStorageObject] Starting download:', {
    storagePath,
    hasSignedUrl: !!signedUrl,
    signedUrlLength: signedUrl?.length || 0,
  });

  let url: string;
  
  if (signedUrl) {
    url = signedUrl;
  } else {
    const signedUrlResult = await supabase.storage.from('discovery-files').createSignedUrl(storagePath, 300);
    if (signedUrlResult.error) {
      console.error('[downloadStorageObject] Failed to create signed URL:', signedUrlResult.error);
      throw new Error(`Failed to create signed URL: ${signedUrlResult.error.message}`);
    }
    url = signedUrlResult.data?.signedUrl || '';
  }

  if (!url) {
    throw new Error('Unable to generate signed URL for storage object');
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.error('[downloadStorageObject] Fetch failed:', response.status, response.statusText);
    throw new Error(`Failed to download storage object: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log('[downloadStorageObject] Download complete, size:', arrayBuffer.byteLength);
  return Buffer.from(arrayBuffer);
}

export const maxDuration = 300; // 5 minutes for long file analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, mimeType, fileName, batesNumber, fileType, casePerspective, extractedText, storagePath, signedUrl } = body;

    console.log('[analyze] Request received:', {
      hasBase64Data: !!base64Data,
      base64DataLength: base64Data?.length || 0,
      hasExtractedText: !!extractedText,
      extractedTextLength: extractedText?.length || 0,
      hasStoragePath: !!storagePath,
      storagePath,
      hasSignedUrl: !!signedUrl,
      mimeType,
      fileName,
      batesNumber,
    });

    if (!base64Data && !extractedText && !storagePath) {
      console.error('[analyze] Missing required fields - no data source available');
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
      console.log('[analyze] Downloading from storage:', storagePath);
      try {
        const buffer = await downloadStorageObject(storagePath as string, signedUrl);
        payloadBase64 = buffer.toString('base64');
        console.log('[analyze] Storage download complete, base64 length:', payloadBase64.length);
      } catch (downloadError) {
        console.error('[analyze] Storage download failed:', downloadError);
        throw new Error(`Failed to download from storage: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
      }
    }

    if (!cleanedText && payloadBase64) {
      console.log('[analyze] Extracting text from base64 data...');
      const extraction = await extractTextFromBase64(payloadBase64, mimeType, fileName);
      cleanedText = extraction.text;
      detectedMime = extraction.mimeType;
      metadata = extraction.metadata;
      chunks = extraction.chunks;
      console.log('[analyze] Extraction complete:', {
        textLength: cleanedText?.length || 0,
        chunkCount: chunks.length,
        detectedMime,
      });
    } else if (cleanedText) {
      chunks = chunkText(cleanedText);
      metadata = {
        mimeType: mimeType || 'text/plain',
        fileName,
        wordCount: cleanedText ? cleanedText.split(/\s+/).length : 0,
        chunkCount: chunks.length,
      };
      console.log('[analyze] Using provided extracted text, chunked into', chunks.length, 'chunks');
    }

    if ((!cleanedText || cleanedText.length === 0) && (base64Data || storagePath) && mimeType) {
      metadata = {
        ...metadata,
        inlineDataProvided: Boolean(base64Data),
        storageBacked: Boolean(storagePath),
      };
      console.log('[analyze] Warning: No text extracted from document');
    }

    console.log('[analyze] Calling analyzeFileServer...');
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

    console.log('[analyze] Analysis complete:', {
      hasSummary: !!analysis.summary,
      hasEvidenceType: !!analysis.evidenceType,
      entityCount: analysis.entities?.length || 0,
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
