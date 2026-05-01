import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  verifyAuth,
} from '@/lib/api/security';
import { assertMembership } from '@/lib/api/groups';

// GET /api/groups/[id]/members — directory.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.members', caller), max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const member = await assertMembership({ groupId: id, profileId: caller.profileId });
  if (member instanceof NextResponse) return member;

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { data: rows, error } = await db
    .from('trace_group_members')
    .select('user_id, role, status, joined_at, onboarded_at, muted_until, subgroup_id')
    .eq('group_id', id)
    .eq('status', 'approved');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows ?? []).map((r: any) => r.user_id);
  if (ids.length === 0) return NextResponse.json({ data: [] });

  const { data: profiles, error: pErr } = await db
    .from('trace_profiles')
    .select('id, display_name, username, avatar_color, profile_data')
    .in('id', ids);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const byId = new Map((profiles as any[]).map(p => [p.id, p]));
  const data = (rows as any[]).map(r => {
    const p = byId.get(r.user_id) ?? {};
    return {
      user_id: r.user_id,
      role: r.role,
      joined_at: r.joined_at,
      onboarded_at: r.onboarded_at,
      muted_until: r.muted_until,
      subgroup_id: r.subgroup_id,
      display_name: p.display_name,
      username: p.username,
      avatar_color: p.avatar_color,
      bio: p.profile_data?.bio ?? null,
    };
  });
  return NextResponse.json({ data });
}
