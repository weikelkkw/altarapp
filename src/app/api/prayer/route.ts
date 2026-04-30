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

// POST — send a prayer to a random believer
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { content: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.content?.trim()) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  const { data: profiles } = await db
    .from('trace_profiles')
    .select('id')
    .neq('id', profileId);

  if (!profiles?.length) return NextResponse.json({ error: 'No other users yet' }, { status: 404 });

  const recipient = profiles[Math.floor(Math.random() * profiles.length)];

  const { error } = await db.from('trace_prayer_deliveries').insert({
    content: body.content.trim(),
    sender_id: profileId,
    recipient_id: recipient.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — mark a delivery as seen or prayed (only recipient can do this)
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id: string; action: 'seen' | 'prayed' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.id || !body.action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const update = body.action === 'prayed'
    ? { seen_at: new Date().toISOString(), prayed_at: new Date().toISOString() }
    : { seen_at: new Date().toISOString() };

  // Only update if this user is the recipient
  const { error } = await db.from('trace_prayer_deliveries')
    .update(update)
    .eq('id', body.id)
    .eq('recipient_id', profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
