'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_message'
  | 'group_joined'
  | 'group_join_request'
  | 'prayer_request'
  | 'mention'
  | 'milestone';

interface Notification {
  id: string;
  type: NotifType | string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accentColor: string;
  userId: string;
  onUnreadCount?: (count: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIcon(type: string): string {
  switch (type) {
    case 'friend_request':    return '👥';
    case 'friend_accepted':   return '✅';
    case 'group_message':     return '💬';
    case 'group_joined':      return '🎉';
    case 'group_join_request':return '🔔';
    case 'prayer_request':    return '🙏';
    case 'mention':           return '@';
    case 'milestone':         return '🏆';
    default:                  return '🔔';
  }
}

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

// ── useUnreadCount hook ───────────────────────────────────────────────────────

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

// ── NotificationCard ──────────────────────────────────────────────────────────

function NotificationCard({
  notif,
  accentColor,
  onMarkRead,
}: {
  notif: Notification;
  accentColor: string;
  onMarkRead: (id: string) => void;
}) {
  const icon = getIcon(notif.type);
  const isAt = notif.type === 'mention';

  return (
    <div
      onClick={() => { if (!notif.read) onMarkRead(notif.id); }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        cursor: notif.read ? 'default' : 'pointer',
        background: notif.read
          ? 'rgba(255,255,255,0.02)'
          : `${accentColor}15`,
        border: `1px solid ${notif.read ? 'rgba(255,255,255,0.06)' : accentColor + '20'}`,
        transition: 'background 0.2s',
      }}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 12,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accentColor,
          flexShrink: 0,
        }} />
      )}

      {/* Icon circle */}
      <div style={{
        flexShrink: 0,
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${accentColor}20`,
        fontSize: isAt ? 15 : 17,
        fontWeight: isAt ? 800 : 400,
        color: isAt ? accentColor : undefined,
        fontFamily: isAt ? 'Montserrat, system-ui, sans-serif' : undefined,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: notif.read ? 0 : 14 }}>
        <p style={{
          margin: 0,
          color: '#e8f0ec',
          fontFamily: 'Montserrat, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.35,
        }}>
          {notif.title}
        </p>

        {notif.body && (
          <p style={{
            margin: '4px 0 0',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontFamily: 'Georgia, serif',
            lineHeight: 1.5,
          }}>
            {notif.body}
          </p>
        )}

        <p style={{
          margin: '6px 0 0',
          color: 'rgba(255,255,255,0.25)',
          fontSize: 11,
          fontFamily: 'Montserrat, system-ui, sans-serif',
        }}>
          {timeAgo(notif.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── NotificationCenter ────────────────────────────────────────────────────────

export default function NotificationCenter({
  open,
  onClose,
  accentColor,
  userId,
  onUnreadCount,
}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(false);
  const [filter, setFilter]               = useState<'all' | 'unread'>('all');
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const sb = createClient();
    if (!sb) { setLoading(false); return; }

    const { data, error } = await sb
      .from('trace_notifications')
      .select('id, type, title, body, data, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      const unread = (data as Notification[]).filter(n => !n.read).length;
      onUnreadCount?.(unread);
    }
    setLoading(false);
  }, [userId, onUnreadCount]);

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const sb = createClient();
    if (!sb) return;

    const channel = sb
      .channel(`notifications-panel-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trace_notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const incoming = payload.new as Notification;
          setNotifications(prev => {
            const next = [incoming, ...prev].slice(0, 50);
            const unread = next.filter(n => !n.read).length;
            onUnreadCount?.(unread);
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { sb.removeChannel(channel); };
  }, [userId, fetchNotifications, onUnreadCount]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ── Mark read ────────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onUnreadCount?.(next.filter(n => !n.read).length);
      return next;
    });

    try {
      await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  }, [onUnreadCount]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadCount?.(0);

    try {
      await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId }),
      });
    } catch {}
  }, [userId, onUnreadCount]);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 900,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 360,
          background: '#060a08',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: '#e8f0ec',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}>
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 20,
                  background: accentColor,
                  color: '#000',
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                }}>
                  {unreadCount}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '5px 10px',
                    borderRadius: 8,
                    color: accentColor,
                    background: `${accentColor}14`,
                    border: `1px solid ${accentColor}25`,
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Mark all read
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 14px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                  background: filter === f ? accentColor : 'rgba(255,255,255,0.07)',
                  color:      filter === f ? '#000'       : 'rgba(255,255,255,0.4)',
                  border:     filter === f ? 'none'        : '1px solid rgba(255,255,255,0.1)',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ────────────────────────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {/* Loading */}
          {loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 0',
              gap: 12,
            }}>
              <div
                className="animate-spin"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `2px solid ${accentColor}33`,
                  borderTopColor: accentColor,
                }}
              />
              <span style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontFamily: 'Montserrat, system-ui, sans-serif',
              }}>
                Loading
              </span>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '64px 24px',
              gap: 14,
              textAlign: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                fontSize: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${accentColor}10`,
                border: `1px solid ${accentColor}20`,
              }}>
                🔔
              </div>
              <p style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                fontFamily: 'Montserrat, system-ui, sans-serif',
              }}>
                {filter === 'unread' ? 'No unread notifications' : "You're all caught up"}
              </p>
              <p style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Georgia, serif',
                lineHeight: 1.6,
                maxWidth: 240,
              }}>
                {filter === 'unread'
                  ? 'All notifications have been read.'
                  : 'Activity from friends, groups, and mentions will appear here.'}
              </p>
            </div>
          )}

          {/* Cards */}
          {!loading && filtered.map(notif => (
            <NotificationCard
              key={notif.id}
              notif={notif}
              accentColor={accentColor}
              onMarkRead={markRead}
            />
          ))}
        </div>
      </div>
    </>
  );
}
