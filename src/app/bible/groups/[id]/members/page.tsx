'use client';

import { use, useEffect, useState } from 'react';
import { tokens } from '../../lib/theme';
import { membersApi, MemberRow } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', leader: 'Leader', co_leader: 'Co-leader', member: 'Member', guest: 'Guest',
};

export default function MembersPage({ params }: Props) {
  const { id } = use(params);
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    membersApi.list(id)
      .then(r => { if (alive) setRows(r); })
      .catch(e => { if (alive) setError(e.message ?? String(e)); });
    return () => { alive = false; };
  }, [id]);

  return (
    <div>
      {error && <div style={{ color: tokens.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {rows === null && !error && <Skeleton height={56} radius={12} count={4} />}
      {rows && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {rows.map(m => (
            <li
              key={m.user_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: tokens.bgPanel,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 40, height: 40, borderRadius: 9999,
                  background: m.avatar_color ?? tokens.gold, color: '#0a0806',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}
              >
                {(m.display_name ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.display_name ?? 'Unnamed'}</div>
                {m.bio && (
                  <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.bio}
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7,
                padding: '4px 8px', borderRadius: 9999,
                background: m.role === 'owner' || m.role === 'leader' || m.role === 'co_leader' ? tokens.goldSoft : tokens.bgPanel,
                color: m.role === 'owner' || m.role === 'leader' || m.role === 'co_leader' ? tokens.gold : tokens.textMuted,
                border: `1px solid ${tokens.border}`,
              }}>
                {ROLE_LABELS[m.role] ?? 'Member'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
