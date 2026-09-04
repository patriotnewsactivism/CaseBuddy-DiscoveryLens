import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { validateProjectPatchInput, validateUuid } from '@/lib/projectValidation';
import { requireProjectRole } from '@/lib/serverAuth';
import type { Database } from '@/types/database.types';

// GET /api/projects/[id] - Get project with all documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateUuid(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, id, ['viewer']);
    if (!authorization.ok) return authorization.response;

    const supabase = getSupabaseAdmin();

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError) throw projectError;
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch all documents for this project
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', id)
      .order('bates_number', { ascending: true });

    if (docsError) throw docsError;

    // Attach fresh signed URLs so resumed sessions can preview cloud-stored
    // files without the client needing to re-derive storage paths itself.
    const storagePaths = (documents || [])
      .map(doc => doc.storage_path)
      .filter((path): path is string => Boolean(path));

    let signedUrlByPath = new Map<string, string>();
    if (storagePaths.length > 0) {
      const { data: signedUrls, error: signError } = await supabase.storage
        .from('discovery-files')
        .createSignedUrls(storagePaths, 3600);

      if (!signError && signedUrls) {
        signedUrlByPath = new Map(
          signedUrls
            .filter(entry => entry.signedUrl && !entry.error)
            .map(entry => [entry.path as string, entry.signedUrl as string])
        );
      }
    }

    const documentsWithUrls = (documents || []).map(doc => ({
      ...doc,
      signed_url: doc.storage_path ? signedUrlByPath.get(doc.storage_path) || null : null,
    }));

    return NextResponse.json({
      project,
      documents: documentsWithUrls,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: message },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateUuid(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, id, ['paralegal']);
    if (!authorization.ok) return authorization.response;

    const body = await request.json();
    const validation = validateProjectPatchInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, description, batesCounter } = validation.value;

    const supabase = getSupabaseAdmin();

    const updates: Partial<Database['public']['Tables']['projects']['Update']> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (batesCounter !== undefined) updates.bates_counter = batesCounter;

    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project (cascades to documents)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateUuid(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, id, ['owner']);
    if (!authorization.ok) return authorization.response;

    const supabase = getSupabaseAdmin();

    // Delete will cascade to documents due to foreign key constraint
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: message },
      { status: 500 }
    );
  }
}
