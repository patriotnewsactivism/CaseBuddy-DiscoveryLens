import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const maxDuration = 300; // 5 minutes for large file uploads

// POST /api/storage/upload - Upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, fileName, mimeType, projectId, batesNumber } = body;

    // Validate required fields
    if (!base64Data || !fileName || !mimeType || !projectId || !batesNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate storage path: projects/{projectId}/{batesNumber}_{fileName}
    const storagePath = `${projectId}/${batesNumber}_${fileName}`;

    const supabase = getSupabaseAdmin();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('discovery-files')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) throw error;

    // Generate a signed URL valid for 1 year
    const { data: urlData } = await supabase.storage
      .from('discovery-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

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
