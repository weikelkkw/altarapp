'use client';

// Sign-in / data diagnostics. No styling, no chrome — pure JSON dump so a
// screenshot tells the whole story. Visit /bible/diag while signed in.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DiagPage() {
  const [out, setOut] = useState<any>({ phase: 'starting' });

  useEffect(() => {
    (async () => {
      const tag = (key: string, value: any) =>
        setOut((prev: any) => ({ ...prev, [key]: value }));

      const supabase = createClient();
      if (!supabase) {
        tag('error', 'No Supabase client — env vars missing in browser bundle');
        return;
      }

      // 1. Session
      const sess = await supabase.auth.getSession();
      tag('session_user_id', sess?.data?.session?.user?.id ?? null);
      tag('session_email', sess?.data?.session?.user?.email ?? null);
      tag('session_expires_at', sess?.data?.session?.expires_at ?? null);
      tag('session_error', sess?.error?.message ?? null);

      const authId = sess?.data?.session?.user?.id;
      if (!authId) { tag('phase', 'no-session'); return; }

      // 2. Profile lookup
      const profQuery = await supabase
        .from('trace_profiles')
        .select('id, display_name, auth_id, username, is_public')
        .eq('auth_id', authId)
        .single();
      tag('profile_query', { data: profQuery.data, error: profQuery.error?.message ?? null });

      const profileId = profQuery.data?.id;
      if (!profileId) { tag('phase', 'no-profile'); return; }

      // 3. Memberships
      const mems = await supabase
        .from('trace_group_members')
        .select('group_id, role, status, joined_at')
        .eq('user_id', profileId);
      tag('memberships_query', {
        data: mems.data,
        count: mems.data?.length ?? 0,
        error: mems.error?.message ?? null,
      });

      const groupIds = (mems.data ?? []).map((m: any) => m.group_id);
      if (groupIds.length === 0) { tag('phase', 'no-memberships'); return; }

      // 4. Groups
      const groups = await supabase
        .from('trace_groups')
        .select('id, name, description, icon, privacy, archived_at')
        .in('id', groupIds);
      tag('groups_query', {
        data: groups.data,
        count: groups.data?.length ?? 0,
        error: groups.error?.message ?? null,
      });

      // 5. Filtered (matches CommunityTab.loadMyGroups exactly)
      const memsApproved = await supabase
        .from('trace_group_members')
        .select('group_id, role')
        .eq('user_id', profileId)
        .eq('status', 'approved');
      tag('community_tab_memberships', {
        count: memsApproved.data?.length ?? 0,
        error: memsApproved.error?.message ?? null,
      });

      tag('phase', 'done');
    })().catch(err => {
      setOut((prev: any) => ({ ...prev, fatal_error: String(err) }));
    });
  }, []);

  return (
    <div style={{
      fontFamily: 'ui-monospace, Menlo, monospace',
      background: '#0a0806',
      color: '#f6efdc',
      minHeight: '100dvh',
      padding: 20,
      paddingTop: 'calc(20px + env(safe-area-inset-top))',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: '#c9a84c' }}>The Altar — Diag</div>
      {JSON.stringify(out, null, 2)}
    </div>
  );
}
