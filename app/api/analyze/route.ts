import { NextRequest, NextResponse } from 'next/server';
import { analyzeFileServer } from '@/lib/geminiServer';

export const maxDuration = 300; // 5 minutes for long file analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, mimeType, fileName, batesNumber, fileType } = body;

    // Validate required fields
    if (!base64Data || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: base64Data and mimeType' },
        { status: 400 }
      );
    }

    // Call server-side Gemini function
    const analysis = await analyzeFileServer({
      base64Data,
      mimeType,
      fileName: fileName || 'Unknown',
      batesNumber: batesNumber || 'UNKNOWN',
      fileType: fileType || 'DOCUMENT',
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
