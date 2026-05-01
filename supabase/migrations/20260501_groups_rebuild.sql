-- Groups rebuild — schema foundation.
-- Spec: docs/GROUPS_REBUILD_DESIGN.md §4.
-- Run AFTER all 20260430_*.sql migrations. Idempotent.
--
-- All changes are additive. Existing rows in trace_groups / trace_group_members
-- continue to work — new columns get safe defaults, new tables add new
-- functionality without disturbing the old surface.

-- ============================================================
-- 1) Expand trace_groups
-- ============================================================
ALTER TABLE trace_groups
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'private'
    CHECK (privacy IN ('private', 'discoverable', 'public')),
  ADD COLUMN IF NOT EXISTS denomination text,
  ADD COLUMN IF NOT EXISTS cadence text
    CHECK (cadence IN ('weekly', 'biweekly', 'monthly', 'adhoc') OR cadence IS NULL),
  ADD COLUMN IF NOT EXISTS location_kind text
    CHECK (location_kind IN ('inperson', 'hybrid', 'online') OR location_kind IS NULL),
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS location_url text,
  ADD COLUMN IF NOT EXISTS what_to_expect text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS settings_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 2) Expand trace_group_members
-- ============================================================
-- Drop the old narrow role check before broadening it.
DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'trace_group_members'::regclass
      AND conname LIKE '%role%check%'
  LOOP
    EXECUTE format('ALTER TABLE trace_group_members DROP CONSTRAINT IF EXISTS %I', con_name);
  END LOOP;
END $$;

ALTER TABLE trace_group_members
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS subgroup_id uuid;

ALTER TABLE trace_group_members
  ADD CONSTRAINT trace_group_members_role_check
  CHECK (role IN ('owner', 'leader', 'co_leader', 'member', 'guest'));

-- ============================================================
-- 3) Subgroups / breakouts
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_subgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_group_subgroups_group_idx ON trace_group_subgroups(group_id);

ALTER TABLE trace_group_subgroups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subgroups_select" ON trace_group_subgroups;
CREATE POLICY "subgroups_select" ON trace_group_subgroups FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
  ));
DROP POLICY IF EXISTS "subgroups_insert_leaders" ON trace_group_subgroups;
CREATE POLICY "subgroups_insert_leaders" ON trace_group_subgroups FOR INSERT
  WITH CHECK (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
      AND role IN ('owner', 'leader', 'co_leader')
  ));

-- ============================================================
-- 4) Join requests
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  decided_by uuid REFERENCES trace_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS trace_group_join_requests_group_status_idx
  ON trace_group_join_requests(group_id, status);

ALTER TABLE trace_group_join_requests ENABLE ROW LEVEL SECURITY;
-- Requester reads their own row; leaders read pending rows for their group.
DROP POLICY IF EXISTS "join_requests_select" ON trace_group_join_requests;
CREATE POLICY "join_requests_select" ON trace_group_join_requests FOR SELECT
  USING (
    user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND status = 'approved'
        AND role IN ('owner', 'leader', 'co_leader')
    )
  );
DROP POLICY IF EXISTS "join_requests_insert_self" ON trace_group_join_requests;
CREATE POLICY "join_requests_insert_self" ON trace_group_join_requests FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid()));
-- UPDATE happens server-side via admin client (decision endpoint).

-- ============================================================
-- 5) Invites
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  channel text NOT NULL CHECK (channel IN ('link', 'qr', 'email', 'sms', 'inapp')),
  recipient text,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'co_leader', 'guest')),
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES trace_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_group_invites_group_idx ON trace_group_invites(group_id);
CREATE INDEX IF NOT EXISTS trace_group_invites_token_idx ON trace_group_invites(token);

ALTER TABLE trace_group_invites ENABLE ROW LEVEL SECURITY;
-- Reads: inviter or group leaders. Token consumption is server-side only.
DROP POLICY IF EXISTS "invites_select" ON trace_group_invites;
CREATE POLICY "invites_select" ON trace_group_invites FOR SELECT
  USING (
    invited_by = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND status = 'approved'
        AND role IN ('owner', 'leader', 'co_leader')
    )
  );
DROP POLICY IF EXISTS "invites_insert" ON trace_group_invites;
CREATE POLICY "invites_insert" ON trace_group_invites FOR INSERT
  WITH CHECK (
    invited_by = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    AND group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = invited_by
        AND status = 'approved'
        -- members can create link-style invites; leaders for everything else.
        AND role IN ('owner', 'leader', 'co_leader', 'member')
    )
  );

-- ============================================================
-- 6) Prayer Wall
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  -- author_id NULL = anonymous. The real author lives in trace_prayer_anon_keys
  -- which is server-only.
  author_id uuid REFERENCES trace_profiles(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text CHECK (body IS NULL OR length(body) <= 4000),
  category text,
  urgency text NOT NULL DEFAULT 'standard'
    CHECK (urgency IN ('whisper', 'standard', 'urgent')),
  privacy_scope text NOT NULL DEFAULT 'group'
    CHECK (privacy_scope IN ('group', 'leaders', 'specific', 'anonymous')),
  scripture_ref text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'praise', 'archived')),
  pray_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS trace_prayer_requests_group_status_created_idx
  ON trace_prayer_requests(group_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS trace_prayer_requests_author_idx
  ON trace_prayer_requests(author_id);

CREATE TABLE IF NOT EXISTS trace_prayer_request_targets (
  request_id uuid NOT NULL REFERENCES trace_prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS trace_prayer_anon_keys (
  request_id uuid PRIMARY KEY REFERENCES trace_prayer_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_prayer_request_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES trace_prayer_requests(id) ON DELETE CASCADE,
  author_id uuid REFERENCES trace_profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_praise boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_prayer_request_updates_request_idx
  ON trace_prayer_request_updates(request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trace_prayer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES trace_prayer_requests(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (request_id, assignee_id)
);

ALTER TABLE trace_prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_prayer_request_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_prayer_anon_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_prayer_request_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_prayer_assignments ENABLE ROW LEVEL SECURITY;

-- prayer_requests SELECT honors privacy_scope.
DROP POLICY IF EXISTS "prayer_requests_select" ON trace_prayer_requests;
CREATE POLICY "prayer_requests_select" ON trace_prayer_requests FOR SELECT
  USING (
    -- Author can always see their own requests (even anonymous ones if we know
    -- the link; here author_id is NULL for anon — the original author looks them
    -- up via /api/me/anon-prayers which uses the admin client).
    author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR (
      -- Privacy-scope gate
      privacy_scope IN ('group', 'anonymous')
      AND group_id IN (
        SELECT group_id FROM trace_group_members
        WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
          AND status = 'approved'
      )
    )
    OR (
      privacy_scope = 'leaders'
      AND group_id IN (
        SELECT group_id FROM trace_group_members
        WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
          AND status = 'approved'
          AND role IN ('owner', 'leader', 'co_leader')
      )
    )
    OR (
      privacy_scope = 'specific'
      AND id IN (
        SELECT request_id FROM trace_prayer_request_targets
        WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      )
    )
  );
DROP POLICY IF EXISTS "prayer_requests_insert" ON trace_prayer_requests;
CREATE POLICY "prayer_requests_insert" ON trace_prayer_requests FOR INSERT
  WITH CHECK (
    -- Anonymous inserts go through the admin client server-side; clients can
    -- only insert with their own author_id and only into a group they belong to.
    author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    AND group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = author_id
        AND status = 'approved'
    )
  );
DROP POLICY IF EXISTS "prayer_requests_update_author" ON trace_prayer_requests;
CREATE POLICY "prayer_requests_update_author" ON trace_prayer_requests FOR UPDATE
  USING (author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid()))
  WITH CHECK (author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "prayer_requests_delete_author" ON trace_prayer_requests;
CREATE POLICY "prayer_requests_delete_author" ON trace_prayer_requests FOR DELETE
  USING (author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid()));

-- targets: select if you ARE the target or you're the request author.
DROP POLICY IF EXISTS "prayer_targets_select" ON trace_prayer_request_targets;
CREATE POLICY "prayer_targets_select" ON trace_prayer_request_targets FOR SELECT
  USING (
    user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR request_id IN (
      SELECT id FROM trace_prayer_requests
      WHERE author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    )
  );
-- target inserts go through the admin client during request create.

-- anon_keys: NEVER selectable from the client. Server-only via admin client.
-- (No SELECT policy → no rows visible to authenticated users.)

-- updates: select if you can see the parent request.
DROP POLICY IF EXISTS "prayer_updates_select" ON trace_prayer_request_updates;
CREATE POLICY "prayer_updates_select" ON trace_prayer_request_updates FOR SELECT
  USING (request_id IN (SELECT id FROM trace_prayer_requests));
DROP POLICY IF EXISTS "prayer_updates_insert" ON trace_prayer_request_updates;
CREATE POLICY "prayer_updates_insert" ON trace_prayer_request_updates FOR INSERT
  WITH CHECK (
    author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    AND request_id IN (SELECT id FROM trace_prayer_requests)
  );

-- assignments: assignee or request author can see; leaders can insert.
DROP POLICY IF EXISTS "prayer_assignments_select" ON trace_prayer_assignments;
CREATE POLICY "prayer_assignments_select" ON trace_prayer_assignments FOR SELECT
  USING (
    assignee_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR request_id IN (
      SELECT id FROM trace_prayer_requests
      WHERE author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    )
  );

-- ============================================================
-- 7) Reading plans (schema only; UI ships in v1.1)
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  plan_template_id uuid,
  title text NOT NULL,
  total_days int NOT NULL CHECK (total_days BETWEEN 1 AND 365),
  start_date date NOT NULL,
  daily_post_time time,
  created_by uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS trace_group_plans_group_idx ON trace_group_plans(group_id);

CREATE TABLE IF NOT EXISTS trace_group_plan_days (
  plan_id uuid NOT NULL REFERENCES trace_group_plans(id) ON DELETE CASCADE,
  day_index int NOT NULL,
  reference text NOT NULL,
  prompt text,
  PRIMARY KEY (plan_id, day_index)
);

CREATE TABLE IF NOT EXISTS trace_group_plan_enrollments (
  plan_id uuid NOT NULL REFERENCES trace_group_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'left')),
  current_day int NOT NULL DEFAULT 1,
  PRIMARY KEY (plan_id, user_id)
);

ALTER TABLE trace_group_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_group_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_group_plan_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_plans_select" ON trace_group_plans;
CREATE POLICY "group_plans_select" ON trace_group_plans FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
  ));
DROP POLICY IF EXISTS "plan_days_select" ON trace_group_plan_days;
CREATE POLICY "plan_days_select" ON trace_group_plan_days FOR SELECT
  USING (plan_id IN (SELECT id FROM trace_group_plans));
DROP POLICY IF EXISTS "plan_enrollments_select" ON trace_group_plan_enrollments;
CREATE POLICY "plan_enrollments_select" ON trace_group_plan_enrollments FOR SELECT
  USING (
    user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR plan_id IN (SELECT id FROM trace_group_plans)
  );

-- ============================================================
-- 8) Meetings (schema only; UI ships in v1.1)
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location_kind text NOT NULL CHECK (location_kind IN ('inperson', 'online', 'hybrid')),
  location_text text,
  online_url text,
  agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  recording_consent_required boolean NOT NULL DEFAULT true,
  recording_url text,
  transcript_text text,
  created_by uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trace_group_meeting_attendance (
  meeting_id uuid NOT NULL REFERENCES trace_group_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('going', 'maybe', 'cant', 'attended', 'absent', 'unknown')),
  PRIMARY KEY (meeting_id, user_id)
);

ALTER TABLE trace_group_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_group_meeting_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_select" ON trace_group_meetings;
CREATE POLICY "meetings_select" ON trace_group_meetings FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
  ));
DROP POLICY IF EXISTS "attendance_select" ON trace_group_meeting_attendance;
CREATE POLICY "attendance_select" ON trace_group_meeting_attendance FOR SELECT
  USING (meeting_id IN (SELECT id FROM trace_group_meetings));

-- ============================================================
-- 9) Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text,
  scripture_ref text,
  scheduled_for timestamptz,
  pinned boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_group_announcements_group_pinned_created_idx
  ON trace_group_announcements(group_id, pinned, created_at DESC);

CREATE TABLE IF NOT EXISTS trace_group_announcement_reads (
  announcement_id uuid NOT NULL REFERENCES trace_group_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES trace_profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE trace_group_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_group_announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON trace_group_announcements;
CREATE POLICY "announcements_select" ON trace_group_announcements FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
  ));
DROP POLICY IF EXISTS "announcements_insert_leaders" ON trace_group_announcements;
CREATE POLICY "announcements_insert_leaders" ON trace_group_announcements FOR INSERT
  WITH CHECK (
    author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    AND group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = author_id
        AND status = 'approved'
        AND role IN ('owner', 'leader', 'co_leader')
    )
  );
DROP POLICY IF EXISTS "announcement_reads_select_self" ON trace_group_announcement_reads;
CREATE POLICY "announcement_reads_select_self" ON trace_group_announcement_reads FOR SELECT
  USING (
    user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    OR announcement_id IN (
      SELECT id FROM trace_group_announcements
      WHERE author_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "announcement_reads_insert_self" ON trace_group_announcement_reads;
CREATE POLICY "announcement_reads_insert_self" ON trace_group_announcement_reads FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid()));

-- ============================================================
-- 10) Audit log (server-only writes)
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_group_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trace_groups(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES trace_profiles(id) ON DELETE SET NULL,
  event text NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_group_audit_log_group_created_idx
  ON trace_group_audit_log(group_id, created_at DESC);

ALTER TABLE trace_group_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_leaders" ON trace_group_audit_log;
CREATE POLICY "audit_log_select_leaders" ON trace_group_audit_log FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM trace_group_members
    WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
      AND status = 'approved'
      AND role IN ('owner', 'leader', 'co_leader')
  ));
-- INSERT only via admin client.

-- ============================================================
-- 11) Realtime publication
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE trace_prayer_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE trace_prayer_request_updates;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE trace_group_announcements;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 12) Helper: increment_pray_count() — atomic counter bump.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_pray_count(req_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE trace_prayer_requests
     SET pray_count = pray_count + 1,
         updated_at = now()
   WHERE id = req_id
   RETURNING pray_count INTO new_count;
  RETURN new_count;
END $$;
GRANT EXECUTE ON FUNCTION increment_pray_count(uuid) TO authenticated;
