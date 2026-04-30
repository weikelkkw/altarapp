import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  verifyAuth,
} from '@/lib/api/security';

// GET /api/account/export
// User-initiated GDPR/CCPA "right of access" + "right to data portability".
// Returns a single JSON object containing every row across the trace_* tables
// owned by the caller. Streamed back as an attachment so browsers offer
// "Save as…" rather than rendering. Limited to one export per user per minute
// to keep DB load bounded.

const TABLES_BY_PROFILE_ID: { table: string; column: string }[] = [
  { table: 'trace_profiles',          column: 'id' },
  { table: 'trace_posts',             column: 'user_id' },
  { table: 'trace_comments',          column: 'user_id' },
  { table: 'trace_post_likes',        column: 'user_id' },
  { table: 'trace_post_prayers',      column: 'user_id' },
  { table: 'trace_prayer_comments',   column: 'user_id' },
  { table: 'trace_prayers',           column: 'user_id' },
  { table: 'trace_encounters',        column: 'user_id' },
  { table: 'trace_notes',             column: 'user_id' },
  { table: 'trace_highlights',        column: 'user_id' },
  { table: 'trace_messages',          column: 'sender_id' },
  { table: 'trace_event_rsvps',       column: 'user_id' },
  { table: 'trace_plan_progress',     column: 'user_id' },
  { table: 'trace_message_reactions', column: 'user_id' },
  { table: 'trace_group_members',     column: 'user_id' },
];

// trace_friendships and trace_prayer_deliveries are bidirectional — fetch both
// directions so the export covers everything the user is part of.
const BIDIRECTIONAL_BY_PROFILE_ID: { table: string; columns: [string, string] }[] = [
  { table: 'trace_friendships',        columns: ['requester_id', 'addressee_id'] },
  { table: 'trace_prayer_deliveries',  columns: ['sender_id', 'recipient_id'] },
];

const TABLES_BY_AUTH_ID: { table: string; column: string }[] = [
  { table: 'trace_auth_events',                column: 'auth_id' },
  { table: 'trace_policy_acceptance',          column: 'auth_id' },
  { table: 'trace_account_deletion_requests',  column: 'auth_id' },
];

export async function GET(req: NextRequest) {
  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'account-export', null),
    max: 1,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const out: Record<string, unknown> = {
    _meta: {
      generatedAt: new Date().toISOString(),
      authId: caller.authId,
      profileId: caller.profileId,
      email: caller.email ?? null,
      schema: 'thealtar.export.v1',
    },
  };

  for (const { table, column } of TABLES_BY_PROFILE_ID) {
    const { data, error } = await (db as any).from(table).select('*').eq(column, caller.profileId);
    out[table] = error ? { error: error.message } : (data ?? []);
  }

  for (const { table, columns } of BIDIRECTIONAL_BY_PROFILE_ID) {
    const { data, error } = await (db as any)
      .from(table)
      .select('*')
      .or(`${columns[0]}.eq.${caller.profileId},${columns[1]}.eq.${caller.profileId}`);
    out[table] = error ? { error: error.message } : (data ?? []);
  }

  for (const { table, column } of TABLES_BY_AUTH_ID) {
    const { data, error } = await (db as any).from(table).select('*').eq(column, caller.authId);
    out[table] = error ? { error: error.message } : (data ?? []);
  }

  // trace_content_reports — return reports the caller filed.
  {
    const { data, error } = await (db as any)
      .from('trace_content_reports')
      .select('*')
      .eq('reporter_id', caller.profileId);
    out['trace_content_reports'] = error ? { error: error.message } : (data ?? []);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return NextResponse.json(out, {
    headers: {
      'Content-Disposition': `attachment; filename="thealtar-export-${stamp}.json"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
