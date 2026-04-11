-- Message reactions
create table if not exists trace_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references trace_group_messages(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);
create index if not exists trace_message_reactions_message_id_idx on trace_message_reactions(message_id);
alter table trace_message_reactions enable row level security;
create policy "group members can view reactions" on trace_message_reactions for select using (true);
create policy "users can manage own reactions" on trace_message_reactions for all
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id))
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Group events
create table if not exists trace_group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);
create index if not exists trace_group_events_group_id_idx on trace_group_events(group_id);
alter table trace_group_events enable row level security;
create policy "group members can view events" on trace_group_events for select
  using (group_id in (select group_id from trace_group_members where user_id = (select id from trace_profiles where auth_id = auth.uid()) and status = 'approved'));
create policy "leaders can manage events" on trace_group_events for all
  using (auth.uid() = (select auth_id from trace_profiles where id = created_by));

-- Event RSVPs
create table if not exists trace_event_rsvps (
  event_id uuid not null references trace_group_events(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  primary key (event_id, user_id)
);
alter table trace_event_rsvps enable row level security;
create policy "group members can rsvp" on trace_event_rsvps for all
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id))
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Shared reading plans
create table if not exists trace_reading_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references trace_groups(id) on delete cascade,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  title text not null,
  book_osis text not null,
  start_chapter integer not null default 1,
  end_chapter integer not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);
alter table trace_reading_plans enable row level security;
create policy "group members can view plans" on trace_reading_plans for select
  using (group_id in (select group_id from trace_group_members where user_id = (select id from trace_profiles where auth_id = auth.uid()) and status = 'approved'));
create policy "leaders can manage plans" on trace_reading_plans for all
  using (auth.uid() = (select auth_id from trace_profiles where id = created_by));

-- Reading plan progress
create table if not exists trace_plan_progress (
  plan_id uuid not null references trace_reading_plans(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  chapter integer not null,
  completed_at timestamptz not null default now(),
  primary key (plan_id, user_id, chapter)
);
alter table trace_plan_progress enable row level security;
create policy "group members can view progress" on trace_plan_progress for select using (true);
create policy "users can manage own progress" on trace_plan_progress for all
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id))
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Pinned messages
alter table trace_group_messages add column if not exists pinned boolean default false;
alter table trace_group_messages add column if not exists reply_to uuid references trace_group_messages(id) on delete set null;
alter table trace_group_messages add column if not exists reply_preview text;

-- Verse status (verse you're meditating on)
alter table trace_profiles add column if not exists verse_status jsonb default null;
-- { verseRef: 'John 3:16', verseText: '...', updatedAt: '...' }
