-- Audit 02 — RLS / Authentication hardening pass.
-- Addresses findings from `~/Desktop/The Altar Actions/completed/02_Auth_Supabase.md`.
-- Run this in the Supabase SQL editor (or via `supabase db push`) AFTER 20260430_auth_events.sql.
--
-- All changes are additive or replacements — no data is deleted.
-- Every replaced policy is dropped first by name (drop-if-exists) before being
-- recreated, so re-running this migration is safe.

-- ============================================================
-- 1) trace_prayer_deliveries — enable RLS (was completely off)
-- ============================================================
-- Until now this table relied on the /api/prayer route (admin client) for all
-- access. Anon-key reads from the browser would have leaked everyone's prayers.
ALTER TABLE trace_prayer_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipient reads own deliveries" ON trace_prayer_deliveries;
CREATE POLICY "recipient reads own deliveries"
  ON trace_prayer_deliveries FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = recipient_id));

DROP POLICY IF EXISTS "sender reads own deliveries" ON trace_prayer_deliveries;
CREATE POLICY "sender reads own deliveries"
  ON trace_prayer_deliveries FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = sender_id));

-- Recipient can mark seen / prayed (already enforced server-side, but defence in depth).
DROP POLICY IF EXISTS "recipient updates own deliveries" ON trace_prayer_deliveries;
CREATE POLICY "recipient updates own deliveries"
  ON trace_prayer_deliveries FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = recipient_id))
  WITH CHECK (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = recipient_id));

-- INSERT happens only via the admin client (/api/prayer), which bypasses RLS.
-- No INSERT policy for `authenticated` — clients cannot insert directly.

-- ============================================================
-- 2) trace_profiles — narrow SELECT, harden UPDATE
-- ============================================================
-- Replace blanket profiles_select(true) with a layered policy:
--   • a user can always see their own row;
--   • a user can see another profile if it is is_public = true OR
--     they share at least one approved group with that user.
DROP POLICY IF EXISTS "profiles_select" ON trace_profiles;
CREATE POLICY "profiles_select"
  ON trace_profiles FOR SELECT
  USING (
    auth.uid() = auth_id
    OR is_public = true
    OR id IN (
      SELECT gm2.user_id
      FROM trace_group_members gm1
      JOIN trace_group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND gm1.status = 'approved'
        AND gm2.status = 'approved'
    )
  );

-- Lock UPDATE so users can change their own row but cannot rewrite auth_id
-- (which would let them point their profile at someone else's auth user).
DROP POLICY IF EXISTS "profiles_update" ON trace_profiles;
CREATE POLICY "profiles_update"
  ON trace_profiles FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- ============================================================
-- 3) trace_posts — SELECT respects group scoping
-- ============================================================
-- After the 20260416 migration, trace_posts has an optional group_id.
-- The legacy posts_select(true) leaked group-scoped posts to non-members.
DROP POLICY IF EXISTS "posts_select" ON trace_posts;
CREATE POLICY "posts_select"
  ON trace_posts FOR SELECT
  USING (
    group_id IS NULL
    OR group_id IN (
      SELECT group_id FROM trace_group_members
      WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND status = 'approved'
    )
  );

-- ============================================================
-- 4) trace_comments — SELECT joins to the parent post's visibility
-- ============================================================
DROP POLICY IF EXISTS "comments_select" ON trace_comments;
CREATE POLICY "comments_select"
  ON trace_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM trace_posts
      WHERE group_id IS NULL
         OR group_id IN (
           SELECT group_id FROM trace_group_members
           WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
             AND status = 'approved'
         )
    )
  );

-- ============================================================
-- 5) trace_prayer_comments — same group-aware visibility as comments
-- ============================================================
-- Was: USING (auth.role() = 'authenticated') — equivalent to USING(true) for any
-- signed-in user, which leaked comments on group-scoped prayer posts.
DROP POLICY IF EXISTS "authenticated users can view prayer comments" ON trace_prayer_comments;
DROP POLICY IF EXISTS "users can view prayer comments in visible posts" ON trace_prayer_comments;
CREATE POLICY "users can view prayer comments in visible posts"
  ON trace_prayer_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM trace_posts
      WHERE group_id IS NULL
         OR group_id IN (
           SELECT group_id FROM trace_group_members
           WHERE user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
             AND status = 'approved'
         )
    )
  );

-- ============================================================
-- 6) trace_message_reactions — only group members of the host message
-- ============================================================
-- Was: USING (true) — anyone could read every reaction in every group.
DROP POLICY IF EXISTS "group members can view reactions" ON trace_message_reactions;
CREATE POLICY "group members can view reactions"
  ON trace_message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM trace_group_messages m
      JOIN trace_group_members gm ON gm.group_id = m.group_id
      WHERE gm.user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND gm.status = 'approved'
    )
  );

-- ============================================================
-- 7) trace_plan_progress — only group members of the plan's group
-- ============================================================
-- Was: USING (true) — leaked every user's reading progress across the platform.
DROP POLICY IF EXISTS "group members can view progress" ON trace_plan_progress;
CREATE POLICY "group members can view progress"
  ON trace_plan_progress FOR SELECT
  USING (
    plan_id IN (
      SELECT p.id FROM trace_reading_plans p
      JOIN trace_group_members gm ON gm.group_id = p.group_id
      WHERE gm.user_id = (SELECT id FROM trace_profiles WHERE auth_id = auth.uid())
        AND gm.status = 'approved'
    )
  );

-- ============================================================
-- 8) trace_notifications — block client INSERTs
-- ============================================================
-- Service role bypasses RLS by default, so the permissive
-- "service role can insert notifications" policy was actually a hole that let
-- any authenticated client spoof notifications to any user_id.
DROP POLICY IF EXISTS "service role can insert notifications" ON trace_notifications;
DROP POLICY IF EXISTS "block client notification inserts" ON trace_notifications;
CREATE POLICY "block client notification inserts"
  ON trace_notifications FOR INSERT TO authenticated
  WITH CHECK (false);

-- ============================================================
-- 9) trace_group_members — split monolithic _all into role-aware policies
-- ============================================================
-- The original group_members_all policy used FOR ALL with USING only, so
-- a member could UPDATE their own row to set role='leader' or
-- status='approved'. Replace with split policies that lock those columns.
DROP POLICY IF EXISTS "group_members_all" ON trace_group_members;

-- INSERT: a user can join themselves to a group, but role must default to
-- 'member' and status must be 'pending' (unless they are the group's creator,
-- who joins as leader/approved on creation). The trigger below enforces this.
DROP POLICY IF EXISTS "group_members_insert" ON trace_group_members;
CREATE POLICY "group_members_insert"
  ON trace_group_members FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = user_id));

-- UPDATE: members may not edit their own role/status; leaders update via the
-- /api/group/approve and /api/group/promote routes (admin client → bypass RLS).
DROP POLICY IF EXISTS "group_members_update_self" ON trace_group_members;
-- Intentionally NO policy granting UPDATE to authenticated. All role/status
-- transitions go through the API.

-- DELETE: a user may remove themselves from a group (leave). Leader-driven
-- removals go through the admin client.
DROP POLICY IF EXISTS "group_members_delete_self" ON trace_group_members;
CREATE POLICY "group_members_delete_self"
  ON trace_group_members FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM trace_profiles WHERE id = user_id));

-- Trigger: enforce that any client INSERT can only set role='member' and
-- status in ('pending','approved'). Group creators get role='leader' inserted
-- via the same client path immediately after `trace_groups` insert; we allow
-- 'leader' iff this is the very first member of the group.
CREATE OR REPLACE FUNCTION enforce_group_member_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count int;
  group_creator uuid;
BEGIN
  -- Service role inserts (admin client) skip this check entirely.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO member_count FROM trace_group_members WHERE group_id = NEW.group_id;
  SELECT created_by INTO group_creator FROM trace_groups WHERE id = NEW.group_id;

  IF NEW.role = 'leader' THEN
    -- Only the group's creator may insert themselves as leader, and only as
    -- the very first member.
    IF member_count > 0 OR NEW.user_id <> group_creator THEN
      RAISE EXCEPTION 'role=leader is only permitted for the group creator on first join';
    END IF;
  END IF;

  IF NEW.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'invalid status %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_group_member_invariants ON trace_group_members;
CREATE TRIGGER trg_enforce_group_member_invariants
  BEFORE INSERT ON trace_group_members
  FOR EACH ROW EXECUTE FUNCTION enforce_group_member_invariants();
