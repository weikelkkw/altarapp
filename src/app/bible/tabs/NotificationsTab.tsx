'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = 'achievement' | 'community' | 'verse' | 'prayer' | 'system' | 'milestone';
type FilterId = 'all' | 'community' | 'achievements' | 'reminders';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: string; // ISO
  read: boolean;
  icon: string;
  accent?: string;
  action?: { label: string; tab?: string };
}

interface Props {
  accentColor: string;
  authUser: { id: string } | null;
  highlighted: Set<string>;
  notes: Record<string, string>;
  onNavigate?: (tab: string) => void;
  onUnreadChange?: (count: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDay(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Notification[]> = {};
  for (const n of notifs) {
    const day = new Date(n.timestamp).toDateString();
    const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : new Date(n.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

const TYPE_COLORS: Record<NotifType, string> = {
  achievement: '#f59e0b',
  community:   '#60a5fa',
  verse:       '#a78bfa',
  prayer:      '#34d399',
  system:      '#94a3b8',
  milestone:   '#f472b6',
};

// ── Notification generators ────────────────────────────────────────────────────

function buildLocalNotifications(
  highlighted: Set<string>,
  notes: Record<string, string>,
): Notification[] {
  const notifs: Notification[] = [];
  const now = new Date();

  // ── Reading streak ──────────────────────────────────────────────────────────
  try {
    const streakRaw = localStorage.getItem('trace-streak');
    const streak = streakRaw ? parseInt(streakRaw) : 0;
    if (streak >= 3) {
      notifs.push({
        id: 'streak-notif',
        type: 'achievement',
        title: `${streak}-Day Reading Streak!`,
        body: `You've opened the Word ${streak} days in a row. Keep going — consistency transforms a life.`,
        timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
        read: false,
        icon: '🔥',
      });
    }
  } catch {}

  // ── Highlights milestone ────────────────────────────────────────────────────
  const hCount = highlighted.size;
  const milestones = [1, 5, 10, 25, 50, 100, 250];
  const reached = [...milestones].reverse().find(m => hCount >= m);
  if (reached) {
    notifs.push({
      id: `highlight-milestone-${reached}`,
      type: 'milestone',
      title: `${hCount} Verse${hCount === 1 ? '' : 's'} Highlighted`,
      body: reached >= 50
        ? `Over ${reached} verses marked — you are building a living concordance in your heart.`
        : reached >= 10
        ? `${reached}+ highlights and counting. Scripture is taking root in you.`
        : `Your first highlighted verses. The Word is becoming personal.`,
      timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
      read: false,
      icon: '✨',
    });
  }

  // ── Notes milestone ─────────────────────────────────────────────────────────
  const noteCount = Object.values(notes).filter(v => v?.trim()).length;
  if (noteCount >= 1) {
    const noteLabel = noteCount >= 20 ? '20+' : noteCount >= 10 ? '10+' : noteCount >= 5 ? '5' : '1';
    notifs.push({
      id: `notes-milestone-${noteLabel}`,
      type: 'milestone',
      title: `${noteCount} Study Note${noteCount === 1 ? '' : 's'} Written`,
      body: noteCount >= 10
        ? `You have written ${noteCount} notes — your commentary on the Word is taking shape.`
        : `Every note you write deepens what you've read. Keep journaling your insights.`,
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      read: true,
      icon: '📝',
    });
  }

  // ── Daily verse ready ───────────────────────────────────────────────────────
  try {
    const today = new Date().toDateString();
    const hasDailyVerse = !!localStorage.getItem(`trace-daily-verse-${today}`);
    if (hasDailyVerse) {
      notifs.push({
        id: 'daily-verse-ready',
        type: 'verse',
        title: 'Your Word for Today is Ready',
        body: 'A personalized verse has been selected for you. Open the Home tab to receive it.',
        timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6).toISOString(),
        read: false,
        icon: '📖',
        action: { label: 'Go to Home', tab: 'home' },
      });
    }
  } catch {}

  // ── Prayer reminders ────────────────────────────────────────────────────────
  try {
    const prayerRaw = localStorage.getItem('trace-prayers');
    if (prayerRaw) {
      const prayers: { id: string; text: string; status: string; createdAt: string }[] = JSON.parse(prayerRaw);
      const active = prayers.filter(p => p.status === 'active' || p.status === 'ongoing');
      if (active.length > 0) {
        const oldest = active.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        const daysSince = Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / 86400000);
        notifs.push({
          id: `prayer-reminder-${oldest.id}`,
          type: 'prayer',
          title: `${active.length} Prayer${active.length === 1 ? '' : 's'} Waiting`,
          body: daysSince >= 1
            ? `You have ${active.length} active prayer${active.length === 1 ? '' : 's'}. The oldest has been lifted ${daysSince} day${daysSince === 1 ? '' : 's'} — God has not forgotten.`
            : `Your prayer list is active. Keep bringing these needs before the Lord.`,
          timestamp: new Date(now.getTime() - 4 * 3600000).toISOString(),
          read: false,
          icon: '🙏',
          action: { label: 'View Prayers', tab: 'home' },
        });
      }
      const answered = prayers.filter(p => p.status === 'answered');
      if (answered.length >= 1) {
        notifs.push({
          id: `answered-prayers-${answered.length}`,
          type: 'achievement',
          title: `${answered.length} Answered Prayer${answered.length === 1 ? '' : 's'}`,
          body: `Faithfulness recorded. ${answered.length} prayer${answered.length === 1 ? ' has' : 's have'} been answered. He hears every word.`,
          timestamp: new Date(now.getTime() - 6 * 3600000).toISOString(),
          read: true,
          icon: '✝️',
        });
      }
    }
  } catch {}

  // ── Reading plans ───────────────────────────────────────────────────────────
  try {
    const plansRaw = localStorage.getItem('trace-reading-plans');
    if (plansRaw) {
      const plans: { id: string; title: string; progress: number; total: number }[] = JSON.parse(plansRaw);
      const active = plans.filter(p => p.progress < p.total);
      if (active.length > 0) {
        const plan = active[0];
        const pct = Math.round((plan.progress / plan.total) * 100);
        notifs.push({
          id: `reading-plan-${plan.id}`,
          type: 'system',
          title: `Reading Plan: ${plan.title}`,
          body: `${pct}% complete — ${plan.total - plan.progress} day${plan.total - plan.progress === 1 ? '' : 's'} remaining. Stay the course.`,
          timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(),
          read: true,
          icon: '📅',
          action: { label: 'Continue Plan', tab: 'study' },
        });
      }
    }
  } catch {}

  // ── Onboarding tip (first-time) ─────────────────────────────────────────────
  try {
    const onboarded = !!localStorage.getItem('trace-onboarding-done');
    if (onboarded && hCount === 0 && noteCount === 0) {
      notifs.push({
        id: 'tip-highlights',
        type: 'system',
        title: 'Tip: Highlight Verses as You Read',
        body: 'Long-press or tap the highlight icon next to any verse in the Read tab to mark it. Your highlights are saved and tracked.',
        timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(),
        read: false,
        icon: '💡',
        action: { label: 'Start Reading', tab: 'read' },
      });
    }
  } catch {}

  return notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── Filter config ─────────────────────────────────────────────────────────────

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',          label: 'All'          },
  { id: 'community',    label: 'Community'    },
  { id: 'achievements', label: 'Achievements' },
  { id: 'reminders',    label: 'Reminders'    },
];

function applyFilter(notifs: Notification[], filter: FilterId): Notification[] {
  if (filter === 'all') return notifs;
  if (filter === 'community') return notifs.filter(n => n.type === 'community');
  if (filter === 'achievements') return notifs.filter(n => n.type === 'achievement' || n.type === 'milestone');
  if (filter === 'reminders') return notifs.filter(n => n.type === 'prayer' || n.type === 'system' || n.type === 'verse');
  return notifs;
}

// ── Notification card ──────────────────────────────────────────────────────────

function NotifCard({
  notif,
  accentColor,
  onRead,
  onDismiss,
  onAction,
}: {
  notif: Notification;
  accentColor: string;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction?: (tab: string) => void;
}) {
  const color = notif.accent || TYPE_COLORS[notif.type] || accentColor;

  return (
    <div
      onClick={() => onRead(notif.id)}
      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: notif.read
          ? 'rgba(255,255,255,0.03)'
          : `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.04) 100%)`,
        border: `1px solid ${notif.read ? 'rgba(255,255,255,0.06)' : color + '28'}`,
        boxShadow: notif.read ? 'none' : `0 2px 20px ${color}10`,
      }}
    >
      {/* Unread indicator */}
      {!notif.read && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}44)` }}
        />
      )}

      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon bubble */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}25`,
            boxShadow: notif.read ? 'none' : `0 0 12px ${color}20`,
          }}
        >
          {notif.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-[13px] font-bold leading-snug"
              style={{ color: notif.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)', fontFamily: 'Montserrat, system-ui, sans-serif' }}
            >
              {notif.title}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
              {!notif.read && (
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              )}
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {timeAgo(notif.timestamp)}
              </span>
            </div>
          </div>

          <p
            className="text-[12px] leading-relaxed mt-1"
            style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'Georgia, serif' }}
          >
            {notif.body}
          </p>

          {notif.action && (
            <button
              onClick={e => { e.stopPropagation(); onAction?.(notif.action!.tab || 'home'); }}
              className="mt-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-all"
              style={{
                color,
                background: `${color}14`,
                border: `1px solid ${color}25`,
              }}
            >
              {notif.action.label} →
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-opacity opacity-0 group-hover:opacity-100 mt-0.5"
          style={{ color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotificationsTab({ accentColor, authUser, highlighted, notes, onNavigate, onUnreadChange }: Props) {
  const [filter, setFilter] = useState<FilterId>('all');
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ── Load notifications ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);

    // Dismissed set from localStorage
    let dismissedSet = new Set<string>();
    try {
      const raw = localStorage.getItem('trace-notifs-dismissed');
      if (raw) dismissedSet = new Set(JSON.parse(raw));
    } catch {}
    setDismissed(dismissedSet);

    // Read set from localStorage
    let readSet = new Set<string>();
    try {
      const raw = localStorage.getItem('trace-notifs-read');
      if (raw) readSet = new Set(JSON.parse(raw));
    } catch {}

    // Build local notifications
    const local = buildLocalNotifications(highlighted, notes).map(n => ({
      ...n,
      read: readSet.has(n.id) ? true : n.read,
    }));

    // Community notifications from Supabase (if signed in)
    const community: Notification[] = [];
    if (authUser) {
      try {
        const supabase = createClient();
        // Fetch likes on the user's posts
        const { data: likes } = await supabase
          .from('trace_post_likes')
          .select('post_id, created_at, user_id')
          .neq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (likes && likes.length > 0) {
          community.push({
            id: `community-likes-${likes.length}`,
            type: 'community',
            title: `${likes.length} Reaction${likes.length === 1 ? '' : 's'} on Your Posts`,
            body: `Your community reflections are resonating. ${likes.length} member${likes.length === 1 ? ' has' : 's have'} responded to your words.`,
            timestamp: likes[0].created_at,
            read: readSet.has(`community-likes-${likes.length}`),
            icon: '❤️',
            accent: '#f472b6',
          });
        }

        // Fetch comments on user's posts
        const { data: comments } = await supabase
          .from('trace_comments')
          .select('id, content, created_at, user_id')
          .neq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (comments && comments.length > 0) {
          community.push({
            id: `community-comments-${comments.length}`,
            type: 'community',
            title: `New Comment${comments.length === 1 ? '' : 's'} on Your Posts`,
            body: `${comments.length} member${comments.length === 1 ? ' has' : 's have'} replied to your reflection. The conversation continues.`,
            timestamp: comments[0].created_at,
            read: readSet.has(`community-comments-${comments.length}`),
            icon: '💬',
            accent: '#60a5fa',
          });
        }
      } catch {
        // Network or permission error — silently skip community notifs
      }
    }

    const all = [...community, ...local]
      .filter(n => !dismissedSet.has(n.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setNotifs(all);
    setLoading(false);
    onUnreadChange?.(all.filter(n => !n.read).length);
  }, [highlighted, notes, authUser, onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  // ── Mark as read ────────────────────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onUnreadChange?.(next.filter(n => !n.read).length);
      return next;
    });
    try {
      const raw = localStorage.getItem('trace-notifs-read');
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (!set.includes(id)) {
        set.push(id);
        localStorage.setItem('trace-notifs-read', JSON.stringify(set));
      }
    } catch {}
  }, [onUnreadChange]);

  const markAllRead = useCallback(() => {
    const ids = notifs.map(n => n.id);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange?.(0);
    try {
      const raw = localStorage.getItem('trace-notifs-read');
      const set: string[] = raw ? JSON.parse(raw) : [];
      const merged = [...new Set([...set, ...ids])];
      localStorage.setItem('trace-notifs-read', JSON.stringify(merged));
    } catch {}
  }, [notifs, onUnreadChange]);

  // ── Dismiss ─────────────────────────────────────────────────────────────────
  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = applyFilter(notifs, filter);
  const unreadCount = notifs.filter(n => !n.read).length;
  const groups = groupByDay(filtered);

  return (
    <div className="space-y-4">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
          <span className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: accentColor, color: '#000', minWidth: 20, textAlign: 'center' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all"
              style={{ color: accentColor, background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}
            >
              Mark all read
            </button>
          )}
          {notifs.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
              style={active
                ? { background: accentColor, color: '#000' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {f.label}
              {f.id !== 'all' && (() => {
                const count = applyFilter(notifs, f.id).filter(n => !n.read).length;
                return count > 0 ? (
                  <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full"
                    style={{ background: active ? 'rgba(0,0,0,0.25)' : accentColor, color: active ? '#000' : '#000' }}>
                    {count}
                  </span>
                ) : null;
              })()}
            </button>
          );
        })}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accentColor}44`, borderTopColor: accentColor }} />
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Loading</p>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-14 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}
          >
            🔔
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
              {filter === 'all' ? 'All caught up' : `No ${filter} notifications`}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif' }}>
              {filter === 'all'
                ? 'Keep reading, praying, and highlighting — your activity will appear here.'
                : 'Nothing here yet. Keep engaging with the Word.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Grouped notifications ───────────────────────────────────────────── */}
      {!loading && groups.map(group => (
        <div key={group.label} className="space-y-2">
          {/* Day label */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {group.label}
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Cards */}
          <div className="group space-y-2">
            {group.items.map(notif => (
              <NotifCard
                key={notif.id}
                notif={notif}
                accentColor={accentColor}
                onRead={markRead}
                onDismiss={dismiss}
                onAction={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      {!loading && notifs.length > 0 && (
        <p className="text-center text-[10px] pb-2" style={{ color: 'rgba(255,255,255,0.12)', fontFamily: 'Georgia, serif' }}>
          Notifications are generated from your local activity and, when signed in, from community interactions.
        </p>
      )}

    </div>
  );
}
