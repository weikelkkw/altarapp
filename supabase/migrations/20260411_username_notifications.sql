-- Add username to trace_profiles
alter table trace_profiles
  add column if not exists username text unique;

create unique index if not exists trace_profiles_username_idx on trace_profiles(lower(username));

-- Notifications table
create table if not exists trace_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists trace_notifications_user_id_idx on trace_notifications(user_id);
create index if not exists trace_notifications_created_at_idx on trace_notifications(created_at desc);

alter table trace_notifications enable row level security;

create policy "users can view own notifications"
  on trace_notifications for select
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

create policy "users can update own notifications"
  on trace_notifications for update
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Service role can insert notifications (triggered by API routes)
create policy "service role can insert notifications"
  on trace_notifications for insert
  with check (true);
