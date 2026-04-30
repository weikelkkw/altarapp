-- Add profile_data and is_public columns to trace_profiles
ALTER TABLE trace_profiles
  ADD COLUMN IF NOT EXISTS profile_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
