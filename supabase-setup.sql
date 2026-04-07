create extension if not exists pgcrypto;

create table if not exists public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  business_name text,
  project_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_projects_updated_at on public.user_projects;
create trigger trg_user_projects_updated_at
before update on public.user_projects
for each row
execute function public.set_user_projects_updated_at();

alter table public.user_projects enable row level security;

drop policy if exists "Users can read own project" on public.user_projects;
create policy "Users can read own project"
on public.user_projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project" on public.user_projects;
create policy "Users can insert own project"
on public.user_projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project" on public.user_projects;
create policy "Users can update own project"
on public.user_projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
