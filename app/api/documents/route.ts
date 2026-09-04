import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, requireProjectRole } from '@/lib/serverAuth';

/**
 * Ensures a DiscoveryLens-specific case exists for the given project,
 * so we can satisfy the NOT-NULL case_id constraint on the documents table.
 * Returns the case id.
 */
async function getOrCreateDiscoveryCase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
  userId?: string
): Promise<string> {
  // Check if the project already has a linked case
  const { data: project } = await supabase
    .from('projects')
    .select('case_id, name')
    .eq('id', projectId)
    .single();

  if (project?.case_id) return project.case_id;

  // Create a lightweight case for this DiscoveryLens project
  const caseName = `DiscoveryLens – ${project?.name ?? projectId}`;
  const insertPayload: Record<string, unknown> = {
    name: caseName,
    case_type: 'discovery',
    client_name: 'DiscoveryLens',
    status: 'discovery',
    description: `Auto-created case for DiscoveryLens project ${projectId}`,
  };
  if (userId) insertPayload.user_id = userId;

  const { data: newCase, error: caseErr } = await supabase
    .from('cases')
    .insert(insertPayload as any)
    .select('id')
    .single();

  if (caseErr) {
    console.error('[getOrCreateDiscoveryCase] Failed to create case:', caseErr);
    throw caseErr;
  }

  // Link the case back to the project for future reuse
  await supabase
    .from('projects')
    .update({ case_id: newCase.id } as any)
    .eq('id', projectId);

  return newCase.id;
}

// POST /api/documents - Create a new document record
export async function POST(request: NextRequest) {
  try {
    const authentication = await requireAuthenticatedUser(request);
    if (!authentication.ok) return authentication.response;

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
        { status: 400 },
      );
    }

    const authorization = await requireProjectRole(request, effectiveProjectId, ['paralegal']);
    if (!authorization.ok) return authorization.response;

    if (!storagePath.startsWith(`${effectiveProjectId}/`)) {
      return NextResponse.json({ error: 'storagePath must belong to the project' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Resolve case_id: use provided caseId, or auto-create one for the project
    let resolvedCaseId = caseId;
    if (!resolvedCaseId && projectId) {
      try {
        resolvedCaseId = await getOrCreateDiscoveryCase(supabase, projectId, authorization.value.user.id);
      } catch (err) {
        console.error('[POST /api/documents] Could not resolve case_id:', err);
        // Fall through – the insert will surface the NOT-NULL error if the column requires it
      }
    }

    // Build document object compatible with remote schema
    const documentData: Record<string, unknown> = {
      name,
      file_type: fileType,
      bates_formatted: batesFormatted,
      storage_path: storagePath,
      file_url: storagePath, // For backward compatibility with remote schema
      status,
    };

    // Set project_id and case_id
    if (projectId) {
      documentData.project_id = projectId;
    }
    if (resolvedCaseId) {
      documentData.case_id = resolvedCaseId;
    }

    // Set user_id (required by the shared DB schema)
    documentData.user_id = authorization.value.user.id;

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
      { status: 500 },
    );
  }
}
