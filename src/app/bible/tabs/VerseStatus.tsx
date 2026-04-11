'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VerseStatusData {
  verseRef: string;
  verseText: string;
  updatedAt: string;
}

interface Props {
  profileId: string;
  accentColor: string;
  isOwn?: boolean;
}

function daysAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function VerseStatus({ profileId, accentColor, isOwn = false }: Props) {
  const [status, setStatus] = useState<VerseStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftRef, setDraftRef] = useState('');
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    async function load() {
      const db = createClient();
      const { data } = await db
        .from('trace_profiles')
        .select('verse_status')
        .eq('id', profileId)
        .single();

      const raw = (data as any)?.verse_status;
      if (raw && typeof raw === 'object' && raw.verseRef) {
        setStatus(raw as VerseStatusData);
      } else {
        setStatus(null);
      }
      setLoading(false);
    }
    load();
  }, [profileId]);

  function openEdit() {
    setDraftRef(status?.verseRef ?? '');
    setDraftText(status?.verseText ?? '');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveStatus() {
    if (!draftRef.trim() || !draftText.trim()) return;
    setSaving(true);

    const db = createClient();
    const newStatus: VerseStatusData = {
      verseRef: draftRef.trim(),
      verseText: draftText.trim(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await db
      .from('trace_profiles')
      .update({ verse_status: newStatus })
      .eq('id', profileId);

    if (!error) {
      setStatus(newStatus);
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return null;

  // Empty state — other user
  if (!status && !isOwn) return null;

  // Empty state — own profile
  if (!status && isOwn && !editing) {
    return (
      <button
        onClick={openEdit}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: `1.5px dashed ${accentColor}40`,
          borderRadius: 12,
          color: accentColor,
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        ✦ Set your verse status
      </button>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: accentColor + '08',
    border: `1px solid ${accentColor}20`,
    borderRadius: 12,
    padding: '12px 14px',
    borderLeft: `3px solid ${accentColor}`,
  };

  // Inline edit form
  if (isOwn && editing) {
    return (
      <div style={cardStyle}>
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Verse Reference
          </label>
          <input
            type="text"
            value={draftRef}
            onChange={(e) => setDraftRef(e.target.value)}
            placeholder="e.g. John 3:16"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '7px 10px',
              borderRadius: 8,
              border: `1px solid ${accentColor}30`,
              background: accentColor + '0a',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 13,
              color: '#1a1a1a',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Verse Text
          </label>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Paste or type the verse text…"
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '7px 10px',
              borderRadius: 8,
              border: `1px solid ${accentColor}30`,
              background: accentColor + '0a',
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: '#1a1a1a',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={saveStatus}
            disabled={saving || !draftRef.trim() || !draftText.trim()}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: 'none',
              background: accentColor,
              color: '#fff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving || !draftRef.trim() || !draftText.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancelEdit}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1px solid ${accentColor}30`,
              background: 'transparent',
              color: accentColor,
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Display card (status exists)
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            color: accentColor,
          }}
        >
          {status!.verseRef}
        </span>
        {isOwn && (
          <button
            onClick={openEdit}
            style={{
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 0 0 8px',
              opacity: 0.7,
            }}
          >
            Edit
          </button>
        )}
      </div>
      <p
        style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13,
          color: '#555',
          margin: '0 0 6px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {status!.verseText}
      </p>
      <span
        style={{
          fontSize: 10,
          color: '#999',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        Updated {daysAgo(status!.updatedAt)}
      </span>
    </div>
  );
}
