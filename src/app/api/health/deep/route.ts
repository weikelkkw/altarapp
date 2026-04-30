import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api/security';

// /api/health/deep — dependency probe.
//
// Hits the Supabase database with a cheap read so an external monitor can
// distinguish "static surface OK but DB is unreachable" from a fully healthy
// state. Use the shallow /api/health for the page-load uptime monitor; use
// this one for the dependency-aware monitor.
//
// Returns:
//   200 { status: "ok", checks: {...} } — every probe passed
//   503 { status: "degraded", checks: {...} } — at least one dependency is down
//
// We deliberately query a tiny known table (`trace_profiles` count) rather
// than `auth.users` so that a Supabase Auth outage doesn't mask a Database
// outage — and so we don't expose auth-row counts publicly.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProbeStatus = 'ok' | 'fail' | 'skipped';
type Checks = { db: ProbeStatus; dbLatencyMs?: number };

async function probeDb(): Promise<{ status: ProbeStatus; latencyMs?: number }> {
  const admin = getAdminClient();
  if (!admin) return { status: 'skipped' };
  const t0 = Date.now();
  try {
    const { error } = await admin
      .from('trace_profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (error) return { status: 'fail' };
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch {
    return { status: 'fail' };
  }
}

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';
  const region = process.env.VERCEL_REGION || 'local';
  const env = process.env.VERCEL_ENV || 'development';

  const db = await probeDb();
  const checks: Checks = { db: db.status };
  if (db.latencyMs !== undefined) checks.dbLatencyMs = db.latencyMs;

  const allOk = db.status === 'ok' || db.status === 'skipped';
  const status = allOk ? 'ok' : 'degraded';

  return NextResponse.json(
    { status, time: new Date().toISOString(), version: sha, env, region, checks },
    {
      status: allOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
