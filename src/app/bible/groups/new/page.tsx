'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { groupsApi } from '../lib/api';
import { tokens } from '../lib/theme';
import { GroupShell } from '../components/GroupShell';

const ARCHETYPES: { id: string; label: string; subtitle: string }[] = [
  { id: 'small_group',    label: 'Small Group',          subtitle: 'A weekly circle of 4–12 walking together.' },
  { id: 'bible_study',    label: 'Bible Study',          subtitle: 'Centered on a book or topic, with discussion.' },
  { id: 'accountability', label: 'Accountability',       subtitle: 'Brief check-ins and partner pairings.' },
  { id: 'family',         label: 'Family',               subtitle: 'Closest folks. Devotion, prayer, and care.' },
  { id: 'prayer_circle',  label: 'Prayer Circle',        subtitle: 'Carry one another\u2019s burdens in prayer.' },
  { id: 'reading_plan',   label: 'Reading Plan Cohort',  subtitle: 'Move through Scripture on the same rhythm.' },
  { id: 'church_wide',    label: 'Church-wide',          subtitle: 'Larger ministry or sermon-aligned group.' },
  { id: 'custom',         label: 'Custom',               subtitle: 'Start from a blank slate.' },
];

const PRIVACIES: { id: 'private' | 'discoverable' | 'public'; label: string; subtitle: string }[] = [
  { id: 'private',      label: 'Private',      subtitle: 'Invite only. Not listed anywhere.' },
  { id: 'discoverable', label: 'Discoverable', subtitle: 'Listed in Find a Group; new members request to join.' },
  { id: 'public',       label: 'Public',       subtitle: 'Anyone with the link can join.' },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [archetype, setArchetype] = useState<string>('small_group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whatToExpect, setWhatToExpect] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'discoverable' | 'public'>('private');
  const [denomination, setDenomination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      const out = await groupsApi.create({
        name: name.trim(),
        archetype,
        description: description.trim() || undefined,
        whatToExpect: whatToExpect.trim() || undefined,
        privacy,
        denomination: denomination.trim() || undefined,
      });
      router.replace(`/bible/groups/${out.id}/pulse`);
    } catch (e: any) {
      setError(e.message ?? 'Failed to create group');
      setSubmitting(false);
    }
  }

  return (
    <GroupShell title="New Group" back={{ href: '/bible/groups' }}>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 24 }}>
        <Section label="What kind of group is this?">
          <div style={{ display: 'grid', gap: 8 }}>
            {ARCHETYPES.map(a => (
              <RadioCard
                key={a.id}
                checked={archetype === a.id}
                onSelect={() => setArchetype(a.id)}
                title={a.label}
                subtitle={a.subtitle}
              />
            ))}
          </div>
        </Section>

        <Section label="Identity">
          <Input value={name} onChange={setName} placeholder="Group name" maxLength={100} required />
          <Input
            value={description}
            onChange={setDescription}
            placeholder="Short description (optional)"
            maxLength={2000}
            multiline
          />
          <Input
            value={whatToExpect}
            onChange={setWhatToExpect}
            placeholder="What new members should expect (optional)"
            maxLength={4000}
            multiline
          />
          <Input
            value={denomination}
            onChange={setDenomination}
            placeholder="Tradition / denomination (optional)"
            maxLength={100}
          />
        </Section>

        <Section label="Privacy">
          <div style={{ display: 'grid', gap: 8 }}>
            {PRIVACIES.map(p => (
              <RadioCard
                key={p.id}
                checked={privacy === p.id}
                onSelect={() => setPrivacy(p.id)}
                title={p.label}
                subtitle={p.subtitle}
              />
            ))}
          </div>
        </Section>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(224,122,76,0.10)', border: `1px solid ${tokens.danger}55`,
            color: tokens.danger, fontSize: 13,
          }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '14px 18px',
            background: submitting ? tokens.goldSoft : tokens.gold,
            color: '#0a0806',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'wait' : 'pointer',
            letterSpacing: 0.3,
          }}
        >
          {submitting ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </GroupShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: 1.2, color: tokens.textFaint, marginBottom: 10,
      }}>{label}</div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </div>
  );
}

function RadioCard({
  checked, onSelect, title, subtitle,
}: {
  checked: boolean; onSelect: () => void; title: string; subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        background: checked ? tokens.goldSoft : tokens.bgPanel,
        border: `1px solid ${checked ? tokens.gold : tokens.border}`,
        borderRadius: 12,
        color: tokens.text,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>{subtitle}</div>}
    </button>
  );
}

function Input({
  value, onChange, placeholder, maxLength, multiline, required,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  maxLength?: number; multiline?: boolean; required?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: tokens.bgInput,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    color: tokens.text,
    fontFamily: tokens.fontUi,
    fontSize: 14,
    outline: 'none',
  };
  return multiline ? (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      required={required}
      style={{ ...sharedStyle, minHeight: 80, resize: 'vertical' }}
    />
  ) : (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      required={required}
      style={sharedStyle}
    />
  );
}
