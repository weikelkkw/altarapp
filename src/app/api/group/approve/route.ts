import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function verifyLeader(db: any, token: string, groupId: string): Promise<boolean> {
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return false;

  const { data: profile } = await db.from('trace_profiles').select('id').eq('auth_id', user.id).single();
  if (!profile) return false;

  const { data: membership } = await db
    .from('trace_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', (profile as any).id)
    .eq('role', 'leader')
    .eq('status', 'approved')
    .single();

  return !!membership;
}

// POST — approve a join request
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { groupId: string; userId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.groupId || !body.userId) return NextResponse.json({ error: 'Missing groupId or userId' }, { status: 400 });

  const isLeader = await verifyLeader(db, token, body.groupId);
  if (!isLeader) return NextResponse.json({ error: 'Not authorized as group leader' }, { status: 403 });

  const { error } = await db
    .from('trace_group_members')
    .update({ status: 'approved' })
    .eq('group_id', body.groupId)
    .eq('user_id', body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — deny / remove a join request
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { groupId: string; userId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (!body.groupId || !body.userId) return NextResponse.json({ error: 'Missing groupId or userId' }, { status: 400 });

  const isLeader = await verifyLeader(db, token, body.groupId);
  if (!isLeader) return NextResponse.json({ error: 'Not authorized as group leader' }, { status: 403 });

  const { error } = await db
    .from('trace_group_members')
    .delete()
    .eq('group_id', body.groupId)
    .eq('user_id', body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
