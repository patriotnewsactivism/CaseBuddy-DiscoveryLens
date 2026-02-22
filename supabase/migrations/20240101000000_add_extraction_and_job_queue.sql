-- Migration: Add extraction and job queue support
-- Created: 2024-01-01
-- Description: Adds columns for text extraction, content hashing, and job queue for background processing

-- ============================================================================
-- DOCUMENTS TABLE UPDATES
-- ============================================================================

-- Add columns for extracted text content
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS text_chunks jsonb,
  ADD COLUMN IF NOT EXISTS processing_progress int DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Add index for content hash lookups (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash) WHERE content_hash IS NOT NULL;

-- Add index for project + content hash (duplicate detection within project)
CREATE INDEX IF NOT EXISTS idx_documents_project_content_hash ON documents(project_id, content_hash) WHERE content_hash IS NOT NULL;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ============================================================================
-- JOB QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  job_type text NOT NULL CHECK (job_type IN ('extract', 'analyze', 'transcribe')),
  priority int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts int DEFAULT 0 CHECK (attempts >= 0),
  max_attempts int DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Index for fetching pending jobs (ordered by priority then creation time)
CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON job_queue(status, priority DESC, created_at) WHERE status = 'pending';

-- Index for project-scoped job queries
CREATE INDEX IF NOT EXISTS idx_job_queue_project ON job_queue(project_id);

-- Index for document-scoped job queries
CREATE INDEX IF NOT EXISTS idx_job_queue_document ON job_queue(document_id) WHERE document_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on job_queue
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view jobs for projects they have access to
CREATE POLICY "Users can view job_queue for accessible projects"
  ON job_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = job_queue.project_id
    )
  );

-- Policy: Service role can manage all jobs (handled by supabase admin client)
-- Note: The service role bypasses RLS, so no additional policy needed

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to clean up old completed/failed jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_to_keep int DEFAULT 7)
RETURNS void AS $$
BEGIN
  DELETE FROM job_queue
  WHERE status IN ('complete', 'failed')
    AND completed_at < now() - (days_to_keep || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create extraction jobs for new documents
CREATE OR REPLACE FUNCTION create_extraction_job_for_document()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'processing' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_queue (project_id, document_id, job_type, priority)
    VALUES (NEW.project_id, NEW.id, 'extract', 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create extraction jobs
DROP TRIGGER IF EXISTS on_document_created ON documents;
CREATE TRIGGER on_document_created
  AFTER INSERT ON documents
  FOR EACH ROW
  WHEN (NEW.status = 'processing')
  EXECUTE FUNCTION create_extraction_job_for_document();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE job_queue IS 'Background job queue for document processing tasks';
COMMENT ON COLUMN documents.extracted_text IS 'Full extracted text content of the document';
COMMENT ON COLUMN documents.text_chunks IS 'JSON array of text chunks with metadata (index, charStart, charEnd, sentenceCount, text)';
COMMENT ON COLUMN documents.processing_progress IS 'Progress percentage (0-100) for the current processing job';
COMMENT ON COLUMN documents.content_hash IS 'SHA-256 hash of file content for duplicate detection';
COMMENT ON COLUMN job_queue.job_type IS 'Type of processing job: extract (text extraction), analyze (AI analysis), transcribe (audio transcription)';
COMMENT ON COLUMN job_queue.priority IS 'Job priority (higher = more urgent)';
COMMENT ON COLUMN job_queue.attempts IS 'Number of times this job has been attempted';
COMMENT ON COLUMN job_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
