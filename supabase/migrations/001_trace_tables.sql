-- Trace Bible App — Initial Schema
-- Run this in your new Supabase project's SQL editor or via `supabase db push`

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (linked to Supabase auth.users)
create table if not exists trace_profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_color text default '#6366f1',
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Community posts
create table if not exists trace_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comments on posts
create table if not exists trace_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references trace_posts(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Post likes
create table if not exists trace_post_likes (
  post_id uuid not null references trace_posts(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Post prayers
create table if not exists trace_post_prayers (
  post_id uuid not null references trace_posts(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Study groups
create table if not exists trace_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Group membership
create table if not exists trace_group_members (
  group_id uuid not null references trace_groups(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Direct message conversations
create table if not exists trace_conversations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversation participants
create table if not exists trace_conversation_participants (
  conversation_id uuid not null references trace_conversations(id) on delete cascade,
  user_id uuid not null references trace_profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- Messages
create table if not exists trace_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references trace_conversations(id) on delete cascade,
  sender_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Bible notes
create table if not exists trace_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Verse highlights
create table if not exists trace_highlights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  verse_ref text not null,
  color text default '#fbbf24',
  created_at timestamptz default now()
);

-- Prayers
create table if not exists trace_prayers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Encounters / devotional entries
create table if not exists trace_encounters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references trace_profiles(id) on delete cascade,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table trace_profiles enable row level security;
alter table trace_posts enable row level security;
alter table trace_comments enable row level security;
alter table trace_post_likes enable row level security;
alter table trace_post_prayers enable row level security;
alter table trace_groups enable row level security;
alter table trace_group_members enable row level security;
alter table trace_conversations enable row level security;
alter table trace_conversation_participants enable row level security;
alter table trace_messages enable row level security;
alter table trace_notes enable row level security;
alter table trace_highlights enable row level security;
alter table trace_prayers enable row level security;
alter table trace_encounters enable row level security;

-- Profiles: users can read all, only update their own
create policy "profiles_select" on trace_profiles for select using (true);
create policy "profiles_insert" on trace_profiles for insert with check (auth.uid() = auth_id);
create policy "profiles_update" on trace_profiles for update using (auth.uid() = auth_id);

-- Posts: anyone authenticated can read; only owner can write/delete
create policy "posts_select" on trace_posts for select using (true);
create policy "posts_insert" on trace_posts for insert with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "posts_delete" on trace_posts for delete using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Comments
create policy "comments_select" on trace_comments for select using (true);
create policy "comments_insert" on trace_comments for insert with check (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "comments_delete" on trace_comments for delete using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Likes & prayers
create policy "likes_all" on trace_post_likes for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "prayers_all" on trace_post_prayers for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Groups
create policy "groups_select" on trace_groups for select using (true);
create policy "groups_insert" on trace_groups for insert with check (auth.uid() = (select auth_id from trace_profiles where id = created_by));
create policy "groups_delete" on trace_groups for delete using (auth.uid() = (select auth_id from trace_profiles where id = created_by));

-- Group members
create policy "group_members_select" on trace_group_members for select using (true);
create policy "group_members_all" on trace_group_members for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Conversations & messages (participants only)
create policy "conversations_select" on trace_conversations for select
  using (id in (select conversation_id from trace_conversation_participants where user_id = (select id from trace_profiles where auth_id = auth.uid())));
create policy "conversations_insert" on trace_conversations for insert with check (true);

create policy "participants_select" on trace_conversation_participants for select
  using (user_id = (select id from trace_profiles where auth_id = auth.uid()));
create policy "participants_insert" on trace_conversation_participants for insert with check (true);

create policy "messages_select" on trace_messages for select
  using (conversation_id in (select conversation_id from trace_conversation_participants where user_id = (select id from trace_profiles where auth_id = auth.uid())));
create policy "messages_insert" on trace_messages for insert
  with check (auth.uid() = (select auth_id from trace_profiles where id = sender_id));

-- Personal data: only owner
create policy "notes_all" on trace_notes for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "highlights_all" on trace_highlights for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "personal_prayers_all" on trace_prayers for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));
create policy "encounters_all" on trace_encounters for all using (auth.uid() = (select auth_id from trace_profiles where id = user_id));

-- Enable realtime for community tables
alter publication supabase_realtime add table trace_posts;
alter publication supabase_realtime add table trace_messages;
alter publication supabase_realtime add table trace_comments;
