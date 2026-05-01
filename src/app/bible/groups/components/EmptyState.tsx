'use client';

import { ReactNode } from 'react';
import { tokens } from '../lib/theme';

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: Props) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        color: tokens.textMuted,
      }}
    >
      <div style={{ fontFamily: tokens.fontSerif, fontSize: 18, color: tokens.text, marginBottom: 8 }}>
        {title}
      </div>
      {body && <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 18px' }}>{body}</div>}
      {action}
    </div>
  );
}
