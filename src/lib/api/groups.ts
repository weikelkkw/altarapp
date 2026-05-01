import 'server-only';
import { NextResponse } from 'next/server';
import { getAdminClient } from './security';

export type GroupRole = 'owner' | 'leader' | 'co_leader' | 'member' | 'guest';

const LEADER_ROLES: GroupRole[] = ['owner', 'leader', 'co_leader'];

export interface MembershipCheck {
  role: GroupRole;
  status: string;
}

// Returns the caller's membership row if they're an approved member of `groupId`,
// or null otherwise. Uses the admin client (RLS bypass) so we can assert role
// from the server before letting a mutation through.
export async function getMembership(
  groupId: string,
  profileId: string,
): Promise<MembershipCheck | null> {
  const db = getAdminClient();
  if (!db) return null;
  const { data } = await db
    .from('trace_group_members')
    .select('role, status')
    .eq('group_id', groupId)
    .eq('user_id', profileId)
    .eq('status', 'approved')
    .single();
  return (data as MembershipCheck | null) ?? null;
}

export function isLeaderRole(role: GroupRole | undefined | null): boolean {
  return !!role && (LEADER_ROLES as string[]).includes(role);
}

// Convenience for routes — returns 403 if the caller isn't an approved member.
// Optionally requires a leader role.
export async function assertMembership(opts: {
  groupId: string;
  profileId: string;
  leaderRequired?: boolean;
}): Promise<NextResponse | { membership: MembershipCheck }> {
  const m = await getMembership(opts.groupId, opts.profileId);
  if (!m) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }
  if (opts.leaderRequired && !isLeaderRole(m.role as GroupRole)) {
    return NextResponse.json({ error: 'Leader role required' }, { status: 403 });
  }
  return { membership: m };
}

// Best-effort audit-log writer. Never throws — audit failures must not break
// the user-visible mutation.
export async function logGroupEvent(opts: {
  groupId: string;
  actorId: string | null;
  event: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminClient();
  if (!db) return;
  try {
    await db.from('trace_group_audit_log').insert({
      group_id: opts.groupId,
      actor_id: opts.actorId,
      event: opts.event,
      target_id: opts.targetId ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    /* swallow — audit must never block UX */
  }
}

// Slug generator: short, readable, low-collision. Two random adjective-ish
// + noun-ish words plus a 4-char suffix. Not cryptographically random — fine
// for a vanity URL.
const ADJECTIVES = [
  'quiet', 'bright', 'gentle', 'living', 'open', 'rooted', 'kindled',
  'morning', 'humble', 'risen', 'still', 'steadfast',
];
const NOUNS = [
  'altar', 'lamp', 'spring', 'vine', 'harvest', 'covenant', 'shepherd',
  'compass', 'anchor', 'beacon', 'haven',
];
export function generateSlug(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${a}-${n}-${suffix}`;
}

// Token generator for invite links. 16 bytes b64url ~ 22 chars.
export function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64url
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return Buffer.from(s, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
