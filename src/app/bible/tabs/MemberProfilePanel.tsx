'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  member: {
    userId: string;
    name: string;
    color: string;
    role: 'leader' | 'member';
    joinedAt: string;
  };
  groupName: string;
  accentColor: string;
  onClose: () => void;
}

interface Highlight {
  book_name: string;
  chapter: number;
  verse: number;
  color: string;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MemberProfilePanel({ member, groupName, onClose }: Props) {
  const [highlightCount, setHighlightCount] = useState<number>(0);
  const [recentHighlights, setRecentHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const joinedDaysAgo = Math.floor(
    (Date.now() - new Date(member.joinedAt).getTime()) / 86400000
  );

  useEffect(() => {
    // Trigger slide-in animation after mount
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch highlight count
      try {
        const { count } = await supabase
          .from('trace_highlights')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.userId);
        setHighlightCount(count ?? 0);
      } catch {
        setHighlightCount(0);
      }

      // Fetch recent highlights
      try {
        const { data } = await supabase
          .from('trace_highlights')
          .select('book_name, chapter, verse, color')
          .eq('user_id', member.userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          setRecentHighlights(
            data.map((row) => ({
              book_name: (row as { book_name: string }).book_name,
              chapter: (row as { chapter: number }).chapter,
              verse: (row as { verse: number }).verse,
              color: (row as { color: string }).color,
            }))
          );
        }
      } catch {
        setRecentHighlights([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [member.userId]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const milestones = [
    {
      icon: '✝',
      label: 'Joined the group',
      earned: true,
    },
    {
      icon: '📖',
      label: 'First week',
      earned: joinedDaysAgo >= 7,
    },
    {
      icon: '🔥',
      label: 'Faithful reader',
      earned: false,
    },
    {
      icon: '🏆',
      label: 'Quiz champion',
      earned: false,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s ease',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'rgba(6,10,8,0.98)',
          borderRadius: '20px 20px 0 0',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${member.color}cc 0%, ${member.color}66 60%, ${member.color}22 100%)`,
            padding: '24px 20px 28px',
            position: 'relative',
            borderRadius: '20px 20px 0 0',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Avatar */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: member.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
              marginBottom: 12,
              boxShadow: `0 0 0 3px rgba(255,255,255,0.2)`,
            }}
          >
            {getInitials(member.name)}
          </div>

          {/* Name */}
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
              marginBottom: 6,
            }}
          >
            {member.name}
          </div>

          {/* Role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                background: member.role === 'leader' ? member.color : 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: 20,
                border: `1px solid ${member.role === 'leader' ? member.color : 'rgba(255,255,255,0.25)'}`,
              }}
            >
              {member.role === 'leader' ? 'Leader' : 'Member'}
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Joined {groupName} · {timeAgo(member.joinedAt)}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Reading Activity Card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${member.color}18`,
              borderRadius: 14,
              padding: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: member.color,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Reading Activity
            </div>

            {loading ? (
              <SkeletonRows count={3} color={member.color} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <StatRow
                  label="Reading streak"
                  value="Active reader"
                  icon="🔥"
                  color={member.color}
                />
                <StatRow
                  label="Last active"
                  value={timeAgo(member.joinedAt)}
                  icon="🕐"
                  color={member.color}
                />
                <StatRow
                  label="Verses highlighted"
                  value={String(highlightCount)}
                  icon="✨"
                  color={member.color}
                />
              </div>
            )}
          </div>

          {/* Milestones / Badges */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${member.color}18`,
              borderRadius: 14,
              padding: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: member.color,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Milestones
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {milestones.map((m) => (
                <span
                  key={m.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    background: m.earned ? `${member.color}28` : 'rgba(255,255,255,0.04)',
                    color: m.earned ? '#fff' : 'rgba(255,255,255,0.3)',
                    border: m.earned
                      ? `1px solid ${member.color}55`
                      : '1px solid rgba(255,255,255,0.08)',
                    opacity: m.earned ? 1 : 0.6,
                  }}
                >
                  {m.icon} {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Highlights */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${member.color}18`,
              borderRadius: 14,
              padding: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: member.color,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Recent Highlights
            </div>

            {loading ? (
              <SkeletonRows count={3} color={member.color} />
            ) : recentHighlights.length === 0 ? (
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.35)',
                  textAlign: 'center',
                  padding: '12px 0',
                }}
              >
                No highlights yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentHighlights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: h.color || member.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      {h.book_name} {h.chapter}:{h.verse}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prayer Activity */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${member.color}18`,
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🙏</span>
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Praying for this group
            </span>
          </div>

          {/* Bottom safe area spacer */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          color: color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SkeletonRows({ count, color }: { count: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 16,
            borderRadius: 8,
            background: `${color}18`,
            width: i % 2 === 0 ? '70%' : '50%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}
