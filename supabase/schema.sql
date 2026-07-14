create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chatwork_room_id text unique,
  line_user_id text unique,
  gmail_address text unique,
  slack_channel_id text unique,
  google_chat_space_id text unique,
  discord_channel_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  source text not null check (
    source in (
      'chatwork',
      'line',
      'gmail',
      'slack',
      'google_chat',
      'discord'
    )
  ),
  sender_name text,
  sender_identifier text,
  message text not null,
  received_at timestamptz not null default now(),
  read_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customers_chatwork_room_id_idx
  on public.customers(chatwork_room_id)
  where chatwork_room_id is not null;

create index if not exists customers_line_user_id_idx
  on public.customers(line_user_id)
  where line_user_id is not null;

create index if not exists notifications_customer_received_at_idx
  on public.notifications(customer_id, received_at desc);

create index if not exists notifications_customer_unread_received_at_idx
  on public.notifications(customer_id, received_at desc)
  where read_at is null;

create index if not exists notifications_source_received_at_idx
  on public.notifications(source, received_at desc);

alter table public.customers enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can read customers"
  on public.customers;
create policy "Authenticated users can read customers"
  on public.customers
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read notifications"
  on public.notifications;
create policy "Authenticated users can read notifications"
  on public.notifications
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can mark notifications as read"
  on public.notifications;
create policy "Authenticated users can mark notifications as read"
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);

-- The web app's webhook routes insert through SUPABASE_SERVICE_ROLE_KEY.
-- For MVP master-data entry, add customers from Supabase Studio or SQL Editor.

create table if not exists public.workspace_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  state_key text not null,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, state_key)
);

create index if not exists workspace_states_user_updated_at_idx
  on public.workspace_states(user_id, updated_at desc);

alter table public.workspace_states enable row level security;

drop policy if exists "Users can read their own workspace state"
  on public.workspace_states;
create policy "Users can read their own workspace state"
  on public.workspace_states
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workspace state"
  on public.workspace_states;
create policy "Users can insert their own workspace state"
  on public.workspace_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace state"
  on public.workspace_states;
create policy "Users can update their own workspace state"
  on public.workspace_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
