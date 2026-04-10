'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'users' | 'content' | 'groups' | 'analytics' | 'settings';

interface Profile {
  id: string;
  auth_id: string;
  display_name: string;
  avatar_color: string;
  profile_picture_url: string | null;
  is_public: boolean;
  experience_level: string;
  streak: number;
  gospel_completed: boolean;
  devotionals_completed: number;
  reading_goal: number;
  church: string;
  denomination: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  verse_ref: string;
  category: string;
  created_at: string;
  author_name?: string;
  likes_count?: number;
  prayers_count?: number;
  comments_count?: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalPosts: number;
  totalComments: number;
  totalPrayers: number;
  totalGroups: number;
  totalHighlights: number;
  totalNotes: number;
  recentUsers: Profile[];
  recentPosts: Post[];
}

interface AnalyticsData {
  signupsByDay: { date: string; count: number }[];
  activeUsers: { name: string; post_count: number }[];
  experienceLevels: { level: string; count: number }[];
  postsByDay: { date: string; count: number }[];
  totalPrayers: number;
  totalEncounters: number;
}

interface SettingsData {
  announcementText: string;
  features: Record<string, boolean>;
}

// ─── Theme Constants ──────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0a0f0c',
  card: 'rgba(255,255,255,0.03)',
  cardHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#60a5fa',
  accentDim: 'rgba(96,165,250,0.15)',
  text: '#e2e8f0',
  textMuted: 'rgba(255,255,255,0.5)',
  danger: '#f87171',
  dangerDim: 'rgba(248,113,113,0.15)',
  success: '#4ade80',
  successDim: 'rgba(74,222,128,0.15)',
  warn: '#fbbf24',
  warnDim: 'rgba(251,191,36,0.15)',
};

const DEFAULT_FEATURES: Record<string, boolean> = {
  reading_plans: true,
  community: true,
  worship_mode: true,
  ai_study: true,
  kingdom_groups: true,
  direct_messages: true,
  fire_mode: true,
  gospel_presentation: true,
};

// ─── Helper Components ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${COLORS.border}`,
        borderTopColor: COLORS.accent, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '20px 24px', flex: '1 1 200px', minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: 'Montserrat, sans-serif' }}>{value}</div>
    </div>
  );
}

function Badge({ children, color = COLORS.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      background: color + '22', color, fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 99, letterSpacing: 0.5,
    }}>{children}</span>
  );
}

function Button({ children, onClick, variant = 'primary', disabled = false, style: extraStyle = {} }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'danger' | 'ghost'; disabled?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'system-ui', transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: COLORS.accent, color: '#000' },
    danger: { background: COLORS.danger, color: '#000' },
    ghost: { background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extraStyle }}>{children}</button>;
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: '10px 16px', color: COLORS.text, fontSize: 14,
        outline: 'none', width: '100%', maxWidth: 400, fontFamily: 'system-ui',
      }}
    />
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◆' },
  { id: 'users', label: 'Users', icon: '◉' },
  { id: 'content', label: 'Content', icon: '▤' },
  { id: 'groups', label: 'Kingdom Groups', icon: '⬡' },
  { id: 'analytics', label: 'Analytics', icon: '◈' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function Sidebar({ active, onNavigate, collapsed, onToggle }: {
  active: Section; onNavigate: (s: Section) => void; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: collapsed ? 64 : 240, background: 'rgba(0,0,0,0.4)',
      borderRight: `1px solid ${COLORS.border}`, display: 'flex',
      flexDirection: 'column', transition: 'width 0.25s ease', zIndex: 100,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 72,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${COLORS.accent}, #818cf8)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, color: '#000', flexShrink: 0,
        }}>T</div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: COLORS.text }}>The Altar Admin</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Bible App Portal</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '12px 16px' : '12px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? COLORS.accentDim : 'transparent',
              color: isActive ? COLORS.accent : COLORS.textMuted,
              fontWeight: isActive ? 600 : 400, fontSize: 14, fontFamily: 'system-ui',
              transition: 'all 0.15s', textAlign: 'left', width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={onToggle} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: COLORS.textMuted, fontSize: 13, fontFamily: 'system-ui',
          justifyContent: collapsed ? 'center' : 'flex-start', width: '100%',
        }}>
          <span style={{ fontSize: 14 }}>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
        <Link href="/bible" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderRadius: 8, textDecoration: 'none',
          color: COLORS.textMuted, fontSize: 13, fontFamily: 'system-ui',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <span style={{ fontSize: 14 }}>←</span>
          {!collapsed && <span>Back to App</span>}
        </Link>
      </div>
    </aside>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
function DashboardSection({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  if (loading || !stats) return <Spinner />;
  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 24 }}>
        Dashboard Overview
      </h2>

      {/* Stat Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Users" value={stats.totalUsers} color={COLORS.accent} icon="◉" />
        <StatCard label="New Today" value={stats.newUsersToday} color={COLORS.success} icon="+" />
        <StatCard label="This Week" value={stats.newUsersWeek} color={COLORS.success} icon="◇" />
        <StatCard label="This Month" value={stats.newUsersMonth} color={COLORS.warn} icon="◈" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <StatCard label="Posts" value={stats.totalPosts} color={COLORS.accent} icon="▤" />
        <StatCard label="Comments" value={stats.totalComments} color={COLORS.text} icon="◫" />
        <StatCard label="Prayers" value={stats.totalPrayers} color="#c084fc" icon="✦" />
        <StatCard label="Groups" value={stats.totalGroups} color={COLORS.warn} icon="⬡" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
        <StatCard label="Highlights" value={stats.totalHighlights} color="#fbbf24" icon="◆" />
        <StatCard label="Notes" value={stats.totalNotes} color="#34d399" icon="▧" />
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Recent Signups */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>
            Recent Signups
          </h3>
          {stats.recentUsers.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No users yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: u.avatar_color || COLORS.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#000', flexShrink: 0,
                  }}>{(u.display_name || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{u.display_name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{u.church || 'No church'} · {u.experience_level || 'New'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{timeAgo(u.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>
            Recent Posts
          </h3>
          {stats.recentPosts.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No posts yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentPosts.map(p => (
                <div key={p.id} style={{ padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.accent }}>{p.author_name || 'Unknown'}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{timeAgo(p.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.4 }}>
                    {(p.content || '').slice(0, 120)}{(p.content || '').length > 120 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>♥ {p.likes_count || 0}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>✦ {p.prayers_count || 0}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>◫ {p.comments_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<{ id: string; display_name: string; experience_level: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('trace_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data);
    setLoading(false);
  }

  async function saveUser() {
    if (!editingUser) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }
    const { error } = await supabase
      .from('trace_profiles')
      .update({
        display_name: editingUser.display_name,
        experience_level: editingUser.experience_level,
      })
      .eq('id', editingUser.id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, display_name: editingUser.display_name, experience_level: editingUser.experience_level } : u));
      setEditingUser(null);
    }
    setSaving(false);
  }

  const filtered = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.church || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.experience_level || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          Users <Badge>{users.length}</Badge>
        </h2>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
      </div>

      {/* Users Table */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '48px 1fr 140px 80px 140px 120px',
          padding: '12px 20px', borderBottom: `1px solid ${COLORS.border}`,
          fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <span></span><span>Name</span><span>Experience</span><span>Streak</span><span>Church</span><span>Joined</span>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: COLORS.textMuted, fontSize: 14 }}>No users found.</div>
        ) : (
          filtered.map(u => (
            <div key={u.id}>
              <div
                onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr 140px 80px 140px 120px',
                  padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
                  cursor: 'pointer', transition: 'background 0.15s', alignItems: 'center',
                  background: expandedUser === u.id ? COLORS.cardHover : 'transparent',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: u.profile_picture_url ? `url(${u.profile_picture_url}) center/cover` : (u.avatar_color || COLORS.accent),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#000',
                }}>
                  {!u.profile_picture_url && (u.display_name || '?')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{u.display_name}</span>
                <span><Badge color={u.experience_level === 'advanced' ? COLORS.success : u.experience_level === 'intermediate' ? COLORS.warn : COLORS.textMuted}>{u.experience_level || 'new'}</Badge></span>
                <span style={{ fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{u.streak || 0}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{u.church || '—'}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(u.created_at)}</span>
              </div>

              {/* Expanded Detail */}
              {expandedUser === u.id && (
                <div style={{ padding: '16px 20px 20px 68px', background: COLORS.cardHover, borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Auth ID</span><br /><span style={{ fontSize: 12, color: COLORS.text, fontFamily: 'monospace' }}>{u.auth_id?.slice(0, 16)}...</span></div>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Denomination</span><br /><span style={{ fontSize: 13, color: COLORS.text }}>{u.denomination || '—'}</span></div>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Reading Goal</span><br /><span style={{ fontSize: 13, color: COLORS.text }}>{u.reading_goal || 0} chapters/day</span></div>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Gospel Completed</span><br /><span style={{ fontSize: 13, color: u.gospel_completed ? COLORS.success : COLORS.textMuted }}>{u.gospel_completed ? 'Yes' : 'No'}</span></div>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Devotionals</span><br /><span style={{ fontSize: 13, color: COLORS.text }}>{u.devotionals_completed || 0}</span></div>
                    <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Public Profile</span><br /><span style={{ fontSize: 13, color: COLORS.text }}>{u.is_public ? 'Yes' : 'No'}</span></div>
                  </div>

                  {editingUser?.id === u.id ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 4 }}>Display Name</label>
                        <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                          value={editingUser.display_name}
                          onChange={e => setEditingUser({ ...editingUser, display_name: e.target.value })}
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '8px 12px', color: COLORS.text, fontSize: 13, outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 4 }}>Experience Level</label>
                        <select
                          value={editingUser.experience_level}
                          onChange={e => setEditingUser({ ...editingUser, experience_level: e.target.value })}
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '8px 12px', color: COLORS.text, fontSize: 13, outline: 'none' }}
                        >
                          <option value="new">New</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <Button onClick={saveUser} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                      <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setEditingUser({ id: u.id, display_name: u.display_name, experience_level: u.experience_level || 'new' })}>
                      Edit User
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Content Section ──────────────────────────────────────────────────────────
function ContentSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    // Load posts
    const { data: postsData } = await supabase
      .from('trace_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (postsData && postsData.length > 0) {
      const authorIds = [...new Set(postsData.map((p: any) => p.user_id))];
      const postIds = postsData.map((p: any) => p.id);

      const [profilesRes, likesRes, prayersRes, commentsCountRes] = await Promise.all([
        supabase.from('trace_profiles').select('id, display_name').in('id', authorIds),
        supabase.from('trace_post_likes').select('post_id').in('post_id', postIds),
        supabase.from('trace_post_prayers').select('post_id').in('post_id', postIds),
        supabase.from('trace_comments').select('id, post_id').in('post_id', postIds),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p.display_name; });

      const likesMap: Record<string, number> = {};
      (likesRes.data || []).forEach((l: any) => { likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1; });

      const prayersMap: Record<string, number> = {};
      (prayersRes.data || []).forEach((p: any) => { prayersMap[p.post_id] = (prayersMap[p.post_id] || 0) + 1; });

      const commentsMap: Record<string, number> = {};
      (commentsCountRes.data || []).forEach((c: any) => { commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1; });

      setPosts(postsData.map((p: any) => ({
        ...p,
        author_name: profileMap[p.user_id] || 'Unknown',
        likes_count: likesMap[p.id] || 0,
        prayers_count: prayersMap[p.id] || 0,
        comments_count: commentsMap[p.id] || 0,
      })));
    }

    // Load comments
    const { data: commentsData } = await supabase
      .from('trace_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (commentsData && commentsData.length > 0) {
      const commentAuthorIds = [...new Set(commentsData.map((c: any) => c.user_id))];
      const { data: cProfiles } = await supabase.from('trace_profiles').select('id, display_name').in('id', commentAuthorIds);
      const cpMap: Record<string, string> = {};
      (cProfiles || []).forEach((p: any) => { cpMap[p.id] = p.display_name; });

      setComments(commentsData.map((c: any) => ({ ...c, author_name: cpMap[c.user_id] || 'Unknown' })));
    }

    setLoading(false);
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this post? This will also delete all associated likes, prayers, and comments.')) return;
    setDeleting(postId);
    const supabase = createClient();
    if (!supabase) { setDeleting(null); return; }
    // Delete associated data then the post
    await Promise.all([
      supabase.from('trace_post_likes').delete().eq('post_id', postId),
      supabase.from('trace_post_prayers').delete().eq('post_id', postId),
      supabase.from('trace_comments').delete().eq('post_id', postId),
    ]);
    await supabase.from('trace_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    setDeleting(null);
  }

  async function deleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    setDeleting(commentId);
    const supabase = createClient();
    if (!supabase) { setDeleting(null); return; }
    await supabase.from('trace_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setDeleting(null);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 24 }}>
        Content Moderation
      </h2>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: COLORS.card, borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {(['posts', 'comments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: tab === t ? COLORS.accentDim : 'transparent',
            color: tab === t ? COLORS.accent : COLORS.textMuted,
            fontWeight: 600, fontSize: 13, fontFamily: 'system-ui', textTransform: 'capitalize',
          }}>
            {t} <span style={{ fontSize: 11, opacity: 0.7 }}>({t === 'posts' ? posts.length : comments.length})</span>
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No posts yet.</p>
          ) : posts.map(p => (
            <div key={p.id} style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.accent }}>{p.author_name}</span>
                  {p.verse_ref && <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>{p.verse_ref}</span>}
                  {p.category && <Badge color={COLORS.textMuted}>{p.category}</Badge>}
                </div>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDateTime(p.created_at)}</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.5, margin: '8px 0 12px' }}>
                {p.content}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>♥ {p.likes_count}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>✦ {p.prayers_count}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>◫ {p.comments_count}</span>
                </div>
                <Button variant="danger" onClick={() => deletePost(p.id)} disabled={deleting === p.id}>
                  {deleting === p.id ? 'Deleting...' : 'Delete Post'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No comments yet.</p>
          ) : comments.map(c => (
            <div key={c.id} style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '14px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.accent }}>{c.author_name}</span>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>on post {c.post_id?.slice(0, 8)}...</span>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.text, margin: 0 }}>{c.content}</p>
              </div>
              <Button variant="danger" onClick={() => deleteComment(c.id)} disabled={deleting === c.id} style={{ flexShrink: 0 }}>
                {deleting === c.id ? '...' : 'Delete'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kingdom Groups Section ───────────────────────────────────────────────────
function GroupsSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', is_public: true });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    const { data: groupsData } = await supabase
      .from('trace_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsData && groupsData.length > 0) {
      const groupIds = groupsData.map((g: any) => g.id);
      const { data: members } = await supabase
        .from('trace_group_members')
        .select('group_id')
        .in('group_id', groupIds);

      const memberCounts: Record<string, number> = {};
      (members || []).forEach((m: any) => { memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1; });

      setGroups(groupsData.map((g: any) => ({ ...g, member_count: memberCounts[g.id] || 0 })));
    } else {
      setGroups([]);
    }
    setLoading(false);
  }

  async function createGroup() {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    const supabase = createClient();
    if (!supabase) { setCreating(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    // Get profile id
    const { data: profile } = await supabase
      .from('trace_profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) { setCreating(false); return; }

    const { data, error } = await supabase
      .from('trace_groups')
      .insert({
        name: newGroup.name,
        description: newGroup.description,
        created_by: profile.id,
        is_public: newGroup.is_public,
      })
      .select()
      .single();

    if (!error && data) {
      setGroups(prev => [{ ...data, member_count: 0 }, ...prev]);
      setNewGroup({ name: '', description: '', is_public: true });
      setShowCreate(false);
    }
    setCreating(false);
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group and all its members?')) return;
    setDeleting(groupId);
    const supabase = createClient();
    if (!supabase) { setDeleting(null); return; }
    await supabase.from('trace_group_members').delete().eq('group_id', groupId);
    await supabase.from('trace_groups').delete().eq('id', groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setDeleting(null);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          Kingdom Groups <Badge>{groups.length}</Badge>
        </h2>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : '+ New Group'}</Button>
      </div>

      {/* Create Group Form */}
      {showCreate && (
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>Create New Group</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted, display: 'block', marginBottom: 4 }}>Group Name *</label>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="e.g., Young Adults Bible Study"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 14px', color: COLORS.text, fontSize: 14, outline: 'none', width: '100%', fontFamily: 'system-ui' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="What is this group about?"
                rows={3}
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 14px', color: COLORS.text, fontSize: 14, outline: 'none', width: '100%', fontFamily: 'system-ui', resize: 'vertical' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: COLORS.text }}>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="checkbox" checked={newGroup.is_public} onChange={e => setNewGroup({ ...newGroup, is_public: e.target.checked })} />
              Public group (anyone can join)
            </label>
            <Button onClick={createGroup} disabled={creating || !newGroup.name.trim()}>{creating ? 'Creating...' : 'Create Group'}</Button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {groups.length === 0 ? (
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No groups created yet.</p>
        ) : groups.map(g => (
          <div key={g.id} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, margin: 0 }}>{g.name}</h3>
              <Badge color={g.is_public ? COLORS.success : COLORS.warn}>{g.is_public ? 'Public' : 'Private'}</Badge>
            </div>
            {g.description && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 12px', lineHeight: 1.4 }}>{g.description}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 13, color: COLORS.text }}><strong>{g.member_count}</strong> <span style={{ color: COLORS.textMuted }}>members</span></span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(g.created_at)}</span>
              </div>
              <Button variant="danger" onClick={() => deleteGroup(g.id)} disabled={deleting === g.id} style={{ padding: '6px 14px', fontSize: 12 }}>
                {deleting === g.id ? '...' : 'Delete'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Section ────────────────────────────────────────────────────────
function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    // Get all profiles for signup trends and experience levels
    const { data: profiles } = await supabase.from('trace_profiles').select('created_at, experience_level, display_name');
    const { data: posts } = await supabase.from('trace_posts').select('user_id, created_at');
    const { data: prayers } = await supabase.from('trace_prayers').select('id');
    const { data: encounters } = await supabase.from('trace_encounters').select('id');

    // Signups by day (last 14 days)
    const signupsByDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      signupsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    (profiles || []).forEach(p => {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      if (signupsByDay.hasOwnProperty(day)) signupsByDay[day]++;
    });

    // Posts by day (last 14 days)
    const postsByDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      postsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    (posts || []).forEach(p => {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      if (postsByDay.hasOwnProperty(day)) postsByDay[day]++;
    });

    // Most active users (by post count)
    const userPostCounts: Record<string, number> = {};
    (posts || []).forEach(p => { userPostCounts[p.user_id] = (userPostCounts[p.user_id] || 0) + 1; });
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach(p => { /* profiles don't have id here, skip */ });

    // Get display names for active users
    const activeUserIds = Object.entries(userPostCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    let activeUsersWithNames: { name: string; post_count: number }[] = [];
    if (activeUserIds.length > 0) {
      const { data: activeProfiles } = await supabase.from('trace_profiles').select('id, display_name').in('id', activeUserIds);
      const nameMap: Record<string, string> = {};
      (activeProfiles || []).forEach((p: any) => { nameMap[p.id] = p.display_name; });
      activeUsersWithNames = activeUserIds.map(id => ({ name: nameMap[id] || 'Unknown', post_count: userPostCounts[id] }));
    }

    // Experience levels breakdown
    const expLevels: Record<string, number> = {};
    (profiles || []).forEach(p => {
      const level = p.experience_level || 'new';
      expLevels[level] = (expLevels[level] || 0) + 1;
    });

    setData({
      signupsByDay: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
      postsByDay: Object.entries(postsByDay).map(([date, count]) => ({ date, count })),
      activeUsers: activeUsersWithNames,
      experienceLevels: Object.entries(expLevels).map(([level, count]) => ({ level, count })),
      totalPrayers: (prayers || []).length,
      totalEncounters: (encounters || []).length,
    });
    setLoading(false);
  }

  if (loading || !data) return <Spinner />;

  const maxSignups = Math.max(...data.signupsByDay.map(d => d.count), 1);
  const maxPosts = Math.max(...data.postsByDay.map(d => d.count), 1);
  const totalExpUsers = data.experienceLevels.reduce((s, e) => s + e.count, 0) || 1;

  const EXP_COLORS: Record<string, string> = {
    new: '#94a3b8', beginner: '#60a5fa', intermediate: '#fbbf24', advanced: '#4ade80',
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 24 }}>Analytics</h2>

      {/* Prayer & Encounter Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="Prayer Journal Entries" value={data.totalPrayers} color="#c084fc" icon="✦" />
        <StatCard label="Encounters Logged" value={data.totalEncounters} color={COLORS.success} icon="◈" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Signups Chart */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>
            User Signups (14 days)
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
            {data.signupsByDay.map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: COLORS.textMuted }}>{d.count || ''}</span>
                <div style={{
                  width: '100%', minHeight: 4,
                  height: `${(d.count / maxSignups) * 120}px`,
                  background: `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accent}66)`,
                  borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease',
                }} />
                <span style={{ fontSize: 9, color: COLORS.textMuted, transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts Chart */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>
            Posts Per Day (14 days)
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
            {data.postsByDay.map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: COLORS.textMuted }}>{d.count || ''}</span>
                <div style={{
                  width: '100%', minHeight: 4,
                  height: `${(d.count / maxPosts) * 120}px`,
                  background: `linear-gradient(180deg, #c084fc, #c084fc66)`,
                  borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease',
                }} />
                <span style={{ fontSize: 9, color: COLORS.textMuted, transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        {/* Experience Level Breakdown */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>
            Experience Levels
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.experienceLevels.map(e => {
              const pct = Math.round((e.count / totalExpUsers) * 100);
              const color = EXP_COLORS[e.level] || COLORS.textMuted;
              return (
                <div key={e.level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: COLORS.text, textTransform: 'capitalize' }}>{e.level}</span>
                    <span style={{ fontSize: 13, color: COLORS.textMuted }}>{e.count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Active Users */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>
            Most Active Users
          </h3>
          {data.activeUsers.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No post activity yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.activeUsers.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i < 3 ? COLORS.accent : COLORS.card,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: i < 3 ? '#000' : COLORS.textMuted, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, color: COLORS.text }}>{u.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.accent }}>{u.post_count} posts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────────
function SettingsSection() {
  const [settings, setSettings] = useState<SettingsData>({
    announcementText: '',
    features: { ...DEFAULT_FEATURES },
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('trace-admin-settings');
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  function save() {
    localStorage.setItem('trace-admin-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 24 }}>Settings</h2>

      {/* Announcement */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>
          App Announcement
        </h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
          This text will appear as a banner in the app. Leave empty to hide.
        </p>
        <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
          value={settings.announcementText}
          onChange={e => setSettings({ ...settings, announcementText: e.target.value })}
          placeholder="e.g., Welcome to The Altar! New reading plans available now."
          rows={3}
          style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: '12px 16px', color: COLORS.text, fontSize: 14,
            outline: 'none', width: '100%', fontFamily: 'system-ui', resize: 'vertical',
          }}
        />
      </div>

      {/* Feature Flags */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>
          Feature Flags
        </h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
          Toggle features on or off for The Altar app.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {Object.entries(settings.features).map(([key, enabled]) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              padding: '12px 16px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
              background: enabled ? COLORS.successDim : 'transparent',
              transition: 'all 0.15s',
            }}>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setSettings(prev => ({
                    ...prev,
                    features: { ...prev.features, [key]: !enabled },
                  }));
                }}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: enabled ? COLORS.success : 'rgba(255,255,255,0.1)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', position: 'absolute', top: 2,
                  left: enabled ? 20 : 2, transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ fontSize: 14, color: COLORS.text, textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button onClick={save}>Save Settings</Button>
        {saved && <span style={{ fontSize: 13, color: COLORS.success, fontWeight: 500 }}>Settings saved successfully!</span>}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function TraceAdminPortal() {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAuthChecked(true); return; }
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setIsAuthed(!!session?.user);
      setAuthChecked(true);
    });
  }, []);

  // Load dashboard stats
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    const supabase = createClient();
    if (!supabase) { setDashboardLoading(false); return; }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalUsers },
      { count: newToday },
      { count: newWeek },
      { count: newMonth },
      { count: totalPosts },
      { count: totalComments },
      { count: totalPrayers },
      { count: totalGroups },
      { count: totalHighlights },
      { count: totalNotes },
      { data: recentUsers },
      { data: recentPostsRaw },
    ] = await Promise.all([
      supabase.from('trace_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trace_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('trace_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('trace_profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('trace_posts').select('*', { count: 'exact', head: true }),
      supabase.from('trace_comments').select('*', { count: 'exact', head: true }),
      supabase.from('trace_post_prayers').select('*', { count: 'exact', head: true }),
      supabase.from('trace_groups').select('*', { count: 'exact', head: true }),
      supabase.from('trace_highlights').select('*', { count: 'exact', head: true }),
      supabase.from('trace_notes').select('*', { count: 'exact', head: true }),
      supabase.from('trace_profiles').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('trace_posts').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    // Enrich recent posts with author names and counts
    let recentPosts: Post[] = [];
    if (recentPostsRaw && recentPostsRaw.length > 0) {
      const authorIds = [...new Set(recentPostsRaw.map((p: any) => p.user_id))];
      const postIds = recentPostsRaw.map((p: any) => p.id);
      const [pRes, lRes, prRes, cRes] = await Promise.all([
        supabase.from('trace_profiles').select('id, display_name').in('id', authorIds),
        supabase.from('trace_post_likes').select('post_id').in('post_id', postIds),
        supabase.from('trace_post_prayers').select('post_id').in('post_id', postIds),
        supabase.from('trace_comments').select('post_id').in('post_id', postIds),
      ]);
      const nm: Record<string, string> = {};
      (pRes.data || []).forEach((p: any) => { nm[p.id] = p.display_name; });
      const lm: Record<string, number> = {};
      (lRes.data || []).forEach((l: any) => { lm[l.post_id] = (lm[l.post_id] || 0) + 1; });
      const pm: Record<string, number> = {};
      (prRes.data || []).forEach((p: any) => { pm[p.post_id] = (pm[p.post_id] || 0) + 1; });
      const cm: Record<string, number> = {};
      (cRes.data || []).forEach((c: any) => { cm[c.post_id] = (cm[c.post_id] || 0) + 1; });
      recentPosts = recentPostsRaw.map((p: any) => ({
        ...p, author_name: nm[p.user_id] || 'Unknown',
        likes_count: lm[p.id] || 0, prayers_count: pm[p.id] || 0, comments_count: cm[p.id] || 0,
      }));
    }

    setDashboardStats({
      totalUsers: totalUsers || 0,
      newUsersToday: newToday || 0,
      newUsersWeek: newWeek || 0,
      newUsersMonth: newMonth || 0,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      totalPrayers: totalPrayers || 0,
      totalGroups: totalGroups || 0,
      totalHighlights: totalHighlights || 0,
      totalNotes: totalNotes || 0,
      recentUsers: recentUsers || [],
      recentPosts,
    });
    setDashboardLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthed && section === 'dashboard') loadDashboard();
  }, [isAuthed, section, loadDashboard]);

  // Responsive sidebar
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setSidebarCollapsed(true);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Not yet checked
  if (!authChecked) {
    return (
      <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthed) {
    return (
      <div style={{
        background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui', color: COLORS.text,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.accent}, #818cf8)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#000', margin: '0 auto 24px',
          }}>T</div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>The Altar Admin</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
            You must be signed in to access the admin portal. Please sign in through The Altar app first.
          </p>
          <Link href="/bible/auth?next=/bible/admin" style={{
            display: 'inline-block', padding: '12px 32px', borderRadius: 10,
            background: COLORS.accent, color: '#000', fontWeight: 700, fontSize: 15,
            textDecoration: 'none',
          }}>
            Sign In to Access Admin
          </Link>
        </div>
      </div>
    );
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: 'system-ui', color: COLORS.text }}>
      <Sidebar
        active={section}
        onNavigate={setSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main style={{
        marginLeft: sidebarWidth, padding: '32px 40px', transition: 'margin-left 0.25s ease',
        maxWidth: 1200,
      }}>
        {/* Top bar with section title */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
              The Altar Admin
            </div>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 28, fontWeight: 700, color: COLORS.text, margin: 0 }}>
              {NAV_ITEMS.find(n => n.id === section)?.label || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: COLORS.success,
            }} />
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>Connected</span>
          </div>
        </div>

        {/* Section Content */}
        {section === 'dashboard' && <DashboardSection stats={dashboardStats} loading={dashboardLoading} />}
        {section === 'users' && <UsersSection />}
        {section === 'content' && <ContentSection />}
        {section === 'groups' && <GroupsSection />}
        {section === 'analytics' && <AnalyticsSection />}
        {section === 'settings' && <SettingsSection />}
      </main>

      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { background: ${COLORS.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::selection { background: ${COLORS.accent}44; }
        select option { background: #1a1f1c; color: ${COLORS.text}; }
      `}</style>
    </div>
  );
}
