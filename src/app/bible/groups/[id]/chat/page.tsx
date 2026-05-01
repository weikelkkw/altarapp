'use client';

import { tokens } from '../../lib/theme';
import { EmptyState } from '../../components/EmptyState';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <EmptyState
      title="Threaded chat is coming soon"
      body="In the meantime, the existing group chat in the Community tab still works. Verse picker, voice notes, and reactions land in v1.1."
      action={
        <Link href="/bible" style={{ color: tokens.gold, fontWeight: 600, textDecoration: 'none' }}>
          Open Community ›
        </Link>
      }
    />
  );
}
