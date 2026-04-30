import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  verifyAuth,
} from '@/lib/api/security';

// POST /api/content/report
// User-initiated content moderation. Authenticated callers submit a report
// against a target piece of UGC; admin client writes the row (RLS blocks any
// other path). Rate-limited per profile to discourage spam-flagging.

const ALLOWED_TARGETS = new Set([
  'post', 'comment', 'prayer_comment', 'message',
  'prayer_delivery', 'group_message', 'profile',
]);

interface Body {
  targetType?: string;
  targetId?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'content-report', caller),
    max: 10,
    windowMs: 10 * 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody<Body>(req, 8 * 1024);
  if (body instanceof NextResponse) return body;

  const targetType = body.targetType;
  const targetId   = body.targetId;
  const reason     = (body.reason ?? '').toString().trim();

  if (!targetType || !ALLOWED_TARGETS.has(targetType)) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
  }
  if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return NextResponse.json({ error: 'Invalid target id' }, { status: 400 });
  }
  if (reason.length < 1 || reason.length > 2000) {
    return NextResponse.json({ error: 'Reason must be 1–2000 characters.' }, { status: 400 });
  }

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { error } = await (db as any).from('trace_content_reports').insert({
    reporter_id: caller.profileId,
    target_type: targetType,
    target_id:   targetId,
    reason,
    status: 'open',
  });
  if (error) return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
