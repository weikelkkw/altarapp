import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST — share a Bible verse to a group chat
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  let body: { groupId: string; verseRef: string; verseText: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { groupId, verseRef, verseText } = body;
  if (!groupId || !verseRef || !verseText) {
    return NextResponse.json({ error: 'Missing groupId, verseRef, or verseText' }, { status: 400 });
  }

  // Verify auth and get user
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get profileId from trace_profiles
  const { data: profile } = await db
    .from('trace_profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  const profileId = (profile as any).id as string;

  // Verify user is an approved member of the group
  const { data: membership } = await db
    .from('trace_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', profileId)
    .eq('status', 'approved')
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'You are not an approved member of this group' }, { status: 403 });
  }

  // Build message content and insert into group chat
  const content = `📖 ${verseRef}\n\n${verseText}\n\n— shared from Trace`;

  const { data: message, error: insertError } = await db
    .from('trace_group_messages')
    .insert({
      group_id: groupId,
      sender_id: profileId,
      content,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ success: true, messageId: (message as any).id });
}
