'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '../lib/theme';

interface Props {
  groupId: string;
}

const TABS: { id: string; label: string; href: (id: string) => string }[] = [
  { id: 'pulse',    label: 'Pulse',    href: id => `/bible/groups/${id}/pulse` },
  { id: 'chat',     label: 'Chat',     href: id => `/bible/groups/${id}/chat` },
  { id: 'prayer',   label: 'Prayer',   href: id => `/bible/groups/${id}/prayer` },
  { id: 'study',    label: 'Study',    href: id => `/bible/groups/${id}/study` },
  { id: 'meetings', label: 'Meetings', href: id => `/bible/groups/${id}/meetings` },
];

export function GroupTabBar({ groupId }: Props) {
  const path = usePathname() ?? '';
  return (
    <nav
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        borderBottom: `1px solid ${tokens.border}`,
        background: tokens.bg,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
      aria-label="Group sections"
    >
      {TABS.map(t => {
        const active = path.includes(`/${t.id}`);
        return (
          <Link
            key={t.id}
            href={t.href(groupId)}
            style={{
              padding: '12px 6px',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: active ? tokens.gold : tokens.textMuted,
              borderBottom: `2px solid ${active ? tokens.gold : 'transparent'}`,
              transition: 'color 0.15s',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
