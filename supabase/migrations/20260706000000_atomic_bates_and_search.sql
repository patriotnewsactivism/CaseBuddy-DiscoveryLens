-- Migration: Atomic Bates number reservation + full-text search
-- Created: 2026-07-06
-- Description:
--   1. Bates numbers were being assigned client-side from a locally-held
--      counter with no server-side reservation, which is a race condition
--      under concurrent uploads (two tabs, or a batch upload racing the
--      background job worker) and silently resets to 1 whenever a new
--      project record is created. reserve_bates_numbers() atomically
--      increments projects.bates_counter and returns the starting number
--      of the reserved block, so the caller can safely assign
--      [start, start+count) without any other caller seeing an overlapping
--      range.
--   2. Adds a full-text search index over documents (name + extracted text
--      + analysis summary) so evidence is genuinely easy to find as the
--      case grows, independent of the in-memory keyword filter in the UI.
--
-- IMPORTANT: This migration is additive only - it does not rename or drop
-- any existing column, since the `documents`/`projects`/`cases` tables are
-- shared with the case-companion app's schema.

-- ============================================================================
-- ATOMIC BATES NUMBER RESERVATION
-- ============================================================================

CREATE OR REPLACE FUNCTION reserve_bates_numbers(p_project_id uuid, p_count int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start int;
BEGIN
  IF p_count <= 0 THEN
    RAISE EXCEPTION 'p_count must be positive';
  END IF;

  UPDATE projects
  SET bates_counter = bates_counter + p_count,
      updated_at = now()
  WHERE id = p_project_id
  RETURNING bates_counter - p_count INTO v_start;

  IF v_start IS NULL THEN
    RAISE EXCEPTION 'Project % not found', p_project_id;
  END IF;

  RETURN v_start;
END;
$$;

COMMENT ON FUNCTION reserve_bates_numbers(uuid, int) IS
  'Atomically reserves a contiguous block of `p_count` Bates numbers for a project, returning the first number in the block. Caller assigns [start, start+count).';

-- ============================================================================
-- FULL-TEXT SEARCH OVER DOCUMENTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'search_vector') THEN
    ALTER TABLE documents ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(bates_formatted, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', left(coalesce(extracted_text, ''), 100000)), 'C')
      ) STORED;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN (search_vector);

COMMENT ON COLUMN documents.search_vector IS 'Auto-maintained full-text search index over name, Bates number, summary, and extracted text - powers fast case-wide evidence search.';
