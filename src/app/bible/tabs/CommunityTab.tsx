'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserIdentity, BookDef, timeAgo } from '../types';
import { createClient } from '@/lib/supabase/client';
import BibleStudyMode from './BibleStudyMode';

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
  name: string;
  color: string;
  role: 'leader' | 'member';
  isMe: boolean;
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

export default function CommunityTab({ userIdentity, accentColor, authUser, onOpenAuth }: Props) {
  const [tab, setTab] = useState<'prayer' | 'groups' | 'testimonies'>('groups');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Kingdom Groups state
  const [selectedGroup, setSelectedGroup] = useState<KingdomGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'chat' | 'prayer' | 'members'>('chat');
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

  const groupChatChannelRef = useRef<any>(null);

  /* ── Resolve profile ID ─────────────────────────────────── */
  useEffect(() => {
    if (!authUser?.id) { setProfileId(null); return; }
    const supabase = createClient();
    if (!supabase) return;
    supabase.from('trace_profiles').select('id').eq('auth_id', authUser.id).single()
      .then(({ data }) => { if (data) setProfileId(data.id); });
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
        .select('user_id, role')
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
        name: profMap[m.user_id]?.display_name || 'Member',
        color: profMap[m.user_id]?.avatar_color || '#6366f1',
        role: m.role as 'leader' | 'member',
        isMe: m.user_id === profileId,
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
    try {
      await supabase.from('trace_messages').insert({ conversation_id: dmConversationId, sender_id: profileId, content: text });
      await loadDmMessages(dmConversationId);
    } catch (err) { console.error('sendDm:', err); setDmInput(text); }
  };

  const startDm = async (member: GroupMember) => {
    setSelectedDmMember(member);
    setDmMessages([]);
    setDmConversationId(null);
    const convId = await findOrCreateDm(member.id);
    setDmConversationId(convId);
    if (convId) await loadDmMessages(convId);
  };

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
    <div className="space-y-4">

      {/* Church header */}
      <div className="flex items-center justify-between" style={{ minHeight: 72 }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
            <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Church</h2>
          </div>
          <p className="text-[10px] pl-3" style={{ color: 'rgba(232,240,236,0.3)' }}>Community · Groups · Prayer</p>
        </div>
        <img src="/png_church-removebg-preview.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', mixBlendMode: 'screen', opacity: 0.9, flexShrink: 0 }} />
      </div>

      {/* Bible Study Mode overlay */}
      {studyModeOpen && (
        <BibleStudyMode
          accentColor={accentColor}
          groupName={selectedGroup?.name}
          onClose={() => setStudyModeOpen(false)}
        />
      )}

      {/* Sign in prompt */}
      {!authUser && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
          <img src="/png_church-removebg-preview.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain', mixBlendMode: 'screen', margin: '0 auto 12px' }} />
          <p className="text-sm font-bold mb-1" style={{ color: 'rgba(232,240,236,0.7)' }}>Welcome to Church</p>
          <p className="text-xs mb-4" style={{ color: 'rgba(232,240,236,0.35)' }}>Sign in to join the community, share prayer requests, and connect with believers.</p>
          {onOpenAuth && (
            <button onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
              Sign In / Create Account
            </button>
          )}
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}18` }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: accentColor }}>Announcement</p>
          {announcements.map((a, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif' }}>{a}</p>
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'groups' as const, icon: '👑', label: 'Groups' },
          { id: 'prayer' as const, icon: '🙏', label: 'Prayer Wall' },
          { id: 'testimonies' as const, icon: '✦', label: 'Testimonies' },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedGroup(null); }}
            className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95"
            style={tab === t.id
              ? { background: `${accentColor}18`, border: `1.5px solid ${accentColor}33` }
              : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.04)' }
            }>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: tab === t.id ? accentColor : 'rgba(232,240,236,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* PRAYER WALL */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'prayer' && (
        <div className="space-y-4">
          <SectionHeader text="Prayer Wall" accentColor={accentColor} icon="🙏" />
          <p className="text-xs" style={{ color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif' }}>
            Share what&apos;s on your heart. Pray for one another. Bear each other&apos;s burdens.
          </p>

          {authUser && profileId && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={newPrayer}
                onChange={e => setNewPrayer(e.target.value)}
                placeholder="Share a prayer request..."
                className="w-full px-4 py-3 text-sm outline-none resize-none min-h-[70px]"
                style={{ background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif' }}
              />
              <div className="flex justify-between items-center px-4 py-2" style={{ borderTop: `1px solid ${accentColor}08` }}>
                <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.2)' }}>Your request will be shared with the community</p>
                <button onClick={submitPrayer} disabled={postingPrayer || !newPrayer.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold"
                  style={{
                    background: newPrayer.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.05)',
                    color: newPrayer.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                  }}>
                  {postingPrayer ? 'Posting...' : 'Share Prayer'}
                </button>
              </div>
            </div>
          )}

          {prayerLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            </div>
          )}

          {!prayerLoading && prayers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🕊</p>
              <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>No prayer requests yet. Be the first to share.</p>
            </div>
          )}

          {prayers.map(prayer => (
            <div key={prayer.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={prayer.authorName} color={prayer.authorColor} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{prayer.authorName}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>{timeAgo(prayer.createdAt)}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif' }}>
                {prayer.content}
              </p>
              <button onClick={() => prayFor(prayer.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: prayer.hasPrayed ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${prayer.hasPrayed ? accentColor + '33' : 'rgba(255,255,255,0.06)'}`,
                  color: prayer.hasPrayed ? accentColor : 'rgba(232,240,236,0.4)',
                }}>
                <span>🙏</span>
                <span>{prayer.hasPrayed ? 'Prayed' : 'Pray for this'}</span>
                {prayer.prayerCount > 0 && <span style={{ opacity: 0.6 }}>· {prayer.prayerCount}</span>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* KINGDOM GROUPS */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'groups' && !selectedGroup && (
        <div className="space-y-4">
          {!authUser ? (
            <div className="rounded-xl p-6 text-center" style={{ background: `${accentColor}06`, border: `1px solid ${accentColor}15` }}>
              <p className="text-3xl mb-3">👑</p>
              <p className="text-sm font-bold mb-3" style={{ color: 'rgba(232,240,236,0.7)' }}>Sign in to join a Kingdom Group</p>
              <button onClick={onOpenAuth} className="px-6 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>
                Sign In
              </button>
            </div>
          ) : groupView === 'create' ? (
            /* ─── CREATE GROUP FORM ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setGroupView('mine')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  ← Back
                </button>
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Create a Group</h3>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: `${accentColor}66` }}>Group Icon</p>
                <div className="flex flex-wrap gap-2">
                  {GROUP_ICONS.map(ic => (
                    <button key={ic} onClick={() => setCreateIcon(ic)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all active:scale-95"
                      style={{
                        background: createIcon === ic ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${createIcon === ic ? accentColor : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: `${accentColor}66` }}>Group Name</p>
                <input autoCorrect="on" autoCapitalize="words" spellCheck
                  value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Men of the Word" maxLength={40}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}18`, color: '#f0f8f4' }} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: `${accentColor}66` }}>Description</p>
                <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck
                  value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                  placeholder="What is this group about? When do you meet?" maxLength={140} rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}18`, color: '#f0f8f4' }} />
                <p className="text-[9px] mt-1 text-right" style={{ color: 'rgba(232,240,236,0.2)' }}>{createDesc.length}/140</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: `${accentColor}66` }}>Who Can Join?</p>
                <div className="space-y-2">
                  {([
                    { value: 'open' as const, label: 'Open', desc: 'Anyone can join immediately', icon: '🌐' },
                    { value: 'request' as const, label: 'Approval Required', desc: 'Members request to join — you approve or deny', icon: '🔒' },
                    { value: 'invite' as const, label: 'Invite Only', desc: 'Members must be invited by the group leader', icon: '✉️' },
                  ]).map(opt => (
                    <button key={opt.value} onClick={() => setCreatePrivacy(opt.value)}
                      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{ background: createPrivacy === opt.value ? `${accentColor}12` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${createPrivacy === opt.value ? accentColor + '40' : 'rgba(255,255,255,0.07)'}` }}>
                      <span className="text-base mt-0.5">{opt.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold" style={{ color: createPrivacy === opt.value ? accentColor : 'rgba(232,240,236,0.7)' }}>{opt.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.3)' }}>{opt.desc}</p>
                      </div>
                      {createPrivacy === opt.value && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accentColor }}>
                          <span style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!createName.trim() || createLoading || !profileId}
                onClick={createGroupHandler}
                className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30"
                style={{ background: createName.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.06)', color: '#fff', boxShadow: createName.trim() ? `0 4px 20px ${accentColor}33` : 'none' }}>
                {createLoading ? 'Creating…' : `${createIcon} Create Group`}
              </button>
            </div>

          ) : groupView === 'discover' ? (
            /* ─── DISCOVER GROUPS ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setGroupView('mine')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  ← Back
                </button>
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Discover Groups</h3>
              </div>

              {discoverGroups.map(group => {
                const privacyLabel = group.privacy === 'open' ? 'Open' : group.privacy === 'invite' ? 'Invite Only' : 'Approval Required';
                const privacyColor = group.privacy === 'open' ? '#22c55e' : group.privacy === 'invite' ? '#94a3b8' : '#f59e0b';
                return (
                  <div key={group.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
                        {group.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{group.name}</p>
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${privacyColor}18`, color: privacyColor, border: `1px solid ${privacyColor}30` }}>
                            {privacyLabel}
                          </span>
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif' }}>{group.description}</p>
                        <p className="text-[10px] mt-1 font-semibold" style={{ color: `${accentColor}60` }}>{group.memberCount} members</p>
                      </div>
                    </div>

                    {group.pendingJoin ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
                        <p className="text-[10px] font-bold" style={{ color: '#f59e0b' }}>Request sent — awaiting leader approval</p>
                      </div>
                    ) : group.privacy === 'invite' ? (
                      <div className="px-3 py-2 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Invite only — ask a member to invite you</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => joinGroup(group)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                        style={{
                          background: group.privacy === 'open' ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : `${accentColor}15`,
                          color: group.privacy === 'open' ? '#fff' : accentColor,
                          border: group.privacy === 'open' ? 'none' : `1px solid ${accentColor}30`,
                          boxShadow: group.privacy === 'open' ? `0 2px 12px ${accentColor}33` : 'none',
                        }}>
                        {group.privacy === 'open' ? '+ Join Group' : '📨 Request to Join'}
                      </button>
                    )}
                  </div>
                );
              })}

              {discoverGroups.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">👑</p>
                  <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>No other groups to discover right now.</p>
                </div>
              )}
            </div>

          ) : (
            /* ─── MY GROUPS ─── */
            <>
              <SectionHeader text="Kingdom Groups" accentColor={accentColor} icon="👑" />
              <div className="flex gap-2">
                <button onClick={() => { setGroupView('discover'); loadDiscoverGroups(); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 12px ${accentColor}33` }}>
                  🔍 Find a Group
                </button>
                <button onClick={() => setGroupView('create')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}>
                  + Create Group
                </button>
              </div>

              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                </div>
              ) : myGroups.length === 0 ? (
                <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10` }}>
                  <img src="/png_church-removebg-preview.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain', mixBlendMode: 'screen', margin: '0 auto 8px' }} />
                  <p className="text-sm font-bold mb-1" style={{ color: 'rgba(232,240,236,0.5)' }}>You&apos;re not in any groups yet</p>
                  <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)', fontFamily: 'Georgia, serif' }}>Find a group or create your own to get started.</p>
                </div>
              ) : (
                myGroups.map(group => (
                  <button key={group.id}
                    onClick={() => { setSelectedGroup(group); setGroupTab('chat'); setGroupMessages([]); setChatMode('group'); setSelectedDmMember(null); }}
                    className="w-full rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
                        {group.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black truncate" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{group.name}</p>
                          {group.isLeader && (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                              style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}33` }}>
                              Leader
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif' }}>{group.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-bold" style={{ color: `${accentColor}80` }}>{group.memberCount} members</p>
                        {group.isLeader && joinRequests.length > 0 && (
                          <p className="text-[9px] font-bold mt-0.5" style={{ color: '#f59e0b' }}>⚠ {joinRequests.length} pending</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* GROUP DETAIL VIEW */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'groups' && selectedGroup && (
        <div className="flex flex-col gap-3">
          {/* Back + group header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
              ← Groups
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{selectedGroup.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black truncate" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{selectedGroup.name}</p>
                  {selectedGroup.isLeader && (
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                      style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                      Leader
                    </span>
                  )}
                </div>
                <p className="text-[9px]" style={{ color: `${accentColor}70` }}>{selectedGroup.memberCount} members · {selectedGroup.privacy === 'open' ? 'Open' : selectedGroup.privacy === 'invite' ? 'Invite Only' : 'Approval Required'}</p>
              </div>
            </div>
            <button onClick={() => setStudyModeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0"
              style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25` }}>
              📚 Study
            </button>
          </div>

          {/* Group sub-tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { id: 'chat' as const, icon: '💬', label: 'Chat', badge: 0 },
              { id: 'prayer' as const, icon: '🙏', label: 'Prayer', badge: 0 },
              { id: 'members' as const, icon: '👥', label: 'Members', badge: selectedGroup.isLeader ? joinRequests.length : 0 },
            ]).map(gt => (
              <button key={gt.id} onClick={() => {
                setGroupTab(gt.id);
                if (gt.id === 'members') { loadGroupMembers(selectedGroup.id); if (selectedGroup.isLeader) loadJoinRequests(selectedGroup.id); }
                if (gt.id === 'chat' && chatMode === 'dm') loadGroupMembers(selectedGroup.id);
              }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all relative"
                style={groupTab === gt.id
                  ? { background: `${accentColor}18`, border: `1.5px solid ${accentColor}33`, color: accentColor }
                  : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.4)' }
                }>
                <span>{gt.icon}</span>
                <span className="uppercase tracking-wider">{gt.label}</span>
                {gt.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                    style={{ background: '#f59e0b', color: '#000' }}>
                    {gt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── GROUP CHAT / DM ── */}
          {groupTab === 'chat' && (
            <div className="flex flex-col gap-2">
              {/* Chat mode toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { setChatMode('group'); setSelectedDmMember(null); }}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                  style={chatMode === 'group'
                    ? { background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }
                    : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: '1px solid transparent' }}>
                  <span>👥</span> Group Chat
                </button>
                <button onClick={() => { setChatMode('dm'); if (!groupMembers.length) loadGroupMembers(selectedGroup.id); }}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                  style={chatMode === 'dm'
                    ? { background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }
                    : { background: 'transparent', color: 'rgba(232,240,236,0.35)', border: '1px solid transparent' }}>
                  <span>🔒</span> Direct Message
                </button>
              </div>

              {/* ─ GROUP CHAT ─ */}
              {chatMode === 'group' && (
                <>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10`, minHeight: 200 }}>
                    {groupMsgsLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                      </div>
                    ) : groupMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <span className="text-3xl mb-3">💬</span>
                        <p className="text-xs font-bold mb-1" style={{ color: 'rgba(232,240,236,0.4)' }}>No messages yet</p>
                        <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif' }}>Only {selectedGroup.name} members can see this.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 p-3 max-h-64 overflow-y-auto">
                        {groupMessages.map(msg => (
                          <div key={msg.id} className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}>
                            {!msg.isMine && <Avatar name={msg.authorName} color={msg.authorColor} size={26} />}
                            <div className="max-w-[75%]">
                              {!msg.isMine && <p className="text-[9px] font-bold mb-0.5 px-1" style={{ color: msg.authorColor }}>{msg.authorName}</p>}
                              <div className="px-3 py-2 text-xs leading-relaxed"
                                style={{ background: msg.isMine ? accentColor : 'rgba(255,255,255,0.06)', color: msg.isMine ? '#000' : 'rgba(232,240,236,0.85)', borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}>
                                {msg.content}
                              </div>
                              <p className="text-[8px] mt-0.5 px-1" style={{ color: 'rgba(232,240,236,0.2)', textAlign: msg.isMine ? 'right' : 'left' }}>{timeAgo(msg.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {authUser ? (
                    <div className="flex gap-2 items-center">
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="text"
                        value={groupMsgInput} onChange={e => setGroupMsgInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && groupMsgInput.trim()) sendGroupMessage(); }}
                        placeholder={`Message ${selectedGroup.name}...`}
                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}15`, color: '#f0f8f4' }} />
                      <button disabled={!groupMsgInput.trim()} onClick={sendGroupMessage}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: groupMsgInput.trim() ? accentColor : 'rgba(255,255,255,0.04)', color: groupMsgInput.trim() ? '#000' : 'rgba(255,255,255,0.2)', border: `1px solid ${groupMsgInput.trim() ? accentColor : 'rgba(255,255,255,0.06)'}` }}>
                        ↑
                      </button>
                    </div>
                  ) : (
                    <button onClick={onOpenAuth} className="py-3 rounded-xl text-xs font-bold" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}>Sign in to chat</button>
                  )}
                </>
              )}

              {/* ─ DIRECT MESSAGES ─ */}
              {chatMode === 'dm' && !selectedDmMember && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: `${accentColor}60` }}>Send a private message to a member</p>
                  {groupMembers.filter(m => !m.isMe).length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>No other members to message yet.</p>
                    </div>
                  ) : (
                    groupMembers.filter(m => !m.isMe).map(m => (
                      <button key={m.id}
                        onClick={() => startDm(m)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}08` }}>
                        <Avatar name={m.name} color={m.color} size={34} />
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{m.name}</p>
                          <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Tap to message privately</p>
                        </div>
                        <span style={{ color: 'rgba(232,240,236,0.2)', fontSize: 14 }}>🔒</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {chatMode === 'dm' && selectedDmMember && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedDmMember(null); setDmMessages([]); setDmConversationId(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      ←
                    </button>
                    <Avatar name={selectedDmMember.name} color={selectedDmMember.color} size={28} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{selectedDmMember.name}</p>
                      <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Private · only you two can see this</p>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10`, minHeight: 180 }}>
                    {dmLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                      </div>
                    ) : dmMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                        <span className="text-2xl mb-2">🔒</span>
                        <p className="text-xs font-bold mb-1" style={{ color: 'rgba(232,240,236,0.35)' }}>Private conversation</p>
                        <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif' }}>Only you and {selectedDmMember.name} can read this.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 p-3 max-h-64 overflow-y-auto">
                        {dmMessages.map(msg => (
                          <div key={msg.id} className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}>
                            {!msg.isMine && <Avatar name={msg.authorName} color={msg.authorColor} size={26} />}
                            <div className="max-w-[75%]">
                              <div className="px-3 py-2 text-xs leading-relaxed"
                                style={{ background: msg.isMine ? accentColor : 'rgba(255,255,255,0.06)', color: msg.isMine ? '#000' : 'rgba(232,240,236,0.85)', borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="text"
                      value={dmInput} onChange={e => setDmInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && dmInput.trim()) sendDm(); }}
                      placeholder={`Message ${selectedDmMember.name}...`}
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}15`, color: '#f0f8f4' }} />
                    <button disabled={!dmInput.trim() || !dmConversationId}
                      onClick={sendDm}
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: dmInput.trim() ? accentColor : 'rgba(255,255,255,0.04)', color: dmInput.trim() ? '#000' : 'rgba(255,255,255,0.2)', border: `1px solid ${dmInput.trim() ? accentColor : 'rgba(255,255,255,0.06)'}` }}>
                      ↑
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── GROUP PRAYER ── */}
          {groupTab === 'prayer' && (
            <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}10` }}>
              <span className="text-2xl">🙏</span>
              <p className="text-xs font-bold mt-2 mb-1" style={{ color: 'rgba(232,240,236,0.5)' }}>Group Prayer Wall</p>
              <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)', fontFamily: 'Georgia, serif' }}>Prayer requests shared here are only visible to {selectedGroup.name}.</p>
            </div>
          )}

          {/* ── GROUP MEMBERS ── */}
          {groupTab === 'members' && (
            <div className="space-y-3">
              {/* Join Requests — visible only to leader */}
              {selectedGroup.isLeader && joinRequests.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                      Join Requests ({joinRequests.length})
                    </p>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
                    {joinRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={req.userName} color={req.userColor} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{req.userName}</p>
                          <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Requested {timeAgo(req.requestedAt)}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => approveRequest(req)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => denyRequest(req)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}>
                            ✕ Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member list */}
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${accentColor}55` }}>Members</p>
              {groupMembers.length === 0 ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                </div>
              ) : (
                groupMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${accentColor}08` }}>
                    <Avatar name={m.name} color={m.color} size={32} />
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{m.name}{m.isMe ? ' (You)' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-1 rounded-full font-bold"
                        style={{ background: m.role === 'leader' ? `${accentColor}22` : 'rgba(255,255,255,0.04)', color: m.role === 'leader' ? accentColor : 'rgba(232,240,236,0.3)' }}>
                        {m.role === 'leader' ? 'Leader' : 'Member'}
                      </span>
                      {selectedGroup.isLeader && !m.isMe && (
                        <button onClick={() => removeMember(m.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-95"
                          style={{ background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.12)', fontSize: 10 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Leave group (non-leader) */}
              {!selectedGroup.isLeader && (
                <button
                  onClick={leaveGroup}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                  Leave Group
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* TESTIMONIES */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === 'testimonies' && (
        <div className="space-y-4">
          <SectionHeader text="Testimonies" accentColor={accentColor} icon="✦" />
          <p className="text-xs" style={{ color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif' }}>
            Share what God is doing in your life. Your testimony could be the encouragement someone needs today.
          </p>

          {authUser && profileId && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
              <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={newTestimony}
                onChange={e => setNewTestimony(e.target.value)}
                placeholder="Share what God has done..."
                className="w-full px-4 py-3 text-sm outline-none resize-none min-h-[70px]"
                style={{ background: 'transparent', color: '#f0f8f4', fontFamily: 'Georgia, serif' }}
              />
              <div className="flex justify-end px-4 py-2" style={{ borderTop: `1px solid ${accentColor}08` }}>
                <button onClick={submitTestimony} disabled={postingTestimony || !newTestimony.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold"
                  style={{
                    background: newTestimony.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.05)',
                    color: newTestimony.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                  }}>
                  {postingTestimony ? 'Sharing...' : 'Share Testimony'}
                </button>
              </div>
            </div>
          )}

          {testimonyLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            </div>
          )}

          {!testimonyLoading && testimonies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✦</p>
              <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>No testimonies yet. Share what God has done.</p>
            </div>
          )}

          {testimonies.map(t => (
            <div key={t.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={t.authorName} color={t.authorColor} size={34} />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{t.authorName}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>{timeAgo(t.createdAt)}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif' }}>
                {t.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer verse */}
      <div className="text-center py-4">
        <p className="text-xs italic" style={{ color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif' }}>
          &ldquo;For where two or three gather in my name, there am I with them.&rdquo;
        </p>
        <p className="text-[10px] font-bold mt-1" style={{ color: 'rgba(232,240,236,0.15)' }}>Matthew 18:20</p>
      </div>
    </div>
  );
}
