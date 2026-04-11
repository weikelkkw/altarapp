'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PinnedMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_color: string;
  sender_avatar?: string;
}

interface Props {
  groupId: string;
  accentColor: string;
  onClose: () => void;
  open: boolean;
}

export interface ReplyPreviewProps {
  replyToContent: string;
  replyToAuthor: string;
  accentColor: string;
  onClear: () => void;
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── ReplyPreview ──────────────────────────────────────────────────────────────

export function ReplyPreview({
  replyToContent,
  replyToAuthor,
  accentColor,
  onClear,
}: ReplyPreviewProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: accentColor + '10',
        borderLeft: '3px solid ' + accentColor,
        borderRadius: '0 8px 8px 0',
        padding: '8px 12px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: accentColor,
            fontFamily: 'Montserrat, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {replyToAuthor}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'Georgia, serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {replyToContent}
        </p>
      </div>

      <button
        onClick={onClear}
        aria-label="Clear reply"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── PinnedMessages ────────────────────────────────────────────────────────────

export default function PinnedMessages({
  groupId,
  accentColor,
  onClose,
  open,
}: Props) {
  const [messages, setMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unpinning, setUnpinning] = useState<Set<string>>(new Set());

  // ── Fetch pinned messages ──────────────────────────────────────────────────

  const fetchPinned = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    const sb = createClient();
    if (!sb) { setLoading(false); return; }

    try {
      const { data, error } = await sb
        .from('trace_group_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          trace_profiles!sender_id (
            display_name,
            avatar_color
          )
        `)
        .eq('group_id', groupId)
        .eq('pinned', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMessages(
          data.map((row: any) => {
            const profile = Array.isArray(row.trace_profiles)
              ? row.trace_profiles[0]
              : row.trace_profiles;
            return {
              id: row.id as string,
              content: row.content as string,
              created_at: row.created_at as string,
              sender_id: row.sender_id as string,
              sender_name: (profile?.display_name as string) ?? 'Member',
              sender_color: (profile?.avatar_color as string) ?? accentColor,
            };
          })
        );
      }
    } catch {
      // ignore
    }

    setLoading(false);
  }, [groupId, accentColor]);

  useEffect(() => {
    if (open) fetchPinned();
  }, [open, fetchPinned]);

  // ── Unpin ──────────────────────────────────────────────────────────────────

  const handleUnpin = async (messageId: string) => {
    setUnpinning((prev) => new Set(prev).add(messageId));

    try {
      const sb = createClient();
      if (sb) {
        await sb
          .from('trace_group_messages')
          .update({ pinned: false })
          .eq('id', messageId);
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      // ignore
    }

    setUnpinning((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  // ── Close animation ────────────────────────────────────────────────────────

  const handleClose = () => {
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 900,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 320ms ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80vh',
          background: '#060a08',
          borderRadius: '24px 24px 0 0',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            margin: '12px auto 0',
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📌</span>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: '#e8f0ec',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Pinned Messages
            </h2>
            {messages.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 20,
                  background: accentColor,
                  color: '#000',
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                }}
              >
                {messages.length}
              </span>
            )}
          </div>

          <button
            onClick={handleClose}
            aria-label="Close pinned messages"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {loading && (
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 14,
                fontFamily: 'Montserrat, system-ui, sans-serif',
                paddingTop: 32,
              }}
            >
              Loading…
            </p>
          )}

          {!loading && messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingTop: 48,
                paddingBottom: 24,
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.35 }}>📌</span>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 14,
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                }}
              >
                No pinned messages yet
              </p>
            </div>
          )}

          {!loading &&
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${accentColor}20`,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                {/* Sender row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: msg.sender_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#000',
                        fontFamily: 'Montserrat, system-ui, sans-serif',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(msg.sender_name)}
                    </div>

                    {/* Name + time */}
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#e8f0ec',
                          fontFamily: 'Montserrat, system-ui, sans-serif',
                          lineHeight: 1.2,
                        }}
                      >
                        {msg.sender_name}
                      </p>
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.3)',
                          fontFamily: 'Montserrat, system-ui, sans-serif',
                        }}
                      >
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Unpin button */}
                  <button
                    onClick={() => handleUnpin(msg.id)}
                    disabled={unpinning.has(msg.id)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 8,
                      color: unpinning.has(msg.id)
                        ? 'rgba(255,255,255,0.25)'
                        : accentColor,
                      background: unpinning.has(msg.id)
                        ? 'rgba(255,255,255,0.04)'
                        : `${accentColor}14`,
                      border: `1px solid ${accentColor}20`,
                      cursor: unpinning.has(msg.id) ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat, system-ui, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {unpinning.has(msg.id) ? 'Unpinning…' : 'Unpin'}
                  </button>
                </div>

                {/* Message content */}
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.82)',
                    fontFamily: 'Georgia, serif',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
