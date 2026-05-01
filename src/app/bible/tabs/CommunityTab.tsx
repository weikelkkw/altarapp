'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIdentity, BookDef, timeAgo } from '../types';
import { createClient } from '@/lib/supabase/client';
import MemberProfilePanel from './MemberProfilePanel';

// BibleStudyMode is a heavy modal that only opens from one entry point inside
// Community. Loading it lazily keeps it out of the chat-list initial bundle.
const BibleStudyMode = dynamic(() => import('./BibleStudyMode'), { ssr: false });
import MentionInput, { renderMessageWithMentions } from './MentionInput';
import FindFriends from './FindFriends';
import GroupEvents from './GroupEvents';
import GroupReactions from './GroupReactions';
import PinnedMessages, { ReplyPreview } from './PinnedMessages';
import StudyScheduler from './StudyScheduler';
import GroupReadingPlan from './GroupReadingPlan';

/* ─── Types ─────────────────────────────────────────────────── */

type Screen = 'home' | 'groups' | 'group-detail' | 'friends' | 'prayer' | 'testimonies' | 'send-prayer';

interface IncomingPrayer {
  id: string;
  content: string;
  prayed_at: string | null;
}

interface PrayerRequest {
  id: string; userId: string; authorName: string; authorColor: string;
  content: string; prayerCount: number; hasPrayed: boolean; createdAt: string;
}
interface Testimony {
  id: string; userId: string; authorName: string; authorColor: string;
  content: string; createdAt: string;
}
interface GroupMessage {
  id: string; authorName: string; authorColor: string;
  content: string; createdAt: string; isMine: boolean;
}
interface KingdomGroup {
  id: string; name: string; description: string; memberCount: number;
  icon: string; isMember?: boolean; isLeader?: boolean;
  pendingJoin?: boolean; privacy?: 'open' | 'request' | 'invite';
}
interface GroupMember {
  id: string; userId: string; name: string; color: string;
  role: 'leader' | 'member'; isMe: boolean; joinedAt: string;
}
interface JoinRequest {
  id: string; userId: string; userName: string; userColor: string; requestedAt: string;
}

const GROUP_ICONS = ['⚔️','🌸','🕊','🔥','📖','✝️','🙏','🌿','⭐','🦁','🌊','👑'];

interface Props {
  selectedBook: BookDef; selectedChapter: number; userIdentity: UserIdentity;
  accentColor: string; onOpenGospel: () => void; authUser?: any;
  onOpenAuth?: () => void; onDmUnread?: (count: number) => void;
}

/* ─── Small helpers ──────────────────────────────────────────── */

function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size/2, flexShrink: 0,
      background: color || '#6366f1', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size*0.38, fontWeight: 800, color: '#fff' }}>
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

function BackButton({ label, onPress, accentColor }: { label: string; onPress: () => void; accentColor: string }) {
  return (
    <button onClick={onPress} style={{ display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.55)',
      border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', marginBottom: 16 }}>
      ← {label}
    </button>
  );
}

function ScreenTitle({ text, accentColor }: { text: string; accentColor: string }) {
  return (
    <h2 style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 20, fontWeight: 900,
      color: '#f0f8f4', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
      {text}
    </h2>
  );
}

function Spinner({ accentColor }: { accentColor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <div style={{ width: 22, height: 22, borderRadius: 11,
        border: `2px solid ${accentColor}33`, borderTopColor: accentColor,
        animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

/* ─── ChatBubbleList ─────────────────────────────────────────── */

const QUICK_REACTIONS = ['❤️','🙏','🔥','😂','😮','✝️'];

interface ReactionGroup { emoji: string; count: number; reacted: boolean; }

function ChatBubbleList({ messages, loading, emptyText, profileId, accentColor, userName, noBorder }: {
  messages: GroupMessage[]; loading: boolean; emptyText: string;
  profileId: string | null; accentColor: string; userName: string; noBorder?: boolean;
}) {
  const [activeReact, setActiveReact] = useState<string | null>(null);
  const [reactionMap, setReactionMap] = useState<Record<string, ReactionGroup[]>>({});
  const holdTimer = useRef<any>(null);
  const A = accentColor;
  const sb = createClient();

  // Fetch reactions for all visible messages
  useEffect(() => {
    if (!messages.length || !sb) return;
    const ids = messages.map(m => m.id);
    sb.from('trace_message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', ids)
      .then(({ data }: { data: any }) => {
        if (!data) return;
        const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {};
        for (const row of data) {
          if (!grouped[row.message_id]) grouped[row.message_id] = {};
          if (!grouped[row.message_id][row.emoji]) grouped[row.message_id][row.emoji] = { count: 0, reacted: false };
          grouped[row.message_id][row.emoji].count += 1;
          if (row.user_id === profileId) grouped[row.message_id][row.emoji].reacted = true;
        }
        const result: Record<string, ReactionGroup[]> = {};
        for (const [msgId, emojis] of Object.entries(grouped)) {
          result[msgId] = QUICK_REACTIONS
            .filter(e => emojis[e])
            .map(e => ({ emoji: e, count: emojis[e].count, reacted: emojis[e].reacted }));
        }
        setReactionMap(result);
      })
      .catch((err: unknown) => console.error('[Reactions] Failed to load:', err));
  }, [messages, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!profileId || !sb) return;
    const existing = reactionMap[msgId]?.find(r => r.emoji === emoji);
    const alreadyReacted = existing?.reacted ?? false;

    // Optimistic update
    setReactionMap(prev => {
      const curr = prev[msgId] || [];
      let next: ReactionGroup[];
      if (alreadyReacted) {
        next = curr.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r).filter(r => r.count > 0);
      } else {
        const exists = curr.find(r => r.emoji === emoji);
        if (exists) {
          next = curr.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r);
        } else {
          const added = [...curr, { emoji, count: 1, reacted: true }];
          next = QUICK_REACTIONS.filter(e => added.find(r => r.emoji === e)).map(e => added.find(r => r.emoji === e)!);
        }
      }
      return { ...prev, [msgId]: next };
    });

    setActiveReact(null);

    if (alreadyReacted) {
      await sb.from('trace_message_reactions').delete()
        .eq('message_id', msgId).eq('user_id', profileId).eq('emoji', emoji);
    } else {
      await sb.from('trace_message_reactions').insert({ message_id: msgId, user_id: profileId, emoji });
    }
  };

  const startHold = (msgId: string) => {
    holdTimer.current = setTimeout(() => setActiveReact(msgId), 400);
  };
  const cancelHold = () => { clearTimeout(holdTimer.current); };

  return (
    <div style={{ borderRadius: noBorder ? 0 : 16, background: noBorder ? 'transparent' : 'rgba(255,255,255,0.02)', border: noBorder ? 'none' : `1px solid ${A}10`, minHeight: 180, position: 'relative' }}>
      {activeReact && <div onClick={() => setActiveReact(null)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${A}33`, borderTopColor: A, animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : messages.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 30, marginBottom: 12 }}>💬</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(232,240,236,0.35)', marginBottom: 4 }}>No messages yet</p>
          <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.18)', fontFamily: 'Georgia, serif', margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 12px', maxHeight: 520, overflowY: 'auto' }}>
          {messages.map(msg => {
            const pills = reactionMap[msg.id] || [];
            return (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexDirection: msg.isMine ? 'row-reverse' : 'row', position: 'relative' }}>
                {!msg.isMine && <Avatar name={msg.authorName} color={msg.authorColor} size={34} />}
                <div style={{ maxWidth: '80%', position: 'relative' }}>
                  {!msg.isMine && (
                    <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, paddingLeft: 4, color: msg.authorColor }}>{msg.authorName}</p>
                  )}
                  {/* Reaction popover */}
                  {activeReact === msg.id && (
                    <div style={{ position: 'absolute', bottom: '100%', [msg.isMine ? 'right' : 'left']: 0, marginBottom: 6, background: '#1a2420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: '6px 10px', display: 'flex', gap: 4, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                      {QUICK_REACTIONS.map(emoji => {
                        const reacted = pills.find(r => r.emoji === emoji)?.reacted ?? false;
                        return (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                            style={{ fontSize: 22, background: reacted ? `${A}33` : 'none', border: reacted ? `1px solid ${A}50` : 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 8, lineHeight: 1, transform: 'scale(1)', transition: 'transform 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div
                    onContextMenu={e => { e.preventDefault(); setActiveReact(msg.id); }}
                    onTouchStart={() => startHold(msg.id)}
                    onTouchEnd={cancelHold}
                    onTouchMove={cancelHold}
                    onMouseDown={() => startHold(msg.id)}
                    onMouseUp={cancelHold}
                    onMouseLeave={cancelHold}
                    style={{
                      padding: '11px 16px', fontSize: 15, lineHeight: 1.55,
                      background: msg.isMine ? `linear-gradient(135deg, ${A}35, ${A}20)` : 'rgba(255,255,255,0.07)',
                      color: '#f0f8f4',
                      borderRadius: msg.isMine ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      userSelect: 'none', WebkitUserSelect: 'none',
                      border: msg.isMine ? `1px solid ${A}30` : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'default',
                    }}>
                    {msg.content}
                  </div>
                  {/* Reaction pills */}
                  {pills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: msg.isMine ? 'flex-end' : 'flex-start' }}>
                      {pills.map(r => (
                        <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 20, padding: '3px 8px', fontSize: 13, lineHeight: 1, cursor: 'pointer',
                            border: r.reacted ? `1px solid ${A}40` : '1px solid rgba(255,255,255,0.08)',
                            background: r.reacted ? `${A}22` : 'rgba(255,255,255,0.05)',
                            color: r.reacted ? A : 'rgba(232,240,236,0.7)', fontWeight: r.reacted ? 700 : 400 }}>
                          <span>{r.emoji}</span>
                          <span style={{ fontSize: 11 }}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 9, marginTop: 4, color: 'rgba(232,240,236,0.18)', textAlign: msg.isMine ? 'right' : 'left', paddingLeft: msg.isMine ? 0 : 4 }}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Spotlight Hero ─────────────────────────────────────────── */

function SpotlightHero({ accentColor, children }: { accentColor: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 50, y: 50, opacity: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setSpot({ x, y, opacity: 1 });
    setTilt({ rx: ((e.clientY - r.top) / r.height - 0.5) * -5, ry: ((e.clientX - r.left) / r.width - 0.5) * 5 });
  }
  function onLeave() { setSpot(s => ({ ...s, opacity: 0 })); setTilt({ rx: 0, ry: 0 }); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {/* Spotlight overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, borderRadius: 24, opacity: spot.opacity, transition: 'opacity 0.4s ease',
        background: `radial-gradient(320px circle at ${spot.x}% ${spot.y}%, ${accentColor}22, transparent 60%)` }} />
      {children}
    </motion.div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */

export default function CommunityTab({ userIdentity, accentColor, authUser, onOpenAuth, onDmUnread }: Props) {
  const [screen, setScreen] = useState<Screen>('home');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Groups
  const [selectedGroup, setSelectedGroup] = useState<KingdomGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'chat'|'prayer'|'members'|'info'>('chat');
  const [groupSubTab, setGroupSubTab] = useState<'mine'|'discover'>('mine');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMsgInput, setGroupMsgInput] = useState('');
  const [groupMsgsLoading, setGroupMsgsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'group'|'dm'>('group');
  const [selectedDmMember, setSelectedDmMember] = useState<GroupMember | null>(null);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<GroupMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmLoading, setDmLoading] = useState(false);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; author: string } | null>(null);
  const [myGroups, setMyGroups] = useState<KingdomGroup[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<KingdomGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createIcon, setCreateIcon] = useState('✝️');
  const [createPrivacy, setCreatePrivacy] = useState<'open'|'request'|'invite'>('request');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [profileMember, setProfileMember] = useState<GroupMember | null>(null);

  // Prayer
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [newPrayer, setNewPrayer] = useState('');
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [postingPrayer, setPostingPrayer] = useState(false);
  const [prayerError, setPrayerError] = useState('');

  // Send-a-prayer (random delivery)
  const [sendPrayerText, setSendPrayerText] = useState('');
  const [sendingPrayer, setSendingPrayer] = useState(false);
  const [sendPrayerDone, setSendPrayerDone] = useState(false);
  const [incomingPrayer, setIncomingPrayer] = useState<IncomingPrayer | null>(null);

  // Testimonies
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [newTestimony, setNewTestimony] = useState('');
  const [testimonyLoading, setTestimonyLoading] = useState(true);
  const [postingTestimony, setPostingTestimony] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const groupChatChannelRef = useRef<any>(null);
  const dmChannelRef = useRef<any>(null);

  /* ── Resolve profile ID ─────────────────────────────────── */
  useEffect(() => {
    if (!authUser?.id) { setProfileId(null); return; }
    const supabase = createClient();
    if (!supabase) return;
    supabase.from('trace_profiles').select('id').eq('auth_id', authUser.id).single()
      .then(({ data }: { data: any }) => { if (data) setProfileId(data.id); });
  }, [authUser?.id]);

  useEffect(() => {
    try {
      const ann = localStorage.getItem('trace-announcements');
      if (ann) setAnnouncements(JSON.parse(ann));
    } catch {}
  }, []);

  /* ── Data loaders ───────────────────────────────────────── */
  const loadMyGroups = useCallback(async () => {
    if (!profileId) { setMyGroups([]); return; }
    const supabase = createClient();
    if (!supabase) return;
    setGroupsLoading(true);
    try {
      const { data: memberships } = await supabase.from('trace_group_members')
        .select('group_id, role').eq('user_id', profileId).eq('status', 'approved');
      if (!memberships?.length) { setMyGroups([]); return; }
      const groupIds = memberships.map((m: any) => m.group_id);
      const roleMap: Record<string, string> = {};
      for (const m of memberships) roleMap[(m as any).group_id] = (m as any).role;
      const { data: groups } = await supabase.from('trace_groups')
        .select('id, name, description, icon, privacy').in('id', groupIds);
      const { data: counts } = await supabase.from('trace_group_members')
        .select('group_id').in('group_id', groupIds).eq('status', 'approved');
      const countMap: Record<string, number> = {};
      for (const c of (counts || [])) countMap[(c as any).group_id] = (countMap[(c as any).group_id] || 0) + 1;
      setMyGroups((groups || []).map((g: any) => ({
        id: g.id, name: g.name, description: g.description || '',
        memberCount: countMap[g.id] || 1, icon: g.icon || '✝️',
        isMember: true, isLeader: roleMap[g.id] === 'leader', privacy: g.privacy as any,
      })));
    } catch (err) { console.warn('loadMyGroups:', err); }
    finally { setGroupsLoading(false); }
  }, [profileId]);

  const loadDiscoverGroups = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: groups } = await supabase.from('trace_groups')
        .select('id, name, description, icon, privacy')
        .order('created_at', { ascending: false }).limit(30);
      if (!groups?.length) { setDiscoverGroups([]); return; }
      const allGroupIds = groups.map((g: any) => g.id);
      let memberMap: Record<string, string> = {};
      if (profileId) {
        const { data: mine } = await supabase.from('trace_group_members')
          .select('group_id, status').eq('user_id', profileId).in('group_id', allGroupIds);
        for (const m of (mine || [])) memberMap[(m as any).group_id] = (m as any).status;
      }
      const { data: counts } = await supabase.from('trace_group_members')
        .select('group_id').in('group_id', allGroupIds).eq('status', 'approved');
      const countMap: Record<string, number> = {};
      for (const c of (counts || [])) countMap[(c as any).group_id] = (countMap[(c as any).group_id] || 0) + 1;
      setDiscoverGroups((groups || [])
        .filter((g: any) => memberMap[g.id] !== 'approved')
        .map((g: any) => ({
          id: g.id, name: g.name, description: g.description || '',
          memberCount: countMap[g.id] || 0, icon: g.icon || '✝️',
          isMember: false, isLeader: false,
          pendingJoin: memberMap[g.id] === 'pending', privacy: g.privacy as any,
        })));
    } catch (err) { console.warn('loadDiscoverGroups:', err); }
  }, [profileId]);

  const loadGroupMembers = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: members } = await supabase.from('trace_group_members')
        .select('user_id, role, joined_at').eq('group_id', groupId).eq('status', 'approved');
      if (!members?.length) { setGroupMembers([]); return; }
      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from('trace_profiles')
        .select('id, display_name, avatar_color').in('id', userIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;
      setGroupMembers(members.map((m: any) => ({
        id: m.user_id, userId: m.user_id,
        name: profMap[m.user_id]?.display_name || 'Member',
        color: profMap[m.user_id]?.avatar_color || '#6366f1',
        role: m.role as 'leader'|'member', isMe: m.user_id === profileId,
        joinedAt: m.joined_at || new Date().toISOString(),
      })));
    } catch (err) { console.warn('loadGroupMembers:', err); }
  }, [profileId]);

  const loadJoinRequests = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: pending } = await supabase.from('trace_group_members')
        .select('user_id, joined_at').eq('group_id', groupId).eq('status', 'pending');
      if (!pending?.length) { setJoinRequests([]); return; }
      const userIds = pending.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from('trace_profiles')
        .select('id, display_name, avatar_color').in('id', userIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;
      setJoinRequests(pending.map((m: any) => ({
        id: m.user_id, userId: m.user_id,
        userName: profMap[m.user_id]?.display_name || 'User',
        userColor: profMap[m.user_id]?.avatar_color || '#6366f1',
        requestedAt: m.joined_at,
      })));
    } catch (err) { console.warn('loadJoinRequests:', err); }
  }, []);

  const loadGroupMessages = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setGroupMsgsLoading(true);
    try {
      const { data: msgs } = await supabase.from('trace_group_messages')
        .select('id, sender_id, content, created_at')
        .eq('group_id', groupId).order('created_at', { ascending: true }).limit(60);
      if (!msgs?.length) { setGroupMessages([]); return; }
      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase.from('trace_profiles')
        .select('id, display_name, avatar_color').in('id', senderIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;
      setGroupMessages(msgs.map((m: any) => ({
        id: m.id, authorName: profMap[m.sender_id]?.display_name || 'Member',
        authorColor: profMap[m.sender_id]?.avatar_color || '#6366f1',
        content: m.content, createdAt: m.created_at, isMine: m.sender_id === profileId,
      })));
    } catch (err) { console.warn('loadGroupMessages:', err); }
    finally { setGroupMsgsLoading(false); }
  }, [profileId]);

  const loadPrayers = useCallback(async (groupId?: string) => {
    if (!groupId) { setPrayers([]); setPrayerLoading(false); return; }
    const supabase = createClient();
    if (!supabase) { setPrayerLoading(false); return; }
    try {
      const { data: posts } = await supabase.from('trace_posts')
        .select('id, user_id, content, created_at').eq('verse_ref', 'prayer-request')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false }).limit(30);
      if (!posts?.length) { setPrayers([]); setPrayerLoading(false); return; }
      const authorIds = [...new Set(posts.map((p: any) => p.user_id))];
      const postIds = posts.map((p: any) => p.id);
      const [profilesRes, prayersRes] = await Promise.all([
        supabase.from('trace_profiles').select('id, display_name, avatar_color').in('id', authorIds),
        supabase.from('trace_post_prayers').select('post_id, user_id').in('post_id', postIds),
      ]);
      const profiles: Record<string, { name: string; color: string }> = {};
      for (const p of (profilesRes.data || []))
        profiles[(p as any).id] = { name: (p as any).display_name || 'User', color: (p as any).avatar_color || '#6366f1' };
      const prayerCounts: Record<string, string[]> = {};
      for (const p of (prayersRes.data || []))
        (prayerCounts[(p as any).post_id] ??= []).push((p as any).user_id);
      setPrayers(posts.map((p: any) => ({
        id: p.id, userId: p.user_id,
        authorName: profiles[p.user_id]?.name || 'User',
        authorColor: profiles[p.user_id]?.color || '#6366f1',
        content: p.content, createdAt: p.created_at,
        prayerCount: (prayerCounts[p.id] || []).length,
        hasPrayed: profileId ? (prayerCounts[p.id] || []).includes(profileId) : false,
      })));
    } catch (err) { console.warn('loadPrayers:', err); setPrayers([]); }
    finally { setPrayerLoading(false); }
  }, [profileId]);

  const loadTestimonies = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setTestimonyLoading(false); return; }
    try {
      const { data: posts } = await supabase.from('trace_posts')
        .select('id, user_id, content, created_at').eq('verse_ref', 'testimony')
        .order('created_at', { ascending: false }).limit(20);
      if (!posts?.length) { setTestimonies([]); setTestimonyLoading(false); return; }
      const authorIds = [...new Set(posts.map((p: any) => p.user_id))];
      const { data: profilesData } = await supabase.from('trace_profiles')
        .select('id, display_name, avatar_color').in('id', authorIds);
      const profiles: Record<string, { name: string; color: string }> = {};
      for (const p of (profilesData || []))
        profiles[(p as any).id] = { name: (p as any).display_name || 'User', color: (p as any).avatar_color || '#6366f1' };
      setTestimonies(posts.map((p: any) => ({
        id: p.id, userId: p.user_id,
        authorName: profiles[p.user_id]?.name || 'User',
        authorColor: profiles[p.user_id]?.color || '#6366f1',
        content: p.content, createdAt: p.created_at,
      })));
    } catch (err) { console.warn('loadTestimonies:', err); setTestimonies([]); }
    finally { setTestimonyLoading(false); }
  }, []);

  /* ── Effects ────────────────────────────────────────────── */
  // prayers are loaded per-group, not globally
  useEffect(() => { loadTestimonies(); }, [loadTestimonies]);
  useEffect(() => {
    if (profileId) { loadMyGroups(); loadDiscoverGroups(); }
    else { setMyGroups([]); setDiscoverGroups([]); }
  }, [profileId, loadMyGroups, loadDiscoverGroups]);

  // Check for unseen incoming prayers
  useEffect(() => {
    if (!profileId) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.from('trace_prayer_deliveries')
      .select('id, content, prayed_at')
      .eq('recipient_id', profileId)
      .is('seen_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }: { data: any }) => {
        if (data) setIncomingPrayer({ id: data.id, content: data.content, prayed_at: data.prayed_at });
      });
  }, [profileId]);

  useEffect(() => {
    if (groupChatChannelRef.current) { groupChatChannelRef.current.unsubscribe(); groupChatChannelRef.current = null; }
    if (!selectedGroup) { setGroupMessages([]); setGroupMembers([]); setJoinRequests([]); setPrayers([]); return; }
    loadGroupMessages(selectedGroup.id);
    loadGroupMembers(selectedGroup.id);
    if (selectedGroup.isLeader) loadJoinRequests(selectedGroup.id);
    loadPrayers(selectedGroup.id);
    const supabase = createClient();
    if (supabase) {
      const channel = supabase.channel(`group-chat-${selectedGroup.id}`)
        .on('postgres_changes' as any, { event: 'INSERT', schema: 'public',
          table: 'trace_group_messages', filter: `group_id=eq.${selectedGroup.id}` },
          () => { loadGroupMessages(selectedGroup.id); })
        .subscribe();
      groupChatChannelRef.current = channel;
    }
    return () => { if (groupChatChannelRef.current) { groupChatChannelRef.current.unsubscribe(); groupChatChannelRef.current = null; } };
  }, [selectedGroup?.id]); // eslint-disable-line

  useEffect(() => {
    if (dmChannelRef.current) { dmChannelRef.current.unsubscribe(); dmChannelRef.current = null; }
    if (!dmConversationId) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase.channel(`dm-${dmConversationId}`)
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public',
        table: 'trace_messages', filter: `conversation_id=eq.${dmConversationId}` },
        (payload: any) => {
          if (payload.new?.sender_id === profileId) return;
          loadDmMessages(dmConversationId);
          if (chatMode !== 'dm') onDmUnread?.(1);
        })
      .subscribe();
    dmChannelRef.current = channel;
    return () => { if (dmChannelRef.current) { dmChannelRef.current.unsubscribe(); dmChannelRef.current = null; } };
  }, [dmConversationId, profileId, chatMode]); // eslint-disable-line

  /* ── Group actions ──────────────────────────────────────── */
  const openGroup = (group: KingdomGroup) => {
    setSelectedGroup(group);
    setGroupTab('chat');
    setGroupMessages([]);
    setChatMode('group');
    setSelectedDmMember(null);
    setScreen('group-detail');
  };

  const createGroupHandler = async () => {
    if (!profileId) return;
    if (createName.trim().length < 3) { setCreateError('Group name must be at least 3 characters.'); return; }
    setCreateError('');
    setCreateLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data: newGroup, error } = await supabase.from('trace_groups')
        .insert({ name: createName.trim(), description: createDesc.trim(), icon: createIcon, privacy: createPrivacy, created_by: profileId })
        .select('id').single();
      if (error || !newGroup) throw error || new Error('No data');
      await supabase.from('trace_group_members').insert({ group_id: (newGroup as any).id, user_id: profileId, role: 'leader', status: 'approved' });
      setCreateName(''); setCreateDesc(''); setCreateIcon('✝️'); setCreatePrivacy('request');
      setCreateError('');
      setCreateSheetOpen(false);
      await loadMyGroups();
    } catch (err) { console.error('Create group:', err); setCreateError('Could not create group. Please try again.'); }
    finally { setCreateLoading(false); }
  };

  const joinGroup = async (group: KingdomGroup) => {
    if (!profileId) { onOpenAuth?.(); return; }
    const supabase = createClient();
    if (!supabase) return;
    try {
      const status = group.privacy === 'open' ? 'approved' : 'pending';
      await supabase.from('trace_group_members').insert({ group_id: group.id, user_id: profileId, role: 'member', status });
      await Promise.all([loadMyGroups(), loadDiscoverGroups()]);
    } catch (err) { console.error('Join group:', err); }
  };

  const leaveGroup = async () => {
    if (!profileId || !selectedGroup) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      await supabase.from('trace_group_members').delete().eq('group_id', selectedGroup.id).eq('user_id', profileId);
      setSelectedGroup(null);
      setScreen('groups');
      await Promise.all([loadMyGroups(), loadDiscoverGroups()]);
    } catch (err) { console.error('Leave group:', err); }
  };

  const approveRequest = async (req: JoinRequest) => {
    if (!selectedGroup) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/group/approve', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: req.userId }) });
      if (!res.ok) return;
      setJoinRequests(prev => prev.filter(r => r.id !== req.id));
      setMyGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, memberCount: g.memberCount + 1 } : g));
      loadGroupMembers(selectedGroup.id);
    } catch (err) { console.error('Approve request:', err); }
  };

  const denyRequest = async (req: JoinRequest) => {
    if (!selectedGroup) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/group/approve', { method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: req.userId }) });
      setJoinRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) { console.error('Deny request:', err); }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      await supabase.from('trace_group_members').delete().eq('group_id', selectedGroup.id).eq('user_id', memberId);
      setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      setMyGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g));
    } catch (err) { console.error('Remove member:', err); }
  };

  const promoteMember = async (memberId: string, currentRole: 'leader'|'member') => {
    if (!selectedGroup) return;
    const newRole = currentRole === 'leader' ? 'member' : 'leader';
    try {
      const res = await fetch('/api/group/promote', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: memberId, role: newRole }) });
      if (res.ok) setGroupMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) { console.error('Promote member:', err); }
  };

  const sendGroupMessage = async () => {
    if (!groupMsgInput.trim() || !profileId || !selectedGroup) return;
    const supabase = createClient();
    if (!supabase) return;
    const text = groupMsgInput.trim();
    setGroupMsgInput('');
    try {
      await supabase.from('trace_group_messages').insert({ group_id: selectedGroup.id, sender_id: profileId, content: text });
      setTimeout(() => loadGroupMessages(selectedGroup.id), 500);
    } catch (err) { console.error('Send group message:', err); setGroupMsgInput(text); }
  };

  const findOrCreateDm = async (otherProfileId: string): Promise<string | null> => {
    if (!profileId) return null;
    const supabase = createClient();
    if (!supabase) return null;
    try {
      const { data: mine } = await supabase.from('trace_conversation_participants')
        .select('conversation_id').eq('user_id', profileId);
      const myConvIds = (mine || []).map((r: any) => r.conversation_id);
      if (myConvIds.length > 0) {
        const { data: shared } = await supabase.from('trace_conversation_participants')
          .select('conversation_id').eq('user_id', otherProfileId).in('conversation_id', myConvIds).limit(1);
        if (shared?.length) return (shared[0] as any).conversation_id;
      }
      const { data: conv } = await supabase.from('trace_conversations').insert({}).select('id').single();
      if (!conv) return null;
      await supabase.from('trace_conversation_participants').insert([
        { conversation_id: (conv as any).id, user_id: profileId },
        { conversation_id: (conv as any).id, user_id: otherProfileId },
      ]);
      return (conv as any).id;
    } catch (err) { console.error('findOrCreateDm:', err); return null; }
  };

  const loadDmMessages = async (conversationId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setDmLoading(true);
    try {
      const { data: msgs } = await supabase.from('trace_messages')
        .select('id, sender_id, content, created_at').eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }).limit(60);
      if (!msgs?.length) { setDmMessages([]); return; }
      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase.from('trace_profiles')
        .select('id, display_name, avatar_color').in('id', senderIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;
      setDmMessages(msgs.map((m: any) => ({
        id: m.id, authorName: profMap[m.sender_id]?.display_name || 'User',
        authorColor: profMap[m.sender_id]?.avatar_color || '#6366f1',
        content: m.content, createdAt: m.created_at, isMine: m.sender_id === profileId,
      })));
    } catch (err) { console.error('loadDmMessages:', err); }
    finally { setDmLoading(false); }
  };

  const sendDm = async () => {
    if (!dmInput.trim() || !profileId || !dmConversationId) return;
    const supabase = createClient();
    if (!supabase) return;
    const text = dmInput.trim();
    setDmInput('');
    const tempId = `temp-${Date.now()}`;
    setDmMessages(prev => [...prev, { id: tempId, authorName: 'You', authorColor: '#6366f1', content: text, createdAt: new Date().toISOString(), isMine: true }]);
    try {
      await supabase.from('trace_messages').insert({ conversation_id: dmConversationId, sender_id: profileId, content: text });
      await loadDmMessages(dmConversationId);
    } catch (err) { console.error('sendDm:', err); setDmInput(text); setDmMessages(prev => prev.filter(m => m.id !== tempId)); }
  };

  const startDm = async (member: GroupMember) => {
    setSelectedDmMember(member); setDmMessages([]); setDmConversationId(null);
    const convId = await findOrCreateDm(member.id);
    setDmConversationId(convId);
    if (convId) await loadDmMessages(convId);
  };

  const submitPrayer = async () => {
    if (!newPrayer.trim() || !profileId) return;
    setPrayerError('');
    setPostingPrayer(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('trace_posts').insert({ user_id: profileId, content: newPrayer.trim(), verse_ref: 'prayer-request', group_id: selectedGroup?.id ?? null });
      setNewPrayer('');
      await loadPrayers(selectedGroup?.id);
    } catch (err) { console.error('Submit prayer:', err); setPrayerError('Could not post prayer. Please try again.'); }
    finally { setPostingPrayer(false); }
  };

  const prayFor = async (postId: string) => {
    if (!profileId) { onOpenAuth?.(); return; }
    const supabase = createClient();
    if (!supabase) return;
    const prayer = prayers.find(p => p.id === postId);
    if (!prayer) return;
    if (prayer.hasPrayed) {
      await supabase.from('trace_post_prayers').delete().eq('post_id', postId).eq('user_id', profileId);
    } else {
      await supabase.from('trace_post_prayers').insert({ post_id: postId, user_id: profileId });
    }
    await loadPrayers(selectedGroup?.id);
  };

  const submitTestimony = async () => {
    if (!newTestimony.trim() || !profileId) return;
    setPostingTestimony(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('trace_posts').insert({ user_id: profileId, content: newTestimony.trim(), verse_ref: 'testimony' });
      setNewTestimony('');
      await loadTestimonies();
    } catch (err) { console.error('Submit testimony:', err); }
    finally { setPostingTestimony(false); }
  };

  const A = accentColor;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Overlays (always rendered when open) ── */}
      {studyModeOpen && (
        <BibleStudyMode accentColor={A} groupName={selectedGroup?.name} onClose={() => setStudyModeOpen(false)} />
      )}
      {profileMember && selectedGroup && (
        <MemberProfilePanel
          member={{ userId: profileMember.userId, name: profileMember.name, color: profileMember.color, role: profileMember.role, joinedAt: profileMember.joinedAt }}
          groupName={selectedGroup.name} accentColor={A} onClose={() => setProfileMember(null)}
        />
      )}
      {selectedGroup && (
        <PinnedMessages groupId={selectedGroup.id} accentColor={A} open={pinnedOpen} onClose={() => setPinnedOpen(false)} />
      )}

      {/* ════════════════════════════════════════════
          SCREEN: HOME
      ════════════════════════════════════════════ */}
      {screen === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Hero banner ── */}
          <SpotlightHero accentColor={A}>
          <div style={{ position: 'relative', minHeight: 140 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/church 2.png")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '24px 22px' }}>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: A, margin: '0 0 6px', fontFamily: 'Montserrat, system-ui, sans-serif' }}>The Church</p>
              <h1 style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Community</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Groups · Prayer · Testimonies</p>
              {authUser && userIdentity.name && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={userIdentity.name} color={userIdentity.color} size={34} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0 }}>{userIdentity.name}</p>
                    {userIdentity.username && <p style={{ fontSize: 10, color: `${A}cc`, margin: 0 }}>@{userIdentity.username}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
          </SpotlightHero>

          {/* ── Announcements ── */}
          {announcements.length > 0 && (
            <div style={{ borderRadius: 18, padding: '14px 18px', background: `${A}10`, border: `1px solid ${A}22` }}>
              <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: A, marginBottom: 6 }}>📣 Announcement</p>
              {announcements.map((a, i) => <p key={i} style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif', margin: 0 }}>{a}</p>)}
            </div>
          )}

          {/* ── Sign-in prompt ── */}
          {!authUser && (
            <div style={{ borderRadius: 24, padding: '32px 24px', textAlign: 'center', background: `linear-gradient(160deg, ${A}10, rgba(255,255,255,0.02))`, border: `1px solid ${A}20` }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>⛪</div>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#f0f8f4', marginBottom: 8, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Welcome to Church</p>
              <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif', marginBottom: 24, lineHeight: 1.7 }}>Join the community, share prayer requests, and connect with believers around the world.</p>
              {onOpenAuth && (
                <button onClick={onOpenAuth} style={{ padding: '14px 36px', borderRadius: 16, fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 8px 28px ${A}44` }}>
                  Sign In / Join
                </button>
              )}
            </div>
          )}

          {/* ── Stats row (authenticated) ── */}
          {authUser && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Groups', value: myGroups.length },
                { label: 'Friends', value: '—' },
                { label: 'Prayers', value: '—' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.88, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24, delay: i * 0.06 }}
                  whileHover={{ scale: 1.05, y: -2, boxShadow: `0 6px 20px ${A}28` }}
                  whileTap={{ scale: 0.97 }}
                  style={{ borderRadius: 16, padding: '14px 10px', textAlign: 'center', background: `linear-gradient(135deg, ${A}18 0%, ${A}08 100%)`, border: `1px solid ${A}28`, boxShadow: `0 2px 10px ${A}12, inset 0 1px 0 ${A}18`, cursor: 'default', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${A}44, transparent)` }} />
                  <p style={{ fontSize: 22, fontWeight: 900, color: A, margin: '0 0 2px', fontFamily: 'Montserrat, system-ui, sans-serif', textShadow: `0 0 12px ${A}55` }}>{s.value}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: `${A}99`, margin: 0 }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── New Groups (v2) callout — links to the rebuilt Groups module ── */}
          <a
            href="/bible/groups"
            style={{
              display: 'block',
              textDecoration: 'none',
              padding: '14px 16px',
              borderRadius: 18,
              background: `linear-gradient(135deg, ${A}22, ${A}08)`,
              border: `1px solid ${A}40`,
              color: '#f0f8f4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: `${A}30`, border: `1px solid ${A}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>✦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  Try the new Groups
                </div>
                <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.5)', marginTop: 2 }}>
                  Prayer Wall, threaded chat, reading plans, meetings &mdash; rebuilt.
                </div>
              </div>
              <div style={{ color: A, fontSize: 18 }}>›</div>
            </div>
          </a>

          {/* ── My Groups ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 900, color: 'rgba(232,240,236,0.5)', margin: 0, fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.15em' }}>My Groups</p>
              <button onClick={() => { setGroupSubTab('mine'); setScreen('groups'); }}
                style={{ fontSize: 11, fontWeight: 700, color: A, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                See All →
              </button>
            </div>
            {!authUser ? (
              <button onClick={onOpenAuth} style={{ width: '100%', padding: '18px', borderRadius: 18, background: `${A}08`, border: `1px dashed ${A}25`, color: `${A}80`, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Sign in to see your groups</button>
            ) : groupsLoading ? (
              <Spinner accentColor={A} />
            ) : myGroups.length === 0 ? (
              <button onClick={() => { setGroupSubTab('discover'); setScreen('groups'); }}
                style={{ width: '100%', padding: '24px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${A}20`, color: 'rgba(232,240,236,0.35)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 28, marginBottom: 8 }}>⛪</span>
                You&apos;re not in any groups yet<br />
                <span style={{ fontSize: 11, color: A }}>Discover one →</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {myGroups.slice(0, 6).map(g => (
                  <motion.button key={g.id} onClick={() => openGroup(g)}
                    whileHover={{ y: -4, boxShadow: `0 8px 24px ${A}28` }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    style={{ flexShrink: 0, width: 120, borderRadius: 20, padding: '16px 12px', textAlign: 'center', background: `linear-gradient(160deg, ${A}12 0%, rgba(255,255,255,0.03) 100%)`, border: `1px solid ${A}20`, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    {g.isLeader && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}>👑</div>}
                    <div style={{ width: 50, height: 50, borderRadius: 25, background: `${A}20`, border: `2px solid ${A}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px' }}>
                      {g.icon}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#f0f8f4', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{g.name}</p>
                    <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.35)', margin: 0 }}>{g.memberCount} members</p>
                  </motion.button>
                ))}
                {myGroups.length > 6 && (
                  <button onClick={() => { setGroupSubTab('mine'); setScreen('groups'); }}
                    style={{ flexShrink: 0, width: 80, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px dashed ${A}18`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 22, color: `${A}60` }}>+</span>
                    <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.25)', margin: 0 }}>{myGroups.length - 6} more</p>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: 'rgba(232,240,236,0.5)', margin: 0, fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Explore</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '✦', label: 'Testimonies', sub: 'What God has done', gradient: `linear-gradient(135deg, ${A}18, ${A}08)`, action: () => { loadTestimonies(); setScreen('testimonies'); } },
                { icon: '🕊', label: 'Send a Prayer', sub: 'Bless a stranger', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.06))', action: () => { setSendPrayerText(''); setSendPrayerDone(false); setScreen('send-prayer'); } },
                { icon: '👥', label: 'Find Friends', sub: 'Search by @username', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))', action: () => setScreen('friends') },
                { icon: '🔭', label: 'Discover Groups', sub: 'Find your people', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))', action: () => { setGroupSubTab('discover'); loadDiscoverGroups(); setScreen('groups'); } },
              ].map(item => (
                <motion.button key={item.label} onClick={item.action}
                  whileHover={{ y: -3, boxShadow: `0 10px 28px rgba(0,0,0,0.35)` }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{ borderRadius: 20, padding: '18px 16px', textAlign: 'left', background: item.gradient, border: `1px solid ${A}15`, cursor: 'pointer' }}>
                  <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{item.icon}</span>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#f0f8f4', margin: '0 0 3px', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{item.label}</p>
                  <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.35)', margin: 0 }}>{item.sub}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ textAlign: 'center', padding: '8px 0 4px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
            <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', margin: '0 0 4px' }}>
              &ldquo;Where two or three gather in my name, there am I with them.&rdquo;
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(232,240,236,0.1)', margin: 0 }}>Matthew 18:20</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SCREEN: GROUPS LIST
      ════════════════════════════════════════════ */}
      {screen === 'groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <BackButton label="Home" onPress={() => setScreen('home')} accentColor={A} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <ScreenTitle text="Groups" accentColor={A} />
            {authUser && profileId && (
              <button onClick={() => setCreateSheetOpen(true)}
                style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${A}22`, color: A, border: `1.5px solid ${A}40`, cursor: 'pointer' }}>
                + New
              </button>
            )}
          </div>

          {!authUser ? (
            <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: `${A}06`, border: `1px solid ${A}15` }}>
              <p style={{ fontSize: 28, marginBottom: 12 }}>👑</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', marginBottom: 12 }}>Sign in to join a group</p>
              <button onClick={onOpenAuth} style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>Sign In</button>
            </div>
          ) : (
            <>
              {/* Mine / Discover toggle */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['mine','discover'] as const).map(v => (
                  <button key={v} onClick={() => { setGroupSubTab(v); if (v === 'discover') loadDiscoverGroups(); }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      ...(groupSubTab === v ? { background: `${A}18`, color: A, border: `1px solid ${A}30` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.4)', border: 'none' }) }}>
                    {v === 'mine' ? 'My Groups' : 'Discover'}
                  </button>
                ))}
              </div>

              {/* My Groups */}
              {groupSubTab === 'mine' && (
                groupsLoading ? <Spinner accentColor={A} /> :
                myGroups.length === 0 ? (
                  <div style={{ borderRadius: 16, padding: 28, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px solid ${A}10` }}>
                    <img src="/png_church-removebg-preview.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', mixBlendMode: 'screen', display: 'block', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(232,240,236,0.45)', marginBottom: 4 }}>You&apos;re not in any groups yet</p>
                    <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.22)', fontFamily: 'Georgia, serif', margin: 0 }}>Find a group or create your own.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {myGroups.map(group => (
                      <motion.button key={group.id} onClick={() => openGroup(group)}
                        whileHover={{ y: -2, boxShadow: `0 6px 20px ${A}20` }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        style={{ width: '100%', borderRadius: 20, padding: '16px 18px', textAlign: 'left', background: `linear-gradient(135deg, ${A}06 0%, rgba(255,255,255,0.025) 100%)`, border: `1px solid ${A}14`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 24, background: `${A}18`, border: `1.5px solid ${A}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          {group.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                            {group.isLeader && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${A}22`, color: A, border: `1px solid ${A}33`, flexShrink: 0 }}>Leader</span>}
                          </div>
                          <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.38)', margin: 0 }}>
                            {group.memberCount} members
                            <span style={{ margin: '0 5px', color: 'rgba(232,240,236,0.18)' }}>·</span>
                            <span style={{ color: group.privacy === 'open' ? '#22c55e' : group.privacy === 'invite' ? '#94a3b8' : '#f59e0b' }}>
                              {group.privacy === 'open' ? 'Open' : group.privacy === 'invite' ? 'Invite Only' : 'Approval Required'}
                            </span>
                          </p>
                        </div>
                        <span style={{ color: `${A}60`, fontSize: 16, fontWeight: 300, flexShrink: 0 }}>›</span>
                      </motion.button>
                    ))}
                  </div>
                )
              )}

              {/* Discover */}
              {groupSubTab === 'discover' && (
                discoverGroups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>🔭</p>
                    <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>No other groups to discover right now.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {discoverGroups.map(group => {
                      const pColor = group.privacy === 'open' ? '#22c55e' : group.privacy === 'invite' ? '#94a3b8' : '#f59e0b';
                      const pLabel = group.privacy === 'open' ? 'Open' : group.privacy === 'invite' ? 'Invite Only' : 'Approval Required';
                      return (
                        <div key={group.id} style={{ borderRadius: 20, padding: '16px 18px', background: `linear-gradient(135deg, ${A}06 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${A}12`, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 24, background: `${A}15`, border: `1.5px solid ${A}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{group.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                            <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.32)', fontFamily: 'Georgia, serif', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
                            <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: 0 }}>{group.memberCount} members <span style={{ margin: '0 4px', color: 'rgba(232,240,236,0.15)' }}>·</span> <span style={{ color: pColor }}>{pLabel}</span></p>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {group.pendingJoin ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.22)' }}>Requested</span>
                            ) : group.privacy === 'invite' ? (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '5px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.3)' }}>Invite Only</span>
                            ) : (
                              <button onClick={() => joinGroup(group)}
                                style={{ fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: group.privacy === 'open' ? `linear-gradient(135deg, ${A}, ${A}cc)` : `${A}18`, color: group.privacy === 'open' ? '#fff' : A, boxShadow: group.privacy === 'open' ? `0 2px 10px ${A}33` : 'none' }}>
                                {group.privacy === 'open' ? 'Join' : 'Request'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          SCREEN: GROUP DETAIL
      ════════════════════════════════════════════ */}
      {screen === 'group-detail' && selectedGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Group header banner */}
          <SpotlightHero accentColor={A}>
          <div style={{ marginBottom: 20 }}>
            {/* Gradient background */}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${A}25 0%, rgba(0,0,0,0) 60%)`, borderRadius: 24 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,10,8,0) 0%, rgba(6,10,8,0.85) 100%)', borderRadius: 24 }} />
            <div style={{ border: `1px solid ${A}22`, borderRadius: 24, padding: '20px 18px 16px', position: 'relative', zIndex: 1 }}>
              {/* Back + Study row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <button onClick={() => { setSelectedGroup(null); setScreen('groups'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.07)', color: 'rgba(232,240,236,0.55)', border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer' }}>
                  ← Groups
                </button>
                <button onClick={() => setStudyModeOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${A}18`, color: A, border: `1px solid ${A}30`, cursor: 'pointer' }}>
                  📚 Study
                </button>
              </div>
              {/* Centered icon + name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, background: `${A}18`, border: `2.5px solid ${A}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: `0 0 24px ${A}25` }}>
                  {selectedGroup.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 5 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: 0, letterSpacing: '-0.01em' }}>{selectedGroup.name}</p>
                    {selectedGroup.isLeader && <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${A}25`, color: A, border: `1px solid ${A}40` }}>Leader</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(232,240,236,0.4)' }}>{selectedGroup.memberCount} members</span>
                    <span style={{ fontSize: 8, color: 'rgba(232,240,236,0.15)' }}>·</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: selectedGroup.privacy === 'open' ? '#22c55e' : selectedGroup.privacy === 'invite' ? '#94a3b8' : '#f59e0b' }}>
                      {selectedGroup.privacy === 'open' ? '🌐 Open' : selectedGroup.privacy === 'invite' ? '✉️ Invite Only' : '🔒 Approval'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </SpotlightHero>

          {/* Tab content */}
          <div style={{ marginBottom: 60 }}>

            {/* ── CHAT TAB ── */}
            {groupTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Chat mode selector + pinned */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => { setChatMode('group'); setSelectedDmMember(null); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(chatMode === 'group' ? { background: `${A}20`, color: A, border: `1px solid ${A}30` } : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: 'none' }) }}>
                      <span>👥</span> Group
                    </button>
                    <button onClick={() => { setChatMode('dm'); if (!groupMembers.length) loadGroupMembers(selectedGroup.id); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(chatMode === 'dm' ? { background: `${A}20`, color: A, border: `1px solid ${A}30` } : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: 'none' }) }}>
                      <span>🔒</span> DMs
                    </button>
                  </div>
                  <button onClick={() => setPinnedOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 12px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,240,236,0.4)', cursor: 'pointer', flexShrink: 0 }}>
                    📌
                  </button>
                </div>

                {chatMode === 'group' && (
                  <>
                    <ChatBubbleList
                      messages={groupMessages}
                      loading={groupMsgsLoading}
                      emptyText={`Only ${selectedGroup.name} members can see this.`}
                      profileId={profileId}
                      accentColor={A}
                      userName={userIdentity.name || ''}
                    />
                    {authUser ? (
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 22, border: `1px solid ${A}18`, marginTop: 8, boxShadow: `0 0 0 0px ${A}00` }}>
                        {replyTo && <ReplyPreview replyToAuthor={replyTo.author} replyToContent={replyTo.content} accentColor={A} onClear={() => setReplyTo(null)} />}
                        <MentionInput value={groupMsgInput} onChange={setGroupMsgInput} onSend={sendGroupMessage}
                          members={groupMembers.map(m => ({ userId: m.id, name: m.name, color: m.color }))}
                          accentColor={A} placeholder={`Message ${selectedGroup.name}...`} />
                      </div>
                    ) : (
                      <button onClick={onOpenAuth} style={{ width: '100%', padding: '14px 0', borderRadius: 16, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer', marginTop: 8, boxShadow: `0 6px 20px ${A}33` }}>Sign in to chat</button>
                    )}
                  </>
                )}

                {chatMode === 'dm' && !selectedDmMember && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: `${A}60`, paddingLeft: 4, marginBottom: 12 }}>Direct Messages</p>
                    {groupMembers.filter(m => !m.isMe).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
                        <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>🔒</span>
                        <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.3)', fontWeight: 600 }}>No other members to message yet.</p>
                      </div>
                    ) : (
                      <div style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
                        {groupMembers.filter(m => !m.isMe).map((m, i, arr) => (
                          <button key={m.id} onClick={() => startDm(m)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <Avatar name={m.name} color={m.color} size={40} />
                              {m.role === 'leader' && <div style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 12, lineHeight: 1 }}>👑</div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                              <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: 0 }}>{m.role === 'leader' ? 'Group Leader' : 'Member'}</p>
                            </div>
                            <div style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 12, background: `${A}12`, border: `1px solid ${A}20`, fontSize: 10, fontWeight: 700, color: A }}>
                              Message
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {chatMode === 'dm' && selectedDmMember && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <button onClick={() => { setSelectedDmMember(null); setDmMessages([]); setDmConversationId(null); }}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>←</button>
                      <Avatar name={selectedDmMember.name} color={selectedDmMember.color} size={32} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{selectedDmMember.name}</p>
                        <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>🔒 Private</p>
                      </div>
                    </div>
                    <ChatBubbleList
                      messages={dmMessages}
                      loading={dmLoading}
                      emptyText={`Only you and ${selectedDmMember.name} can read this.`}
                      profileId={profileId}
                      accentColor={A}
                      userName={userIdentity.name || ''}
                      noBorder
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="text"
                        value={dmInput} onChange={e => setDmInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && dmInput.trim()) sendDm(); }}
                        placeholder={`Message ${selectedDmMember.name}...`}
                        style={{ flex: 1, padding: '13px 18px', borderRadius: 24, fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#f0f8f4' }} />
                      <button disabled={!dmInput.trim()} onClick={sendDm}
                        style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: dmInput.trim() ? 'pointer' : 'default', background: dmInput.trim() ? A : 'rgba(255,255,255,0.05)', color: dmInput.trim() ? '#000' : 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 18 }}>↑</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PRAYER TAB (group) ── */}
            {groupTab === 'prayer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,240,236,0.3)', margin: 0 }}>Prayer Wall</p>
                  <span style={{ fontSize: 10, color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Group only · private</span>
                </div>
                {/* Compose */}
                <div style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${A}18`, boxShadow: `0 0 0 0px ${A}00` }}>
                  <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck value={newPrayer}
                    onChange={e => setNewPrayer(e.target.value)}
                    placeholder="Share a prayer request with the group..."
                    style={{ width: '100%', padding: '16px 18px', fontSize: 14, outline: 'none', resize: 'none', minHeight: 80, background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif', boxSizing: 'border-box', border: 'none', lineHeight: 1.65 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                    {prayerError && <p style={{ fontSize: 10, color: '#f87171', margin: 0, flex: 1 }}>{prayerError}</p>}
                    <button onClick={submitPrayer} disabled={postingPrayer || !newPrayer.trim()}
                      style={{ padding: '9px 18px', borderRadius: 14, fontSize: 12, fontWeight: 800, border: 'none', cursor: newPrayer.trim() ? 'pointer' : 'default', background: newPrayer.trim() ? `linear-gradient(135deg, ${A}, ${A}cc)` : 'rgba(255,255,255,0.05)', color: newPrayer.trim() ? '#fff' : 'rgba(255,255,255,0.2)', boxShadow: newPrayer.trim() ? `0 4px 16px ${A}33` : 'none' }}>
                      {postingPrayer ? 'Posting…' : '🙏 Post Prayer'}
                    </button>
                  </div>
                </div>
                {/* Prayer list */}
                {prayerLoading ? <Spinner accentColor={A} /> : prayers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
                    <p style={{ fontSize: 32, marginBottom: 10 }}>🙏</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,240,236,0.4)', marginBottom: 4 }}>No prayer requests yet</p>
                    <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', margin: 0 }}>Be the first to share one.</p>
                  </div>
                ) : prayers.map(pr => (
                  <div key={pr.id} style={{ borderRadius: 20, padding: '16px 18px', background: pr.hasPrayed ? `linear-gradient(135deg, ${A}08, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.025)', border: `1px solid ${pr.hasPrayed ? A + '20' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Avatar name={pr.authorName} color={pr.authorColor} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: '0 0 2px' }}>{pr.authorName}</p>
                        <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.28)', margin: 0 }}>{timeAgo(pr.createdAt)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 14, background: pr.hasPrayed ? `${A}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${pr.hasPrayed ? A + '35' : 'rgba(255,255,255,0.07)'}` }}>
                        <span style={{ fontSize: 13 }}>🙏</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pr.hasPrayed ? A : 'rgba(232,240,236,0.4)' }}>{pr.prayerCount}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(232,240,236,0.78)', fontFamily: 'Georgia, serif', margin: '0 0 14px' }}>{pr.content}</p>
                    <button onClick={() => prayFor(pr.id)}
                      style={{ padding: '9px 18px', borderRadius: 14, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', background: pr.hasPrayed ? `${A}20` : `rgba(255,255,255,0.06)`, color: pr.hasPrayed ? A : 'rgba(232,240,236,0.55)', boxShadow: pr.hasPrayed ? `0 0 16px ${A}20` : 'none' }}>
                      {pr.hasPrayed ? '🙏 Praying for this' : '🙏 Pray for this'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {groupTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,240,236,0.3)', marginBottom: 12, paddingLeft: 2 }}>
                  {groupMembers.length} Member{groupMembers.length !== 1 ? 's' : ''}
                </p>
                {groupMembers.length === 0 ? <Spinner accentColor={A} /> : (
                  <div style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
                    {groupMembers.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: i < groupMembers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <button onClick={() => setProfileMember(m)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                          <Avatar name={m.name} color={m.color} size={40} />
                          {m.role === 'leader' && <div style={{ position: 'absolute', bottom: -3, right: -3, fontSize: 12, lineHeight: 1 }}>👑</div>}
                        </button>
                        <button onClick={() => setProfileMember(m)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.name}{m.isMe ? <span style={{ color: `${A}80`, fontWeight: 500, fontSize: 11 }}> · You</span> : ''}
                          </p>
                          <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.28)', margin: 0 }}>Joined {timeAgo(m.joinedAt)}</p>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {selectedGroup.isLeader && !m.isMe && (
                            <>
                              <button onClick={() => promoteMember(m.id, m.role)} title={m.role === 'leader' ? 'Demote' : 'Promote'}
                                style={{ width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${A}14`, color: A, border: `1px solid ${A}28`, fontSize: 11, cursor: 'pointer' }}>
                                {m.role === 'leader' ? '↓' : '↑'}
                              </button>
                              <button onClick={() => removeMember(m.id)}
                                style={{ width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.14)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                            </>
                          )}
                          {(!selectedGroup.isLeader || m.isMe) && (
                            <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 10, fontWeight: 700, background: m.role === 'leader' ? `${A}20` : 'rgba(255,255,255,0.04)', color: m.role === 'leader' ? A : 'rgba(232,240,236,0.28)' }}>
                              {m.role === 'leader' ? 'Leader' : 'Member'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── INFO TAB ── */}
            {groupTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ borderRadius: 20, padding: '20px 18px', background: `linear-gradient(135deg, ${A}08 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${A}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: `${A}18`, border: `2px solid ${A}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{selectedGroup.icon}</div>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: '0 0 4px' }}>{selectedGroup.name}</p>
                    {selectedGroup.description && <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif', lineHeight: 1.6, margin: '0 0 8px' }}>{selectedGroup.description}</p>}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: selectedGroup.privacy === 'open' ? 'rgba(34,197,94,0.12)' : selectedGroup.privacy === 'invite' ? 'rgba(148,163,184,0.1)' : 'rgba(245,158,11,0.12)', color: selectedGroup.privacy === 'open' ? '#22c55e' : selectedGroup.privacy === 'invite' ? '#94a3b8' : '#f59e0b', border: `1px solid ${selectedGroup.privacy === 'open' ? 'rgba(34,197,94,0.22)' : selectedGroup.privacy === 'invite' ? 'rgba(148,163,184,0.18)' : 'rgba(245,158,11,0.22)'}` }}>
                      {selectedGroup.privacy === 'open' ? '🌐 Open' : selectedGroup.privacy === 'invite' ? '✉️ Invite Only' : '🔒 Approval Required'}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: `${A}70`, margin: 0 }}>{selectedGroup.memberCount} members</p>
                </div>

                {selectedGroup.isLeader && joinRequests.length > 0 && (
                  <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', margin: 0 }}>Join Requests ({joinRequests.length})</p>
                    </div>
                    {joinRequests.map(req => (
                      <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.07)' }}>
                        <Avatar name={req.userName} color={req.userColor} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{req.userName}</p>
                          <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>Requested {timeAgo(req.requestedAt)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => approveRequest(req)} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${A}20`, color: A, border: `1px solid ${A}35`, cursor: 'pointer' }}>✓ Approve</button>
                          <button onClick={() => denyRequest(req)} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)', cursor: 'pointer' }}>✕ Deny</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {profileId && <GroupEvents groupId={selectedGroup.id} profileId={profileId} isLeader={!!selectedGroup.isLeader} accentColor={A} />}
                {profileId && <StudyScheduler groupId={selectedGroup.id} profileId={profileId} isLeader={!!selectedGroup.isLeader} accentColor={A} />}
                {profileId && <GroupReadingPlan groupId={selectedGroup.id} profileId={profileId} isLeader={!!selectedGroup.isLeader} accentColor={A} />}

                {!selectedGroup.isLeader && (
                  <button onClick={leaveGroup} style={{ width: '100%', padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', marginTop: 8 }}>Leave Group</button>
                )}
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '10px 8px 14px', background: 'linear-gradient(0deg, #060a08 80%, rgba(6,10,8,0) 100%)', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 5, border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}>
              {([
                { id: 'chat' as const, icon: '💬', label: 'Chat' },
                { id: 'prayer' as const, icon: '🙏', label: 'Prayer' },
                { id: 'members' as const, icon: '👥', label: 'Members' },
                { id: 'info' as const, icon: 'ℹ️', label: 'Info', badge: selectedGroup.isLeader ? joinRequests.length : 0 },
              ]).map(gt => (
                <button key={gt.id}
                  onClick={() => {
                    setGroupTab(gt.id);
                    if (gt.id === 'members') { loadGroupMembers(selectedGroup.id); if (selectedGroup.isLeader) loadJoinRequests(selectedGroup.id); }
                    if (gt.id === 'info' && selectedGroup.isLeader) loadJoinRequests(selectedGroup.id);
                    if (gt.id === 'chat' && chatMode === 'dm') loadGroupMembers(selectedGroup.id);
                    if (gt.id === 'prayer') loadPrayers(selectedGroup.id);
                  }}
                  style={{ flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', cursor: 'pointer', position: 'relative', borderRadius: 16, transition: 'all 0.15s',
                    background: groupTab === gt.id ? `linear-gradient(135deg, ${A}28, ${A}14)` : 'transparent',
                    boxShadow: groupTab === gt.id ? `0 2px 10px ${A}20` : 'none',
                  }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{gt.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: groupTab === gt.id ? A : 'rgba(232,240,236,0.28)' }}>{gt.label}</span>
                  {(gt as any).badge > 0 && (
                    <div style={{ position: 'absolute', top: 4, right: '18%', width: 14, height: 14, borderRadius: 7, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000' }}>{(gt as any).badge}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SCREEN: FRIENDS
      ════════════════════════════════════════════ */}
      {screen === 'friends' && (
        <div>
          <BackButton label="Home" onPress={() => setScreen('home')} accentColor={A} />
          {authUser && profileId ? (
            <FindFriends accentColor={A} currentUserId={profileId} authToken={authUser.id} />
          ) : (
            <div style={{ borderRadius: 16, padding: 28, textAlign: 'center', background: `${A}06`, border: `1px solid ${A}15` }}>
              <p style={{ fontSize: 28, marginBottom: 12 }}>👥</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', marginBottom: 12 }}>Sign in to find friends</p>
              <button onClick={onOpenAuth} style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>Sign In</button>
            </div>
          )}
        </div>
      )}


      {/* ════════════════════════════════════════════
          SCREEN: SEND A PRAYER
      ════════════════════════════════════════════ */}
      {screen === 'send-prayer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BackButton label="Home" onPress={() => setScreen('home')} accentColor={A} />
          <ScreenTitle text="Send a Prayer" accentColor={A} />
          <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', lineHeight: 1.7, margin: '-8px 0 4px' }}>
            Write a prayer and it will be delivered anonymously to a random believer in the app.
          </p>
          {sendPrayerDone ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🕊</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f0f8f4', marginBottom: 8 }}>Prayer sent.</p>
              <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif' }}>Someone just received it. Keep praying.</p>
              <button onClick={() => { setSendPrayerText(''); setSendPrayerDone(false); }} style={{ marginTop: 24, padding: '10px 28px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
                Send Another
              </button>
            </div>
          ) : (
            <>
              {!authUser ? (
                <div style={{ borderRadius: 16, padding: 28, textAlign: 'center', background: `${A}06`, border: `1px solid ${A}15` }}>
                  <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.5)', marginBottom: 12 }}>Sign in to send a prayer</p>
                  <button onClick={onOpenAuth} style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>Sign In</button>
                </div>
              ) : (
                <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${A}15` }}>
                  <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck
                    value={sendPrayerText} onChange={e => setSendPrayerText(e.target.value)}
                    placeholder="Write a prayer for someone you'll never meet..."
                    style={{ width: '100%', padding: '14px 16px', fontSize: 13, outline: 'none', resize: 'none', minHeight: 120, background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif', boxSizing: 'border-box', border: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 14px', borderTop: `1px solid ${A}08` }}>
                    <button
                      disabled={sendingPrayer || !sendPrayerText.trim()}
                      onClick={async () => {
                        if (!profileId || !sendPrayerText.trim() || !authUser) return;
                        setSendingPrayer(true);
                        try {
                          const supabase = createClient();
                          const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
                          const res = await fetch('/api/prayer', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                            body: JSON.stringify({ content: sendPrayerText.trim() }),
                          });
                          if (res.ok) setSendPrayerDone(true);
                        } finally { setSendingPrayer(false); }
                      }}
                      style={{ padding: '8px 20px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: sendPrayerText.trim() ? 'pointer' : 'default', background: sendPrayerText.trim() ? `linear-gradient(135deg, ${A}, ${A}cc)` : 'rgba(255,255,255,0.05)', color: sendPrayerText.trim() ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                      {sendingPrayer ? 'Sending…' : '🕊 Send Prayer'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          SCREEN: TESTIMONIES
      ════════════════════════════════════════════ */}
      {screen === 'testimonies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BackButton label="Home" onPress={() => setScreen('home')} accentColor={A} />
          <ScreenTitle text="Testimonies" accentColor={A} />
          <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', lineHeight: 1.7, margin: '-8px 0 4px' }}>
            Share what God is doing in your life.
          </p>
          {authUser && profileId && (
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${A}15` }}>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck value={newTestimony}
                onChange={e => setNewTestimony(e.target.value)}
                placeholder="Share what God has done..."
                style={{ width: '100%', padding: '14px 16px', fontSize: 13, outline: 'none', resize: 'none', minHeight: 70, background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif', boxSizing: 'border-box', border: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderTop: `1px solid ${A}08` }}>
                <button onClick={submitTestimony} disabled={postingTestimony || !newTestimony.trim()}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: newTestimony.trim() ? 'pointer' : 'default', background: newTestimony.trim() ? `linear-gradient(135deg, ${A}, ${A}cc)` : 'rgba(255,255,255,0.05)', color: newTestimony.trim() ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                  {postingTestimony ? 'Sharing...' : 'Share Testimony'}
                </button>
              </div>
            </div>
          )}
          {testimonyLoading ? <Spinner accentColor={A} /> : testimonies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>✦</p>
              <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>No testimonies yet. Share what God has done.</p>
            </div>
          ) : testimonies.map(t => (
            <div key={t.id} style={{ borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${A}10` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={t.authorName} color={t.authorColor} size={36} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{t.authorName}</p>
                  <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: 0 }}>{timeAgo(t.createdAt)}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,240,236,0.72)', fontFamily: 'Georgia, serif', margin: 0 }}>{t.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          CREATE GROUP BOTTOM SHEET
      ════════════════════════════════════════════ */}
      {createSheetOpen && (
        <>
          <div onClick={() => setCreateSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: '#0d1410', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', padding: '0 0 env(safe-area-inset-bottom)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div style={{ padding: '8px 20px 24px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 16, fontWeight: 900, color: A, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Create a Group</h3>
                <button onClick={() => setCreateSheetOpen(false)} style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(232,240,236,0.5)', fontSize: 18, cursor: 'pointer' }} aria-label="Close">×</button>
              </div>

              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${A}66`, marginBottom: 10 }}>Group Icon</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {GROUP_ICONS.map(ic => (
                  <button key={ic} onClick={() => setCreateIcon(ic)}
                    style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: createIcon === ic ? `${A}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${createIcon === ic ? A : 'rgba(255,255,255,0.08)'}` }}>
                    {ic}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${A}66`, marginBottom: 8 }}>Group Name</p>
              <input autoCorrect="on" autoCapitalize="words" spellCheck value={createName} onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Men of the Word" maxLength={40}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${A}18`, color: '#f0f8f4', boxSizing: 'border-box', marginBottom: 18 }} />

              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${A}66`, marginBottom: 8 }}>Description</p>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                placeholder="What is this group about? When do you meet?" maxLength={140} rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, fontSize: 13, outline: 'none', resize: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${A}18`, color: '#f0f8f4', boxSizing: 'border-box', marginBottom: 4 }} />
              <p style={{ fontSize: 9, textAlign: 'right', color: 'rgba(232,240,236,0.2)', marginBottom: 18 }}>{createDesc.length}/140</p>

              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${A}66`, marginBottom: 10 }}>Who Can Join?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {([
                  { value: 'open' as const, label: 'Open', desc: 'Anyone can join immediately', icon: '🌐' },
                  { value: 'request' as const, label: 'Approval Required', desc: 'Members request to join — you approve or deny', icon: '🔒' },
                  { value: 'invite' as const, label: 'Invite Only', desc: 'Members must be invited by the group leader', icon: '✉️' },
                ]).map(opt => (
                  <button key={opt.value} onClick={() => setCreatePrivacy(opt.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', background: createPrivacy === opt.value ? `${A}12` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${createPrivacy === opt.value ? A + '40' : 'rgba(255,255,255,0.07)'}` }}>
                    <span style={{ fontSize: 16, marginTop: 1 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: createPrivacy === opt.value ? A : 'rgba(232,240,236,0.7)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: '2px 0 0' }}>{opt.desc}</p>
                    </div>
                    {createPrivacy === opt.value && (
                      <div style={{ width: 18, height: 18, borderRadius: 9, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {createError && (
                <p style={{ fontSize: 11, color: '#f87171', marginBottom: 8, textAlign: 'center' }}>{createError}</p>
              )}
              <button disabled={createLoading || !profileId} onClick={createGroupHandler}
                style={{ width: '100%', padding: '14px 0', borderRadius: 16, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: createName.trim() ? 'pointer' : 'default', background: createName.trim() ? `linear-gradient(135deg, ${A}, ${A}cc)` : 'rgba(255,255,255,0.06)', color: createName.trim() ? '#fff' : 'rgba(255,255,255,0.2)', boxShadow: createName.trim() ? `0 4px 20px ${A}33` : 'none', opacity: (createLoading || !profileId) ? 0.5 : 1 }}>
                {createLoading ? 'Creating…' : `${createIcon} Create Group`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          INCOMING PRAYER MODAL
      ════════════════════════════════════════════ */}
      {incomingPrayer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: 380, borderRadius: 24, background: '#0e1a13', border: `1px solid ${A}25`, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 36, margin: '0 0 8px' }}>🙏</p>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: A, margin: 0 }}>Someone prayed for you</p>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(232,240,236,0.85)', fontFamily: 'Georgia, serif', margin: 0, padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: `1px solid ${A}12` }}>
              "{incomingPrayer.content}"
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={async () => {
                    const supabase = createClient();
                  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
                  await fetch('/api/prayer', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: incomingPrayer.id, action: 'prayed' }) });
                  setIncomingPrayer(null);
                }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${A}, ${A}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
                🙏 I'm praying too
              </button>
              <button
                onClick={async () => {
                    const supabase = createClient();
                  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
                  await fetch('/api/prayer', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id: incomingPrayer.id, action: 'seen' }) });
                  setIncomingPrayer(null);
                }}
                style={{ padding: '12px 16px', borderRadius: 14, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
