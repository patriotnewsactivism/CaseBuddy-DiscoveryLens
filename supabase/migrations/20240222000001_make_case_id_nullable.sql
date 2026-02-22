-- Make case_id nullable to allow documents without a case
ALTER TABLE documents ALTER COLUMN case_id DROP NOT NULL;

-- Make user_id nullable as well
ALTER TABLE documents ALTER COLUMN user_id DROP NOT NULL;
