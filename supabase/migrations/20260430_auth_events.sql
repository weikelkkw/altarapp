-- Append-only audit log for security-relevant events.
-- Inserted server-side via the service role; users can only read rows
-- attributed to their own auth_id, never modify or delete them.

CREATE TABLE IF NOT EXISTS trace_auth_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,                -- e.g. 'login_success','login_failure','password_change','signup','rate_limit_exceeded'
  ip_address  text,
  user_agent  text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trace_auth_events_auth_id_created
  ON trace_auth_events (auth_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trace_auth_events_type_created
  ON trace_auth_events (event_type, created_at DESC);

-- RLS: read-only access to your own events; no client-side writes/updates/deletes.
ALTER TABLE trace_auth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own auth events" ON trace_auth_events;
CREATE POLICY "Users read own auth events"
  ON trace_auth_events FOR SELECT
  USING (auth.uid() = auth_id);

-- Block all client writes — service role bypasses RLS for inserts.
DROP POLICY IF EXISTS "Block client writes" ON trace_auth_events;
CREATE POLICY "Block client writes"
  ON trace_auth_events FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates" ON trace_auth_events;
CREATE POLICY "Block client updates"
  ON trace_auth_events FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block client deletes" ON trace_auth_events;
CREATE POLICY "Block client deletes"
  ON trace_auth_events FOR DELETE TO authenticated
  USING (false);
