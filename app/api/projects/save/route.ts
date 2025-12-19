import { NextRequest, NextResponse } from 'next/server';
import { createStorageClient, getStorageConfig, saveManifestObject } from '@/lib/storageServer';
import { normalizeProjectName } from '@/lib/storageUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName, files, casePerspective } = body;

    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json({ error: 'projectName is required.' }, { status: 400 });
    }

    if (!Array.isArray(files)) {
      return NextResponse.json({ error: 'files must be an array.' }, { status: 400 });
    }

    const hasMissingKeys = files.some((file: any) => !file?.storageKey);
    if (hasMissingKeys) {
      return NextResponse.json({ error: 'Each file must include storageKey after upload.' }, { status: 400 });
    }

    const slug = normalizeProjectName(projectName);
    const manifestKey = `projects/${slug}/manifest.json`;
    const manifest = {
      projectName,
      savedAt: new Date().toISOString(),
      files,
      manifestKey,
      casePerspective,
    };

    const config = getStorageConfig();
    const client = createStorageClient(config);
    await saveManifestObject(client, config.bucket, manifestKey, manifest);

    return NextResponse.json({ success: true, manifestKey });
  } catch (error: any) {
    console.error('Save project error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save project manifest',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
