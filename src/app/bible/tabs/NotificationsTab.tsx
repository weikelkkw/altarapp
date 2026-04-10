'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = 'achievement' | 'community' | 'verse' | 'prayer' | 'system' | 'milestone';
type FilterId  = 'all' | 'community' | 'achievements' | 'reminders';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  icon: string;
  accent?: string;
  action?: { label: string; tab: string };
}

interface Props {
  accentColor: string;
  authUser: { id: string } | null;
  highlighted: Set<string>;
  notes: Record<string, string>;
  onNavigate?: (tab: string) => void;
  onUnreadChange?: (count: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<NotifType, string> = {
  achievement: '#f59e0b',
  community:   '#60a5fa',
  verse:       '#a78bfa',
  prayer:      '#34d399',
  system:      '#94a3b8',
  milestone:   '#f472b6',
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',          label: 'All'          },
  { id: 'community',    label: 'Community'    },
  { id: 'achievements', label: 'Achievements' },
  { id: 'reminders',    label: 'Reminders'    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function matchFilter(n: Notif, f: FilterId): boolean {
  if (f === 'all') return true;
  if (f === 'community')    return n.type === 'community';
  if (f === 'achievements') return n.type === 'achievement' || n.type === 'milestone';
  if (f === 'reminders')    return n.type === 'prayer' || n.type === 'system' || n.type === 'verse';
  return true;
}

function groupByDay(notifs: Notif[]): { label: string; items: Notif[] }[] {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const map: Record<string, Notif[]> = {};
  for (const n of notifs) {
    const day = new Date(n.timestamp).toDateString();
    const label =
      day === today     ? 'Today'     :
      day === yesterday ? 'Yesterday' :
      new Date(n.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    (map[label] ??= []).push(n);
  }
  return Object.entries(map).map(([label, items]) => ({ label, items }));
}

// ── Notification builder ───────────────────────────────────────────────────────

function buildLocal(highlighted: Set<string>, notes: Record<string, string>): Notif[] {
  const out: Notif[] = [];
  const now = Date.now();

  // Streak
  try {
    const s = parseInt(localStorage.getItem('trace-streak') || '0');
    if (s >= 3) out.push({
      id: 'streak', type: 'achievement', icon: '🔥',
      title: `${s}-Day Reading Streak`,
      body: `${s} days in a row. Consistency transforms a life.`,
      timestamp: new Date(now - 5 * 60000).toISOString(), read: false,
    });
  } catch {}

  // Highlights
  const hCount = highlighted.size;
  const hMilestone = [250, 100, 50, 25, 10, 5, 1].find(m => hCount >= m);
  if (hMilestone) out.push({
    id: `hl-${hMilestone}`, type: 'milestone', icon: '✨',
    title: `${hCount} Verse${hCount === 1 ? '' : 's'} Highlighted`,
    body: hMilestone >= 50
      ? 'You are building a living concordance in your heart.'
      : hMilestone >= 10
      ? 'Scripture is taking root in you.'
      : 'The Word is becoming personal.',
    timestamp: new Date(now - 30 * 60000).toISOString(), read: false,
  });

  // Notes
  const nCount = Object.values(notes).filter(v => v?.trim()).length;
  if (nCount >= 1) out.push({
    id: `notes-${nCount}`, type: 'milestone', icon: '📝',
    title: `${nCount} Study Note${nCount === 1 ? '' : 's'} Written`,
    body: nCount >= 10
      ? 'Your commentary on the Word is taking shape.'
      : 'Every note deepens what you have read.',
    timestamp: new Date(now - 2 * 3600000).toISOString(), read: true,
  });

  // Daily verse
  try {
    if (localStorage.getItem(`trace-daily-verse-${new Date().toDateString()}`)) {
      out.push({
        id: 'daily-verse', type: 'verse', icon: '📖',
        title: 'Your Word for Today is Ready',
        body: 'A personalized verse has been selected for you.',
        timestamp: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(), read: false,
        action: { label: 'Open Home', tab: 'home' },
      });
    }
  } catch {}

  // Prayers
  try {
    const raw = localStorage.getItem('trace-prayers');
    if (raw) {
      const prayers: { id: string; status: string; createdAt: string }[] = JSON.parse(raw);
      const active   = prayers.filter(p => p.status === 'active' || p.status === 'ongoing');
      const answered = prayers.filter(p => p.status === 'answered');
      if (active.length > 0) {
        const oldest = active.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0];
        const days   = Math.floor((now - +new Date(oldest.createdAt)) / 86400000);
        out.push({
          id: `prayer-${oldest.id}`, type: 'prayer', icon: '🙏',
          title: `${active.length} Prayer${active.length === 1 ? '' : 's'} Active`,
          body: days >= 1
            ? `${days} day${days === 1 ? '' : 's'} lifting these needs — God has not forgotten.`
            : 'Keep bringing these needs before the Lord.',
          timestamp: new Date(now - 4 * 3600000).toISOString(), read: false,
          action: { label: 'View Prayers', tab: 'home' },
        });
      }
      if (answered.length >= 1) out.push({
        id: `answered-${answered.length}`, type: 'achievement', icon: '✝️',
        title: `${answered.length} Answered Prayer${answered.length === 1 ? '' : 's'}`,
        body: 'Faithfulness recorded. He hears every word.',
        timestamp: new Date(now - 6 * 3600000).toISOString(), read: true,
      });
    }
  } catch {}

  // Tip
  try {
    if (localStorage.getItem('trace-onboarding-done') && hCount === 0 && nCount === 0) {
      out.push({
        id: 'tip-highlight', type: 'system', icon: '💡',
        title: 'Tip: Highlight Verses as You Read',
        body: 'Tap the highlight icon next to any verse in the Read tab to mark it.',
        timestamp: new Date(now - 24 * 3600000).toISOString(), read: false,
        action: { label: 'Start Reading', tab: 'read' },
      });
    }
  } catch {}

  return out.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

// ── Card ──────────────────────────────────────────────────────────────────────

function NotifCard({ n, accent, onRead, onDismiss, onAction }: {
  n: Notif;
  accent: string;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction?: (tab: string) => void;
}) {
  const color = n.accent ?? TYPE_COLOR[n.type] ?? accent;

  return (
    <div
      onClick={() => onRead(n.id)}
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: '12px 14px 12px 16px',
        background: n.read ? 'rgba(255,255,255,0.03)' : `${color}0c`,
        border: `1px solid ${n.read ? 'rgba(255,255,255,0.07)' : color + '30'}`,
        cursor: 'pointer',
      }}
    >
      {/* Unread left bar */}
      {!n.read && (
        <div style={{
          position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
          borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${color}, ${color}55)`,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          background: `${color}18`,
          border: `1px solid ${color}28`,
        }}>
          {n.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{
              margin: 0,
              fontSize: 13, fontWeight: 700, lineHeight: 1.3,
              color: n.read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.92)',
              fontFamily: 'Montserrat, system-ui, sans-serif',
            }}>
              {n.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 1 }}>
              {!n.read && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                {timeAgo(n.timestamp)}
              </span>
            </div>
          </div>

          <p style={{
            margin: '4px 0 0',
            fontSize: 12, lineHeight: 1.55,
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'Georgia, serif',
          }}>
            {n.body}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            {n.action ? (
              <button
                onClick={e => { e.stopPropagation(); onAction?.(n.action!.tab); }}
                style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  padding: '4px 10px', borderRadius: 8,
                  color, background: `${color}16`, border: `1px solid ${color}28`,
                  cursor: 'pointer',
                }}
              >
                {n.action.label} →
              </button>
            ) : <div />}

            <button
              onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
              style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsTab({ accentColor, authUser, highlighted, notes, onNavigate, onUnreadChange }: Props) {
  const [filter,    setFilter]    = useState<FilterId>('all');
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let dis = new Set<string>();
    let rd  = new Set<string>();
    try { dis = new Set(JSON.parse(localStorage.getItem('trace-notifs-dismissed') || '[]')); } catch {}
    try { rd  = new Set(JSON.parse(localStorage.getItem('trace-notifs-read')      || '[]')); } catch {}
    setDismissed(dis);

    const local: Notif[] = buildLocal(highlighted, notes).map(n => ({
      ...n, read: rd.has(n.id) || n.read,
    }));

    const community: Notif[] = [];
    if (authUser) {
      try {
        const sb = createClient();
        const { data: likes } = await sb
          .from('trace_post_likes').select('post_id, created_at, user_id')
          .neq('user_id', authUser.id).order('created_at', { ascending: false }).limit(10);
        if (likes?.length) community.push({
          id: `cl-${likes.length}`, type: 'community', icon: '❤️', accent: '#f472b6',
          title: `${likes.length} Reaction${likes.length === 1 ? '' : 's'} on Your Posts`,
          body: `${likes.length} member${likes.length === 1 ? ' has' : 's have'} responded to your words.`,
          timestamp: likes[0].created_at, read: rd.has(`cl-${likes.length}`),
        });

        const { data: comments } = await sb
          .from('trace_comments').select('id, created_at, user_id')
          .neq('user_id', authUser.id).order('created_at', { ascending: false }).limit(5);
        if (comments?.length) community.push({
          id: `cc-${comments.length}`, type: 'community', icon: '💬', accent: '#60a5fa',
          title: `${comments.length} New Comment${comments.length === 1 ? '' : 's'}`,
          body: `${comments.length} member${comments.length === 1 ? ' has' : 's have'} replied to your reflection.`,
          timestamp: comments[0].created_at, read: rd.has(`cc-${comments.length}`),
        });
      } catch {}
    }

    const all = [...community, ...local]
      .filter(n => !dis.has(n.id))
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

    setNotifs(all);
    setLoading(false);
    onUnreadChange?.(all.filter(n => !n.read).length);
  }, [highlighted, notes, authUser, onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback((id: string) => {
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onUnreadChange?.(next.filter(n => !n.read).length);
      return next;
    });
    try {
      const arr: string[] = JSON.parse(localStorage.getItem('trace-notifs-read') || '[]');
      if (!arr.includes(id)) localStorage.setItem('trace-notifs-read', JSON.stringify([...arr, id]));
    } catch {}
  }, [onUnreadChange]);

  const markAllRead = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange?.(0);
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('trace-notifs-read') || '[]');
      const merged = [...new Set([...existing, ...notifs.map(n => n.id)])];
      localStorage.setItem('trace-notifs-read', JSON.stringify(merged));
    } catch {}
  }, [notifs, onUnreadChange]);

  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    setDismissed(prev => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem('trace-notifs-dismissed', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const ids = notifs.map(n => n.id);
    setNotifs([]);
    setDismissed(prev => {
      const next = new Set([...prev, ...ids]);
      try { localStorage.setItem('trace-notifs-dismissed', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [notifs]);

  const filtered   = notifs.filter(n => matchFilter(n, filter));
  const unread     = notifs.filter(n => !n.read).length;
  const groups     = groupByDay(filtered);

  return (
    <div>
      {/* ── Title row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 20, borderRadius: 2, background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
          <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Notifications
          </span>
          {unread > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
              background: accentColor, color: '#000',
            }}>
              {unread}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && (
            <button onClick={markAllRead} style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}25`,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Read all
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll} style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => {
          const active      = filter === f.id;
          const chipUnread  = f.id === 'all' ? 0 : notifs.filter(n => matchFilter(n, f.id) && !n.read).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
                textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer',
                background: active ? accentColor : 'rgba(255,255,255,0.07)',
                color:      active ? '#000'       : 'rgba(255,255,255,0.45)',
                border:     active ? 'none'        : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {f.label}
              {chipUnread > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 10,
                  background: active ? 'rgba(0,0,0,0.25)' : accentColor,
                  color: '#000',
                }}>
                  {chipUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }}>
          <div className="animate-spin" style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${accentColor}33`, borderTopColor: accentColor,
          }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Loading
          </span>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, fontSize: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accentColor}10`, border: `1px solid ${accentColor}20`,
          }}>
            🔔
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            {filter === 'all' ? 'All caught up' : `No ${filter} yet`}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif', maxWidth: 240, lineHeight: 1.6 }}>
            {filter === 'all'
              ? 'Keep reading and praying — activity appears here.'
              : 'Nothing here yet. Keep engaging with the Word.'}
          </p>
        </div>
      )}

      {/* ── Groups ──────────────────────────────────────────────────────────── */}
      {!loading && groups.map(group => (
        <div key={group.label} style={{ marginBottom: 20 }}>
          {/* Day divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)' }}>
              {group.label}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map(n => (
              <NotifCard
                key={n.id}
                n={n}
                accent={accentColor}
                onRead={markRead}
                onDismiss={dismiss}
                onAction={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      {!loading && notifs.length > 0 && (
        <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.1)', fontFamily: 'Georgia, serif' }}>
          Based on your local activity{authUser ? ' and community interactions' : ''}.
        </p>
      )}
    </div>
  );
}
