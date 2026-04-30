import 'server-only';
import { NextRequest } from 'next/server';
import { getAdminClient } from './security';

export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'signup'
  | 'password_change'
  | 'password_reset_requested'
  | 'logout'
  | 'rate_limit_exceeded'
  | 'unauthorized_access';

export async function recordAuthEvent(opts: {
  authId?: string | null;
  type: AuthEventType;
  req?: NextRequest;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminClient();
  if (!db) return;
  const ip = opts.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || opts.req?.headers.get('x-real-ip')
    || null;
  const ua = opts.req?.headers.get('user-agent') || null;
  try {
    await db.from('trace_auth_events').insert({
      auth_id:    opts.authId ?? null,
      event_type: opts.type,
      ip_address: ip,
      user_agent: ua,
      metadata:   opts.metadata ?? {},
    });
  } catch {
    // Audit logging must never break the caller.
  }
}
