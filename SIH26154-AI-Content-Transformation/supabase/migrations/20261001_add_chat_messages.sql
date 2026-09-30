-- SIH26154 Content Transformation / SIH26154
-- Additive migration for AI Chatbot conversations
-- Preserves all existing tables and data

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

-- Additive RLS policy
drop policy if exists "chat messages own rows" on public.content_chat_messages;
create policy "chat messages own rows" on public.content_chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
