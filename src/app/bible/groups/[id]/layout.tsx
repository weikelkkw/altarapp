'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { tokens, safeArea } from '../lib/theme';
import { groupsApi, GroupDetail } from '../lib/api';
import { GroupTabBar } from '../components/GroupTabBar';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function GroupLayout({ children, params }: Props) {
  const { id } = use(params);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    groupsApi.get(id)
      .then(g => { if (alive) setGroup(g); })
      .catch(e => { if (alive) setError(e.message ?? String(e)); });
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', background: tokens.bg, color: tokens.text, fontFamily: tokens.fontUi, padding: 24 }}>
        <div style={{ paddingTop: safeArea.paddingTop }}>
          <Link href="/bible/groups" style={{ color: tokens.textMuted, textDecoration: 'none', fontSize: 14 }}>‹ Groups</Link>
          <div style={{ marginTop: 24, color: tokens.danger, fontSize: 14 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: tokens.bg,
        color: tokens.text,
        fontFamily: tokens.fontUi,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: safeArea.paddingTop,
        paddingBottom: safeArea.paddingBottom,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: `1px solid ${tokens.border}`,
          paddingTop: `calc(12px + ${safeArea.paddingTop})`,
        }}
      >
        <Link
          href="/bible/groups"
          style={{ color: tokens.textMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
        >
          ‹ Groups
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: tokens.text }}>
          {group?.name ?? '\u00A0'}
        </div>
        <Link
          href={`/bible/groups/${id}/settings`}
          style={{ color: tokens.textMuted, textDecoration: 'none', fontSize: 18 }}
          aria-label="Group settings"
        >
          ⚙
        </Link>
      </header>

      <GroupTabBar groupId={id} />

      <main style={{ flex: 1, padding: '12px 16px 80px' }}>{children}</main>
    </div>
  );
}
