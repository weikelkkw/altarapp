-- Prayer delivery: send a prayer to a random believer
CREATE TABLE IF NOT EXISTS trace_prayer_deliveries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text NOT NULL,
  sender_id   uuid REFERENCES trace_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES trace_profiles(id) ON DELETE CASCADE,
  seen_at     timestamptz,
  prayed_at   timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_deliveries_recipient
  ON trace_prayer_deliveries(recipient_id, seen_at);
