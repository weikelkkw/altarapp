'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Constants ─────────────────────────────────────────────── */

const REACTION_EMOJIS = ['❤️', '🙏', '🔥', '✝️', '👏'] as const;

/* ─── Types ─────────────────────────────────────────────────── */

interface ReactionGroup {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface Props {
  messageId: string;
  profileId: string; // current user's trace_profiles.id
  accentColor: string;
}

/* ─── Component ─────────────────────────────────────────────── */

export default function GroupReactions({ messageId, profileId, accentColor }: Props) {
  const [reactions, setReactions] = useState<ReactionGroup[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch reactions ─────────────────────────────────────── */

  const fetchReactions = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('trace_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (error) {
      console.warn('GroupReactions fetch error:', error);
      setLoading(false);
      return;
    }

    // Aggregate by emoji
    const grouped: Record<string, { count: number; reacted: boolean }> = {};
    for (const row of data || []) {
      if (!grouped[row.emoji]) {
        grouped[row.emoji] = { count: 0, reacted: false };
      }
      grouped[row.emoji].count += 1;
      if (row.user_id === profileId) {
        grouped[row.emoji].reacted = true;
      }
    }

    // Preserve canonical emoji order — only show emojis that have at least 1 reaction
    const ordered: ReactionGroup[] = REACTION_EMOJIS
      .filter(e => grouped[e])
      .map(e => ({ emoji: e, count: grouped[e].count, reacted: grouped[e].reacted }));

    setReactions(ordered);
    setLoading(false);
  }, [messageId, profileId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  /* ── Close picker on outside click ──────────────────────── */

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  /* ── Toggle reaction ─────────────────────────────────────── */

  const toggleReaction = async (emoji: string) => {
    const supabase = createClient();
    if (!supabase || !profileId) return;

    const existing = reactions.find(r => r.emoji === emoji);
    const alreadyReacted = existing?.reacted ?? false;

    // Optimistic update
    setReactions(prev => {
      if (alreadyReacted) {
        // Decrement / remove pill
        return prev
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
          .filter(r => r.count > 0);
      } else {
        // Increment or add new pill
        const exists = prev.find(r => r.emoji === emoji);
        if (exists) {
          return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r);
        }
        // Insert in canonical order
        const next = [...prev, { emoji, count: 1, reacted: true }];
        return REACTION_EMOJIS
          .filter(e => next.find(r => r.emoji === e))
          .map(e => next.find(r => r.emoji === e)!);
      }
    });

    setPickerOpen(false);

    try {
      if (alreadyReacted) {
        await supabase
          .from('trace_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', profileId)
          .eq('emoji', emoji);
      } else {
        await supabase
          .from('trace_message_reactions')
          .insert({ message_id: messageId, user_id: profileId, emoji });
      }
    } catch (err) {
      console.error('GroupReactions toggle error:', err);
      // Revert on failure
      await fetchReactions();
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  if (loading) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {/* Reaction pills */}
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            borderRadius: 20,
            padding: '3px 8px',
            fontSize: 13,
            lineHeight: 1,
            cursor: 'pointer',
            border: r.reacted
              ? `1px solid ${accentColor}40`
              : '1px solid rgba(255,255,255,0.08)',
            background: r.reacted
              ? `${accentColor}22`
              : 'rgba(255,255,255,0.05)',
            color: r.reacted ? accentColor : 'rgba(232,240,236,0.7)',
            fontWeight: r.reacted ? 700 : 400,
            transition: 'all 0.15s ease',
          }}
          aria-label={`${r.emoji} ${r.count}`}
        >
          <span>{r.emoji}</span>
          <span style={{ fontSize: 11 }}>{r.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div style={{ position: 'relative' }} ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(prev => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            padding: '3px 7px',
            fontSize: 12,
            lineHeight: 1,
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
            background: pickerOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            color: 'rgba(232,240,236,0.4)',
            transition: 'all 0.15s ease',
          }}
          aria-label="Add reaction"
        >
          +
        </button>

        {/* Floating picker */}
        {pickerOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#0d1a14',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 30,
              padding: '6px 10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
            role="dialog"
            aria-label="Pick a reaction"
          >
            {REACTION_EMOJIS.map(emoji => {
              const alreadyReacted = reactions.find(r => r.emoji === emoji)?.reacted ?? false;
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  style={{
                    background: alreadyReacted ? `${accentColor}22` : 'transparent',
                    border: alreadyReacted ? `1px solid ${accentColor}40` : '1px solid transparent',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '4px 5px',
                    transition: 'transform 0.1s ease, background 0.15s ease',
                    transform: 'scale(1)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
