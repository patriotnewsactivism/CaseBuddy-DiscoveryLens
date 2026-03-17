-- Add authentication and collaboration tables

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text not null default 'attorney' check (role in ('attorney', 'paralegal', 'admin', 'client_viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project collaborators/members table
create table if not exists public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'attorney', 'paralegal', 'viewer')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- Comments/annotations table
create table if not exists public.document_comments (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  comment text not null,
  -- For inline comments on specific parts of documents
  selector text, -- CSS selector or position data
  -- For timestamp-based comments on audio/video
  start_time float, -- seconds
  end_time float,   -- seconds
  resolved boolean default false,
  resolved_by uuid references auth.users(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks/to-do items table
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete cascade set null,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id) not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity log/audit trail table
create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null, -- e.g., 'uploaded_document', 'added_comment', 'changed_status'
  entity_type text not null, -- e.g., 'document', 'comment', 'task'
  entity_id uuid,
  details jsonb, -- Additional context about the action
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security on all new tables
alter table public.user_profiles enable row level security;
alter table public.project_members enable row level security;
alter table public.document_comments enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;

-- Create basic policies (these should be refined based on actual auth requirements)
create policy "Allow public read access to user_profiles"
  on public.user_profiles for select
  using (true);

create policy "Allow users to update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Allow public read access to project_members"
  on public.project_members for select
  using (true);

create policy "Allow public read access to document_comments"
  on public.document_comments for select
  using (true);

create policy "Allow public read access to tasks"
  on public.tasks for select
  using (true);

create policy "Allow public read access to activity_log"
  on public.activity_log for select
  using (true);

-- Create indexes for performance
create index if not exists user_profiles_email_idx on public.user_profiles(email);
create index if not exists project_members_project_id_idx on public.project_members(project_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists document_comments_document_id_idx on public.document_comments(document_id);
create index if not exists document_comments_user_id_idx on public.document_comments(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists activity_log_project_id_idx on public.activity_log(project_id);
create index if not exists activity_log_user_id_idx on public.activity_log(user_id);
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);

-- Update existing tables to add user_id for tracking
alter table public.projects add column if not exists owner_id uuid references auth.users(id);
alter table public.documents add column if not exists uploaded_by uuid references auth.users(id);

-- Add indexes for the new foreign keys
create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists documents_uploaded_by_idx on public.documents(uploaded_by);

-- Update triggers for updated_at on new tables
do $$
begin
  -- Check if trigger exists, if not create it
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.user_profiles'::regclass) then
    create trigger set_updated_at
      before update on public.user_profiles
      for each row
      execute function public.handle_updated_at();
  end if;
  
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.project_members'::regclass) then
    create trigger set_updated_at
      before update on public.project_members
      for each row
      execute function public.handle_updated_at();
  end if;
  
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.document_comments'::regclass) then
    create trigger set_updated_at
      before update on public.document_comments
      for each row
      execute function public.handle_updated_at();
  end if;
  
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.tasks'::regclass) then
    create trigger set_updated_at
      before update on public.tasks
      for each row
      execute function public.handle_updated_at();
  end if;
  
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.activity_log'::regclass) then
    create trigger set_updated_at
      before update on public.activity_log
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;