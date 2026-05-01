-- Defensive remediation after Session 02's RLS hardening.
--
-- 20260430_audit_2_rls.sql replaced the old `group_members_all` policy with a
-- role-aware split that requires `status = 'approved'` on every read.
-- 002_altar_columns.sql added the `status` column with a DEFAULT, but a
-- handful of pre-existing rows from before that migration may carry NULL
-- status (Postgres backfills DEFAULTs only on `ADD COLUMN ... NOT NULL` in
-- some versions). Any such row becomes invisible to the user via RLS even
-- though the data is intact — which presents to the user as "my groups
-- disappeared".
--
-- This migration is idempotent. It:
--   1. Backfills any null/empty status to 'approved' so existing memberships
--      stay visible.
--   2. Backfills role to 'member' for any row whose role doesn't match the
--      check constraint that 20260501_groups_rebuild.sql installs (so the
--      groups_rebuild migration can apply cleanly without rejecting rows).
--   3. Touches no group rows themselves.

UPDATE trace_group_members
   SET status = 'approved'
 WHERE status IS NULL OR status NOT IN ('pending', 'approved');

UPDATE trace_group_members
   SET role = 'member'
 WHERE role IS NULL OR role NOT IN ('owner', 'leader', 'co_leader', 'member', 'guest');
