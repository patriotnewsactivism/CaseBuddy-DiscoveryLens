-- DiscoveryLens Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  bates_prefix text not null default 'DEF',
  bates_counter integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents table
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,

  -- Basic file information
  name text not null,
  mime_type text not null,
  file_type text not null check (file_type in ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO')),
  file_size bigint,

  -- Bates numbering
  bates_prefix text not null,
  bates_number integer not null,
  bates_formatted text not null,

  -- Storage reference
  storage_path text not null,

  -- Analysis results (JSONB for flexible schema)
  analysis jsonb,

  -- Status tracking
  status text not null default 'processing' check (status in ('processing', 'complete', 'failed')),
  error_message text,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Unique constraint on Bates number within project
  unique(project_id, bates_formatted)
);

-- Create indexes for common queries
create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists documents_bates_formatted_idx on public.documents(bates_formatted);
create index if not exists documents_file_type_idx on public.documents(file_type);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_created_at_idx on public.documents(created_at desc);

-- Enable Row Level Security
alter table public.projects enable row level security;
alter table public.documents enable row level security;

-- RLS Policies (for now, allow all access - add user auth later)
-- These policies allow anyone to read/write for testing
-- In production, you should add proper authentication and user-based policies

create policy "Allow public read access to projects"
  on public.projects for select
  using (true);

create policy "Allow public insert access to projects"
  on public.projects for insert
  with check (true);

create policy "Allow public update access to projects"
  on public.projects for update
  using (true);

create policy "Allow public delete access to projects"
  on public.projects for delete
  using (true);

create policy "Allow public read access to documents"
  on public.documents for select
  using (true);

create policy "Allow public insert access to documents"
  on public.documents for insert
  with check (true);

create policy "Allow public update access to documents"
  on public.documents for update
  using (true);

create policy "Allow public delete access to documents"
  on public.documents for delete
  using (true);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger set_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.documents
  for each row
  execute function public.handle_updated_at();

-- Storage bucket for discovery files
-- Run this separately or use the Supabase Storage UI
insert into storage.buckets (id, name, public)
values ('discovery-files', 'discovery-files', false)
on conflict (id) do nothing;

-- Storage policies (allow authenticated access)
create policy "Allow public read access to discovery files"
  on storage.objects for select
  using (bucket_id = 'discovery-files');

create policy "Allow public insert access to discovery files"
  on storage.objects for insert
  with check (bucket_id = 'discovery-files');

create policy "Allow public delete access to discovery files"
  on storage.objects for delete
  using (bucket_id = 'discovery-files');
