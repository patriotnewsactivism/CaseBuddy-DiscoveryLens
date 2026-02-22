-- Add missing columns for document analysis
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message text;

COMMENT ON COLUMN documents.analysis IS 'AI-generated analysis results stored as JSON';
COMMENT ON COLUMN documents.error_message IS 'Error message if processing failed';
