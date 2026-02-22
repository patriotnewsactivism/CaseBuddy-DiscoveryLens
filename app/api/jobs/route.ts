import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';

type JobType = Database['public']['Tables']['job_queue']['Row']['job_type'];

interface CreateJobRequest {
  projectId: string;
  documentId?: string;
  jobType: JobType;
  priority?: number;
}

interface BatchJobRequest {
  projectId: string;
  jobs: Array<{
    documentId: string;
    jobType: JobType;
    priority?: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if ('jobs' in body && Array.isArray(body.jobs)) {
      return handleBatchCreate(body as BatchJobRequest);
    }
    
    return handleSingleCreate(body as CreateJobRequest);
  } catch (error: unknown) {
    console.error('Error creating job:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create job', details: message },
      { status: 500 }
    );
  }
}

async function handleSingleCreate(body: CreateJobRequest): Promise<NextResponse> {
  const { projectId, documentId, jobType, priority = 0 } = body;

  if (!projectId || !jobType) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, jobType' },
      { status: 400 }
    );
  }

  const validJobTypes = ['extract', 'analyze', 'transcribe'];
  if (!validJobTypes.includes(jobType)) {
    return NextResponse.json(
      { error: `Invalid jobType. Must be one of: ${validJobTypes.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: job, error } = await supabase
    .from('job_queue')
    .insert({
      project_id: projectId,
      document_id: documentId || null,
      job_type: jobType,
      priority,
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert job: ${error.message}`);
  }

  return NextResponse.json({ job }, { status: 201 });
}

async function handleBatchCreate(body: BatchJobRequest): Promise<NextResponse> {
  const { projectId, jobs } = body;

  if (!projectId || !Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, jobs (non-empty array)' },
      { status: 400 }
    );
  }

  const validJobTypes = ['extract', 'analyze', 'transcribe'];
  for (const job of jobs) {
    if (!job.documentId || !job.jobType) {
      return NextResponse.json(
        { error: 'Each job must have documentId and jobType' },
        { status: 400 }
      );
    }
    if (!validJobTypes.includes(job.jobType)) {
      return NextResponse.json(
        { error: `Invalid jobType. Must be one of: ${validJobTypes.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const supabase = getSupabaseAdmin();

  const jobsToInsert = jobs.map(job => ({
    project_id: projectId,
    document_id: job.documentId,
    job_type: job.jobType,
    priority: job.priority || 0,
    status: 'pending' as const,
    attempts: 0,
    max_attempts: 3,
  }));

  const { data: createdJobs, error } = await supabase
    .from('job_queue')
    .insert(jobsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to insert jobs: ${error.message}`);
  }

  return NextResponse.json({ jobs: createdJobs, count: createdJobs.length }, { status: 201 });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('job_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      const validStatuses = ['pending', 'processing', 'complete', 'failed'] as const;
      const typedStatus = validStatuses.find(s => s === status);
      if (!typedStatus) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      query = query.eq('status', typedStatus);
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    console.error('Error fetching jobs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: message },
      { status: 500 }
    );
  }
}