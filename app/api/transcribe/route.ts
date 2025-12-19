import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioServer } from '@/lib/geminiServer';
import { downloadMediaBuffer, getMaxMediaBytes } from '@/lib/mediaTranscoder';

export const maxDuration = 300; // 5 minutes for transcription

async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    const mediaUrl = formData.get('mediaUrl') as string | null;
    const batesNumber = (formData.get('batesNumber') as string) || 'UNKNOWN';
    const fileName = (formData.get('fileName') as string) || (file instanceof File ? file.name : 'Unknown');

    if (file instanceof File) {
      const mimeType = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { buffer, mimeType, fileName, batesNumber };
    }

    if (mediaUrl) {
      const { buffer, mimeType, fileName: derivedName } = await downloadMediaBuffer(mediaUrl, getMaxMediaBytes());
      return { buffer, mimeType: mimeType || 'application/octet-stream', fileName: fileName || derivedName || 'Unknown', batesNumber };
    }

    throw new Error('No file or mediaUrl provided in form data');
  }

  const body = await request.json();
  const { base64Data, mimeType, fileName, batesNumber, mediaUrl } = body;

  if (mediaUrl) {
    const { buffer, mimeType: remoteMime, fileName: derivedName } = await downloadMediaBuffer(mediaUrl, getMaxMediaBytes());
    return { buffer, mimeType: mimeType || remoteMime || 'application/octet-stream', fileName: fileName || derivedName || 'Unknown', batesNumber: batesNumber || 'UNKNOWN' };
  }

  if (!base64Data || !mimeType) {
    throw new Error('Missing required fields: base64Data and mimeType');
  }

  return {
    buffer: Buffer.from(base64Data, 'base64'),
    mimeType,
    fileName: fileName || 'Unknown',
    batesNumber: batesNumber || 'UNKNOWN'
  };
}

export async function POST(request: NextRequest) {
  try {
    const { buffer, mimeType, fileName, batesNumber } = await parseRequest(request);

    // Validate that this is an audio or video file
    if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio and video files are supported.' },
        { status: 400 }
      );
    }

    const transcription = await transcribeAudioServer({
      input: buffer,
      mimeType,
      fileName,
      batesNumber,
      isBase64: false,
    });

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    const status = error?.message?.includes('exceeds maximum size') ? 413 : 500;
    return NextResponse.json(
      {
        error: 'Failed to transcribe file',
        details: error?.message || String(error)
      },
      { status }
    );
  }
}
