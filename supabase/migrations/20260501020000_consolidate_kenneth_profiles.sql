-- One-shot data migration: consolidate two Kenneth profiles into one.
--
--   Old (delete after migrate):
--     profile id  e91ff405-49da-4b32-a3b8-4161126022e8
--     auth   id   0d37cae6-db17-4609-a27b-64dc5090d269
--     email       kenneth@poseidonkingdom.com
--     signup      2026-04-10
--     state       has all groups + memberships + activity
--
--   New (keep + receive everything):
--     profile id  66e14722-b747-4d4a-b049-4bc0afcd304c
--     auth   id   e15b7243-10e0-4efd-975c-41cf92f38eb6
--     email       kenneth@waterbyposeidon.com
--     signup      2026-04-13
--     state       empty — zero rows in every trace_* table
--
-- Idempotent: if the old profile no longer exists (migration already ran or
-- this is a fresh dev DB) every statement becomes a no-op. UUIDs are
-- hardcoded so it's safe to run in any environment that doesn't share these
-- specific ids.
--
-- The old auth.users row is also deleted so the @poseidonkingdom.com login
-- can never be used to recreate the orphan profile.

DO $body$
DECLARE
  old_profile uuid := 'e91ff405-49da-4b32-a3b8-4161126022e8';
  new_profile uuid := '66e14722-b747-4d4a-b049-4bc0afcd304c';
  old_auth    uuid := '0d37cae6-db17-4609-a27b-64dc5090d269';
BEGIN
  -- Skip cleanly if old profile is already gone.
  IF NOT EXISTS (SELECT 1 FROM trace_profiles WHERE id = old_profile) THEN
    RAISE NOTICE 'Old Kenneth profile not present — skipping consolidation.';
    RETURN;
  END IF;

  -- ── 1) Repoint every FK that references trace_profiles(id) ─────────────
  -- Order doesn't matter; new profile is empty so nothing collides on PKs.

  -- Authoring / creation
  UPDATE trace_groups               SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_group_subgroups      SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_group_plans          SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_group_meetings       SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_group_events         SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_reading_plans        SET created_by   = new_profile WHERE created_by   = old_profile;
  UPDATE trace_study_schedules      SET created_by   = new_profile WHERE created_by   = old_profile;

  -- Membership
  UPDATE trace_group_members        SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_group_join_requests  SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_group_join_requests  SET decided_by   = new_profile WHERE decided_by   = old_profile;
  UPDATE trace_group_invites        SET invited_by   = new_profile WHERE invited_by   = old_profile;
  UPDATE trace_group_invites        SET consumed_by  = new_profile WHERE consumed_by  = old_profile;
  UPDATE trace_group_plan_enrollments      SET user_id = new_profile WHERE user_id   = old_profile;
  UPDATE trace_group_meeting_attendance    SET user_id = new_profile WHERE user_id   = old_profile;
  UPDATE trace_group_announcements         SET author_id = new_profile WHERE author_id = old_profile;
  UPDATE trace_group_announcement_reads    SET user_id  = new_profile WHERE user_id   = old_profile;
  UPDATE trace_group_audit_log             SET actor_id = new_profile WHERE actor_id  = old_profile;

  -- Posts / comments / reactions
  UPDATE trace_posts                SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_comments             SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_post_likes           SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_post_prayers         SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_message_reactions    SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_event_rsvps          SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_plan_progress        SET user_id      = new_profile WHERE user_id      = old_profile;

  -- Messaging
  UPDATE trace_messages             SET sender_id    = new_profile WHERE sender_id    = old_profile;
  UPDATE trace_group_messages       SET sender_id    = new_profile WHERE sender_id    = old_profile;
  UPDATE trace_conversation_participants    SET user_id = new_profile WHERE user_id  = old_profile;

  -- Prayer
  UPDATE trace_prayers              SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_prayer_comments      SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_prayer_deliveries    SET sender_id    = new_profile WHERE sender_id    = old_profile;
  UPDATE trace_prayer_deliveries    SET recipient_id = new_profile WHERE recipient_id = old_profile;
  UPDATE trace_prayer_requests      SET author_id    = new_profile WHERE author_id    = old_profile;
  UPDATE trace_prayer_request_updates       SET author_id   = new_profile WHERE author_id   = old_profile;
  UPDATE trace_prayer_request_targets       SET user_id     = new_profile WHERE user_id     = old_profile;
  UPDATE trace_prayer_anon_keys             SET author_id   = new_profile WHERE author_id   = old_profile;
  UPDATE trace_prayer_assignments           SET assigned_by = new_profile WHERE assigned_by = old_profile;
  UPDATE trace_prayer_assignments           SET assignee_id = new_profile WHERE assignee_id = old_profile;

  -- Friends + content
  UPDATE trace_friendships          SET requester_id = new_profile WHERE requester_id = old_profile;
  UPDATE trace_friendships          SET addressee_id = new_profile WHERE addressee_id = old_profile;
  UPDATE trace_highlights           SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_reading_activity     SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_notes                SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_notifications        SET user_id      = new_profile WHERE user_id      = old_profile;
  UPDATE trace_encounters           SET user_id      = new_profile WHERE user_id      = old_profile;

  -- Moderation / legal
  UPDATE trace_content_reports      SET reporter_id  = new_profile WHERE reporter_id  = old_profile;
  UPDATE trace_content_reports      SET resolved_by  = new_profile WHERE resolved_by  = old_profile;

  -- ── 2) Drop the old profile row (no FKs reference it now) ─────────────
  DELETE FROM trace_profiles WHERE id = old_profile;

  -- ── 3) Disable the old auth.users row so the older email cannot log
  --       back in and recreate the orphan profile. ───────────────────────
  DELETE FROM auth.users WHERE id = old_auth;

  RAISE NOTICE 'Consolidated Kenneth profiles. Old profile + old auth user removed.';
END $body$;
