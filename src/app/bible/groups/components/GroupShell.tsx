'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { tokens, safeArea } from '../lib/theme';

interface Props {
  title: string;
  back?: { href: string; label?: string };
  trailing?: ReactNode;
  children: ReactNode;
  /** Hide the chrome (e.g. for a full-bleed hero). */
  bare?: boolean;
}

// Shared shell for all /bible/groups/* pages. Single header, scroll body,
// safe-area aware.
export function GroupShell({ title, back, trailing, children, bare }: Props) {
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
      {!bare && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'rgba(10,8,6,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${tokens.border}`,
            paddingTop: `calc(12px + ${safeArea.paddingTop})`,
          }}
        >
          {back && (
            <Link
              href={back.href}
              style={{
                color: tokens.textMuted,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                borderRadius: 8,
                margin: '-6px -8px',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
              {back.label ?? 'Back'}
            </Link>
          )}
          <h1
            style={{
              flex: 1,
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: 0.1,
              textAlign: back ? 'center' : 'left',
              color: tokens.text,
            }}
          >
            {title}
          </h1>
          {trailing ?? <div style={{ width: back ? 60 : 0 }} />}
        </header>
      )}
      <main style={{ flex: 1, padding: bare ? 0 : '12px 16px 80px' }}>{children}</main>
    </div>
  );
}

export const GROUPS_BACK = { href: '/bible/groups', label: 'Groups' };
