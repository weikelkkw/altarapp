import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  verifyAuth,
} from '@/lib/api/security';
import { recordAuthEvent } from '@/lib/api/audit';

// POST /api/account/delete
// User-initiated GDPR/CCPA "right to erasure" handler.
// Records a deletion request, removes the auth user (which cascades through
// every trace_* table via ON DELETE CASCADE foreign keys to auth.users), and
// returns once the auth row is gone. Public posts/comments by the user are
// kept (per Privacy Policy §5) but become orphaned — RLS keeps them readable
// only as community content with no profile attribution.

interface Body { reason?: string }

export async function POST(req: NextRequest) {
  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'account-delete', null),
    max: 3,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await readJsonBody<Body>(req, 4 * 1024);
  const reason = body instanceof NextResponse ? null : (body.reason ?? null);

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
  const ua = req.headers.get('user-agent') || null;

  // Record the request first so we have an immutable audit trail even if the
  // delete itself fails partway through. The unique-pending index prevents
  // a user from queueing two simultaneous deletions.
  const { error: requestError } = await (db as any)
    .from('trace_account_deletion_requests')
    .insert({
      auth_id: caller.authId,
      reason: reason ? String(reason).slice(0, 500) : null,
      ip_address: ip,
      user_agent: ua,
      status: 'processing',
    });
  if (requestError && !(requestError.code === '23505')) {
    // 23505 = duplicate-pending; still proceed to delete in case the prior
    // attempt stalled. Any other error means we can't trust the audit row.
    return NextResponse.json({ error: 'Failed to record deletion request' }, { status: 500 });
  }

  // Audit-log the intent before destructive work.
  await recordAuthEvent({
    authId: caller.authId,
    type: 'logout',
    req,
    metadata: { event: 'account_deletion_requested', reason },
  });

  // Delete the auth user. ON DELETE CASCADE on every trace_* foreign key to
  // auth.users.id removes the user's profile and all owned rows in one shot.
  const { error: delErr } = await (db.auth as any).admin.deleteUser(caller.authId);
  if (delErr) {
    return NextResponse.json({ error: 'Account deletion failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
