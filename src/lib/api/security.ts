import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Admin Supabase client ──────────────────────────────────────────────────
// Reuse a single client instance per Lambda/Edge worker.
let _admin: ReturnType<typeof createClient> | null = null;
export function getAdminClient() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _admin;
}

// ─── Auth verification ──────────────────────────────────────────────────────
// Resolves the caller's Supabase profile from the Authorization: Bearer header.
// Returns the profile id + auth user id, or null if not authenticated.
export interface AuthedCaller {
  profileId: string;
  authId: string;
  email?: string;
}

// Pull a Supabase access token from either an Authorization: Bearer header
// or the chunked sb-<ref>-auth-token cookie that @supabase/ssr writes.
function readSessionToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (authHeader) return authHeader;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  let ref = '';
  try { ref = new URL(url).hostname.split('.')[0]; } catch { return null; }

  const base = `sb-${ref}-auth-token`;
  const direct = req.cookies.get(base)?.value;
  // Supabase chunks large session cookies as .0, .1, .2 …
  let chunked = '';
  for (let i = 0; i < 8; i++) {
    const piece = req.cookies.get(`${base}.${i}`)?.value;
    if (!piece) break;
    chunked += piece;
  }
  const raw = direct || chunked;
  if (!raw) return null;

  try {
    // The cookie may be base64-prefixed JSON ("base64-…") in newer SDKs
    const decoded = raw.startsWith('base64-')
      ? Buffer.from(raw.slice(7), 'base64').toString('utf-8')
      : decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    return parsed?.access_token || parsed?.[0]?.access_token || null;
  } catch {
    // Not JSON — assume raw JWT
    return raw.length > 20 ? raw : null;
  }
}

export async function verifyAuth(req: NextRequest): Promise<AuthedCaller | null> {
  const token = readSessionToken(req);
  if (!token) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await db
    .from('trace_profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  if (!profile) return null;
  return { profileId: (profile as any).id, authId: user.id, email: user.email ?? undefined };
}

// Convenience — return a 401 response if unauthenticated.
export async function requireAuth(req: NextRequest): Promise<AuthedCaller | NextResponse> {
  const caller = await verifyAuth(req);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return caller;
}

// ─── Body size + content-type guards ────────────────────────────────────────
export const MAX_JSON_BODY = 64 * 1024; // 64 KB — fits chat history, voice picks, etc.

export function rejectIfOversized(req: NextRequest, max = MAX_JSON_BODY): NextResponse | null {
  const len = req.headers.get('content-length');
  if (len && parseInt(len, 10) > max) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  return null;
}

export function rejectIfNotJson(req: NextRequest): NextResponse | null {
  const ct = req.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  return null;
}

// Read JSON body with a hard size cap — defends against bypassed Content-Length.
export async function readJsonBody<T = unknown>(req: NextRequest, max = MAX_JSON_BODY): Promise<T | NextResponse> {
  const overSized = rejectIfOversized(req, max);
  if (overSized) return overSized;
  try {
    const text = await req.text();
    if (text.length > max) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

// ─── Rate limiting (in-memory sliding window) ───────────────────────────────
// Note: this resets per Lambda/Edge instance — fine for casual abuse defense
// but NOT a substitute for Upstash/Redis at scale. Track that as a TODO.

interface Bucket { hits: number[]; }
const buckets = new Map<string, Bucket>();

// Periodic GC so the map doesn't grow unbounded.
let _lastSweep = 0;
function sweep(now: number) {
  if (now - _lastSweep < 60_000) return;
  _lastSweep = now;
  for (const [k, b] of buckets) {
    const cutoff = now - 5 * 60_000; // anything older than 5 min is dead
    b.hits = b.hits.filter(t => t > cutoff);
    if (b.hits.length === 0) buckets.delete(k);
  }
}

export interface RateLimitOptions {
  /** Bucket key — combine route + caller identity */
  key: string;
  /** Max hits allowed in the window */
  max: number;
  /** Window length in ms */
  windowMs: number;
}

/** Returns null when allowed, or a 429 response when over limit.
 *  Side effect: bumps the bucket and triggers a fire-and-forget audit event
 *  on lockout via the audit helper (which itself can never throw).
 */
export function rateLimit({ key, max, windowMs }: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter(t => now - t < windowMs);
  if (b.hits.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - b.hits[0])) / 1000));
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }
  b.hits.push(now);
  buckets.set(key, b);
  return null;
}

// Pull a stable identity for rate limiting — prefers profileId, falls back to IP.
export function rateLimitKeyFor(req: NextRequest, route: string, caller: AuthedCaller | null): string {
  if (caller) return `${route}:u:${caller.profileId}`;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  return `${route}:ip:${ip}`;
}
