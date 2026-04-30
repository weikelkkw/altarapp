-- Scope prayer wall posts to groups
ALTER TABLE trace_posts
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES trace_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trace_posts_group_id ON trace_posts(group_id);
