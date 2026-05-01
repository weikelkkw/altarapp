-- Session 03 — Legal & Compliance audit (Subject #4 + #5)
--
-- Adds three tables to close the most material legal/compliance code gaps:
--   1. trace_policy_acceptance      — append-only proof-of-consent log
--   2. trace_content_reports        — UGC moderation queue
--   3. trace_account_deletion_requests — record + audit deletion requests
--
-- All three are server-write-only via the admin client. Authenticated users
-- can SELECT only their own rows. INSERT/UPDATE/DELETE are blocked for the
-- `authenticated` role; the service role bypasses RLS by default for the
-- corresponding /api routes.

-- ─── trace_policy_acceptance ────────────────────────────────────────────────
create table if not exists public.trace_policy_acceptance (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid not null references auth.users(id) on delete cascade,
  policy_type     text not null check (policy_type in ('terms','privacy','dmca','accessibility','combined')),
  policy_version  text not null,
  accepted_at     timestamptz not null default now(),
  ip_address      text,
  user_agent      text,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists idx_trace_policy_acceptance_auth_id
  on public.trace_policy_acceptance(auth_id, accepted_at desc);

alter table public.trace_policy_acceptance enable row level security;

drop policy if exists policy_acceptance_select_own on public.trace_policy_acceptance;
create policy policy_acceptance_select_own
  on public.trace_policy_acceptance
  for select to authenticated
  using (auth.uid() = auth_id);

drop policy if exists policy_acceptance_no_insert on public.trace_policy_acceptance;
create policy policy_acceptance_no_insert
  on public.trace_policy_acceptance
  for insert to authenticated
  with check (false);

drop policy if exists policy_acceptance_no_update on public.trace_policy_acceptance;
create policy policy_acceptance_no_update
  on public.trace_policy_acceptance
  for update to authenticated
  using (false) with check (false);

drop policy if exists policy_acceptance_no_delete on public.trace_policy_acceptance;
create policy policy_acceptance_no_delete
  on public.trace_policy_acceptance
  for delete to authenticated
  using (false);


-- ─── trace_content_reports ──────────────────────────────────────────────────
create table if not exists public.trace_content_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.trace_profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('post','comment','prayer_comment','message','prayer_delivery','group_message','profile')),
  target_id    uuid not null,
  reason       text not null check (char_length(reason) between 1 and 2000),
  status       text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution   text,
  resolved_at  timestamptz,
  resolved_by  uuid references public.trace_profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_trace_content_reports_status
  on public.trace_content_reports(status, created_at desc);
create index if not exists idx_trace_content_reports_target
  on public.trace_content_reports(target_type, target_id);

alter table public.trace_content_reports enable row level security;

drop policy if exists content_reports_select_own on public.trace_content_reports;
create policy content_reports_select_own
  on public.trace_content_reports
  for select to authenticated
  using (auth.uid() in (select auth_id from public.trace_profiles where id = reporter_id));

drop policy if exists content_reports_no_insert on public.trace_content_reports;
create policy content_reports_no_insert
  on public.trace_content_reports
  for insert to authenticated
  with check (false);

drop policy if exists content_reports_no_update on public.trace_content_reports;
create policy content_reports_no_update
  on public.trace_content_reports
  for update to authenticated
  using (false) with check (false);

drop policy if exists content_reports_no_delete on public.trace_content_reports;
create policy content_reports_no_delete
  on public.trace_content_reports
  for delete to authenticated
  using (false);


-- ─── trace_account_deletion_requests ───────────────────────────────────────
create table if not exists public.trace_account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid not null references auth.users(id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '30 days'),
  completed_at  timestamptz,
  status        text not null default 'pending' check (status in ('pending','processing','completed','cancelled')),
  reason        text,
  ip_address    text,
  user_agent    text
);

create index if not exists idx_trace_account_deletion_requests_status
  on public.trace_account_deletion_requests(status, scheduled_for);
create unique index if not exists uniq_trace_account_deletion_pending
  on public.trace_account_deletion_requests(auth_id)
  where status in ('pending','processing');

alter table public.trace_account_deletion_requests enable row level security;

drop policy if exists deletion_requests_select_own on public.trace_account_deletion_requests;
create policy deletion_requests_select_own
  on public.trace_account_deletion_requests
  for select to authenticated
  using (auth.uid() = auth_id);

drop policy if exists deletion_requests_no_insert on public.trace_account_deletion_requests;
create policy deletion_requests_no_insert
  on public.trace_account_deletion_requests
  for insert to authenticated
  with check (false);

drop policy if exists deletion_requests_no_update on public.trace_account_deletion_requests;
create policy deletion_requests_no_update
  on public.trace_account_deletion_requests
  for update to authenticated
  using (false) with check (false);

drop policy if exists deletion_requests_no_delete on public.trace_account_deletion_requests;
create policy deletion_requests_no_delete
  on public.trace_account_deletion_requests
  for delete to authenticated
  using (false);


grant select on public.trace_policy_acceptance to authenticated;
grant select on public.trace_content_reports to authenticated;
grant select on public.trace_account_deletion_requests to authenticated;
