import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitKeyFor, readJsonBody, verifyAuth } from '@/lib/api/security';
import { recordAuthEvent, type AuthEventType } from '@/lib/api/audit';

// POST /api/auth/log — record an authentication event from the client.
// We can't (and shouldn't) trust the client to identify itself for failure
// events, so we accept the *type* and verify the session ourselves where
// applicable. For failure / pre-session events, the body's auth_id is used
// only as advisory metadata; the IP + UA are recorded regardless.
const ALLOWED: ReadonlySet<AuthEventType> = new Set<AuthEventType>([
  'login_success',
  'login_failure',
  'signup',
  'password_change',
  'password_reset_requested',
  'logout',
  'unauthorized_access',
]);

export async function POST(req: NextRequest) {
  // Rate limit by IP — we don't always have an authenticated profile here.
  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'auth-log', null),
    max: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody<{ type?: AuthEventType; advisoryAuthId?: string }>(req, 4 * 1024);
  if (body instanceof NextResponse) return body;

  const type = body.type;
  if (!type || !ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  // For success-style events we can verify the caller's session and pin the
  // event to a real auth_id. For failures we only get an advisory hint.
  let authId: string | null = null;
  if (type === 'login_success' || type === 'password_change' || type === 'logout' || type === 'signup') {
    const caller = await verifyAuth(req);
    if (caller) authId = caller.authId;
  }

  await recordAuthEvent({
    authId: authId ?? body.advisoryAuthId ?? null,
    type,
    req,
  });
  return NextResponse.json({ ok: true });
}
