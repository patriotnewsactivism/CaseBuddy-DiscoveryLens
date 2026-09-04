import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, requireProjectRole } from '@/lib/serverAuth';

export const maxDuration = 300; // 5 minutes for large file uploads
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// POST /api/storage/upload - Upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const authentication = await requireAuthenticatedUser(request);
    if (!authentication.ok) return authentication.response;

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

    const authorization = await requireProjectRole(request, projectId, ['paralegal']);
    if (!authorization.ok) return authorization.response;

    if ((file as File).size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 100 MB upload limit' }, { status: 413 });
    }

    if (!/^[A-Za-z0-9_-]{1,64}$/.test(batesNumber)) {
      return NextResponse.json({ error: 'Invalid Bates number' }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (checksum && checksum.length > 0) {
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      if (hash !== checksum) {
        return NextResponse.json(
          { error: 'Checksum mismatch. Upload aborted.' },
          { status: 409 }
        );
      }
    }

    const safeFileName = fileName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 160);
    const storagePath = `${projectId}/${batesNumber}_${safeFileName}`;

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
      .createSignedUrl(storagePath, 60 * 60);

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
