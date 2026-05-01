'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { tokens } from '../../lib/theme';
import { groupsApi, GroupDetail, prayerApi, PrayerRequest, membersApi, MemberRow } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';

interface Props {
  params: Promise<{ id: string }>;
}

export default function PulsePage({ params }: Props) {
  const { id } = use(params);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[] | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([groupsApi.get(id), prayerApi.list(id, 'open'), membersApi.list(id)])
      .then(([g, p, m]) => { if (alive) { setGroup(g); setPrayers(p.slice(0, 3)); setMembers(m); } })
      .catch(() => {/* surfaced from layout */});
    return () => { alive = false; };
  }, [id]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Welcome group={group} memberCount={members?.length ?? null} />

      <Section label="Recent prayer requests" trailing={
        <Link href={`/bible/groups/${id}/prayer`} style={{ color: tokens.gold, fontSize: 13, textDecoration: 'none' }}>
          See all
        </Link>
      }>
        {prayers === null && <Skeleton height={56} radius={12} count={2} />}
        {prayers && prayers.length === 0 && (
          <Soft>No prayer requests yet. <Link href={`/bible/groups/${id}/prayer`} style={{ color: tokens.gold, textDecoration: 'underline' }}>Start the wall.</Link></Soft>
        )}
        {prayers && prayers.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {prayers.map(p => (
              <Link
                key={p.id}
                href={`/bible/groups/${id}/prayer`}
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  background: tokens.bgPanel,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: tokens.text,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: tokens.textMuted, whiteSpace: 'nowrap' }}>🙏 {p.pray_count}</div>
                </div>
                {p.body && (
                  <div style={{ fontSize: 13, color: tokens.textMuted, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.body}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section label="Members" trailing={
        <Link href={`/bible/groups/${id}/members`} style={{ color: tokens.gold, fontSize: 13, textDecoration: 'none' }}>
          See all
        </Link>
      }>
        {members === null && <Skeleton height={32} radius={9999} count={1} />}
        {members && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.slice(0, 8).map(m => (
              <Avatar key={m.user_id} name={m.display_name ?? '?'} color={m.avatar_color ?? tokens.gold} />
            ))}
            {members.length > 8 && (
              <div style={{
                width: 32, height: 32, borderRadius: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: tokens.bgPanel, border: `1px solid ${tokens.border}`,
                fontSize: 11, color: tokens.textMuted, fontWeight: 600,
              }}>
                +{members.length - 8}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Welcome({ group, memberCount }: { group: GroupDetail | null; memberCount: number | null }) {
  if (!group) return <Skeleton height={92} radius={14} />;
  return (
    <div
      style={{
        padding: 18,
        background: 'linear-gradient(180deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02))',
        border: `1px solid ${tokens.goldSoft}`,
        borderRadius: 14,
      }}
    >
      <div style={{ fontFamily: tokens.fontSerif, fontSize: 22, lineHeight: 1.2, color: tokens.text }}>{group.name}</div>
      {group.description && (
        <div style={{ fontSize: 14, color: tokens.textMuted, marginTop: 6, lineHeight: 1.55 }}>{group.description}</div>
      )}
      <div style={{ fontSize: 12, color: tokens.textFaint, marginTop: 10 }}>
        {memberCount !== null ? `${memberCount} member${memberCount === 1 ? '' : 's'}` : '\u00A0'}
        {group.cadence ? ` · meets ${group.cadence}` : ''}
      </div>
    </div>
  );
}

function Section({ label, trailing, children }: { label: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 1.2, color: tokens.textFaint,
        }}>{label}</div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Soft({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: tokens.textMuted }}>{children}</div>;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      title={name}
      style={{
        width: 32, height: 32, borderRadius: 9999,
        background: color, color: '#0a0806',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
      }}
    >
      {initial}
    </div>
  );
}
