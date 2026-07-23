create table if not exists public.user_workspace_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"version":1,"data":{}}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.user_workspace_states enable row level security;

grant select, insert, update
  on public.user_workspace_states
  to authenticated;

drop policy if exists "Users can read their workspace state"
  on public.user_workspace_states;
create policy "Users can read their workspace state"
  on public.user_workspace_states
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their workspace state"
  on public.user_workspace_states;
create policy "Users can create their workspace state"
  on public.user_workspace_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their workspace state"
  on public.user_workspace_states;
create policy "Users can update their workspace state"
  on public.user_workspace_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_workspace_states_updated_at_idx
  on public.user_workspace_states(updated_at desc);
