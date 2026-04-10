'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = 'overview' | 'members' | 'content' | 'groups' | 'analytics' | 'settings';
type AuthState = 'checking' | 'unauthorized' | 'ready';

interface Stats {
  userCount: number; newUsersToday: number; newUsersWeek: number;
  postCount: number; postsToday: number; groupCount: number;
  commentCount: number; commentsToday: number; highlightCount: number;
  prayerCount: number; noteCount: number; encounterCount: number;
}

interface AdminData {
  stats: Stats;
  recentUsers: any[];
  posts: any[];
  groups: any[];
  signupsByDay: { date: string; count: number }[];
  postsByDay: { date: string; count: number }[];
  experienceLevels: { level: string; count: number }[];
}

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#080808',
  sidebar:  '#0c0c0c',
  card:     'rgba(255,255,255,0.03)',
  cardHov:  'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.07)',
  text:     '#e2e8f0',
  muted:    'rgba(255,255,255,0.42)',
  gold:     '#c9a84c',
  blue:     '#60a5fa',
  green:    '#4ade80',
  red:      '#f87171',
  purple:   '#a78bfa',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const dy = Math.floor(h / 24);
  if (dy > 0) return `${dy}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Reusable UI ───────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 34 }: { name: string; color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color || C.gold + '33', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 26px' }}>
      <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1, marginBottom: sub ? 6 : 0, fontFamily: 'system-ui' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color, background: color + '18', padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {label}
    </span>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.red}25`, background: `${C.red}0c`, color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = `${C.red}18`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${C.red}0c`; }}
    >
      Delete
    </button>
  );
}

function VBarChart({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 88 }}>
      {data.map(d => (
        <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            background: d.count > 0 ? color : 'rgba(255,255,255,0.05)',
            height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%`,
            transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
          <span style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>{d.date}</span>
        </div>
      ))}
    </div>
  );
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
      <span style={{ width: 90, fontSize: 11, color: C.muted, textAlign: 'right', flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ width: 32, fontSize: 12, fontWeight: 700, color: C.text, textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

// ── Nav Icon SVGs ─────────────────────────────────────────────────────────────
function IconGrid() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function IconUsers() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconContent() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IconGroups() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconChart() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconSettings() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>; }

// ── Sections ──────────────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: AdminData }) {
  const { stats, recentUsers, posts, signupsByDay, postsByDay } = data;
  return (
    <div>
      <SectionHeader title="Overview" sub="The Altar at a glance" />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Members" value={fmt(stats.userCount)} sub={`+${stats.newUsersToday} today · +${stats.newUsersWeek} this week`} color={C.gold} />
        <StatCard label="Community Posts" value={fmt(stats.postCount)} sub={`${stats.postsToday} posted today`} color={C.blue} />
        <StatCard label="Kingdom Groups" value={fmt(stats.groupCount)} color={C.gold} />
        <StatCard label="Comments" value={fmt(stats.commentCount)} sub={`${stats.commentsToday} today`} color={C.blue} />
        <StatCard label="Verse Highlights" value={fmt(stats.highlightCount)} sub="Total marked" color={C.purple} />
        <StatCard label="Prayer Entries" value={fmt(stats.prayerCount)} sub="Personal journals" color={C.green} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16, fontWeight: 600 }}>New Members — Last 7 Days</p>
          <VBarChart data={signupsByDay} color={C.gold} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16, fontWeight: 600 }}>New Posts — Last 7 Days</p>
          <VBarChart data={postsByDay} color={C.blue} />
        </div>
      </div>

      {/* Recent activity feeds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16, fontWeight: 600 }}>Recent Members</p>
          {recentUsers.slice(0, 6).map((u: any, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none' }}>
              <Avatar name={u.display_name || '?'} color={u.avatar_color} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.display_name || 'Anonymous'}</p>
                <p style={{ fontSize: 11, color: C.muted, textTransform: 'capitalize' }}>{u.experience_level || 'beginner'}</p>
              </div>
              <p style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{timeAgo(u.created_at)}</p>
            </div>
          ))}
          {recentUsers.length === 0 && <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '20px 0' }}>No members yet</p>}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16, fontWeight: 600 }}>Recent Posts</p>
          {posts.slice(0, 6).map((p: any, i) => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none' }}>
              <p style={{ fontSize: 12, color: C.text, lineHeight: 1.55, marginBottom: 4 }}>
                {p.content?.slice(0, 90)}{(p.content?.length || 0) > 90 ? '…' : ''}
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>{p.author?.display_name || 'Unknown'} · {timeAgo(p.created_at)}</p>
            </div>
          ))}
          {posts.length === 0 && <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '20px 0' }}>No posts yet</p>}
        </div>
      </div>
    </div>
  );
}

function MembersSection({ users, search, setSearch }: { users: any[]; search: string; setSearch: (s: string) => void }) {
  const filtered = users.filter(u => !search || (u.display_name || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <SectionHeader title="Members" sub={`${users.length} total registered`} />

      <div style={{ marginBottom: 18 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
          style={{ width: '100%', padding: '12px 18px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          onFocus={e => { e.currentTarget.style.borderColor = C.gold + '44'; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
        />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', padding: '12px 22px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
          {['Member', 'Level', 'Joined', 'Status'].map(h => (
            <span key={h} style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>{h}</span>
          ))}
        </div>
        {filtered.slice(0, 50).map((u: any, i) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', padding: '14px 22px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.cardHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={u.display_name || '?'} color={u.avatar_color} size={38} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{u.display_name || 'Anonymous'}</p>
                <p style={{ fontSize: 11, color: C.muted }}>{u.auth_id?.slice(0, 8)}…</p>
              </div>
            </div>
            <span style={{ fontSize: 12, color: C.muted, textTransform: 'capitalize' }}>{u.experience_level || '—'}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(u.created_at)}</span>
            <Badge label="Active" color={C.green} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: C.muted }}>No members found</div>
        )}
      </div>
      {filtered.length > 50 && <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 12 }}>Showing 50 of {filtered.length}</p>}
    </div>
  );
}

function ContentSection({ posts, filter, setFilter, onDelete }: {
  posts: any[]; filter: string;
  setFilter: (f: string) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = filter === 'all' ? posts : posts.filter(p =>
    p.verse_ref === filter || p.category === filter
  );
  return (
    <div>
      <SectionHeader title="Content" sub={`${posts.length} total posts`} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all', 'All Posts'], ['prayer-request', 'Prayer Requests'], ['testimony', 'Testimonies']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: '8px 18px', borderRadius: 10, border: `1px solid ${filter === val ? C.gold + '44' : C.border}`,
            background: filter === val ? C.gold + '10' : 'transparent', color: filter === val ? C.gold : C.muted,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.slice(0, 40).map((p: any) => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                <Avatar name={p.author?.display_name || '?'} color={p.author?.avatar_color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.author?.display_name || 'Unknown'}</span>
                    {p.verse_ref === 'prayer-request' && <Badge label="Prayer" color={C.blue} />}
                    {p.verse_ref === 'testimony' && <Badge label="Testimony" color={C.gold} />}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{timeAgo(p.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>{p.content}</p>
                </div>
              </div>
              <DeleteBtn onClick={() => onDelete(p.id)} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
            No content here
          </div>
        )}
      </div>
    </div>
  );
}

function GroupsSection({ groups, onDelete }: { groups: any[]; onDelete: (id: string) => void }) {
  return (
    <div>
      <SectionHeader title="Kingdom Groups" sub={`${groups.length} total`} />
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', padding: '12px 22px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
          {['Group', 'Created By', 'Date', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>{h}</span>
          ))}
        </div>
        {groups.map((g: any, i) => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', padding: '16px 22px', borderBottom: i < groups.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', gap: 16 }}
            onMouseEnter={e => { e.currentTarget.style.background = C.cardHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{g.icon || '✝️'} {g.name}</p>
              {g.description && <p style={{ fontSize: 12, color: C.muted }}>{g.description.slice(0, 60)}{g.description.length > 60 ? '…' : ''}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={g.creator?.display_name || '?'} color={g.creator?.avatar_color} size={28} />
              <span style={{ fontSize: 12, color: C.muted }}>{g.creator?.display_name || 'Unknown'}</span>
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(g.created_at)}</span>
            <DeleteBtn onClick={() => onDelete(g.id)} />
          </div>
        ))}
        {groups.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: C.muted }}>No groups yet</div>
        )}
      </div>
    </div>
  );
}

function AnalyticsSection({ data }: { data: AdminData }) {
  const { stats, signupsByDay, postsByDay, experienceLevels } = data;
  const maxExp = Math.max(...experienceLevels.map(e => e.count), 1);
  const engMax = Math.max(stats.highlightCount, stats.prayerCount, stats.noteCount, stats.commentCount, stats.encounterCount, 1);
  return (
    <div>
      <SectionHeader title="Analytics" sub="Growth and engagement metrics" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label="Total Members" value={fmt(stats.userCount)} color={C.gold} />
        <StatCard label="Total Posts" value={fmt(stats.postCount)} color={C.blue} />
        <StatCard label="Study Notes" value={fmt(stats.noteCount)} color={C.purple} />
        <StatCard label="Devotionals" value={fmt(stats.encounterCount)} color={C.green} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Member Growth</p>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>New signups over last 7 days</p>
          <VBarChart data={signupsByDay} color={C.gold} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Post Activity</p>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>Community posts over last 7 days</p>
          <VBarChart data={postsByDay} color={C.blue} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Experience Levels</p>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>How members identify their faith journey</p>
          {experienceLevels.map(e => (
            <HBar key={e.level} label={e.level}
              value={e.count} max={maxExp}
              color={e.level === 'advanced' ? C.gold : e.level === 'intermediate' ? C.blue : e.level === 'beginner' ? C.green : C.muted}
            />
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Engagement Breakdown</p>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Total actions across all users</p>
          {[
            { label: 'Highlights', value: stats.highlightCount, color: C.gold },
            { label: 'Prayers', value: stats.prayerCount, color: C.blue },
            { label: 'Notes', value: stats.noteCount, color: C.purple },
            { label: 'Comments', value: stats.commentCount, color: C.green },
            { label: 'Devotionals', value: stats.encounterCount, color: 'rgba(251,191,36,0.9)' },
          ].map(item => (
            <HBar key={item.label} label={item.label} value={item.value} max={engMax} color={item.color} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ adminEmail }: { adminEmail: string }) {
  const features = [
    { key: 'community', label: 'Community Feed', desc: 'Prayer wall and testimonies' },
    { key: 'kingdom_groups', label: 'Kingdom Groups', desc: 'Study groups and group chat' },
    { key: 'direct_messages', label: 'Direct Messages', desc: 'User-to-user messaging' },
    { key: 'ai_study', label: 'AI Study Mode', desc: 'Claude-powered Bible study assistant' },
    { key: 'fire_mode', label: 'Fire Mode', desc: 'Focused distraction-free reading' },
    { key: 'gospel_presentation', label: 'Gospel Presentation', desc: 'Structured gospel walkthrough' },
    { key: 'worship_mode', label: 'Worship Mode', desc: 'Spotify integration' },
  ];
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('altar-admin-flags') || '{}'); } catch { return {}; }
  });
  const toggle = (key: string) => {
    const next = { ...flags, [key]: !(flags[key] ?? true) };
    setFlags(next);
    try { localStorage.setItem('altar-admin-flags', JSON.stringify(next)); } catch {}
  };

  return (
    <div>
      <SectionHeader title="Settings" sub="Portal configuration and feature management" />

      {/* Admin account card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px', marginBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Admin Account</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gold + '18', border: `1px solid ${C.gold}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{adminEmail}</p>
            <p style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Administrator · Full Access</p>
          </div>
        </div>
      </div>

      {/* Environment setup */}
      <div style={{ background: C.blue + '08', border: `1px solid ${C.blue}22`, borderRadius: 18, padding: '24px', marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 8 }}>Environment Setup</p>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
          Add these to your <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: 5, color: C.text, fontSize: 11 }}>.env.local</code> to configure admin access:
        </p>
        <pre style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '16px 18px', fontSize: 12, color: '#a5f3fc', lineHeight: 2, margin: 0, overflow: 'auto', fontFamily: 'monospace' }}>
{`ADMIN_EMAILS=your@email.com,second@email.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`}
        </pre>
      </div>

      {/* Feature flags */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Feature Flags</p>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>
          These flags are stored locally in this browser. To enforce globally, wire them to a server-side config table.
        </p>
        {features.map((f, i) => {
          const on = flags[f.key] ?? true;
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < features.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{f.label}</p>
                <p style={{ fontSize: 12, color: C.muted }}>{f.desc}</p>
              </div>
              <button onClick={() => toggle(f.key)} style={{
                width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: on ? C.gold : 'rgba(255,255,255,0.1)', position: 'relative',
                transition: 'background 0.25s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
                  left: on ? 27 : 4, boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const NAV: { id: Section; label: string; Icon: () => JSX.Element }[] = [
  { id: 'overview',   label: 'Overview',   Icon: IconGrid },
  { id: 'members',    label: 'Members',    Icon: IconUsers },
  { id: 'content',    label: 'Content',    Icon: IconContent },
  { id: 'groups',     label: 'Groups',     Icon: IconGroups },
  { id: 'analytics',  label: 'Analytics',  Icon: IconChart },
  { id: 'settings',   label: 'Settings',   Icon: IconSettings },
];

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<AdminData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [search, setSearch] = useState('');
  const [contentFilter, setContentFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async (token: string) => {
    const res = await fetch('/api/admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) { setAuthState('unauthorized'); return; }
    const json = await res.json();
    setData(json);
    setAuthState('ready');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAuthState('unauthorized'); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/bible/auth?next=/admin'); return; }
      setUserEmail(session.user.email || '');
      load(session.access_token);
    });
  }, [router, load]);

  const handleDelete = useCallback(async (table: string, id: string) => {
    if (!confirm('Permanently delete this? Cannot be undone.')) return;
    const supabase = createClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    });
    setData(prev => {
      if (!prev) return prev;
      if (table === 'trace_posts') return { ...prev, posts: prev.posts.filter(p => p.id !== id) };
      if (table === 'trace_groups') return { ...prev, groups: prev.groups.filter(g => g.id !== id) };
      return prev;
    });
  }, []);

  const handleRefresh = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setRefreshing(true);
    await load(session.access_token);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/bible/auth?logout=1');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 18 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: `2px solid ${C.gold}22`, borderTopColor: C.gold, animation: 'spin 0.9s linear infinite' }} />
        <p style={{ color: C.muted, fontSize: 13 }}>Loading admin portal…</p>
      </div>
    );
  }

  // ── Unauthorized ───────────────────────────────────────────────────────────
  if (authState === 'unauthorized') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 20, padding: 32 }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill={C.red}/></svg>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 10 }}>Access Denied</p>
          <p style={{ fontSize: 14, color: C.muted, maxWidth: 340, lineHeight: 1.7 }}>
            Your account is not authorized to access the admin portal. Add your email to <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, color: C.text }}>ADMIN_EMAILS</code> in your <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, color: C.text }}>.env.local</code>.
          </p>
        </div>
        <button onClick={() => router.push('/bible')} style={{ padding: '10px 26px', borderRadius: 10, background: C.gold + '15', border: `1px solid ${C.gold}33`, color: C.gold, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Return to The Altar
        </button>
      </div>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text, overflow: 'hidden' }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Sidebar ── */}
      <aside style={{ width: 232, flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '26px 20px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
            <svg width="11" height="17" viewBox="0 0 11 17" fill="none" style={{ filter: `drop-shadow(0 0 5px ${C.gold}66)`, flexShrink: 0 }}>
              <rect x="4" y="0" width="3" height="17" rx="0.75" fill={C.gold} />
              <rect x="0" y="4" width="11" height="3" rx="0.75" fill={C.gold} />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, lineHeight: 1 }}>The Altar</span>
          </div>
          <p style={{ fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', paddingLeft: 20, fontWeight: 600 }}>Admin Portal</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', borderRadius: 10,
                background: active ? C.gold + '14' : 'transparent',
                border: `1px solid ${active ? C.gold + '28' : 'transparent'}`,
                color: active ? C.gold : C.muted, fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', fontFamily: 'inherit',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; } }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}><Icon /></span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Refresh */}
        <div style={{ padding: '10px 10px 0' }}>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted, fontSize: 12, cursor: refreshing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>

        {/* User footer */}
        <div style={{ padding: '14px 10px 18px', borderTop: `1px solid ${C.border}`, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.gold + '20', border: `1px solid ${C.gold}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
              <p style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>Administrator</p>
            </div>
          </div>
          <button onClick={handleSignOut} style={{
            width: '100%', padding: '8px', borderRadius: 9, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + '33'; e.currentTarget.style.background = C.red + '08'; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '44px 52px' }}>
        {data && section === 'overview'  && <OverviewSection data={data} />}
        {data && section === 'members'   && <MembersSection users={data.recentUsers} search={search} setSearch={setSearch} />}
        {data && section === 'content'   && <ContentSection posts={data.posts} filter={contentFilter} setFilter={setContentFilter} onDelete={id => handleDelete('trace_posts', id)} />}
        {data && section === 'groups'    && <GroupsSection groups={data.groups} onDelete={id => handleDelete('trace_groups', id)} />}
        {data && section === 'analytics' && <AnalyticsSection data={data} />}
        {section === 'settings'          && <SettingsSection adminEmail={userEmail} />}
      </main>
    </div>
  );
}
