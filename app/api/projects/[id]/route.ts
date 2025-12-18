import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

// GET /api/projects/[id] - Get project with all documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    return NextResponse.json({
      project,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error.message },
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
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      batesCounter?: number;
    };
    const { name, description, batesCounter } = body;

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
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message },
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
    const supabase = getSupabaseAdmin();

    // Delete will cascade to documents due to foreign key constraint
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message },
      { status: 500 }
    );
  }
}
