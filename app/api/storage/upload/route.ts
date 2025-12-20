import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const maxDuration = 300; // 5 minutes for large file uploads

// POST /api/storage/upload - Upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const fileName = formData.get('fileName') as string | null;
    const mimeType = formData.get('mimeType') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const batesNumber = formData.get('batesNumber') as string | null;
    const checksum = formData.get('checksum') as string | null;

    if (!file || typeof file === 'string' || !fileName || !mimeType || !projectId || !batesNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (checksum) {
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      if (hash !== checksum) {
        return NextResponse.json(
          { error: 'Checksum mismatch. Upload aborted.' },
          { status: 409 }
        );
      }
    }

    const storagePath = `${projectId}/${batesNumber}_${fileName}`;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
      .from('discovery-files')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = await supabase.storage
      .from('discovery-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    return NextResponse.json({
      storagePath: data.path,
      signedUrl: urlData?.signedUrl,
    });
  } catch (error: any) {
    console.error('Storage upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file to storage',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
