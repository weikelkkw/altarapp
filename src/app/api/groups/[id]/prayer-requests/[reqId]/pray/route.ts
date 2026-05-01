import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  verifyAuth,
} from '@/lib/api/security';
import { assertMembership } from '@/lib/api/groups';

// POST /api/groups/[id]/prayer-requests/[reqId]/pray — increments the counter.
// Idempotent-ish: we don't deduplicate per user in v1 (matches design — "tap"
// rather than "vote"). v1.1 will add user-level dedup using
// trace_prayer_deliveries.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; reqId: string }> },
) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, reqId } = await ctx.params;

  // Per-user-per-request rate cap so a held-down button doesn't inflate the
  // counter to the moon.
  const limited = rateLimit({
    key: `prayer.pray:${caller.profileId}:${reqId}`,
    max: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const guard = await assertMembership({ groupId: id, profileId: caller.profileId });
  if (guard instanceof NextResponse) return guard;

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  // Verify the request belongs to this group + caller can see it (privacy gate).
  const { data: pr } = await db
    .from('trace_prayer_requests')
    .select('id, group_id, author_id, privacy_scope')
    .eq('id', reqId)
    .single();
  if (!pr || (pr as any).group_id !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Use the SECURITY DEFINER function from the migration for an atomic bump.
  const { data: count, error } = await db.rpc('increment_pray_count', { req_id: reqId });
  if (error) {
    // Fallback: direct increment.
    const { data: row, error: e2 } = await db
      .from('trace_prayer_requests')
      .update({ pray_count: ((pr as any).pray_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', reqId)
      .select('pray_count')
      .single();
    if (e2 || !row) return NextResponse.json({ error: e2?.message ?? 'Failed' }, { status: 500 });
    return NextResponse.json({ data: { pray_count: (row as any).pray_count } });
  }

  return NextResponse.json({ data: { pray_count: count } });
}
