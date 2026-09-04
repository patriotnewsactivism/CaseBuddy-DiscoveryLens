import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { validateCreateProjectInput } from '@/lib/projectValidation';
import { requireAuthenticatedUser } from '@/lib/serverAuth';

// GET /api/projects - List all projects (optionally filtered by caseId)
export async function GET(request: NextRequest) {
  try {
    const authorization = await requireAuthenticatedUser(request);
    if (!authorization.ok) return authorization.response;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    const { data: memberships, error: membershipError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', authorization.value.user.id);
    if (membershipError) throw membershipError;

    const memberProjectIds = (memberships ?? []).map((membership) => membership.project_id);
    let query = supabase.from('projects').select('*').order('updated_at', { ascending: false });
    if (memberProjectIds.length > 0) {
      query = query.or(`owner_id.eq.${authorization.value.user.id},id.in.(${memberProjectIds.join(',')})`);
    } else {
      query = query.eq('owner_id', authorization.value.user.id);
    }
    if (caseId) query = query.eq('case_id', caseId);

    const { data: projects, error } = await query;
    if (error) throw error;

    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects', details: message }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const authorization = await requireAuthenticatedUser(request);
    if (!authorization.ok) return authorization.response;

    const body = await request.json();
    const validation = validateCreateProjectInput(body);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const { name, description, batesPrefix, caseId } = validation.value;
    const supabase = getSupabaseAdmin();

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        bates_prefix: batesPrefix,
        bates_counter: 1,
        case_id: caseId ?? null,
        owner_id: authorization.value.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: membershipError } = await supabase
      .from('project_members')
      .upsert({ project_id: project.id, user_id: authorization.value.user.id, role: 'owner' }, { onConflict: 'project_id,user_id' });
    if (membershipError) throw membershipError;

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project', details: message }, { status: 500 });
  }
}
