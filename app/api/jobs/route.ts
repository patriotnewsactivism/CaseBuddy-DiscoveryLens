import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, requireProjectRole } from '@/lib/serverAuth';

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
  return getSupabaseAdmin() as any;
}

const VALID_JOB_TYPES: JobType[] = ['extract', 'analyze', 'transcribe'];
const VALID_STATUSES = ['pending', 'processing', 'complete', 'failed'] as const;

export async function POST(request: NextRequest) {
  try {
    const authentication = await requireAuthenticatedUser(request);
    if (!authentication.ok) return authentication.response;

    const body = await request.json();
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    if (!projectId) {
      return NextResponse.json({ error: 'Missing required field: projectId' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, projectId, ['paralegal']);
    if (!authorization.ok) return authorization.response;

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

  if (documentId && !(await documentsBelongToProject(projectId, [documentId]))) {
    return NextResponse.json({ error: 'documentId does not belong to the project' }, { status: 400 });
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

  if (!(await documentsBelongToProject(projectId, jobs.map((job) => job.documentId)))) {
    return NextResponse.json({ error: 'Every documentId must belong to the project' }, { status: 400 });
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

async function documentsBelongToProject(projectId: string, documentIds: string[]): Promise<boolean> {
  const uniqueDocumentIds = [...new Set(documentIds)];
  if (uniqueDocumentIds.length === 0) return true;

  const { data: documents, error } = await getDb()
    .from('documents')
    .select('id')
    .eq('project_id', projectId)
    .in('id', uniqueDocumentIds);

  if (error) throw new Error(`Failed to validate job documents: ${error.message}`);
  return (documents ?? []).length === uniqueDocumentIds.length;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, projectId, ['viewer']);
    if (!authorization.ok) return authorization.response;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'limit must be an integer between 1 and 100' }, { status: 400 });
    }

    let query = getDb()
      .from('job_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    query = query.eq('project_id', projectId);

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
