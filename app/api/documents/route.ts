import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

// POST /api/documents - Create a new document record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      caseId,
      name,
      mimeType,
      fileType,
      fileSize,
      batesPrefix,
      batesNumber,
      batesFormatted,
      storagePath,
      status = 'pending',
    } = body;

    // Validate required fields - accept either projectId or caseId
    const effectiveProjectId = projectId || caseId;
    if (!effectiveProjectId || !name || !fileType || !batesFormatted || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId (or caseId), name, fileType, batesFormatted, storagePath' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Build document object compatible with remote schema
    const documentData: Record<string, unknown> = {
      name,
      file_type: fileType,
      bates_formatted: batesFormatted,
      storage_path: storagePath,
      file_url: storagePath, // For backward compatibility with remote schema
      status,
    };

    // Set project_id or case_id based on what's available
    if (projectId) {
      documentData.project_id = projectId;
    }
    if (caseId) {
      documentData.case_id = caseId;
    }

    // Add optional fields
    if (mimeType) documentData.mime_type = mimeType;
    if (fileSize !== undefined) documentData.file_size = fileSize;
    if (batesPrefix) documentData.bates_prefix = batesPrefix;
    if (batesNumber !== undefined) documentData.bates_number = String(batesNumber);

    const { data: document, error } = await supabase
      .from('documents')
      .insert(documentData as any)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document', details: error.message },
      { status: 500 }
    );
  }
}
