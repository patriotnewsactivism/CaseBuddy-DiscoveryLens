-- ============================================================================
-- Add dedicated analysis columns to documents table
-- These mirror fields from the analysis JSONB column for easier querying
-- by CaseBuddy and other consumers of the shared database.
-- ============================================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS key_facts text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS evidence_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sentiment text CHECK (sentiment IN ('Hostile', 'Cooperative', 'Neutral') OR sentiment IS NULL);

COMMENT ON COLUMN documents.summary IS 'AI-generated executive summary (mirrored from analysis.summary)';
COMMENT ON COLUMN documents.key_facts IS 'Newline-delimited key facts extracted by AI (mirrored from analysis.relevantFacts)';
COMMENT ON COLUMN documents.extracted_text IS 'Full OCR/transcription text (mirrored from analysis.transcription)';
COMMENT ON COLUMN documents.evidence_type IS 'Evidence category (mirrored from analysis.evidenceType)';
COMMENT ON COLUMN documents.sentiment IS 'Document sentiment relative to case perspective (mirrored from analysis.sentiment)';

CREATE INDEX IF NOT EXISTS idx_documents_evidence_type ON documents(evidence_type);
CREATE INDEX IF NOT EXISTS idx_documents_sentiment ON documents(sentiment);

-- ============================================================================
-- document_reports table
-- Tracks every export generated from DiscoveryLens so CaseBuddy can see
-- what reports have been produced for each project/document.
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  format text NOT NULL CHECK (format IN ('pdf', 'csv', 'json')),
  fields_included jsonb NOT NULL DEFAULT '{}',
  document_ids uuid[] NOT NULL DEFAULT '{}',
  document_count int GENERATED ALWAYS AS (array_length(document_ids, 1)) STORED,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE document_reports IS 'Audit trail of analysis reports exported from DiscoveryLens';
COMMENT ON COLUMN document_reports.fields_included IS 'JSON object describing which analysis fields were included in this export';
COMMENT ON COLUMN document_reports.document_ids IS 'Array of document UUIDs included in this export';
COMMENT ON COLUMN document_reports.format IS 'Export format: pdf, csv, or json';

CREATE INDEX IF NOT EXISTS idx_document_reports_project_id ON document_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_document_reports_generated_at ON document_reports(generated_at DESC);
