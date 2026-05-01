import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  rejectIfNotJson,
  verifyAuth,
} from '@/lib/api/security';
import { generateSlug, logGroupEvent } from '@/lib/api/groups';

const ARCHETYPES = [
  'small_group', 'bible_study', 'accountability', 'family',
  'prayer_circle', 'reading_plan', 'church_wide', 'custom',
] as const;
type Archetype = typeof ARCHETYPES[number];

const PRIVACIES = ['private', 'discoverable', 'public'] as const;
type Privacy = typeof PRIVACIES[number];

interface CreateGroupBody {
  name: string;
  archetype?: Archetype;
  description?: string;
  denomination?: string;
  cadence?: 'weekly' | 'biweekly' | 'monthly' | 'adhoc';
  locationKind?: 'inperson' | 'hybrid' | 'online';
  locationText?: string;
  locationUrl?: string;
  whatToExpect?: string;
  privacy?: Privacy;
  coverImageUrl?: string;
}

// GET /api/groups — list the caller's groups (latest activity first).
export async function GET(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.list', caller), max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  // Pull memberships then groups in two queries — Supabase doesn't always
  // optimize the join the way we want with deeply nested selects.
  const { data: memberships, error: mErr } = await db
    .from('trace_group_members')
    .select('group_id, role')
    .eq('user_id', caller.profileId)
    .eq('status', 'approved');
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const ids = (memberships ?? []).map((m: any) => m.group_id);
  if (ids.length === 0) return NextResponse.json({ data: [] });

  const { data: groups, error: gErr } = await db
    .from('trace_groups')
    .select('id, name, description, archetype, privacy, cover_image_url, slug, archived_at, created_at')
    .in('id', ids)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  const roleByGroup = new Map((memberships as any[]).map(m => [m.group_id, m.role]));
  const data = (groups ?? []).map((g: any) => ({ ...g, my_role: roleByGroup.get(g.id) ?? 'member' }));
  return NextResponse.json({ data });
}

// POST /api/groups — create a group. Caller becomes owner.
export async function POST(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctype = rejectIfNotJson(req); if (ctype) return ctype;
  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.create', caller), max: 8, windowMs: 60_000 });
  if (limited) return limited;

  const body = await readJsonBody<CreateGroupBody>(req);
  if (body instanceof NextResponse) return body;

  const name = body.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Name must be 2–100 characters' }, { status: 400 });
  }
  if (body.archetype && !ARCHETYPES.includes(body.archetype)) {
    return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
  }
  const privacy = (body.privacy && PRIVACIES.includes(body.privacy)) ? body.privacy : 'private';

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  // Generate a unique slug (retry up to 5 times on collision).
  let slug = generateSlug();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await db.from('trace_groups').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = generateSlug();
  }

  const insert = {
    name,
    description: body.description ?? null,
    archetype: body.archetype ?? 'custom',
    privacy,
    denomination: body.denomination ?? null,
    cadence: body.cadence ?? null,
    location_kind: body.locationKind ?? null,
    location_text: body.locationText ?? null,
    location_url: body.locationUrl ?? null,
    what_to_expect: body.whatToExpect ?? null,
    cover_image_url: body.coverImageUrl ?? null,
    slug,
    created_by: caller.profileId,
  };

  const { data: group, error: gErr } = await db
    .from('trace_groups')
    .insert(insert)
    .select('id, name, slug, privacy, archetype')
    .single();
  if (gErr || !group) {
    return NextResponse.json({ error: gErr?.message ?? 'Failed to create group' }, { status: 500 });
  }

  const { error: mErr } = await db.from('trace_group_members').insert({
    group_id: (group as any).id,
    user_id: caller.profileId,
    role: 'owner',
    status: 'approved',
    onboarded_at: new Date().toISOString(),
  });
  if (mErr) {
    // Best effort rollback — admin client can hard-delete.
    await db.from('trace_groups').delete().eq('id', (group as any).id);
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  await logGroupEvent({
    groupId: (group as any).id,
    actorId: caller.profileId,
    event: 'group.created',
    metadata: { archetype: insert.archetype, privacy: insert.privacy },
  });

  return NextResponse.json({ data: group }, { status: 201 });
}
