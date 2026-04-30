import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  rateLimit,
  rateLimitKeyFor,
  readJsonBody,
  verifyAuth,
} from '@/lib/api/security';
import { recordAuthEvent } from '@/lib/api/audit';
import { COMBINED_VERSION, LEGAL_VERSIONS, MIN_AGE_YEARS } from '@/lib/legal/versions';

// POST /api/legal/accept
// Records a user's acceptance of Terms + Privacy at signup, with the policy
// version they actually saw and (optionally) their date of birth for COPPA
// gating. If the DOB indicates the user is under MIN_AGE_YEARS, the auth
// user is deleted immediately and a 451 is returned — defense-in-depth on
// top of the client-side block.

interface Body {
  dateOfBirth?: string; // ISO yyyy-mm-dd
  accepted?: { terms?: boolean; privacy?: boolean };
}

function ageFromDob(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const dob = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'legal-accept', null),
    max: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await readJsonBody<Body>(req, 4 * 1024);
  if (body instanceof NextResponse) return body;

  if (!body.accepted?.terms || !body.accepted?.privacy) {
    return NextResponse.json({ error: 'Acceptance of Terms and Privacy Policy is required.' }, { status: 400 });
  }

  // Optional but strongly preferred: collect DOB at signup to enforce COPPA.
  let recordedAge: number | null = null;
  if (body.dateOfBirth) {
    const age = ageFromDob(body.dateOfBirth);
    if (age == null) {
      return NextResponse.json({ error: 'Invalid date of birth.' }, { status: 400 });
    }
    if (age < MIN_AGE_YEARS) {
      // Server-side enforcement: remove the freshly-created auth user so no
      // child account persists. We swallow errors to avoid leaking signal.
      const db = getAdminClient();
      if (db) {
        try { await (db.auth as any).admin.deleteUser(caller.authId); } catch {}
      }
      await recordAuthEvent({
        authId: caller.authId,
        type: 'unauthorized_access',
        req,
        metadata: { reason: 'coppa_block', minAge: MIN_AGE_YEARS },
      });
      return NextResponse.json(
        { error: `You must be at least ${MIN_AGE_YEARS} years old to use The Altar.` },
        { status: 451 },
      );
    }
    recordedAge = age;
  }

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
  const ua = req.headers.get('user-agent') || null;

  const rows = [
    {
      auth_id: caller.authId,
      policy_type: 'terms',
      policy_version: LEGAL_VERSIONS.terms,
      ip_address: ip,
      user_agent: ua,
      metadata: { age: recordedAge, combined_version: COMBINED_VERSION },
    },
    {
      auth_id: caller.authId,
      policy_type: 'privacy',
      policy_version: LEGAL_VERSIONS.privacy,
      ip_address: ip,
      user_agent: ua,
      metadata: { age: recordedAge, combined_version: COMBINED_VERSION },
    },
  ];

  const { error } = await (db as any).from('trace_policy_acceptance').insert(rows);
  if (error) {
    return NextResponse.json({ error: 'Failed to record acceptance' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: COMBINED_VERSION });
}
