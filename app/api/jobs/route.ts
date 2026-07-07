import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

type JobType = 'extract' | 'analyze' | 'transcribe';

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

// job_queue is not yet in the generated types — use untyped client for these routes
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseAdmin() as any;
}

const VALID_JOB_TYPES: JobType[] = ['extract', 'analyze', 'transcribe'];
const VALID_STATUSES = ['pending', 'processing', 'complete', 'failed'] as const;

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

  if (!VALID_JOB_TYPES.includes(jobType)) {
    return NextResponse.json(
      { error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data: job, error } = await getDb()
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

  for (const job of jobs) {
    if (!job.documentId || !job.jobType) {
      return NextResponse.json(
        { error: 'Each job must have documentId and jobType' },
        { status: 400 }
      );
    }
    if (!VALID_JOB_TYPES.includes(job.jobType)) {
      return NextResponse.json(
        { error: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const jobsToInsert = jobs.map(job => ({
    project_id: projectId,
    document_id: job.documentId,
    job_type: job.jobType,
    priority: job.priority || 0,
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
  }));

  const { data: createdJobs, error } = await getDb()
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

    let query = getDb()
      .from('job_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      query = query.eq('status', status);
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
