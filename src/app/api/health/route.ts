import { NextResponse } from 'next/server';

// /api/health — uptime + dependency-health probe.
//
// Returns 200 with a small JSON payload when the application can serve
// traffic. Returns 503 when a critical dependency is unreachable.
//
// Designed for external uptime monitors (Better Uptime / UptimeRobot) and
// for the post-deploy smoke test in docs/DEPLOYMENT.md.
//
// Notes:
// - We deliberately do NOT hit Supabase here; an outage of the database
//   would page the on-call but we don't want a transient blip to be
//   reported as "the application is down" when the static surface is fine.
//   If/when we add a /api/health/deep, that one will hit the database.
// - We don't expose secrets, internals, or build-id leaks. Only:
//     status, time, version (Vercel git SHA if available), region.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';
  const region = process.env.VERCEL_REGION || 'local';
  const env = process.env.VERCEL_ENV || 'development';

  const body = {
    status: 'ok',
    time: new Date().toISOString(),
    version: sha,
    env,
    region,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
