-- SIH26154 Content Transformation / SIH26154
-- Run this script in Supabase SQL Editor after creating your project.
-- It creates the persistent content-transformation database and a private Storage bucket.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_text text,
  preferences jsonb not null default '{}'::jsonb,
  selected_outputs jsonb not null default '[]'::jsonb,
  truth_layer jsonb not null default '{}'::jsonb,
  consistency_score integer not null default 0,
  red_team_risk text not null default 'low',
  status text not null default 'human_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_source_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  output_type text not null,
  content text not null,
  status text not null default 'generated',
  created_at timestamptz not null default now()
);

create table if not exists public.content_claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null,
  status text not null check (status in ('verified','unverified','contradicted')),
  evidence text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.content_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists content_projects_user_created_idx on public.content_projects(user_id, created_at desc);
create index if not exists content_source_files_project_idx on public.content_source_files(project_id);
create index if not exists content_outputs_project_idx on public.content_outputs(project_id);
create index if not exists content_claims_project_idx on public.content_claims(project_id);
create index if not exists content_reviews_project_idx on public.content_reviews(project_id);

alter table public.profiles enable row level security;
alter table public.content_projects enable row level security;
alter table public.content_source_files enable row level security;
alter table public.content_outputs enable row level security;
alter table public.content_claims enable row level security;
alter table public.content_reviews enable row level security;

-- Users can only see/change their own records.
drop policy if exists "profiles own rows" on public.profiles;
drop policy if exists "projects own rows" on public.content_projects;
drop policy if exists "source files own rows" on public.content_source_files;
drop policy if exists "outputs own rows" on public.content_outputs;
drop policy if exists "claims own rows" on public.content_claims;
drop policy if exists "reviews own rows" on public.content_reviews;
drop policy if exists "source storage insert own folder" on storage.objects;
drop policy if exists "source storage select own folder" on storage.objects;
drop policy if exists "source storage delete own folder" on storage.objects;
create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "projects own rows" on public.content_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "source files own rows" on public.content_source_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outputs own rows" on public.content_outputs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "claims own rows" on public.content_claims for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews own rows" on public.content_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private bucket: the file itself is stored in Storage; the DB stores metadata + path.
insert into storage.buckets (id, name, public) values ('SIH26154 Content Transformation-source-files','SIH26154 Content Transformation-source-files',false)
on conflict (id) do update set public = false;

create policy "source storage insert own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'SIH26154 Content Transformation-source-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "source storage select own folder" on storage.objects for select to authenticated
using (bucket_id = 'SIH26154 Content Transformation-source-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "source storage delete own folder" on storage.objects for delete to authenticated
using (bucket_id = 'SIH26154 Content Transformation-source-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Automatically create/update a profile when a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- AI Chatbot conversation persistence (Additive)
create table if not exists public.content_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.content_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  created_at timestamptz not null default now()
);

create index if not exists content_chat_messages_project_idx on public.content_chat_messages(project_id, created_at asc);
create index if not exists content_chat_messages_user_idx on public.content_chat_messages(user_id, created_at desc);

alter table public.content_chat_messages enable row level security;
drop policy if exists "chat messages own rows" on public.content_chat_messages;
create policy "chat messages own rows" on public.content_chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

