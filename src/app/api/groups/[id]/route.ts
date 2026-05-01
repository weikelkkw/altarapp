import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  rejectIfNotJson,
  verifyAuth,
} from '@/lib/api/security';
import { assertMembership, isLeaderRole, logGroupEvent } from '@/lib/api/groups';

interface PatchGroupBody {
  name?: string;
  description?: string;
  whatToExpect?: string;
  privacy?: 'private' | 'discoverable' | 'public';
  denomination?: string;
  cadence?: 'weekly' | 'biweekly' | 'monthly' | 'adhoc';
  locationKind?: 'inperson' | 'hybrid' | 'online';
  locationText?: string;
  locationUrl?: string;
  coverImageUrl?: string;
}

// GET /api/groups/[id] — group detail (members of the group only).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.get', caller), max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const member = await assertMembership({ groupId: id, profileId: caller.profileId });
  if (member instanceof NextResponse) return member;

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { data: group, error } = await db
    .from('trace_groups')
    .select('id, name, description, archetype, privacy, denomination, cadence, location_kind, location_text, location_url, what_to_expect, cover_image_url, slug, created_at, archived_at, settings_data')
    .eq('id', id)
    .single();
  if (error || !group) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ data: { ...group, my_role: member.membership.role } });
}

// PATCH /api/groups/[id] — leader-only update.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctype = rejectIfNotJson(req); if (ctype) return ctype;
  const { id } = await ctx.params;

  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.patch', caller), max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await assertMembership({ groupId: id, profileId: caller.profileId, leaderRequired: true });
  if (guard instanceof NextResponse) return guard;

  const body = await readJsonBody<PatchGroupBody>(req);
  if (body instanceof NextResponse) return body;

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 100) {
      return NextResponse.json({ error: 'Name must be 2–100 characters' }, { status: 400 });
    }
    update.name = n;
  }
  if (body.description !== undefined) update.description = body.description.slice(0, 2000) || null;
  if (body.whatToExpect !== undefined) update.what_to_expect = body.whatToExpect.slice(0, 4000) || null;
  if (body.privacy !== undefined) update.privacy = body.privacy;
  if (body.denomination !== undefined) update.denomination = body.denomination?.slice(0, 100) || null;
  if (body.cadence !== undefined) update.cadence = body.cadence;
  if (body.locationKind !== undefined) update.location_kind = body.locationKind;
  if (body.locationText !== undefined) update.location_text = body.locationText?.slice(0, 500) || null;
  if (body.locationUrl !== undefined) update.location_url = body.locationUrl?.slice(0, 500) || null;
  if (body.coverImageUrl !== undefined) update.cover_image_url = body.coverImageUrl?.slice(0, 500) || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
  }

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { data, error } = await db
    .from('trace_groups')
    .update(update)
    .eq('id', id)
    .select('id, name, privacy, archetype, slug')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logGroupEvent({
    groupId: id,
    actorId: caller.profileId,
    event: 'group.updated',
    metadata: { fields: Object.keys(update) },
  });

  return NextResponse.json({ data });
}

// DELETE /api/groups/[id] — owner-only soft archive.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const limited = rateLimit({ key: rateLimitKeyFor(req, 'groups.delete', caller), max: 5, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await assertMembership({ groupId: id, profileId: caller.profileId, leaderRequired: true });
  if (guard instanceof NextResponse) return guard;
  if (guard.membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can archive a group' }, { status: 403 });
  }

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { error } = await db
    .from('trace_groups')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logGroupEvent({
    groupId: id,
    actorId: caller.profileId,
    event: 'group.archived',
  });

  return NextResponse.json({ data: { archived: true } });
}
