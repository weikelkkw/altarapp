'use client';

import { createClient } from '@/lib/supabase/client';

// Wraps fetch() with auth + JSON envelope handling.
async function authedFetch(input: string, init: RequestInit = {}) {
  const sb = createClient();
  let token: string | undefined;
  if (sb) {
    const { data } = await sb.auth.getSession();
    token = data.session?.access_token;
  }
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const message = json?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json?.data;
}

// ─── Groups ─────────────────────────────────────────────────────────────────
export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  archetype: string | null;
  privacy: 'private' | 'discoverable' | 'public';
  cover_image_url: string | null;
  slug: string | null;
  created_at: string;
  my_role: 'owner' | 'leader' | 'co_leader' | 'member' | 'guest';
}

export interface GroupDetail extends GroupSummary {
  denomination: string | null;
  cadence: string | null;
  location_kind: string | null;
  location_text: string | null;
  location_url: string | null;
  what_to_expect: string | null;
  archived_at: string | null;
  settings_data: Record<string, unknown>;
}

export const groupsApi = {
  list: () => authedFetch('/api/groups') as Promise<GroupSummary[]>,
  create: (body: {
    name: string;
    archetype?: string;
    description?: string;
    privacy?: string;
    denomination?: string;
    cadence?: string;
    locationKind?: string;
    locationText?: string;
    whatToExpect?: string;
  }) => authedFetch('/api/groups', { method: 'POST', body: JSON.stringify(body) }) as Promise<{ id: string; name: string; slug: string }>,
  get: (id: string) => authedFetch(`/api/groups/${id}`) as Promise<GroupDetail>,
  patch: (id: string, body: Record<string, unknown>) =>
    authedFetch(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id: string) => authedFetch(`/api/groups/${id}`, { method: 'DELETE' }),
};

// ─── Members ────────────────────────────────────────────────────────────────
export interface MemberRow {
  user_id: string;
  role: 'owner' | 'leader' | 'co_leader' | 'member' | 'guest';
  joined_at: string;
  onboarded_at: string | null;
  display_name: string | null;
  username: string | null;
  avatar_color: string | null;
  bio: string | null;
}

export const membersApi = {
  list: (groupId: string) => authedFetch(`/api/groups/${groupId}/members`) as Promise<MemberRow[]>,
};

// ─── Prayer requests ────────────────────────────────────────────────────────
export interface PrayerRequest {
  id: string;
  group_id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  category: string | null;
  urgency: 'whisper' | 'standard' | 'urgent';
  privacy_scope: 'group' | 'leaders' | 'specific' | 'anonymous';
  scripture_ref: string | null;
  status: 'open' | 'praise' | 'archived';
  pray_count: number;
  created_at: string;
  updated_at: string | null;
}

export const prayerApi = {
  list: (groupId: string, status: 'open' | 'praise' | 'archived' | 'all' = 'open') =>
    authedFetch(`/api/groups/${groupId}/prayer-requests?status=${status}`) as Promise<PrayerRequest[]>,
  create: (groupId: string, body: {
    title: string;
    body?: string;
    category?: string;
    urgency?: 'whisper' | 'standard' | 'urgent';
    privacyScope?: 'group' | 'leaders' | 'specific' | 'anonymous';
    scriptureRef?: string;
    targetUserIds?: string[];
  }) => authedFetch(`/api/groups/${groupId}/prayer-requests`, { method: 'POST', body: JSON.stringify(body) }) as Promise<PrayerRequest>,
  pray: (groupId: string, reqId: string) =>
    authedFetch(`/api/groups/${groupId}/prayer-requests/${reqId}/pray`, { method: 'POST' }) as Promise<{ pray_count: number }>,
};
