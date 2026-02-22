import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: job, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    console.error('Error fetching job:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch job', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: job, error: fetchError } = await supabase
      .from('job_queue')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch job: ${fetchError.message}`);
    }

    if (job.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete a job that is currently processing' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('job_queue')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete job: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error: unknown) {
    console.error('Error deleting job:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete job', details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, priority, maxAttempts } = body;

    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    
    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'complete', 'failed'] as const;
      const typedStatus = validStatuses.find(s => s === status);
      if (!typedStatus) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = typedStatus;
    }

    if (priority !== undefined) {
      if (typeof priority !== 'number') {
        return NextResponse.json(
          { error: 'Priority must be a number' },
          { status: 400 }
        );
      }
      updateData.priority = priority;
    }

    if (maxAttempts !== undefined) {
      if (typeof maxAttempts !== 'number' || maxAttempts < 1 || maxAttempts > 10) {
        return NextResponse.json(
          { error: 'maxAttempts must be a number between 1 and 10' },
          { status: 400 }
        );
      }
      updateData.max_attempts = maxAttempts;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const { data: job, error } = await supabase
      .from('job_queue')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to update job: ${error.message}`);
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    console.error('Error updating job:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update job', details: message },
      { status: 500 }
    );
  }
}