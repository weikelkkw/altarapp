create table if not exists trace_study_schedules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references trace_groups(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time time not null,
  duration_minutes integer not null default 60,
  location text,
  meeting_link text,
  notes text,
  active boolean not null default true,
  created_by uuid not null references trace_profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table trace_study_schedules enable row level security;
create policy "group members can view schedule" on trace_study_schedules for select
  using (group_id in (select group_id from trace_group_members where user_id = (select id from trace_profiles where auth_id = auth.uid()) and status = 'approved'));
create policy "leaders can manage schedule" on trace_study_schedules for all
  using (auth.uid() = (select auth_id from trace_profiles where id = created_by));
