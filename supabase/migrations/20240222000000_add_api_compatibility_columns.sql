-- Add missing columns to documents table for compatibility with DiscoveryLens API
-- These columns are required by the local codebase but missing from the remote schema

-- Add mime_type column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type text;

-- Add storage_path column (maps to file_url for backward compatibility)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;

-- Add bates_prefix column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS bates_prefix text DEFAULT 'DEF';

-- Add bates_formatted column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS bates_formatted text;

-- Add project_id column that references projects table
-- This allows both case_id (existing) and project_id (new) to coexist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- Create index on project_id for performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- Create index on storage_path
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON documents(storage_path);

-- Update storage_path from file_url for existing records
UPDATE documents SET storage_path = file_url WHERE storage_path IS NULL AND file_url IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN documents.mime_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN documents.storage_path IS 'Path to file in Supabase storage bucket';
COMMENT ON COLUMN documents.bates_prefix IS 'Prefix for Bates numbering (e.g., DEF, PL)';
COMMENT ON COLUMN documents.bates_formatted IS 'Formatted Bates number (e.g., DEF-0001)';
COMMENT ON COLUMN documents.project_id IS 'Reference to project for document organization';
