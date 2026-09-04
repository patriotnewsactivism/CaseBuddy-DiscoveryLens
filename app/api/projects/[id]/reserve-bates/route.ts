import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { validateUuid } from '@/lib/projectValidation';
import { requireProjectRole } from '@/lib/serverAuth';

// POST /api/projects/[id]/reserve-bates - Atomically reserve a block of N
// contiguous Bates numbers for this project (see migration
// 20260706000000_atomic_bates_and_search.sql for reserve_bates_numbers()).
// Returns the starting number of the reserved block; the caller assigns
// [startNumber, startNumber + count) to the files it's about to process.
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const count = Number(body?.count);

    if (!Number.isInteger(count) || count <= 0 || count > 5000) {
      return NextResponse.json({ error: 'count must be a positive integer no greater than 5000' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: startNumber, error } = await supabase.rpc('reserve_bates_numbers', {
      p_project_id: id,
      p_count: count,
    });

    if (error) throw error;

    return NextResponse.json({ startNumber });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error reserving Bates numbers:', error);
    return NextResponse.json(
      { error: 'Failed to reserve Bates numbers', details: message },
      { status: 500 }
    );
  }
}
