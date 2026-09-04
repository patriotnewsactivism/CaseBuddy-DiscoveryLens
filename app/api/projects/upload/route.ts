import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser } from '@/lib/serverAuth';

const STORAGE_BUCKET = 'discovery-files';

/**
 * Server-side file upload endpoint
 * Receives multipart file data and uploads to Supabase Storage
 * Used as fallback since Supabase doesn't support presigned PUT URLs
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await requireAuthenticatedUser(request);
    if (!authorization.ok) return authorization.response;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = request.nextUrl.searchParams.get('key');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    if (!key.startsWith(`users/${authorization.value.user.id}/`)) {
      return NextResponse.json({ error: 'Invalid upload key' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const fileBuffer = await file.arrayBuffer();

    console.log(`[upload] Uploading ${file.size} bytes`);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(key, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.error('[upload] Upload failed:', error);
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      );
    }

    console.log('[upload] Upload successful');

    return NextResponse.json({
      success: true,
      key,
      storageKey: key,
    });
  } catch (error: any) {
    console.error('[upload] Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
