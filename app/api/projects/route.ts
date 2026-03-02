import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { validateCreateProjectInput } from '@/lib/projectValidation';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: message },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateProjectInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, description, batesPrefix } = validation.value;

    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        bates_prefix: batesPrefix,
        bates_counter: 1,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: message },
      { status: 500 }
    );
  }
}
