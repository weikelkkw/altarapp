import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ── Config ────────────────────────────────────────────────────────────────────
// Add to .env.local:
//   ADMIN_EMAILS=you@email.com,other@email.com
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  if (!ADMIN_EMAILS.length) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user?.email) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  return user;
}

function groupByDay(items: { created_at: string }[], days = 7) {
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr.slice(5), // MM-DD
      count: items.filter(item => item.created_at?.startsWith(dateStr)).length,
    });
  }
  return result;
}

// ── GET — fetch all admin data ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const db = getAdminClient()!;
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    profilesRes,
    postsRes,
    commentsRes,
    groupsRes,
    highlightsRes,
    prayersRes,
    notesRes,
    encountersRes,
  ] = await Promise.all([
    db.from('trace_profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    db.from('trace_posts').select('*, author:trace_profiles!user_id(display_name, avatar_color)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
    db.from('trace_comments').select('id, created_at', { count: 'exact' }),
    db.from('trace_groups').select('*, creator:trace_profiles!created_by(display_name, avatar_color)', { count: 'exact' }).order('created_at', { ascending: false }),
    db.from('trace_highlights').select('id, created_at', { count: 'exact' }),
    db.from('trace_prayers').select('id, created_at', { count: 'exact' }),
    db.from('trace_notes').select('id, created_at', { count: 'exact' }),
    db.from('trace_encounters').select('id, created_at', { count: 'exact' }),
  ]);

  const allProfiles = profilesRes.data || [];
  const allPosts = postsRes.data || [];
  const allComments = commentsRes.data || [];
  const allPrayers = prayersRes.data || [];

  // Compute stats
  const newUsersToday = allProfiles.filter((p: any) => p.created_at?.startsWith(today)).length;
  const newUsersWeek = allProfiles.filter((p: any) => p.created_at >= weekAgo).length;
  const postsToday = allPosts.filter((p: any) => p.created_at?.startsWith(today)).length;
  const commentsToday = allComments.filter((c: any) => c.created_at?.startsWith(today)).length;

  // 7-day sparklines
  const recentProfiles = allProfiles.filter((p: any) => p.created_at >= weekAgo);
  const recentPosts = allPosts.filter((p: any) => p.created_at >= weekAgo);

  // Experience distribution
  const levels = ['beginner', 'intermediate', 'advanced'];
  const experienceLevels = [
    ...levels.map(level => ({
      level,
      count: allProfiles.filter((p: any) => p.experience_level === level).length,
    })),
    { level: 'not set', count: allProfiles.filter((p: any) => !p.experience_level).length },
  ];

  return NextResponse.json({
    stats: {
      userCount: profilesRes.count || 0,
      newUsersToday,
      newUsersWeek,
      postCount: postsRes.count || 0,
      postsToday,
      groupCount: groupsRes.count || 0,
      commentCount: commentsRes.count || 0,
      commentsToday,
      highlightCount: highlightsRes.count || 0,
      prayerCount: prayersRes.count || 0,
      noteCount: notesRes.count || 0,
      encounterCount: encountersRes.count || 0,
    },
    recentUsers: allProfiles.slice(0, 100),
    posts: allPosts.slice(0, 100),
    groups: groupsRes.data || [],
    signupsByDay: groupByDay(recentProfiles),
    postsByDay: groupByDay(recentPosts),
    experienceLevels,
  });
}

// ── DELETE — admin remove content ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  let body: { table: string; id: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { table, id } = body;
  const allowed = ['trace_posts', 'trace_comments', 'trace_groups'];
  if (!allowed.includes(table) || !id) return NextResponse.json({ error: 'Not allowed' }, { status: 400 });

  const db = getAdminClient()!;
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
