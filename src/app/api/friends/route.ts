import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getProfileId(db: any, token: string): Promise<string | null> {
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data } = await db.from('trace_profiles').select('id').eq('auth_id', user.id).single();
  return (data as any)?.id ?? null;
}

// GET — search users by username prefix
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  // Strip leading @ and require at least 2 characters
  const raw = req.nextUrl.searchParams.get('q') ?? '';
  const q = raw.startsWith('@') ? raw.slice(1) : raw;
  if (q.trim().length < 2) return NextResponse.json({ users: [], friendIds: [] });

  // Verify caller is authenticated
  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load existing friendship ids for the current user
  async function loadFriendIds(): Promise<string[]> {
    const { data } = await db!
      .from('trace_friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
    if (!data) return [];
    return data.map((f: any) =>
      f.requester_id === profileId ? f.addressee_id : f.requester_id
    );
  }

  const [{ data, error }, friendIds] = await Promise.all([
    db
      .from('trace_profiles')
      .select('id, display_name, username, avatar_color')
      .ilike('username', `${q}%`)
      .limit(10),
    loadFriendIds(),
  ]);

  if (error) return NextResponse.json({ users: [], friendIds: [] });
  return NextResponse.json({ users: data ?? [], friendIds });
}

// POST — send friend request
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { toUserId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.toUserId) return NextResponse.json({ error: 'Missing toUserId' }, { status: 400 });

  const requesterId = await getProfileId(db, token);
  if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (requesterId === body.toUserId) {
    return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
  }

  // Check if friendship already exists in either direction
  const { data: existing } = await db
    .from('trace_friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${requesterId},addressee_id.eq.${body.toUserId}),and(requester_id.eq.${body.toUserId},addressee_id.eq.${requesterId})`
    )
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Friend request already exists' }, { status: 409 });

  const { error } = await db.from('trace_friendships').insert({
    requester_id: requesterId,
    addressee_id: body.toUserId,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the addressee of the new friend request
  try {
    const { data: requesterProfile } = await db
      .from('trace_profiles')
      .select('display_name')
      .eq('id', requesterId)
      .single();

    await db.from('trace_notifications').insert({
      user_id:    body.toUserId,
      type:       'friend_request',
      title:      'New friend request',
      body:       `${requesterProfile?.display_name ?? 'Someone'} wants to connect with you`,
      data:       { fromUserId: requesterId },
      read:       false,
      created_at: new Date().toISOString(),
    });
  } catch {}

  return NextResponse.json({ success: true });
}

// PATCH — accept or decline a friend request
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { friendshipId: string; action: 'accept' | 'decline' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.friendshipId || !body.action) return NextResponse.json({ error: 'Missing friendshipId or action' }, { status: 400 });
  if (body.action !== 'accept' && body.action !== 'decline') {
    return NextResponse.json({ error: 'action must be "accept" or "decline"' }, { status: 400 });
  }

  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify the current user is the addressee
  const { data: friendship } = await db
    .from('trace_friendships')
    .select('id, addressee_id, requester_id')
    .eq('id', body.friendshipId)
    .single();

  if (!friendship) return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
  if ((friendship as any).addressee_id !== profileId) {
    return NextResponse.json({ error: 'Only the addressee can accept or decline this request' }, { status: 403 });
  }

  const addresseeProfileId = profileId;

  if (body.action === 'accept') {
    const { error } = await db
      .from('trace_friendships')
      .update({ status: 'accepted' })
      .eq('id', body.friendshipId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the requester that their request was accepted
    try {
      const { data: requesterProfile } = await db
        .from('trace_profiles')
        .select('display_name')
        .eq('id', addresseeProfileId)
        .single();

      await db.from('trace_notifications').insert({
        user_id:    (friendship as any).requester_id,
        type:       'friend_accepted',
        title:      'Friend request accepted',
        body:       `${requesterProfile?.display_name ?? 'Someone'} accepted your friend request`,
        data:       { fromUserId: addresseeProfileId },
        read:       false,
        created_at: new Date().toISOString(),
      });
    } catch {}
  } else {
    const { error } = await db
      .from('trace_friendships')
      .delete()
      .eq('id', body.friendshipId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a friend
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { friendshipId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.friendshipId) return NextResponse.json({ error: 'Missing friendshipId' }, { status: 400 });

  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only delete if current user is requester or addressee
  const { error } = await db
    .from('trace_friendships')
    .delete()
    .eq('id', body.friendshipId)
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
