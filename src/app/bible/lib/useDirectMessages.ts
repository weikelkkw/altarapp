import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ConversationParticipant {
  userId: string;
  name: string;
  color: string;
  picture?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant: ConversationParticipant; // the OTHER person
  messages: Message[];
  updatedAt: string;
}

export function useDirectMessages(userId: string | null | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);

    try {
      // Get conversation IDs the user participates in
      const { data: myConvos } = await supabase
        .from('trace_conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (!myConvos || myConvos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convoIds = myConvos.map(c => c.conversation_id);

      // Get conversation details
      const { data: convos } = await supabase
        .from('trace_conversations')
        .select('id, updated_at')
        .in('id', convoIds)
        .order('updated_at', { ascending: false });

      if (!convos) { setLoading(false); return; }

      // Get all participants for these conversations
      const { data: allParticipants } = await supabase
        .from('trace_conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convoIds);

      // Get the other user's IDs
      const otherUserIds = (allParticipants || [])
        .filter(p => p.user_id !== userId)
        .map(p => p.user_id);

      // Fetch profiles for other users
      let profileMap: Record<string, { name: string; color: string; picture?: string }> = {};
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('trace_profiles')
          .select('auth_id, display_name, avatar_color, profile_picture_url')
          .in('auth_id', otherUserIds);

        for (const p of (profiles || [])) {
          profileMap[p.auth_id] = {
            name: p.display_name || 'User',
            color: p.avatar_color || '#6366f1',
            picture: p.profile_picture_url || undefined,
          };
        }
      }

      // Get messages for all conversations
      const { data: allMessages } = await supabase
        .from('trace_messages')
        .select('id, conversation_id, sender_id, content, read, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: true });

      // Assemble conversations
      const assembled: Conversation[] = convos.map(convo => {
        const otherParticipant = (allParticipants || []).find(
          p => p.conversation_id === convo.id && p.user_id !== userId
        );
        const otherProfile = otherParticipant
          ? profileMap[otherParticipant.user_id] || { name: 'User', color: '#6366f1' }
          : { name: 'User', color: '#6366f1' };

        const messages: Message[] = (allMessages || [])
          .filter(m => m.conversation_id === convo.id)
          .map(m => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content,
            read: m.read,
            createdAt: m.created_at,
          }));

        return {
          id: convo.id,
          participant: {
            userId: otherParticipant?.user_id || '',
            ...otherProfile,
          },
          messages,
          updatedAt: convo.updated_at,
        };
      });

      setConversations(assembled);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    if (!supabase) return;

    loadConversations();

    const channel = supabase
      .channel('trace-dm-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trace_messages',
      }, (payload: any) => {
        const newMsg: Message = {
          id: payload.new.id,
          conversationId: payload.new.conversation_id,
          senderId: payload.new.sender_id,
          content: payload.new.content,
          read: payload.new.read,
          createdAt: payload.new.created_at,
        };
        setConversations(prev => {
          const exists = prev.find(c => c.id === newMsg.conversationId);
          if (exists) {
            // Check if message already exists (avoid duplicates from own sends)
            if (exists.messages.some(m => m.id === newMsg.id)) return prev;
            return prev.map(c =>
              c.id === newMsg.conversationId
                ? { ...c, messages: [...c.messages, newMsg], updatedAt: newMsg.createdAt }
                : c
            );
          }
          // New conversation — reload everything
          loadConversations();
          return prev;
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadConversations]);

  // Start a new conversation with another user
  const startConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!userId) return null;
    const supabase = createClient();
    if (!supabase) return null;

    // Check if a conversation already exists between these two users
    const existing = conversations.find(c => c.participant.userId === otherUserId);
    if (existing) return existing.id;

    try {
      // Create conversation
      const { data: convo, error: convoErr } = await supabase
        .from('trace_conversations')
        .insert({})
        .select('id')
        .single();

      if (convoErr || !convo) throw convoErr;

      // Add both participants
      const { error: partErr } = await supabase
        .from('trace_conversation_participants')
        .insert([
          { conversation_id: convo.id, user_id: userId },
          { conversation_id: convo.id, user_id: otherUserId },
        ]);

      if (partErr) throw partErr;

      // Reload conversations to pick up the new one with profile data
      await loadConversations();
      return convo.id;
    } catch (err) {
      console.error('Failed to start conversation:', err);
      return null;
    }
  }, [userId, conversations, loadConversations]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!userId || !content.trim()) return;
    const supabase = createClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('trace_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      return;
    }

    // Optimistically add message to local state (realtime will also fire)
    if (data) {
      const msg: Message = {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        content: data.content,
        read: data.read,
        createdAt: data.created_at,
      };
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, msg], updatedAt: msg.createdAt }
            : c
        )
      );
    }
  }, [userId]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!userId) return;
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from('trace_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? { ...c, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      )
    );
  }, [userId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    const supabase = createClient();
    if (!supabase) return;

    await supabase.from('trace_conversations').delete().eq('id', conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
  }, [userId]);

  // Computed: unread count
  const unreadCount = conversations.reduce((sum, c) => {
    return sum + c.messages.filter(m => m.senderId !== userId && !m.read).length;
  }, 0);

  return {
    conversations,
    loading,
    unreadCount,
    startConversation,
    sendMessage,
    markAsRead,
    deleteConversation,
    reload: loadConversations,
  };
}
