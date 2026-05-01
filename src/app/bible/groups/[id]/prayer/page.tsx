'use client';

import { use, useEffect, useState } from 'react';
import { tokens } from '../../lib/theme';
import { prayerApi, PrayerRequest } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

interface Props {
  params: Promise<{ id: string }>;
}

const FILTERS: { id: 'open' | 'praise' | 'archived' | 'all'; label: string }[] = [
  { id: 'open',     label: 'Open' },
  { id: 'praise',   label: 'Praise' },
  { id: 'archived', label: 'Archive' },
  { id: 'all',      label: 'All' },
];

export default function PrayerPage({ params }: Props) {
  const { id } = use(params);
  const [filter, setFilter] = useState<'open' | 'praise' | 'archived' | 'all'>('open');
  const [items, setItems] = useState<PrayerRequest[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  function refresh() {
    setItems(null);
    prayerApi.list(id, filter)
      .then(setItems)
      .catch(() => setItems([]));
  }
  useEffect(refresh, [id, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPray(reqId: string) {
    setItems(prev => prev ? prev.map(p => p.id === reqId ? { ...p, pray_count: p.pray_count + 1 } : p) : prev);
    try {
      const out = await prayerApi.pray(id, reqId);
      setItems(prev => prev ? prev.map(p => p.id === reqId ? { ...p, pray_count: out.pray_count } : p) : prev);
    } catch {
      // Roll back optimistic bump.
      setItems(prev => prev ? prev.map(p => p.id === reqId ? { ...p, pray_count: Math.max(0, p.pray_count - 1) } : p) : prev);
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto',
      }}>
        {FILTERS.map(f => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 14px',
                background: active ? tokens.gold : tokens.bgPanel,
                color: active ? '#0a0806' : tokens.textMuted,
                border: `1px solid ${active ? tokens.gold : tokens.border}`,
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {items === null && <Skeleton height={92} radius={14} count={3} />}

      {items && items.length === 0 && (
        <EmptyState
          title={filter === 'open' ? 'No prayer requests yet' : `No ${filter} requests`}
          body={filter === 'open' ? 'Be the first. The wall is a quiet place to carry one another\u2019s burdens.' : undefined}
          action={
            <button
              onClick={() => setComposerOpen(true)}
              style={{
                padding: '12px 20px', background: tokens.gold, color: '#0a0806',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Add a prayer
            </button>
          }
        />
      )}

      {items && items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {items.map(p => (
            <li key={p.id}>
              <PrayerCard p={p} onPray={() => onPray(p.id)} />
            </li>
          ))}
        </ul>
      )}

      {/* Floating action button */}
      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Add a prayer"
        style={{
          position: 'fixed',
          right: 20,
          bottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          width: 56, height: 56, borderRadius: 9999,
          background: tokens.gold, color: '#0a0806',
          border: 'none', cursor: 'pointer',
          fontSize: 28, fontWeight: 300,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 30,
        }}
      >
        +
      </button>

      {composerOpen && (
        <PrayerComposer
          groupId={id}
          onClose={() => setComposerOpen(false)}
          onCreated={r => {
            setItems(prev => prev ? [r, ...prev] : [r]);
            setComposerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PrayerCard({ p, onPray }: { p: PrayerRequest; onPray: () => void }) {
  const urgencyColor = p.urgency === 'urgent' ? tokens.danger
    : p.urgency === 'whisper' ? tokens.textFaint
    : tokens.textMuted;
  return (
    <article
      style={{
        padding: 14,
        background: tokens.bgPanel,
        border: `1px solid ${p.status === 'praise' ? tokens.praise + '55' : tokens.border}`,
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            {p.privacy_scope === 'anonymous' && <Chip>Anonymous</Chip>}
            {p.privacy_scope === 'leaders' && <Chip>Leaders only</Chip>}
            {p.privacy_scope === 'specific' && <Chip>Specific</Chip>}
            {p.category && <Chip>{p.category}</Chip>}
            {p.urgency !== 'standard' && (
              <span style={{ fontSize: 11, color: urgencyColor, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                {p.urgency}
              </span>
            )}
            {p.status === 'praise' && <Chip color={tokens.praise}>Praise report</Chip>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{p.title}</div>
          {p.body && (
            <div style={{ fontSize: 14, color: tokens.textMuted, marginTop: 6, lineHeight: 1.55 }}>{p.body}</div>
          )}
          {p.scripture_ref && (
            <div style={{ fontFamily: tokens.fontSerif, fontStyle: 'italic', fontSize: 13, color: tokens.gold, marginTop: 8 }}>
              {p.scripture_ref}
            </div>
          )}
          <div style={{ fontSize: 12, color: tokens.textFaint, marginTop: 10 }}>
            {timeAgo(p.created_at)}
          </div>
        </div>
        <button
          onClick={onPray}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '8px 12px',
            background: tokens.goldFaint,
            border: `1px solid ${tokens.goldSoft}`,
            borderRadius: 12,
            cursor: 'pointer',
            color: tokens.gold,
            minWidth: 56,
          }}
          aria-label="I prayed for this"
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>🙏</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{p.pray_count}</span>
        </button>
      </div>
    </article>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7,
      padding: '3px 8px', borderRadius: 9999,
      background: (color ?? tokens.gold) + '22',
      color: color ?? tokens.gold,
      border: `1px solid ${(color ?? tokens.gold)}44`,
    }}>{children}</span>
  );
}

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

// ─── Composer ───────────────────────────────────────────────────────────────
function PrayerComposer({
  groupId, onClose, onCreated,
}: {
  groupId: string;
  onClose: () => void;
  onCreated: (r: PrayerRequest) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState<'whisper' | 'standard' | 'urgent'>('standard');
  const [privacy, setPrivacy] = useState<'group' | 'leaders' | 'anonymous'>('group');
  const [scriptureRef, setScriptureRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (title.trim().length < 1) { setError('A title helps the group know how to pray.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const created = await prayerApi.create(groupId, {
        title: title.trim(),
        body: body.trim() || undefined,
        category: category.trim() || undefined,
        urgency,
        privacyScope: privacy,
        scriptureRef: scriptureRef.trim() || undefined,
      });
      onCreated(created);
    } catch (e: any) {
      setError(e.message ?? 'Failed to post');
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: tokens.bg,
          color: tokens.text,
          borderTop: `1px solid ${tokens.borderStrong}`,
          borderRadius: '20px 20px 0 0',
          padding: 18,
          paddingBottom: `calc(18px + env(safe-area-inset-bottom, 0px))`,
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 32, height: 4, background: tokens.borderStrong, borderRadius: 9999, margin: '0 auto 16px' }} />

        <h2 style={{ margin: 0, fontFamily: tokens.fontSerif, fontSize: 20, color: tokens.text }}>New prayer request</h2>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <input
            value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required
            placeholder="What are we praying for?"
            style={inputStyle}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)} maxLength={4000}
            placeholder="Optional context, prayer points, or how God is working."
            style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              value={category} onChange={e => setCategory(e.target.value)} maxLength={60}
              placeholder="Category (e.g. Healing)"
              style={inputStyle}
            />
            <input
              value={scriptureRef} onChange={e => setScriptureRef(e.target.value)} maxLength={100}
              placeholder="Scripture (optional)"
              style={inputStyle}
            />
          </div>

          <ChipRow label="Urgency">
            <ChoiceChip selected={urgency === 'whisper'}  onClick={() => setUrgency('whisper')}>Whisper</ChoiceChip>
            <ChoiceChip selected={urgency === 'standard'} onClick={() => setUrgency('standard')}>Standard</ChoiceChip>
            <ChoiceChip selected={urgency === 'urgent'}   onClick={() => setUrgency('urgent')}>Urgent</ChoiceChip>
          </ChipRow>

          <ChipRow label="Visibility">
            <ChoiceChip selected={privacy === 'group'}     onClick={() => setPrivacy('group')}>Whole group</ChoiceChip>
            <ChoiceChip selected={privacy === 'leaders'}   onClick={() => setPrivacy('leaders')}>Leaders only</ChoiceChip>
            <ChoiceChip selected={privacy === 'anonymous'} onClick={() => setPrivacy('anonymous')}>Anonymous</ChoiceChip>
          </ChipRow>

          {privacy === 'anonymous' && (
            <div style={{ fontSize: 12, color: tokens.textFaint, padding: 10, background: tokens.bgPanel, borderRadius: 10, border: `1px solid ${tokens.border}` }}>
              Truly anonymous — even leaders cannot see who posted this. You can later choose to reveal yourself.
            </div>
          )}

          {error && (
            <div style={{ color: tokens.danger, fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px 14px', background: tokens.bgPanel, border: `1px solid ${tokens.border}`,
                       borderRadius: 12, color: tokens.text, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{ flex: 1, padding: '12px 14px', background: submitting ? tokens.goldSoft : tokens.gold,
                       color: '#0a0806', border: 'none', borderRadius: 12, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer' }}>
              {submitting ? 'Posting…' : 'Post prayer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: tokens.bgInput,
  border: `1px solid ${tokens.border}`,
  borderRadius: 10,
  color: tokens.text,
  fontFamily: tokens.fontUi,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: tokens.textFaint, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  );
}

function ChoiceChip({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        background: selected ? tokens.goldSoft : tokens.bgPanel,
        border: `1px solid ${selected ? tokens.gold : tokens.border}`,
        borderRadius: 9999,
        color: selected ? tokens.gold : tokens.textMuted,
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
