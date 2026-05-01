'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { groupsApi, GroupSummary } from './lib/api';
import { tokens } from './lib/theme';
import { GroupShell } from './components/GroupShell';
import { EmptyState } from './components/EmptyState';
import { Skeleton } from './components/Skeleton';

export default function GroupsHomePage() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    groupsApi.list()
      .then(g => { if (alive) setGroups(g); })
      .catch(e => { if (alive) setError(e.message ?? String(e)); });
    return () => { alive = false; };
  }, []);

  return (
    <GroupShell
      title="Groups"
      back={{ href: '/bible', label: 'Bible' }}
      trailing={
        <Link
          href="/bible/groups/new"
          style={{
            color: tokens.gold,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            padding: '6px 10px',
            borderRadius: 8,
            border: `1px solid ${tokens.goldSoft}`,
          }}
        >
          + New
        </Link>
      }
    >
      {error && (
        <div style={{
          padding: '12px 14px', borderRadius: 10, background: 'rgba(224,122,76,0.10)',
          border: `1px solid ${tokens.danger}55`, color: tokens.danger,
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {groups === null && !error && (
        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          <Skeleton height={72} radius={14} />
          <Skeleton height={72} radius={14} />
          <Skeleton height={72} radius={14} />
        </div>
      )}

      {groups && groups.length === 0 && (
        <EmptyState
          title="No groups yet"
          body="Create one for your small group, family, or accountability circle. Or join one a friend has shared with you."
          action={
            <Link
              href="/bible/groups/new"
              style={{
                display: 'inline-block',
                padding: '12px 20px',
                background: tokens.gold,
                color: '#0a0806',
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
                letterSpacing: 0.3,
              }}
            >
              Create a group
            </Link>
          }
        />
      )}

      {groups && groups.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {groups.map(g => (
            <li key={g.id}>
              <Link
                href={`/bible/groups/${g.id}/pulse`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  background: tokens.bgPanel,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: tokens.text,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: g.cover_image_url
                      ? `url(${g.cover_image_url}) center/cover no-repeat`
                      : 'linear-gradient(135deg, rgba(201,168,76,0.35), rgba(201,168,76,0.10))',
                    border: `1px solid ${tokens.borderStrong}`,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                    {labelForArchetype(g.archetype)} · {labelForPrivacy(g.privacy)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {g.my_role === 'owner' ? 'Owner' : g.my_role === 'leader' || g.my_role === 'co_leader' ? 'Leader' : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GroupShell>
  );
}

function labelForArchetype(a: string | null): string {
  switch (a) {
    case 'small_group':     return 'Small Group';
    case 'bible_study':     return 'Bible Study';
    case 'accountability':  return 'Accountability';
    case 'family':          return 'Family';
    case 'prayer_circle':   return 'Prayer Circle';
    case 'reading_plan':    return 'Reading Plan Cohort';
    case 'church_wide':     return 'Church-wide';
    default:                return 'Group';
  }
}
function labelForPrivacy(p: string): string {
  return p === 'public' ? 'Public' : p === 'discoverable' ? 'Discoverable' : 'Private';
}
