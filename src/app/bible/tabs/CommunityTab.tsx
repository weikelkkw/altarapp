'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserIdentity, BookDef, timeAgo } from '../types';
import { createClient } from '@/lib/supabase/client';
import BibleStudyMode from './BibleStudyMode';
import MemberProfilePanel from './MemberProfilePanel';
import MentionInput, { renderMessageWithMentions } from './MentionInput';
import FindFriends from './FindFriends';
import GroupEvents from './GroupEvents';
import GroupReactions from './GroupReactions';
import PinnedMessages, { ReplyPreview } from './PinnedMessages';
import StudyScheduler from './StudyScheduler';
import GroupReadingPlan from './GroupReadingPlan';

/* ─── Types ─────────────────────────────────────────────────── */

interface PrayerRequest {
  id: string;
  userId: string;
  authorName: string;
  authorColor: string;
  content: string;
  prayerCount: number;
  hasPrayed: boolean;
  createdAt: string;
}

interface Testimony {
  id: string;
  userId: string;
  authorName: string;
  authorColor: string;
  content: string;
  createdAt: string;
}

interface GroupMessage {
  id: string;
  authorName: string;
  authorColor: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

interface KingdomGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  icon: string;
  isMember?: boolean;
  isLeader?: boolean;
  pendingJoin?: boolean;
  privacy?: 'open' | 'request' | 'invite';
}

interface GroupMember {
  id: string;
  userId: string;
  name: string;
  color: string;
  role: 'leader' | 'member';
  isMe: boolean;
  joinedAt: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  requestedAt: string;
}

const GROUP_ICONS = ['⚔️', '🌸', '🕊', '🔥', '📖', '✝️', '🙏', '🌿', '⭐', '🦁', '🌊', '👑'];

interface Props {
  selectedBook: BookDef;
  selectedChapter: number;
  userIdentity: UserIdentity;
  accentColor: string;
  onOpenGospel: () => void;
  authUser?: any;
  onOpenAuth?: () => void;
  onDmUnread?: (count: number) => void;
}

/* ─── Avatar ────────────────────────────────────────────────── */

function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0,
      background: color || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────────── */

function SectionHeader({ text, accentColor, icon }: { text: string; accentColor: string; icon?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
      {icon && <span className="text-base">{icon}</span>}
      <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{text}</h2>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */

export default function CommunityTab({ userIdentity, accentColor, authUser, onOpenAuth, onDmUnread }: Props) {
  const [tab, setTab] = useState<'prayer' | 'groups' | 'testimonies'>('groups');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Kingdom Groups state
  const [selectedGroup, setSelectedGroup] = useState<KingdomGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'chat' | 'prayer' | 'members' | 'info'>('chat');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMsgInput, setGroupMsgInput] = useState('');
  const [groupMsgsLoading, setGroupMsgsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'group' | 'dm'>('group');
  const [selectedDmMember, setSelectedDmMember] = useState<GroupMember | null>(null);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<GroupMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmLoading, setDmLoading] = useState(false);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; author: string } | null>(null);

  // Group management state
  const [groupView, setGroupView] = useState<'mine' | 'discover' | 'create'>('mine');
  const [myGroups, setMyGroups] = useState<KingdomGroup[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<KingdomGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createIcon, setCreateIcon] = useState('✝️');
  const [createPrivacy, setCreatePrivacy] = useState<'open' | 'request' | 'invite'>('request');
  const [createLoading, setCreateLoading] = useState(false);

  // Prayer wall state
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [newPrayer, setNewPrayer] = useState('');
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [postingPrayer, setPostingPrayer] = useState(false);

  // Testimonies state
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [newTestimony, setNewTestimony] = useState('');
  const [testimonyLoading, setTestimonyLoading] = useState(true);
  const [postingTestimony, setPostingTestimony] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Profile panel
  const [profileMember, setProfileMember] = useState<GroupMember | null>(null);

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

  /* ── Announcements ──────────────────────────────────────── */
  useEffect(() => {
    try {
      const ann = localStorage.getItem('trace-announcements');
      if (ann) setAnnouncements(JSON.parse(ann));
    } catch {}
  }, []);

  /* ── Load my groups ─────────────────────────────────────── */
  const loadMyGroups = useCallback(async () => {
    if (!profileId) { setMyGroups([]); return; }
    const supabase = createClient();
    if (!supabase) return;
    setGroupsLoading(true);
    try {
      const { data: memberships } = await supabase
        .from('trace_group_members')
        .select('group_id, role')
        .eq('user_id', profileId)
        .eq('status', 'approved');
      if (!memberships?.length) { setMyGroups([]); return; }

      const groupIds = memberships.map((m: any) => m.group_id);
      const roleMap: Record<string, string> = {};
      for (const m of memberships) roleMap[(m as any).group_id] = (m as any).role;

      const { data: groups } = await supabase
        .from('trace_groups')
        .select('id, name, description, icon, privacy')
        .in('id', groupIds);

      const { data: counts } = await supabase
        .from('trace_group_members')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('status', 'approved');
      const countMap: Record<string, number> = {};
      for (const c of (counts || [])) countMap[(c as any).group_id] = (countMap[(c as any).group_id] || 0) + 1;

      setMyGroups((groups || []).map((g: any) => ({
        id: g.id, name: g.name, description: g.description || '',
        memberCount: countMap[g.id] || 1,
        icon: g.icon || '✝️',
        isMember: true, isLeader: roleMap[g.id] === 'leader',
        privacy: g.privacy as any,
      })));
    } catch (err) { console.warn('loadMyGroups:', err); }
    finally { setGroupsLoading(false); }
  }, [profileId]);

  /* ── Load discover groups ───────────────────────────────── */
  const loadDiscoverGroups = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: groups } = await supabase
        .from('trace_groups')
        .select('id, name, description, icon, privacy')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!groups?.length) { setDiscoverGroups([]); return; }

      const allGroupIds = groups.map((g: any) => g.id);
      let memberMap: Record<string, string> = {};
      if (profileId) {
        const { data: mine } = await supabase
          .from('trace_group_members')
          .select('group_id, status')
          .eq('user_id', profileId)
          .in('group_id', allGroupIds);
        for (const m of (mine || [])) memberMap[(m as any).group_id] = (m as any).status;
      }

      const { data: counts } = await supabase
        .from('trace_group_members')
        .select('group_id')
        .in('group_id', allGroupIds)
        .eq('status', 'approved');
      const countMap: Record<string, number> = {};
      for (const c of (counts || [])) countMap[(c as any).group_id] = (countMap[(c as any).group_id] || 0) + 1;

      setDiscoverGroups((groups || [])
        .filter((g: any) => memberMap[g.id] !== 'approved')
        .map((g: any) => ({
          id: g.id, name: g.name, description: g.description || '',
          memberCount: countMap[g.id] || 0,
          icon: g.icon || '✝️',
          isMember: false, isLeader: false,
          pendingJoin: memberMap[g.id] === 'pending',
          privacy: g.privacy as any,
        }))
      );
    } catch (err) { console.warn('loadDiscoverGroups:', err); }
  }, [profileId]);

  /* ── Load group members ─────────────────────────────────── */
  const loadGroupMembers = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: members } = await supabase
        .from('trace_group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId)
        .eq('status', 'approved');
      if (!members?.length) { setGroupMembers([]); return; }

      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', userIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;

      setGroupMembers(members.map((m: any) => ({
        id: m.user_id,
        userId: m.user_id,
        name: profMap[m.user_id]?.display_name || 'Member',
        color: profMap[m.user_id]?.avatar_color || '#6366f1',
        role: m.role as 'leader' | 'member',
        isMe: m.user_id === profileId,
        joinedAt: m.joined_at || new Date().toISOString(),
      })));
    } catch (err) { console.warn('loadGroupMembers:', err); }
  }, [profileId]);

  /* ── Load join requests ─────────────────────────────────── */
  const loadJoinRequests = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: pending } = await supabase
        .from('trace_group_members')
        .select('user_id, joined_at')
        .eq('group_id', groupId)
        .eq('status', 'pending');
      if (!pending?.length) { setJoinRequests([]); return; }

      const userIds = pending.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', userIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;

      setJoinRequests(pending.map((m: any) => ({
        id: m.user_id,
        userId: m.user_id,
        userName: profMap[m.user_id]?.display_name || 'User',
        userColor: profMap[m.user_id]?.avatar_color || '#6366f1',
        requestedAt: m.joined_at,
      })));
    } catch (err) { console.warn('loadJoinRequests:', err); }
  }, []);

  /* ── Load group messages ────────────────────────────────── */
  const loadGroupMessages = useCallback(async (groupId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setGroupMsgsLoading(true);
    try {
      const { data: msgs } = await supabase
        .from('trace_group_messages')
        .select('id, sender_id, content, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(60);
      if (!msgs?.length) { setGroupMessages([]); return; }

      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', senderIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;

      setGroupMessages(msgs.map((m: any) => ({
        id: m.id,
        authorName: profMap[m.sender_id]?.display_name || 'Member',
        authorColor: profMap[m.sender_id]?.avatar_color || '#6366f1',
        content: m.content,
        createdAt: m.created_at,
        isMine: m.sender_id === profileId,
      })));
    } catch (err) { console.warn('loadGroupMessages:', err); }
    finally { setGroupMsgsLoading(false); }
  }, [profileId]);

  /* ── Load prayer requests ───────────────────────────────── */
  const loadPrayers = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setPrayerLoading(false); return; }
    try {
      const { data: posts } = await supabase
        .from('trace_posts')
        .select('id, user_id, content, created_at')
        .eq('verse_ref', 'prayer-request')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!posts || posts.length === 0) { setPrayers([]); setPrayerLoading(false); return; }

      const authorIds = [...new Set(posts.map((p: any) => p.user_id))];
      const postIds = posts.map((p: any) => p.id);

      const [profilesRes, prayersRes] = await Promise.all([
        supabase.from('trace_profiles').select('id, display_name, avatar_color').in('id', authorIds),
        supabase.from('trace_post_prayers').select('post_id, user_id').in('post_id', postIds),
      ]);

      const profiles: Record<string, { name: string; color: string }> = {};
      for (const p of (profilesRes.data || [])) {
        profiles[(p as any).id] = { name: (p as any).display_name || 'User', color: (p as any).avatar_color || '#6366f1' };
      }

      const prayerCounts: Record<string, string[]> = {};
      for (const p of (prayersRes.data || [])) {
        (prayerCounts[(p as any).post_id] ??= []).push((p as any).user_id);
      }

      setPrayers(posts.map((p: any) => {
        const prof = profiles[p.user_id];
        return {
          id: p.id, userId: p.user_id,
          authorName: prof?.name || 'User', authorColor: prof?.color || '#6366f1',
          content: p.content, createdAt: p.created_at,
          prayerCount: (prayerCounts[p.id] || []).length,
          hasPrayed: profileId ? (prayerCounts[p.id] || []).includes(profileId) : false,
        };
      }));
    } catch (err) {
      console.warn('Load prayers:', err);
      setPrayers([]);
    } finally {
      setPrayerLoading(false);
    }
  }, [profileId]);

  /* ── Load testimonies ───────────────────────────────────── */
  const loadTestimonies = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setTestimonyLoading(false); return; }
    try {
      const { data: posts } = await supabase
        .from('trace_posts')
        .select('id, user_id, content, created_at')
        .eq('verse_ref', 'testimony')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!posts || posts.length === 0) { setTestimonies([]); setTestimonyLoading(false); return; }

      const authorIds = [...new Set(posts.map((p: any) => p.user_id))];
      const { data: profilesData } = await supabase.from('trace_profiles').select('id, display_name, avatar_color').in('id', authorIds);

      const profiles: Record<string, { name: string; color: string }> = {};
      for (const p of (profilesData || [])) {
        profiles[(p as any).id] = { name: (p as any).display_name || 'User', color: (p as any).avatar_color || '#6366f1' };
      }

      setTestimonies(posts.map((p: any) => {
        const prof = profiles[p.user_id];
        return {
          id: p.id, userId: p.user_id,
          authorName: prof?.name || 'User', authorColor: prof?.color || '#6366f1',
          content: p.content, createdAt: p.created_at,
        };
      }));
    } catch (err) {
      console.warn('Load testimonies:', err);
      setTestimonies([]);
    } finally {
      setTestimonyLoading(false);
    }
  }, []);

  /* ── Effects ────────────────────────────────────────────── */
  useEffect(() => { loadPrayers(); }, [loadPrayers]);
  useEffect(() => { loadTestimonies(); }, [loadTestimonies]);
  useEffect(() => {
    if (profileId) { loadMyGroups(); loadDiscoverGroups(); }
    else { setMyGroups([]); setDiscoverGroups([]); }
  }, [profileId, loadMyGroups, loadDiscoverGroups]);

  // When selected group changes — load messages, members, join requests + set up real-time
  useEffect(() => {
    if (groupChatChannelRef.current) {
      groupChatChannelRef.current.unsubscribe();
      groupChatChannelRef.current = null;
    }
    if (!selectedGroup) {
      setGroupMessages([]); setGroupMembers([]); setJoinRequests([]);
      return;
    }
    loadGroupMessages(selectedGroup.id);
    loadGroupMembers(selectedGroup.id);
    if (selectedGroup.isLeader) loadJoinRequests(selectedGroup.id);

    const supabase = createClient();
    if (supabase) {
      const channel = supabase
        .channel(`group-chat-${selectedGroup.id}`)
        .on('postgres_changes' as any, {
          event: 'INSERT', schema: 'public',
          table: 'trace_group_messages',
          filter: `group_id=eq.${selectedGroup.id}`,
        }, () => { loadGroupMessages(selectedGroup.id); })
        .subscribe();
      groupChatChannelRef.current = channel;
    }
    return () => {
      if (groupChatChannelRef.current) {
        groupChatChannelRef.current.unsubscribe();
        groupChatChannelRef.current = null;
      }
    };
  }, [selectedGroup?.id]); // eslint-disable-line

  /* ── Group actions ──────────────────────────────────────── */
  const createGroupHandler = async () => {
    if (!createName.trim() || !profileId) return;
    setCreateLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data: newGroup, error } = await supabase
        .from('trace_groups')
        .insert({ name: createName.trim(), description: createDesc.trim(), icon: createIcon, privacy: createPrivacy, created_by: profileId })
        .select('id').single();
      if (error || !newGroup) throw error || new Error('No data returned');
      await supabase.from('trace_group_members').insert({ group_id: (newGroup as any).id, user_id: profileId, role: 'leader', status: 'approved' });
      setCreateName(''); setCreateDesc(''); setCreateIcon('✝️'); setCreatePrivacy('request');
      setGroupView('mine');
      await loadMyGroups();
    } catch (err) { console.error('Create group:', err); }
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
      const res = await fetch('/api/group/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: req.userId }),
      });
      if (!res.ok) { console.error('Approve failed:', await res.text()); return; }
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
      const res = await fetch('/api/group/approve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: req.userId }),
      });
      if (!res.ok) { console.error('Deny failed:', await res.text()); return; }
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

  const promoteMember = async (memberId: string, currentRole: 'leader' | 'member') => {
    if (!selectedGroup) return;
    const newRole = currentRole === 'leader' ? 'member' : 'leader';
    try {
      const res = await fetch('/api/group/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroup.id, userId: memberId, role: newRole }),
      });
      if (res.ok) {
        setGroupMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      }
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
      // Real-time subscription will update the messages list; do an explicit reload as fallback
      setTimeout(() => loadGroupMessages(selectedGroup.id), 500);
    } catch (err) { console.error('Send group message:', err); setGroupMsgInput(text); }
  };

  /* ── DM helpers ─────────────────────────────────────────── */
  const findOrCreateDm = async (otherProfileId: string): Promise<string | null> => {
    if (!profileId) return null;
    const supabase = createClient();
    if (!supabase) return null;
    try {
      // Find existing DM conversation with this person
      const { data: mine } = await supabase
        .from('trace_conversation_participants')
        .select('conversation_id')
        .eq('user_id', profileId);
      const myConvIds = (mine || []).map((r: any) => r.conversation_id);

      if (myConvIds.length > 0) {
        const { data: shared } = await supabase
          .from('trace_conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherProfileId)
          .in('conversation_id', myConvIds)
          .limit(1);
        if (shared?.length) return (shared[0] as any).conversation_id;
      }

      // Create new conversation
      const { data: conv } = await supabase
        .from('trace_conversations')
        .insert({})
        .select('id').single();
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
      const { data: msgs } = await supabase
        .from('trace_messages')
        .select('id, sender_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(60);
      if (!msgs?.length) { setDmMessages([]); return; }

      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', senderIds);
      const profMap: Record<string, any> = {};
      for (const p of (profiles || [])) profMap[(p as any).id] = p;

      setDmMessages(msgs.map((m: any) => ({
        id: m.id,
        authorName: profMap[m.sender_id]?.display_name || 'User',
        authorColor: profMap[m.sender_id]?.avatar_color || '#6366f1',
        content: m.content,
        createdAt: m.created_at,
        isMine: m.sender_id === profileId,
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
    // Optimistic update — shows message immediately
    const tempId = `temp-${Date.now()}`;
    setDmMessages(prev => [...prev, {
      id: tempId,
      authorName: 'You',
      authorColor: '#6366f1',
      content: text,
      createdAt: new Date().toISOString(),
      isMine: true,
    }]);
    try {
      await supabase.from('trace_messages').insert({ conversation_id: dmConversationId, sender_id: profileId, content: text });
      // Sync to replace temp message with real one
      await loadDmMessages(dmConversationId);
    } catch (err) {
      console.error('sendDm:', err);
      setDmInput(text);
      setDmMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const startDm = async (member: GroupMember) => {
    setSelectedDmMember(member);
    setDmMessages([]);
    setDmConversationId(null);
    const convId = await findOrCreateDm(member.id);
    setDmConversationId(convId);
    if (convId) await loadDmMessages(convId);
  };

  // Real-time subscription for DMs — fires whenever dmConversationId changes
  useEffect(() => {
    if (dmChannelRef.current) {
      dmChannelRef.current.unsubscribe();
      dmChannelRef.current = null;
    }
    if (!dmConversationId) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`dm-${dmConversationId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public',
        table: 'trace_messages',
        filter: `conversation_id=eq.${dmConversationId}`,
      }, (payload: any) => {
        const incoming = payload.new;
        // Skip if it's our own message (already shown optimistically)
        if (incoming?.sender_id === profileId) return;
        // Append new message from the other person
        loadDmMessages(dmConversationId);
        // If user isn't actively viewing this DM, fire unread notification
        if (chatMode !== 'dm') {
          onDmUnread?.(1);
        }
      })
      .subscribe();

    dmChannelRef.current = channel;
    return () => {
      if (dmChannelRef.current) {
        dmChannelRef.current.unsubscribe();
        dmChannelRef.current = null;
      }
    };
  }, [dmConversationId, profileId, chatMode]);

  /* ── Prayer / Testimony actions ─────────────────────────── */
  const submitPrayer = async () => {
    if (!newPrayer.trim() || !profileId) return;
    setPostingPrayer(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('trace_posts').insert({ user_id: profileId, content: newPrayer.trim(), verse_ref: 'prayer-request' });
      setNewPrayer('');
      await loadPrayers();
    } catch (err) { console.error('Submit prayer failed:', err); }
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
    await loadPrayers();
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
    } catch (err) { console.error('Submit testimony failed:', err); }
    finally { setPostingTestimony(false); }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Church header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 4, height: 24, borderRadius: 9999, background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
            <h2 style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Church</h2>
          </div>
          <p style={{ color: 'rgba(232,240,236,0.3)', fontSize: 10, paddingLeft: 12, margin: 0 }}>Community · Groups · Prayer</p>
        </div>
        <img src="/png_church-removebg-preview.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', mixBlendMode: 'screen', opacity: 0.9, flexShrink: 0 }} />
      </div>

      {/* ── Bible Study Mode overlay ── */}
      {studyModeOpen && (
        <BibleStudyMode
          accentColor={accentColor}
          groupName={selectedGroup?.name}
          onClose={() => setStudyModeOpen(false)}
        />
      )}

      {/* ── Sign in prompt ── */}
      {!authUser && (
        <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18`, marginBottom: 16 }}>
          <img src="/png_church-removebg-preview.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain', mixBlendMode: 'screen', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', marginBottom: 4 }}>Welcome to Church</p>
          <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', marginBottom: 16 }}>Sign in to join the community, share prayer requests, and connect with believers.</p>
          {onOpenAuth && (
            <button onClick={onOpenAuth}
              style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
              Sign In / Create Account
            </button>
          )}
        </div>
      )}

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <div style={{ borderRadius: 12, padding: 16, background: `${accentColor}08`, border: `1px solid ${accentColor}18`, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentColor, marginBottom: 8 }}>Announcement</p>
          {announcements.map((a, i) => (
            <p key={i} style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif', margin: 0 }}>{a}</p>
          ))}
        </div>
      )}

      {/* ── Pill tab navigation ── */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 30, background: 'rgba(255,255,255,0.04)', marginBottom: 20 }}>
        {([
          { id: 'groups' as const, label: 'Groups' },
          { id: 'prayer' as const, label: 'Friends' },
          { id: 'testimonies' as const, label: 'Testimonies' },
        ]).map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setSelectedGroup(null); }}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 26,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s',
              fontFamily: 'Montserrat, system-ui, sans-serif',
              ...(tab === t.id
                ? { background: `${accentColor}22`, color: accentColor }
                : { background: 'transparent', color: 'rgba(232,240,236,0.38)' }
              ),
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FRIENDS                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'prayer' && (
        authUser && profileId ? (
          <FindFriends accentColor={accentColor} currentUserId={profileId} authToken={authUser.id} />
        ) : (
          <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: `${accentColor}06`, border: `1px solid ${accentColor}15` }}>
            <p style={{ fontSize: 28, marginBottom: 12 }}>👥</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', marginBottom: 12 }}>Sign in to find friends</p>
            <button onClick={onOpenAuth}
              style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
              Sign In
            </button>
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* KINGDOM GROUPS — list view                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'groups' && !selectedGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!authUser ? (
            <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: `${accentColor}06`, border: `1px solid ${accentColor}15` }}>
              <p style={{ fontSize: 28, marginBottom: 12 }}>👑</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', marginBottom: 12 }}>Sign in to join a Kingdom Group</p>
              <button onClick={onOpenAuth}
                style={{ padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
                Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 16, fontWeight: 900, color: '#f0f8f4', margin: 0 }}>My Groups</h3>
                <button
                  onClick={() => setGroupView('create')}
                  style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${accentColor}22`, color: accentColor, border: `1.5px solid ${accentColor}40`, cursor: 'pointer' }}>
                  + New
                </button>
              </div>

              {/* My / Discover toggle */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setGroupView('mine')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(groupView !== 'discover' ? { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.4)', border: 'none' }) }}>
                  My Groups
                </button>
                <button
                  onClick={() => { setGroupView('discover'); loadDiscoverGroups(); }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(groupView === 'discover' ? { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.4)', border: 'none' }) }}>
                  Discover
                </button>
              </div>

              {/* ─── MY GROUPS ─── */}
              {groupView !== 'discover' && (
                <>
                  {groupsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  ) : myGroups.length === 0 ? (
                    <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10` }}>
                      <img src="/png_church-removebg-preview.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain', mixBlendMode: 'screen', display: 'block', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.5)', marginBottom: 4 }}>You&apos;re not in any groups yet</p>
                      <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.25)', fontFamily: 'Georgia, serif', margin: 0 }}>Find a group or create your own to get started.</p>
                    </div>
                  ) : (
                    myGroups.map(group => (
                      <button key={group.id}
                        onClick={() => { setSelectedGroup(group); setGroupTab('chat'); setGroupMessages([]); setChatMode('group'); setSelectedDmMember(null); }}
                        style={{ width: '100%', borderRadius: 20, padding: '16px 18px', textAlign: 'left', background: `linear-gradient(135deg, ${accentColor}06 0%, rgba(255,255,255,0.025) 100%)`, border: `1px solid ${accentColor}14`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Icon circle */}
                        <div style={{ width: 48, height: 48, borderRadius: 24, background: `${accentColor}18`, border: `1.5px solid ${accentColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          {group.icon}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                            {group.isLeader && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}33`, flexShrink: 0 }}>Leader</span>
                            )}
                          </div>
                          <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.38)', margin: 0 }}>
                            {group.memberCount} members
                            <span style={{ margin: '0 5px', color: 'rgba(232,240,236,0.18)' }}>·</span>
                            <span style={{ color: group.privacy === 'open' ? '#22c55e' : group.privacy === 'invite' ? '#94a3b8' : '#f59e0b' }}>
                              {group.privacy === 'open' ? 'Open' : group.privacy === 'invite' ? 'Invite Only' : 'Approval Required'}
                            </span>
                          </p>
                        </div>
                        {/* Arrow + pending badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          {group.isLeader && joinRequests.length > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                              {joinRequests.length} pending
                            </span>
                          )}
                          <span style={{ color: `${accentColor}60`, fontSize: 16, fontWeight: 300 }}>›</span>
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}

              {/* ─── DISCOVER GROUPS ─── */}
              {groupView === 'discover' && (
                <>
                  {discoverGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <p style={{ fontSize: 24, marginBottom: 8 }}>👑</p>
                      <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>No other groups to discover right now.</p>
                    </div>
                  ) : (
                    discoverGroups.map(group => {
                      const privacyColor = group.privacy === 'open' ? '#22c55e' : group.privacy === 'invite' ? '#94a3b8' : '#f59e0b';
                      const privacyLabel = group.privacy === 'open' ? 'Open' : group.privacy === 'invite' ? 'Invite Only' : 'Approval Required';
                      return (
                        <div key={group.id} style={{ borderRadius: 20, padding: '16px 18px', background: `linear-gradient(135deg, ${accentColor}06 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${accentColor}12`, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 24, background: `${accentColor}15`, border: `1.5px solid ${accentColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                            {group.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                            <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
                            <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: 0 }}>
                              {group.memberCount} members
                              <span style={{ margin: '0 5px', color: 'rgba(232,240,236,0.15)' }}>·</span>
                              <span style={{ color: privacyColor }}>{privacyLabel}</span>
                            </p>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {group.pendingJoin ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.22)' }}>Requested</span>
                            ) : group.privacy === 'invite' ? (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '5px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.3)' }}>Invite Only</span>
                            ) : (
                              <button onClick={() => joinGroup(group)}
                                style={{ fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: group.privacy === 'open' ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : `${accentColor}18`, color: group.privacy === 'open' ? '#fff' : accentColor, boxShadow: group.privacy === 'open' ? `0 2px 10px ${accentColor}33` : 'none' }}>
                                {group.privacy === 'open' ? 'Join' : 'Request'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* GROUP DETAIL VIEW                                     */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'groups' && selectedGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Group header bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setSelectedGroup(null)}
              style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', flexShrink: 0 }}>
              ← Groups
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 20 }}>{selectedGroup.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedGroup.name}</p>
                  {selectedGroup.isLeader && (
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}35`, flexShrink: 0 }}>Leader</span>
                  )}
                </div>
                <p style={{ fontSize: 9, color: `${accentColor}70`, margin: 0 }}>{selectedGroup.memberCount} members · {selectedGroup.privacy === 'open' ? 'Open' : selectedGroup.privacy === 'invite' ? 'Invite Only' : 'Approval Required'}</p>
              </div>
            </div>
            <button onClick={() => setStudyModeOpen(true)}
              style={{ padding: '7px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25`, cursor: 'pointer', flexShrink: 0 }}>
              📚 Study
            </button>
          </div>

          {/* ── TAB CONTENT ── */}
          <div style={{ marginBottom: 60 }}>

            {/* ── CHAT TAB ── */}
            {groupTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Pinned button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button onClick={() => setPinnedOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,240,236,0.45)', cursor: 'pointer' }}>
                    📌 Pinned
                  </button>
                </div>

                {/* Chat mode toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => { setChatMode('group'); setSelectedDmMember(null); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(chatMode === 'group' ? { background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` } : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: 'none' }) }}>
                    <span>👥</span> Group Chat
                  </button>
                  <button onClick={() => { setChatMode('dm'); if (!groupMembers.length) loadGroupMembers(selectedGroup.id); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', ...(chatMode === 'dm' ? { background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` } : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: 'none' }) }}>
                    <span>🔒</span> Direct Message
                  </button>
                </div>

                {/* ─ GROUP CHAT ─ */}
                {chatMode === 'group' && (
                  <>
                    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10`, minHeight: 200 }}>
                      {groupMsgsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      ) : groupMessages.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
                          <span style={{ fontSize: 28, marginBottom: 10 }}>💬</span>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,240,236,0.4)', marginBottom: 4 }}>No messages yet</p>
                          <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', margin: 0 }}>Only {selectedGroup.name} members can see this.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, maxHeight: 320, overflowY: 'auto' }}>
                          {groupMessages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.isMine ? 'row-reverse' : 'row' }}>
                              {!msg.isMine && <Avatar name={msg.authorName} color={msg.authorColor} size={26} />}
                              <div style={{ maxWidth: '75%' }}>
                                {!msg.isMine && (
                                  <p style={{ fontSize: 9, fontWeight: 700, marginBottom: 3, paddingLeft: 4, color: msg.authorColor }}>{msg.authorName}</p>
                                )}
                                <div style={{
                                  padding: '9px 13px',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                  background: msg.isMine ? `${accentColor}25` : 'rgba(255,255,255,0.05)',
                                  color: 'rgba(232,240,236,0.9)',
                                  borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                }}>
                                  {renderMessageWithMentions(msg.content, userIdentity.name || '', accentColor)}
                                </div>
                                <p style={{ fontSize: 8, marginTop: 3, color: 'rgba(232,240,236,0.2)', textAlign: msg.isMine ? 'right' : 'left', paddingLeft: msg.isMine ? 0 : 4 }}>{timeAgo(msg.createdAt)}</p>
                                {profileId && (
                                  <GroupReactions
                                    messageId={msg.id}
                                    profileId={profileId}
                                    accentColor={accentColor}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {authUser ? (
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                        {replyTo && (
                          <ReplyPreview
                            replyToAuthor={replyTo.author}
                            replyToContent={replyTo.content}
                            accentColor={accentColor}
                            onClear={() => setReplyTo(null)}
                          />
                        )}
                        <MentionInput
                          value={groupMsgInput}
                          onChange={setGroupMsgInput}
                          onSend={sendGroupMessage}
                          members={groupMembers.map(m => ({ userId: m.id, name: m.name, color: m.color }))}
                          accentColor={accentColor}
                          placeholder={`Message ${selectedGroup.name}...`}
                        />
                      </div>
                    ) : (
                      <button onClick={onOpenAuth}
                        style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Sign in to chat
                      </button>
                    )}
                  </>
                )}

                {/* ─ DIRECT MESSAGES ─ */}
                {chatMode === 'dm' && !selectedDmMember && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: `${accentColor}60`, paddingLeft: 2 }}>Send a private message to a member</p>
                    {groupMembers.filter(m => !m.isMe).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)' }}>No other members to message yet.</p>
                      </div>
                    ) : (
                      groupMembers.filter(m => !m.isMe).map(m => (
                        <button key={m.id}
                          onClick={() => startDm(m)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}08`, cursor: 'pointer', textAlign: 'left' }}>
                          <Avatar name={m.name} color={m.color} size={34} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{m.name}</p>
                            <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>Tap to message privately</p>
                          </div>
                          <span style={{ color: 'rgba(232,240,236,0.2)', fontSize: 14 }}>🔒</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {chatMode === 'dm' && selectedDmMember && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => { setSelectedDmMember(null); setDmMessages([]); setDmConversationId(null); }}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                        ←
                      </button>
                      <Avatar name={selectedDmMember.name} color={selectedDmMember.color} size={28} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{selectedDmMember.name}</p>
                        <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>Private · only you two can see this</p>
                      </div>
                    </div>
                    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10`, minHeight: 180 }}>
                      {dmLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      ) : dmMessages.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
                          <span style={{ fontSize: 22, marginBottom: 8 }}>🔒</span>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,240,236,0.35)', marginBottom: 4 }}>Private conversation</p>
                          <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', margin: 0 }}>Only you and {selectedDmMember.name} can read this.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, maxHeight: 280, overflowY: 'auto' }}>
                          {dmMessages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.isMine ? 'row-reverse' : 'row' }}>
                              {!msg.isMine && <Avatar name={msg.authorName} color={msg.authorColor} size={26} />}
                              <div style={{ maxWidth: '75%' }}>
                                <div style={{
                                  padding: '9px 13px',
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                  background: msg.isMine ? `${accentColor}25` : 'rgba(255,255,255,0.05)',
                                  color: 'rgba(232,240,236,0.9)',
                                  borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                }}>
                                  {msg.content}
                                </div>
                                <p style={{ fontSize: 8, marginTop: 3, color: 'rgba(232,240,236,0.2)', textAlign: msg.isMine ? 'right' : 'left' }}>{timeAgo(msg.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="text"
                        value={dmInput} onChange={e => setDmInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && dmInput.trim()) sendDm(); }}
                        placeholder={`Message ${selectedDmMember.name}...`}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 20, fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, color: '#f0f8f4' }} />
                      <button disabled={!dmInput.trim() || !dmConversationId}
                        onClick={sendDm}
                        style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: dmInput.trim() ? 'pointer' : 'default', background: dmInput.trim() ? accentColor : 'rgba(255,255,255,0.05)', color: dmInput.trim() ? '#000' : 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 16 }}>
                        ↑
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PRAYER TAB ── */}
            {groupTab === 'prayer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Post new prayer */}
                <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
                  <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    value={newPrayer}
                    onChange={e => setNewPrayer(e.target.value)}
                    placeholder="Share a prayer request with the group..."
                    style={{ width: '100%', padding: '14px 16px', fontSize: 13, outline: 'none', resize: 'none', minHeight: 72, background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif', boxSizing: 'border-box', border: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderTop: `1px solid ${accentColor}08` }}>
                    <button onClick={submitPrayer} disabled={postingPrayer || !newPrayer.trim()}
                      style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: newPrayer.trim() ? 'pointer' : 'default', background: newPrayer.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.05)', color: newPrayer.trim() ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                      {postingPrayer ? 'Posting…' : '🙏 Post Prayer'}
                    </button>
                  </div>
                </div>

                {/* Prayer cards */}
                {prayerLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : prayers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <p style={{ fontSize: 26, marginBottom: 8 }}>🙏</p>
                    <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>No prayer requests yet. Be the first to share.</p>
                  </div>
                ) : (
                  prayers.map(pr => (
                    <div key={pr.id} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Avatar name={pr.authorName} color={pr.authorColor} size={32} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{pr.authorName}</p>
                          <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>{timeAgo(pr.createdAt)}</p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: pr.hasPrayed ? `${accentColor}20` : 'rgba(255,255,255,0.05)', color: pr.hasPrayed ? accentColor : 'rgba(232,240,236,0.4)', border: `1px solid ${pr.hasPrayed ? accentColor + '35' : 'rgba(255,255,255,0.08)'}` }}>
                          🙏 {pr.prayerCount}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif', margin: '0 0 12px' }}>{pr.content}</p>
                      <button onClick={() => prayFor(pr.id)}
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: pr.hasPrayed ? `${accentColor}18` : 'rgba(255,255,255,0.05)', color: pr.hasPrayed ? accentColor : 'rgba(232,240,236,0.5)' }}>
                        {pr.hasPrayed ? '🙏 Praying' : '🙏 Pray'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {groupTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupMembers.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : (
                  groupMembers.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${accentColor}08` }}>
                      <button onClick={() => setProfileMember(m)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Avatar name={m.name} color={m.color} size={36} />
                      </button>
                      <button onClick={() => setProfileMember(m)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>
                          {m.role === 'leader' && <span style={{ fontSize: 12, marginRight: 4 }}>👑</span>}
                          {m.name}{m.isMe ? ' (You)' : ''}
                        </p>
                        <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>Joined {timeAgo(m.joinedAt)}</p>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 10, fontWeight: 700, background: m.role === 'leader' ? `${accentColor}22` : 'rgba(255,255,255,0.04)', color: m.role === 'leader' ? accentColor : 'rgba(232,240,236,0.3)' }}>
                          {m.role === 'leader' ? 'Leader' : 'Member'}
                        </span>
                        {selectedGroup.isLeader && !m.isMe && (
                          <>
                            <button onClick={() => promoteMember(m.id, m.role)} title={m.role === 'leader' ? 'Demote to Member' : 'Promote to Leader'}
                              style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}28`, fontSize: 11, cursor: 'pointer' }}>
                              {m.role === 'leader' ? '↓' : '↑'}
                            </button>
                            <button onClick={() => removeMember(m.id)}
                              style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.55)', border: '1px solid rgba(239,68,68,0.12)', fontSize: 11, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── INFO TAB ── */}
            {groupTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Group identity card */}
                <div style={{ borderRadius: 20, padding: '20px 18px', background: `linear-gradient(135deg, ${accentColor}08 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${accentColor}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: `${accentColor}18`, border: `2px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                    {selectedGroup.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', margin: '0 0 4px' }}>{selectedGroup.name}</p>
                    {selectedGroup.description && (
                      <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif', lineHeight: 1.6, margin: '0 0 8px' }}>{selectedGroup.description}</p>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: selectedGroup.privacy === 'open' ? 'rgba(34,197,94,0.12)' : selectedGroup.privacy === 'invite' ? 'rgba(148,163,184,0.1)' : 'rgba(245,158,11,0.12)', color: selectedGroup.privacy === 'open' ? '#22c55e' : selectedGroup.privacy === 'invite' ? '#94a3b8' : '#f59e0b', border: `1px solid ${selectedGroup.privacy === 'open' ? 'rgba(34,197,94,0.22)' : selectedGroup.privacy === 'invite' ? 'rgba(148,163,184,0.18)' : 'rgba(245,158,11,0.22)'}` }}>
                      {selectedGroup.privacy === 'open' ? '🌐 Open' : selectedGroup.privacy === 'invite' ? '✉️ Invite Only' : '🔒 Approval Required'}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: `${accentColor}70`, margin: 0 }}>{selectedGroup.memberCount} members</p>
                </div>

                {/* Join Requests — leader only */}
                {selectedGroup.isLeader && joinRequests.length > 0 && (
                  <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', margin: 0 }}>
                        Join Requests ({joinRequests.length})
                      </p>
                    </div>
                    {joinRequests.map(req => (
                      <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.07)' }}>
                        <Avatar name={req.userName} color={req.userColor} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f8f4', margin: 0 }}>{req.userName}</p>
                          <p style={{ fontSize: 9, color: 'rgba(232,240,236,0.3)', margin: 0 }}>Requested {timeAgo(req.requestedAt)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => approveRequest(req)}
                            style={{ padding: '6px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}35`, cursor: 'pointer' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => denyRequest(req)}
                            style={{ padding: '6px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)', cursor: 'pointer' }}>
                            ✕ Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Events */}
                {profileId && (
                  <GroupEvents
                    groupId={selectedGroup.id}
                    profileId={profileId}
                    isLeader={!!selectedGroup.isLeader}
                    accentColor={accentColor}
                  />
                )}

                {/* Study Scheduler */}
                {profileId && (
                  <StudyScheduler
                    groupId={selectedGroup.id}
                    profileId={profileId}
                    isLeader={!!selectedGroup.isLeader}
                    accentColor={accentColor}
                  />
                )}

                {/* Reading Plan */}
                {profileId && (
                  <GroupReadingPlan
                    groupId={selectedGroup.id}
                    profileId={profileId}
                    isLeader={!!selectedGroup.isLeader}
                    accentColor={accentColor}
                  />
                )}

                {/* Leave group — non-leader */}
                {!selectedGroup.isLeader && (
                  <button onClick={leaveGroup}
                    style={{ width: '100%', padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', marginTop: 8 }}>
                    Leave Group
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Bottom tab bar — sticky within group view ── */}
          <div style={{ position: 'sticky', bottom: 0, background: '#060a08', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', marginTop: 0, zIndex: 10 }}>
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
                }}
                style={{ flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative' }}>
                <span style={{ fontSize: 18 }}>{gt.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: groupTab === gt.id ? accentColor : 'rgba(232,240,236,0.3)' }}>{gt.label}</span>
                {groupTab === gt.id && (
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: 1, background: accentColor }} />
                )}
                {(gt as any).badge > 0 && (
                  <div style={{ position: 'absolute', top: 6, right: '25%', width: 14, height: 14, borderRadius: 7, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000' }}>
                    {(gt as any).badge}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* PRAYER WALL                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'testimonies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionHeader text="Testimonies" accentColor={accentColor} icon="✦" />
          <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif', lineHeight: 1.7, margin: 0 }}>
            Share what God is doing in your life. Your testimony could be the encouragement someone needs today.
          </p>

          {authUser && profileId && (
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={newTestimony}
                onChange={e => setNewTestimony(e.target.value)}
                placeholder="Share what God has done..."
                style={{ width: '100%', padding: '14px 16px', fontSize: 13, outline: 'none', resize: 'none', minHeight: 70, background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif', boxSizing: 'border-box', border: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderTop: `1px solid ${accentColor}08` }}>
                <button onClick={submitTestimony} disabled={postingTestimony || !newTestimony.trim()}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: newTestimony.trim() ? 'pointer' : 'default', background: newTestimony.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.05)', color: newTestimony.trim() ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                  {postingTestimony ? 'Sharing...' : 'Share Testimony'}
                </button>
              </div>
            </div>
          )}

          {testimonyLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!testimonyLoading && testimonies.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>✦</p>
              <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>No testimonies yet. Share what God has done.</p>
            </div>
          )}

          {testimonies.map(t => (
            <div key={t.id} style={{ borderRadius: 16, padding: '16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
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

      {/* ── Footer verse ── */}
      {!selectedGroup && (
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif', margin: 0 }}>
            &ldquo;For where two or three gather in my name, there am I with them.&rdquo;
          </p>
          <p style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: 'rgba(232,240,236,0.15)', marginBottom: 0 }}>Matthew 18:20</p>
        </div>
      )}

      {/* ── Member Profile Panel ── */}
      {profileMember && selectedGroup && (
        <MemberProfilePanel
          member={{
            userId: profileMember.userId,
            name: profileMember.name,
            color: profileMember.color,
            role: profileMember.role,
            joinedAt: profileMember.joinedAt,
          }}
          groupName={selectedGroup.name}
          accentColor={accentColor}
          onClose={() => setProfileMember(null)}
        />
      )}

      {/* ── Pinned Messages panel ── */}
      {selectedGroup && (
        <PinnedMessages
          groupId={selectedGroup.id}
          accentColor={accentColor}
          open={pinnedOpen}
          onClose={() => setPinnedOpen(false)}
        />
      )}

      {/* ── Create Group bottom sheet ── */}
      {groupView === 'create' && tab === 'groups' && !selectedGroup && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setGroupView('mine')}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          />
          {/* Sheet */}
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: '#0d1410', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', padding: '0 0 env(safe-area-inset-bottom)' }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div style={{ padding: '8px 20px 24px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 16, fontWeight: 900, color: accentColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Create a Group</h3>
                <button onClick={() => setGroupView('mine')}
                  style={{ width: 30, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(232,240,236,0.5)', fontSize: 16, cursor: 'pointer' }}>
                  ×
                </button>
              </div>

              {/* Icon picker */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${accentColor}66`, marginBottom: 10 }}>Group Icon</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {GROUP_ICONS.map(ic => (
                  <button key={ic} onClick={() => setCreateIcon(ic)}
                    style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: createIcon === ic ? `${accentColor}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${createIcon === ic ? accentColor : 'rgba(255,255,255,0.08)'}` }}>
                    {ic}
                  </button>
                ))}
              </div>

              {/* Name */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${accentColor}66`, marginBottom: 8 }}>Group Name</p>
              <input autoCorrect="on" autoCapitalize="words" spellCheck
                value={createName} onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Men of the Word" maxLength={40}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}18`, color: '#f0f8f4', boxSizing: 'border-box', marginBottom: 18 }}
              />

              {/* Description */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${accentColor}66`, marginBottom: 8 }}>Description</p>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck
                value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                placeholder="What is this group about? When do you meet?" maxLength={140} rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, fontSize: 13, outline: 'none', resize: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}18`, color: '#f0f8f4', boxSizing: 'border-box', marginBottom: 4 }}
              />
              <p style={{ fontSize: 9, textAlign: 'right', color: 'rgba(232,240,236,0.2)', marginBottom: 18 }}>{createDesc.length}/140</p>

              {/* Privacy */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: `${accentColor}66`, marginBottom: 10 }}>Who Can Join?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {([
                  { value: 'open' as const, label: 'Open', desc: 'Anyone can join immediately', icon: '🌐' },
                  { value: 'request' as const, label: 'Approval Required', desc: 'Members request to join — you approve or deny', icon: '🔒' },
                  { value: 'invite' as const, label: 'Invite Only', desc: 'Members must be invited by the group leader', icon: '✉️' },
                ]).map(opt => (
                  <button key={opt.value} onClick={() => setCreatePrivacy(opt.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', background: createPrivacy === opt.value ? `${accentColor}12` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${createPrivacy === opt.value ? accentColor + '40' : 'rgba(255,255,255,0.07)'}` }}>
                    <span style={{ fontSize: 16, marginTop: 1 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: createPrivacy === opt.value ? accentColor : 'rgba(232,240,236,0.7)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', margin: '2px 0 0' }}>{opt.desc}</p>
                    </div>
                    {createPrivacy === opt.value && (
                      <div style={{ width: 18, height: 18, borderRadius: 9, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                disabled={!createName.trim() || createLoading || !profileId}
                onClick={createGroupHandler}
                style={{ width: '100%', padding: '14px 0', borderRadius: 16, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: createName.trim() ? 'pointer' : 'default', background: createName.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.06)', color: createName.trim() ? '#fff' : 'rgba(255,255,255,0.2)', boxShadow: createName.trim() ? `0 4px 20px ${accentColor}33` : 'none', opacity: (!createName.trim() || createLoading || !profileId) ? 0.5 : 1 }}>
                {createLoading ? 'Creating…' : `${createIcon} Create Group`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
