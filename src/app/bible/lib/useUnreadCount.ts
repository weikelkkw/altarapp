'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// Lives in `lib/` (not in `tabs/NotificationCenter.tsx`) so the badge can
// subscribe without dragging the whole notification panel into the initial
// bundle — the panel itself is loaded dynamically on first open.
export function useUnreadCount(userId: string): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    const sb = createClient();
    if (!sb) return;
    const { count: c } = await sb
      .from('trace_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    setCount(c ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchCount();

    const sb = createClient();
    if (!sb) return;

    const channel = sb
      .channel(`unread-count-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trace_notifications', filter: `user_id=eq.${userId}` },
        () => { fetchCount(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trace_notifications', filter: `user_id=eq.${userId}` },
        () => { fetchCount(); }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [userId, fetchCount]);

  return count;
}
