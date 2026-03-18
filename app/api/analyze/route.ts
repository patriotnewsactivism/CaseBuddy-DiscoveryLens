import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProviders } from '@/lib/aiProvider';
import { analyzeFileServer as analyzeWithAzure } from '@/lib/azureOpenAIService';
import { analyzeFileServer as analyzeWithOpenAI } from '@/lib/openAIService';
import { analyzeFileServer as analyzeWithGemini } from '@/lib/geminiServerService';
import { chunkText, extractTextFromBase64 } from '@/lib/extractionService';
import { extractTextWithDocumentIntelligence, isDocumentIntelligenceConfigured } from '@/lib/documentIntelligenceService';
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

      // Try Document Intelligence first for PDFs and images (best accuracy)
      if (isDocumentIntelligenceConfigured() && (mimeType?.includes('pdf') || mimeType?.includes('image/'))) {
        try {
          console.log('[analyze] Using Document Intelligence for OCR...');
          const docResult = await extractTextWithDocumentIntelligence(
            payloadBase64,
            mimeType || 'application/octet-stream',
            fileName,
            batesNumber
          );
          cleanedText = docResult.text;
          detectedMime = mimeType;
          metadata = {
            mimeType: mimeType || 'application/pdf',
            fileName,
            wordCount: cleanedText ? cleanedText.split(/\s+/).length : 0,
            sourceOCR: 'document-intelligence',
            pages: docResult.pages,
            confidence: docResult.confidence,
            tableCount: docResult.tables?.length || 0,
          };
          chunks = chunkText(cleanedText);
          console.log('[analyze] Document Intelligence extraction complete:', {
            textLength: cleanedText?.length || 0,
            chunkCount: chunks.length,
            confidence: metadata.confidence,
          });
        } catch (docIntelError: any) {
          console.warn('[analyze] Document Intelligence failed, falling back to generic extraction:', docIntelError?.message);
          const extraction = await extractTextFromBase64(payloadBase64, mimeType, fileName);
          cleanedText = extraction.text;
          detectedMime = extraction.mimeType;
          metadata = extraction.metadata;
          chunks = extraction.chunks;
        }
      } else {
        // Fall back to generic text extraction
        const extraction = await extractTextFromBase64(payloadBase64, mimeType, fileName);
        cleanedText = extraction.text;
        detectedMime = extraction.mimeType;
        metadata = extraction.metadata;
        chunks = extraction.chunks;
        console.log('[analyze] Generic extraction complete:', {
          textLength: cleanedText?.length || 0,
          chunkCount: chunks.length,
          detectedMime,
        });
      }
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

    const providers = getConfiguredAIProviders();

    console.log('[analyze] Provider fallback chain:', {
      providers,
      hasAzureEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      hasAzureKey: !!process.env.AZURE_OPENAI_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      aiProviderEnv: process.env.AI_PROVIDER,
    });

    const analyzeParams = {
      mimeType: detectedMime || mimeType,
      fileName: fileName || 'Unknown',
      batesNumber: batesNumber || 'UNKNOWN',
      fileType: fileType || 'DOCUMENT',
      casePerspective,
      textContent: cleanedText,
      textChunks: chunks,
      metadata,
      base64Data: payloadBase64,
    };

    const isAuthError = (error: any): boolean =>
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Access denied') ||
      error?.message?.includes('invalid subscription key') ||
      error?.message?.includes('Invalid API key') ||
      error?.message?.includes('authentication') ||
      error?.code === 'AuthenticationError';

    let analysis: any = null;
    let lastAuthError: any = null;

    for (const provider of providers) {
      try {
        console.log(`[analyze] Trying provider: ${provider}`);
        const fn = provider === 'azure' ? analyzeWithAzure
          : provider === 'gemini' ? analyzeWithGemini
          : analyzeWithOpenAI;
        analysis = await fn(analyzeParams);
        console.log(`[analyze] Success with provider: ${provider}`);
        break;
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn(`[analyze] Provider ${provider} auth failed, trying next provider...`, err?.message);
          lastAuthError = err;
          continue;
        }
        throw err; // Non-auth errors propagate immediately
      }
    }

    if (analysis === null) {
      console.error('[analyze] All providers failed authentication — returning placeholder analysis.');
      // Return a placeholder so the app continues working without valid AI credentials.
      // The UI can detect analysisUnavailable=true to show a warning badge.
      const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
      const evidenceType =
        (mimeType || '').startsWith('image/') ? 'Photograph'
        : (mimeType || '').startsWith('video/') ? 'CCTV/Surveillance'
        : (mimeType || '').startsWith('audio/') ? 'Audio Recording'
        : 'Other';
      analysis = {
        summary: `AI analysis unavailable — no configured AI provider could authenticate. Please check your AI provider credentials (OPENAI_API_KEY, GEMINI_API_KEY, or Azure OpenAI settings). File: ${fileName || 'Unknown'}`,
        evidenceType,
        entities: [],
        dates: [],
        relevantFacts: [`File: ${fileName || 'Unknown'}`, `Type: ${mimeType || fileType || 'Unknown'}`],
        sentiment: 'Neutral',
        transcription: '',
        analysisUnavailable: true,
      };
    }

    console.log('[analyze] Analysis complete:', {
      hasSummary: !!analysis.summary,
      hasEvidenceType: !!analysis.evidenceType,
      entityCount: analysis.entities?.length || 0,
    });

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analysis API error:', error);

    const isAuthErr =
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Access denied') ||
      error?.message?.includes('invalid subscription key') ||
      error?.message?.includes('Invalid API key') ||
      error?.message?.includes('authentication') ||
      error?.code === 'AuthenticationError';

    if (isAuthErr) {
      console.error('[analyze] AI provider authentication failed — check your API key and endpoint configuration.');
      return NextResponse.json(
        { error: 'AI service authentication failed. Please verify your AI provider credentials and configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze file',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
