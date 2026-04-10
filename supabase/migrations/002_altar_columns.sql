-- Altar Co. — Schema additions
-- Run this in the Supabase SQL editor

-- verse_ref discriminator on trace_posts (used for prayer-request / testimony)
alter table trace_posts add column if not exists verse_ref text;
create index if not exists trace_posts_verse_ref_idx on trace_posts(verse_ref);

-- icon + privacy on groups
alter table trace_groups add column if not exists icon text default '✝️';
alter table trace_groups add column if not exists privacy text default 'request'
  check (privacy in ('open', 'request', 'invite'));

-- role + status on group members
alter table trace_group_members add column if not exists role text default 'member'
  check (role in ('leader', 'member'));
alter table trace_group_members add column if not exists status text default 'approved'
  check (status in ('approved', 'pending'));

-- read flag on direct messages
alter table trace_messages add column if not exists read_by_recipient boolean default false;

-- Group chat messages (separate from DMs)
create table if not exists trace_group_messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  sender_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table trace_group_messages enable row level security;

-- Members of the group can read; members can insert
create policy "group_msgs_select" on trace_group_messages for select
  using (
    group_id in (
      select group_id from trace_group_members
      where user_id = (select id from trace_profiles where auth_id = auth.uid())
      and status = 'approved'
    )
  );

create policy "group_msgs_insert" on trace_group_messages for insert
  with check (
    auth.uid() = (select auth_id from trace_profiles where id = sender_id)
    and group_id in (
      select group_id from trace_group_members
      where user_id = sender_id and status = 'approved'
    )
  );

-- Enable realtime for group messages
alter publication supabase_realtime add table trace_group_messages;
