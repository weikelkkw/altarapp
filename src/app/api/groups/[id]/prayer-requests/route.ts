import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  rejectIfNotJson,
  verifyAuth,
} from '@/lib/api/security';
import { assertMembership, logGroupEvent } from '@/lib/api/groups';

const URGENCIES = ['whisper', 'standard', 'urgent'] as const;
const SCOPES = ['group', 'leaders', 'specific', 'anonymous'] as const;

interface CreatePrayerBody {
  title: string;
  body?: string;
  category?: string;
  urgency?: typeof URGENCIES[number];
  privacyScope?: typeof SCOPES[number];
  scriptureRef?: string;
  targetUserIds?: string[];
}

// GET /api/groups/[id]/prayer-requests — list active requests visible to caller.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const limited = rateLimit({ key: rateLimitKeyFor(req, 'prayer.list', caller), max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await assertMembership({ groupId: id, profileId: caller.profileId });
  if (guard instanceof NextResponse) return guard;
  const isLeader = ['owner', 'leader', 'co_leader'].includes(guard.membership.role);

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'open';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '40', 10) || 40, 100);

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  // Server-side filter for visible requests, mirroring the RLS policy. We use
  // the admin client + manual filter so anonymous-author rows still show
  // (with author_id surfaced as null).
  let q = db
    .from('trace_prayer_requests')
    .select('id, group_id, author_id, title, body, category, urgency, privacy_scope, scripture_ref, status, pray_count, created_at, updated_at')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') q = q.eq('status', status);

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by privacy_scope server-side.
  const visible: any[] = [];
  const targetCheckIds: string[] = [];

  for (const r of (rows ?? []) as any[]) {
    if (r.privacy_scope === 'group' || r.privacy_scope === 'anonymous') {
      visible.push(r);
    } else if (r.privacy_scope === 'leaders') {
      if (isLeader) visible.push(r);
      else if (r.author_id === caller.profileId) visible.push(r);
    } else if (r.privacy_scope === 'specific') {
      // Defer membership check.
      targetCheckIds.push(r.id);
      visible.push(r); // tentatively include; we'll filter below
    }
  }

  if (targetCheckIds.length) {
    const { data: targets } = await db
      .from('trace_prayer_request_targets')
      .select('request_id')
      .eq('user_id', caller.profileId)
      .in('request_id', targetCheckIds);
    const allowed = new Set((targets ?? []).map((t: any) => t.request_id));
    // Drop specific-scope rows the caller isn't targeted on (unless they authored).
    for (let i = visible.length - 1; i >= 0; i--) {
      const r = visible[i];
      if (r.privacy_scope === 'specific' && r.author_id !== caller.profileId && !allowed.has(r.id)) {
        visible.splice(i, 1);
      }
    }
  }

  // Strip author_id on anonymous rows so the client never sees it.
  for (const r of visible) {
    if (r.privacy_scope === 'anonymous') r.author_id = null;
  }

  // Annotate "i_prayed_today" for each request the caller has prayed today.
  // Look up trace_prayer_deliveries authored by this profile in the last 24h
  // for these request ids — but trace_prayer_deliveries doesn't currently have
  // a request_id column linking to prayer_requests, so skip for v1.
  // (Counter on the request itself is the source of truth.)

  return NextResponse.json({ data: visible });
}

// POST /api/groups/[id]/prayer-requests — create.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctype = rejectIfNotJson(req); if (ctype) return ctype;
  const { id } = await ctx.params;

  const limited = rateLimit({ key: rateLimitKeyFor(req, 'prayer.create', caller), max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await assertMembership({ groupId: id, profileId: caller.profileId });
  if (guard instanceof NextResponse) return guard;

  const body = await readJsonBody<CreatePrayerBody>(req);
  if (body instanceof NextResponse) return body;

  const title = body.title?.trim();
  if (!title || title.length < 1 || title.length > 200) {
    return NextResponse.json({ error: 'Title must be 1–200 characters' }, { status: 400 });
  }
  const text = body.body?.trim() ?? '';
  if (text.length > 4000) {
    return NextResponse.json({ error: 'Body is too long (max 4000 chars)' }, { status: 400 });
  }
  const urgency = body.urgency && URGENCIES.includes(body.urgency) ? body.urgency : 'standard';
  const scope = body.privacyScope && SCOPES.includes(body.privacyScope) ? body.privacyScope : 'group';

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const isAnon = scope === 'anonymous';

  const insert = {
    group_id: id,
    author_id: isAnon ? null : caller.profileId,
    title,
    body: text || null,
    category: body.category?.slice(0, 60) ?? null,
    urgency,
    privacy_scope: scope,
    scripture_ref: body.scriptureRef?.slice(0, 100) ?? null,
    status: 'open',
  };

  const { data: row, error } = await db
    .from('trace_prayer_requests')
    .insert(insert)
    .select('id, group_id, author_id, title, body, category, urgency, privacy_scope, scripture_ref, status, pray_count, created_at')
    .single();
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create prayer' }, { status: 500 });
  }

  // For anonymous requests, stash the real author in a server-only table so
  // the original poster can self-reveal later.
  if (isAnon) {
    await db.from('trace_prayer_anon_keys').insert({
      request_id: (row as any).id,
      author_id: caller.profileId,
    });
  }

  // Persist target list for 'specific' scope.
  if (scope === 'specific' && Array.isArray(body.targetUserIds) && body.targetUserIds.length) {
    const targetRows = body.targetUserIds
      .filter((u): u is string => typeof u === 'string' && u.length === 36)
      .map(u => ({ request_id: (row as any).id, user_id: u }));
    if (targetRows.length) {
      await db.from('trace_prayer_request_targets').insert(targetRows);
    }
  }

  // Audit row never reveals anonymous author.
  await logGroupEvent({
    groupId: id,
    actorId: isAnon ? null : caller.profileId,
    event: 'prayer.created',
    targetId: (row as any).id,
    metadata: { urgency, privacy_scope: scope, anonymous: isAnon },
  });

  // For client display: never leak author_id on anon rows.
  const out = isAnon ? { ...(row as any), author_id: null } : row;
  return NextResponse.json({ data: out }, { status: 201 });
}
