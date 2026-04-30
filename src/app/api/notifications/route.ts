import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, verifyAuth, readJsonBody } from '@/lib/api/security';

// PATCH — mark notification(s) as read. Caller must be authenticated and may
// only update notifications they own. There is intentionally NO public POST
// endpoint: notifications are inserted server-side by trusted code paths
// (friend requests, prayer deliveries, etc.) using the admin client directly,
// not via this route. Exposing a POST without strong auth would let anyone
// spoof notifications to any user.
export async function PATCH(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) {
    return NextResponse.json(
      { error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
      { status: 500 }
    );
  }

  const body = await readJsonBody<{ notificationId?: string; markAllRead?: boolean }>(req, 4 * 1024);
  if (body instanceof NextResponse) return body;

  if (body.markAllRead) {
    const { error } = await db
      .from('trace_notifications')
      .update({ read: true })
      .eq('user_id', caller.profileId)
      .eq('read', false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.notificationId) {
    const { error } = await db
      .from('trace_notifications')
      .update({ read: true })
      .eq('id', body.notificationId)
      .eq('user_id', caller.profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: 'Provide either notificationId or markAllRead' },
    { status: 400 }
  );
}
