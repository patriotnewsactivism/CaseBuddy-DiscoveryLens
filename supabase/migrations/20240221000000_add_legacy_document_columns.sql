ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS case_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id uuid;
