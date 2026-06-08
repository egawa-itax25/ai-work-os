alter table public.notifications
  add column if not exists read_at timestamptz;

create index if not exists notifications_customer_unread_received_at_idx
  on public.notifications(customer_id, received_at desc)
  where read_at is null;

drop policy if exists "Authenticated users can mark notifications as read"
  on public.notifications;

create policy "Authenticated users can mark notifications as read"
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);
