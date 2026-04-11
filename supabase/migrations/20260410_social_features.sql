-- Social features migration — 2026-04-10
-- Run this in Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists trace_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references trace_profiles(id) on delete cascade,
  addressee_id uuid not null references trace_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create table if not exists trace_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  book_name text not null,
  book_osis text not null,
  chapter integer not null,
  verse integer not null,
  color text not null,
  verse_text text,
  created_at timestamptz not null default now(),
  unique(user_id, book_osis, chapter, verse)
);

create table if not exists trace_reading_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  book_osis text not null,
  chapter integer not null,
  read_at timestamptz not null default now()
);

create index if not exists trace_reading_activity_user_id_idx on trace_reading_activity(user_id);
create index if not exists trace_reading_activity_read_at_idx on trace_reading_activity(read_at desc);

create table if not exists trace_prayer_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references trace_posts(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists trace_prayer_comments_post_id_idx on trace_prayer_comments(post_id);

-- ============================================================
-- RLS POLICIES — trace_friendships
-- ============================================================

alter table trace_friendships enable row level security;

-- Users can see friendships they're part of
create policy "users can view their friendships"
  on trace_friendships for select
  using (auth.uid() in (
    select auth_id from trace_profiles where id = requester_id or id = addressee_id
  ));

-- Users can insert friend requests as requester
create policy "users can send friend requests"
  on trace_friendships for insert
  with check (auth.uid() = (select auth_id from trace_profiles where id = requester_id));

-- Users can update (accept) requests where they are addressee
create policy "users can accept friend requests"
  on trace_friendships for update
  using (auth.uid() = (select auth_id from trace_profiles where id = addressee_id));

-- Users can delete their own friendships
create policy "users can remove friendships"
  on trace_friendships for delete
  using (auth.uid() in (
    select auth_id from trace_profiles where id = requester_id or id = addressee_id
  ));

-- ============================================================
-- RLS POLICIES — trace_highlights
-- ============================================================

alter table trace_highlights enable row level security;

-- Users can see highlights of people in their groups
create policy "users can view highlights of group members"
  on trace_highlights for select
  using (
    auth.uid() = (select auth_id from trace_profiles where id = user_id)
    or user_id in (
      select gm2.user_id from trace_group_members gm1
      join trace_group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = (select id from trace_profiles where auth_id = auth.uid())
      and gm1.status = 'approved' and gm2.status = 'approved'
    )
  );

create policy "users can manage own highlights"
  on trace_highlights for all
  using (auth.uid() = (select auth_id from trace_profiles where id = user_id))
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- ============================================================
-- RLS POLICIES — trace_reading_activity
-- ============================================================

alter table trace_reading_activity enable row level security;

create policy "users can view reading activity of group members"
  on trace_reading_activity for select
  using (
    auth.uid() = (select auth_id from trace_profiles where id = user_id)
    or user_id in (
      select gm2.user_id from trace_group_members gm1
      join trace_group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = (select id from trace_profiles where auth_id = auth.uid())
      and gm1.status = 'approved' and gm2.status = 'approved'
    )
  );

create policy "users can insert own reading activity"
  on trace_reading_activity for insert
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- ============================================================
-- RLS POLICIES — trace_prayer_comments
-- ============================================================

alter table trace_prayer_comments enable row level security;

create policy "authenticated users can view prayer comments"
  on trace_prayer_comments for select
  using (auth.role() = 'authenticated');

create policy "users can add own prayer comments"
  on trace_prayer_comments for insert
  with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));
