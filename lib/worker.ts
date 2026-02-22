import { getSupabaseAdmin } from './supabaseClient';
import { extractTextFromBase64, type ExtractionResult } from './extractionService';
import { analyzeFileServer } from './geminiServer';
import { LRUCache } from './cache';
import type { Database, Json } from './database.types';

type JobQueueRow = Database['public']['Tables']['job_queue']['Row'];
type JobType = JobQueueRow['job_type'];
type JobStatus = JobQueueRow['status'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

interface WorkerConfig {
  pollIntervalMs: number;
  maxConcurrentJobs: number;
  lockTimeoutMs: number;
}

interface JobProcessor {
  process(job: JobQueueRow): Promise<void>;
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 2000,
  maxConcurrentJobs: 1,
  lockTimeoutMs: 10 * 60 * 1000,
};

class JobWorker {
  private config: WorkerConfig;
  private isRunning = false;
  private currentJob: JobQueueRow | null = null;
  private pollTimeout: NodeJS.Timeout | null = null;
  private workerId: string;
  private onProgress?: (jobId: string, progress: number, stage: string) => void;
  private onComplete?: (jobId: string) => void;
  private onError?: (jobId: string, error: Error) => void;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  setProgressCallback(callback: (jobId: string, progress: number, stage: string) => void): void {
    this.onProgress = callback;
  }

  setCompleteCallback(callback: (jobId: string) => void): void {
    this.onComplete = callback;
  }

  setErrorCallback(callback: (jobId: string, error: Error) => void): void {
    this.onError = callback;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  async stopGracefully(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    while (this.currentJob) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  getWorkerId(): string {
    return this.workerId;
  }

  isProcessing(): boolean {
    return this.currentJob !== null;
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (!this.currentJob) {
        const job = await this.acquireJob();
        if (job) {
          this.currentJob = job;
          this.processJob(job)
            .finally(() => {
              this.currentJob = null;
            });
        }
      }
    } catch (error) {
      console.error(`Worker ${this.workerId} poll error:`, error);
    }

    this.pollTimeout = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private async acquireJob(): Promise<JobQueueRow | null> {
    const supabase = getSupabaseAdmin();
    
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !jobs || jobs.length === 0) {
      return null;
    }

    const job = jobs[0];
    
    const { error: updateError } = await supabase
      .from('job_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'pending');

    if (updateError) {
      return null;
    }

    return { ...job, status: 'processing', started_at: new Date().toISOString() };
  }

  private async processJob(job: JobQueueRow): Promise<void> {
    try {
      switch (job.job_type) {
        case 'extract':
          await this.processExtractJob(job);
          break;
        case 'analyze':
          await this.processAnalyzeJob(job);
          break;
        case 'transcribe':
          await this.processTranscribeJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await this.markJobComplete(job.id);
      this.onComplete?.(job.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.handleJobFailure(job, err);
      this.onError?.(job.id, err);
    }
  }

  private async processExtractJob(job: JobQueueRow): Promise<void> {
    const supabase = getSupabaseAdmin();
    
    if (!job.document_id) {
      throw new Error('No document_id provided for extract job');
    }
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', job.document_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${job.document_id}`);
    }

    this.onProgress?.(job.id, 10, 'Starting text extraction');

    if (!document.storage_path) {
      throw new Error(`Document has no storage_path: ${job.document_id}`);
    }

    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (storageError || !fileData) {
      throw new Error(`Failed to download file: ${document.storage_path}`);
    }

    this.onProgress?.(job.id, 20, 'File downloaded');

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const contentHash = LRUCache.hashContent(buffer);

    const existingDoc = await supabase
      .from('documents')
      .select('id')
      .eq('content_hash', contentHash)
      .eq('project_id', job.project_id || '')
      .neq('id', document.id)
      .limit(1);

    if (existingDoc.data && existingDoc.data.length > 0) {
      this.onProgress?.(job.id, 50, 'Duplicate content detected');
    }

    const result: ExtractionResult = await extractTextFromBase64(
      base64Data,
      document.mime_type || undefined,
      document.name,
      (progress, stage) => this.onProgress?.(job.id, 20 + progress * 0.6, stage)
    );

    this.onProgress?.(job.id, 80, 'Updating document');

    const textChunksForDb: Json = result.chunkMetadata 
      ? result.chunkMetadata.map((c, i) => ({ index: c.index, charStart: c.charStart, charEnd: c.charEnd, sentenceCount: c.sentenceCount, text: result.chunks[i] || '' }))
      : result.chunks;

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: result.text,
        text_chunks: textChunksForDb,
        content_hash: contentHash,
        processing_progress: 100,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    this.onProgress?.(job.id, 100, 'Extraction complete');
  }

  private async processAnalyzeJob(job: JobQueueRow): Promise<void> {
    const supabase = getSupabaseAdmin();
    
    if (!job.document_id) {
      throw new Error('No document_id provided for analyze job');
    }
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', job.document_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${job.document_id}`);
    }

    this.onProgress?.(job.id, 10, 'Starting analysis');

    let textChunks: string[] = [];
    if (document.text_chunks) {
      const chunks = document.text_chunks as unknown[];
      if (Array.isArray(chunks) && chunks.length > 0) {
        if (typeof chunks[0] === 'string') {
          textChunks = chunks as string[];
        } else if (typeof chunks[0] === 'object') {
          textChunks = chunks.map((c: unknown) => (c as { text?: string }).text || '');
        }
      }
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('description')
      .eq('id', job.project_id || '')
      .single();

    const casePerspective = project?.description || undefined;

    this.onProgress?.(job.id, 20, 'Analyzing document');

    const analysis = await analyzeFileServer({
      fileName: document.name,
      batesNumber: document.bates_formatted || 'UNKNOWN',
      fileType: document.file_type || 'DOCUMENT',
      casePerspective,
      textContent: document.extracted_text || undefined,
      textChunks,
      contentHash: document.content_hash || undefined,
    });

    this.onProgress?.(job.id, 80, 'Saving analysis');

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        analysis,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id);

    if (updateError) {
      throw new Error(`Failed to update document analysis: ${updateError.message}`);
    }

    this.onProgress?.(job.id, 100, 'Analysis complete');
  }

  private async processTranscribeJob(job: JobQueueRow): Promise<void> {
    const supabase = getSupabaseAdmin();
    
    if (!job.document_id) {
      throw new Error('No document_id provided for transcribe job');
    }
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', job.document_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${job.document_id}`);
    }

    this.onProgress?.(job.id, 10, 'Starting transcription');

    if (!document.storage_path) {
      throw new Error(`Document has no storage_path: ${job.document_id}`);
    }

    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (storageError || !fileData) {
      throw new Error(`Failed to download file: ${document.storage_path}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64Data = buffer.toString('base64');

    this.onProgress?.(job.id, 20, 'Processing audio');

    const { transcribeAudioServer } = await import('./geminiServer');
    const transcription = await transcribeAudioServer({
      base64Data,
      mimeType: document.mime_type || 'audio/mpeg',
      fileName: document.name,
      batesNumber: document.bates_formatted || 'UNKNOWN',
    });

    this.onProgress?.(job.id, 80, 'Saving transcription');

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: transcription,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id);

    if (updateError) {
      throw new Error(`Failed to update document transcription: ${updateError.message}`);
    }

    this.onProgress?.(job.id, 100, 'Transcription complete');
  }

  private async markJobComplete(jobId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('job_queue')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async handleJobFailure(job: JobQueueRow, error: Error): Promise<void> {
    const supabase = getSupabaseAdmin();
    const newAttempts = job.attempts + 1;
    const shouldRetry = newAttempts < job.max_attempts;

    if (shouldRetry) {
      await supabase
        .from('job_queue')
        .update({
          status: 'pending',
          attempts: newAttempts,
          error_message: error.message,
        })
        .eq('id', job.id);
    } else {
      await supabase
        .from('job_queue')
        .update({
          status: 'failed',
          attempts: newAttempts,
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (job.document_id) {
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.document_id);
      }
    }
  }
}

export { JobWorker, type WorkerConfig, type JobQueueRow };