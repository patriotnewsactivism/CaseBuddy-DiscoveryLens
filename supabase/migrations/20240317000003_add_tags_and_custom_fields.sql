-- Add tags and custom_fields columns to documents table

-- Add tags column (array of text)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add custom_fields column (JSONB)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Update existing rows to have default values (in case they were added before defaults were set)
UPDATE public.documents 
SET tags = '{}' 
WHERE tags IS NULL;

UPDATE public.documents 
SET custom_fields = '{}'::jsonb 
WHERE custom_fields IS NULL;

-- Add indexes for better query performance on tags
CREATE INDEX IF NOT EXISTS documents_tags_idx ON public.documents USING GIN (tags);