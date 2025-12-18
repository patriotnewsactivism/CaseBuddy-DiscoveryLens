import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioServer } from '@/lib/geminiServer';

export const maxDuration = 300; // 5 minutes for transcription

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, mimeType, fileName, batesNumber } = body;

    // Validate required fields
    if (!base64Data || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: base64Data and mimeType' },
        { status: 400 }
      );
    }

    // Validate that this is an audio or video file
    if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio and video files are supported.' },
        { status: 400 }
      );
    }

    // Call server-side transcription function
    const transcription = await transcribeAudioServer({
      base64Data,
      mimeType,
      fileName: fileName || 'Unknown',
      batesNumber: batesNumber || 'UNKNOWN',
    });

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to transcribe file',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
