import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST — insert a notification (no auth required; called server-side by other API routes)
export async function POST(req: NextRequest) {
  let body: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, any>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.userId || !body.type || !body.title) {
    return NextResponse.json({ error: 'Missing required fields: userId, type, title' }, { status: 400 });
  }

  const db = getAdminClient();
  if (!db) {
    return NextResponse.json(
      { error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
      { status: 500 }
    );
  }

  const { error } = await db.from('trace_notifications').insert({
    user_id:    body.userId,
    type:       body.type,
    title:      body.title,
    body:       body.body   ?? null,
    data:       body.data   ?? null,
    read:       false,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — mark notification(s) as read
export async function PATCH(req: NextRequest) {
  let body: {
    notificationId?: string;
    markAllRead?: boolean;
    userId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getAdminClient();
  if (!db) {
    return NextResponse.json(
      { error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
      { status: 500 }
    );
  }

  if (body.markAllRead && body.userId) {
    const { error } = await db
      .from('trace_notifications')
      .update({ read: true })
      .eq('user_id', body.userId)
      .eq('read', false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.notificationId) {
    const { error } = await db
      .from('trace_notifications')
      .update({ read: true })
      .eq('id', body.notificationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: 'Provide either notificationId or markAllRead + userId' },
    { status: 400 }
  );
}
