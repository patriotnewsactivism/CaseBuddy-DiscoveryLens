import { NextRequest, NextResponse } from 'next/server';
import { buildObjectKey, normalizeProjectName } from '@/lib/storageUtils';
import { createStorageClient, getPresignedUploadUrl, getStorageConfig } from '@/lib/storageServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName, files } = body;

    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json({ error: 'projectName is required.' }, { status: 400 });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required.' }, { status: 400 });
    }

    const config = getStorageConfig();
    const client = createStorageClient(config);
    const uploads = await Promise.all(
      files.map(async (file: { id: string; name: string; mimeType: string }) => {
        if (!file?.id || !file?.name || !file?.mimeType) {
          throw new Error('Each file requires id, name, and mimeType.');
        }

        const objectKey = buildObjectKey(projectName, file.name, file.id);
        const uploadUrl = await getPresignedUploadUrl(client, config.bucket, objectKey, file.mimeType);
        return { id: file.id, uploadUrl, objectKey };
      })
    );

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
