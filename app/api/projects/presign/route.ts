import { NextRequest, NextResponse } from 'next/server';
import { buildObjectKey, normalizeProjectName } from '@/lib/storageUtils';
import { requireAuthenticatedUser } from '@/lib/serverAuth';

/**
 * Presign endpoint for preparing file uploads
 * Since Supabase Storage doesn't support presigned PUT URLs like S3,
 * this endpoint returns server-side upload endpoints instead.
 * Client should POST file data to /api/projects/upload with the objectKey.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await requireAuthenticatedUser(request);
    if (!authorization.ok) return authorization.response;

    const body = await request.json();
    const { projectName, files } = body;

    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json({ error: 'projectName is required.' }, { status: 400 });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required.' }, { status: 400 });
    }

    const uploads = files.map((file: { id: string; name: string; mimeType: string }) => {
      if (!file?.id || !file?.name || !file?.mimeType) {
        throw new Error('Each file requires id, name, and mimeType.');
      }

      const objectKey = `users/${authorization.value.user.id}/${buildObjectKey(projectName, file.name, file.id)}`;

      // Return server-side upload endpoint instead of presigned URL
      // Client will POST file data here
      return {
        id: file.id,
        uploadUrl: `/api/projects/upload?key=${encodeURIComponent(objectKey)}`,
        objectKey,
      };
    });

    return NextResponse.json({
      uploads,
      projectSlug: normalizeProjectName(projectName),
    });
  } catch (error: any) {
    console.error('Presign error:', error);
    return NextResponse.json(
      {
        error: 'Failed to prepare uploads',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
