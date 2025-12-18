import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

// POST /api/documents - Create a new document record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      mimeType,
      fileType,
      fileSize,
      batesPrefix,
      batesNumber,
      batesFormatted,
      storagePath,
      analysis,
      status = 'processing',
    } = body;

    // Validate required fields
    if (!projectId || !name || !mimeType || !fileType || !batesFormatted || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        name,
        mime_type: mimeType,
        file_type: fileType,
        file_size: fileSize,
        bates_prefix: batesPrefix,
        bates_number: batesNumber,
        bates_formatted: batesFormatted,
        storage_path: storagePath,
        analysis,
        status,
      })
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
