'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokens } from '../../lib/theme';
import { groupsApi, GroupDetail } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';

interface Props {
  params: Promise<{ id: string }>;
}

export default function SettingsPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [g, setG] = useState<GroupDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whatToExpect, setWhatToExpect] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'discoverable' | 'public'>('private');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    groupsApi.get(id).then(d => {
      if (!alive) return;
      setG(d);
      setName(d.name);
      setDescription(d.description ?? '');
      setWhatToExpect(d.what_to_expect ?? '');
      setPrivacy(d.privacy);
    }).catch(e => setError(e.message ?? String(e)));
    return () => { alive = false; };
  }, [id]);

  const isLeader = g?.my_role === 'owner' || g?.my_role === 'leader' || g?.my_role === 'co_leader';
  const isOwner = g?.my_role === 'owner';

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await groupsApi.patch(id, { name, description, whatToExpect, privacy });
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally { setBusy(false); }
  }

  async function onArchive() {
    if (!isOwner) return;
    if (!confirm(`Archive "${g?.name}"? It will be hidden from members and removed permanently after 7 days.`)) return;
    setBusy(true);
    try {
      await groupsApi.archive(id);
      router.replace('/bible/groups');
    } catch (e: any) {
      setError(e.message ?? 'Failed to archive');
      setBusy(false);
    }
  }

  if (!g) return <Skeleton height={56} radius={12} count={4} />;

  if (!isLeader) {
    return <div style={{ color: tokens.textMuted, fontSize: 14 }}>Only leaders can edit group settings.</div>;
  }

  return (
    <form onSubmit={onSave} style={{ display: 'grid', gap: 16 }}>
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={100} required style={inputStyle} />
      </Field>

      <Field label="Description">
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
      </Field>

      <Field label="What new members should expect">
        <textarea value={whatToExpect} onChange={e => setWhatToExpect(e.target.value)} maxLength={4000}
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
      </Field>

      <Field label="Privacy">
        <select value={privacy} onChange={e => setPrivacy(e.target.value as any)} style={{ ...inputStyle, padding: '12px 14px' }}>
          <option value="private">Private — invite only</option>
          <option value="discoverable">Discoverable — listed, request to join</option>
          <option value="public">Public — anyone with the link</option>
        </select>
      </Field>

      {error && <div style={{ color: tokens.danger, fontSize: 13 }}>{error}</div>}
      {savedAt && <div style={{ color: tokens.praise, fontSize: 13 }}>Saved.</div>}

      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '12px 18px',
          background: busy ? tokens.goldSoft : tokens.gold,
          color: '#0a0806', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'Saving…' : 'Save changes'}
      </button>

      {isOwner && (
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${tokens.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: tokens.danger, marginBottom: 8 }}>
            Danger zone
          </div>
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              color: tokens.danger,
              border: `1px solid ${tokens.danger}66`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Archive group
          </button>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: tokens.textFaint }}>
        {label}
      </span>
      {children}
    </label>
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
