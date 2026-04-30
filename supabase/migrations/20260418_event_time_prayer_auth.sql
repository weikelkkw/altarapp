-- Add event_time column to trace_group_events
ALTER TABLE trace_group_events
  ADD COLUMN IF NOT EXISTS event_time text;
