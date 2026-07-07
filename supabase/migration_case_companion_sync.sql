-- DiscoveryLens <> Case Companion Integration Migration
-- Run this in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/jpzkumgndqsdwimbvjku/sql/new

-- ================================================================
-- 1. Create the projects table (needed by DiscoveryLens)
-- ================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  bates_prefix text not null default 'DEF',
  bates_counter integer not null default 1,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ================================================================
-- 2. Add missing columns to existing documents table
-- ================================================================
alter table public.documents
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists bates_prefix text,
  add column if not exists bates_formatted text,
  add column if not exists mime_type text,
  add column if not exists storage_path text,
  add column if not exists extracted_text text,
  add column if not exists text_chunks jsonb,
  add column if not exists analysis jsonb,
  add column if not exists status text default 'complete',
  add column if not exists processing_progress integer default 100,
  add column if not exists content_hash text,
  add column if not exists tags text[] default '{}',
  add column if not exists custom_fields jsonb default '{}'::jsonb;

-- ================================================================
-- 3. Create the discovery-files storage bucket policies
-- ================================================================
create policy if not exists "Allow public read access to discovery files"
  on storage.objects for select
  using (bucket_id = 'discovery-files');

create policy if not exists "Allow public insert access to discovery files"
  on storage.objects for insert
  with check (bucket_id = 'discovery-files');

create policy if not exists "Allow public delete access to discovery files"
  on storage.objects for delete
  using (bucket_id = 'discovery-files');

-- ================================================================
-- 4. RLS policies for projects table
-- ================================================================
alter table public.projects enable row level security;

create policy if not exists "Allow public read access to projects"
  on public.projects for select using (true);

create policy if not exists "Allow public insert access to projects"
  on public.projects for insert with check (true);

create policy if not exists "Allow public update access to projects"
  on public.projects for update using (true);

create policy if not exists "Allow public delete access to projects"
  on public.projects for delete using (true);

-- ================================================================
-- 5. Indexes for new columns
-- ================================================================
create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_bates_formatted_idx on public.documents(bates_formatted);

-- ================================================================
-- 6. updated_at trigger for projects
-- ================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

