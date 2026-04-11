-- Store appearance/voice/bible settings per user so they sync across devices
alter table trace_profiles
  add column if not exists settings_data jsonb default '{}';
