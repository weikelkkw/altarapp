import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getProfileId(db: any, token: string): Promise<string | null> {
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data } = await db.from('trace_profiles').select('id').eq('auth_id', user.id).single();
  return (data as any)?.id ?? null;
}

// GET — suggest people to befriend from shared groups
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  if (!db) return NextResponse.json({ error: 'Server not configured — add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 });

  const profileId = await getProfileId(db, token);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all groupIds where caller is an approved member
  const { data: memberships } = await db
    .from('trace_group_members')
    .select('group_id')
    .eq('profile_id', profileId)
    .eq('status', 'approved');

  const groupIds: string[] = (memberships ?? []).map((m: any) => m.group_id);
  if (groupIds.length === 0) return NextResponse.json({ suggestions: [] });

  // Get all existing friendships (any status, either direction) to know who to exclude
  const { data: friendships } = await db
    .from('trace_friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

  const excludedIds = new Set<string>([profileId]);
  for (const f of friendships ?? []) {
    excludedIds.add((f as any).requester_id);
    excludedIds.add((f as any).addressee_id);
  }

  // Get all other approved members in those groups
  const { data: sharedMembers } = await db
    .from('trace_group_members')
    .select('profile_id')
    .in('group_id', groupIds)
    .eq('status', 'approved')
    .neq('profile_id', profileId);

  // Collect unique candidate profile ids not already in excludedIds
  const candidateIds = [...new Set<string>(
    (sharedMembers ?? [])
      .map((m: any) => m.profile_id as string)
      .filter((id) => !excludedIds.has(id))
  )];

  if (candidateIds.length === 0) return NextResponse.json({ suggestions: [] });

  // Fetch profiles for candidates, limited to 8
  const { data: profiles, error } = await db
    .from('trace_profiles')
    .select('id, display_name, username, avatar_color')
    .in('id', candidateIds)
    .limit(8);

  if (error) return NextResponse.json({ suggestions: [] });
  return NextResponse.json({ suggestions: profiles ?? [] });
}
