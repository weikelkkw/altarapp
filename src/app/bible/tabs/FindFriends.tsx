'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─────────────────────────────────────────────────── */

interface Props {
  accentColor: string;
  currentUserId: string;  // current user's trace_profiles.id
  authToken: string;      // supabase session access_token for API calls
}

interface SearchUser {
  id: string;
  display_name: string;
  avatar_color: string;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requesterName: string;
  requesterColor: string;
}

interface Friend {
  friendshipId: string;
  profileId: string;
  display_name: string;
  avatar_color: string;
}

/* ─── Avatar ─────────────────────────────────────────────────── */

function Avatar({ name, color, size = 38 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || '#6366f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: '0.03em',
      }}
    >
      {initials || '?'}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function FindFriends({ accentColor, currentUserId, authToken }: Props) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  /* ── Load friend requests ── */
  const loadFriendRequests = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: requests, error } = await supabase
        .from('trace_friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', currentUserId)
        .eq('status', 'pending');

      if (error || !requests) return;

      // Fetch requester profiles
      const requesterIds = requests.map((r: any) => r.requester_id);
      if (requesterIds.length === 0) {
        setFriendRequests([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', requesterIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const enriched: FriendRequest[] = requests.map((r: any) => {
        const profile = profileMap.get(r.requester_id) as any;
        return {
          id: r.id,
          requester_id: r.requester_id,
          created_at: r.created_at,
          requesterName: profile?.display_name ?? 'Unknown',
          requesterColor: profile?.avatar_color ?? '#6366f1',
        };
      });

      setFriendRequests(enriched);
    } catch {
      setFriendRequests([]);
    }
  }, [supabase, currentUserId]);

  /* ── Load friends ── */
  const loadFriends = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: friendships, error } = await supabase
        .from('trace_friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      if (error || !friendships) return;

      const otherIds = friendships.map((f: any) =>
        f.requester_id === currentUserId ? f.addressee_id : f.requester_id
      );

      if (otherIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, avatar_color')
        .in('id', otherIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const enriched: Friend[] = friendships.map((f: any) => {
        const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
        const profile = profileMap.get(otherId) as any;
        return {
          friendshipId: f.id,
          profileId: otherId,
          display_name: profile?.display_name ?? 'Unknown',
          avatar_color: profile?.avatar_color ?? '#6366f1',
        };
      });

      setFriends(enriched);
    } catch {
      setFriends([]);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    loadFriendRequests();
    loadFriends();
  }, [loadFriendRequests, loadFriends]);

  /* ── Debounced search ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) { setSearchResults([]); return; }
        const json = await res.json();
        // Filter out self
        setSearchResults((json.users ?? []).filter((u: SearchUser) => u.id !== currentUserId));
      } catch {
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, authToken, currentUserId]);

  /* ── Send friend request ── */
  async function sendRequest(toUserId: string) {
    setSentRequests((prev) => new Set(prev).add(toUserId));
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) {
        // Revert optimistic update on failure (except 409 = already exists)
        if (res.status !== 409) {
          setSentRequests((prev) => { const next = new Set(prev); next.delete(toUserId); return next; });
        }
      }
    } catch {
      setSentRequests((prev) => { const next = new Set(prev); next.delete(toUserId); return next; });
    }
  }

  /* ── Accept/decline request ── */
  async function respondToRequest(friendshipId: string, action: 'accept' | 'decline') {
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== friendshipId));
        if (action === 'accept') loadFriends();
      }
    } catch {
      // silent
    }
  }

  /* ── Helpers ── */
  const friendIds = new Set(friends.map((f) => f.profileId));

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${accentColor}15`,
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 12,
  };

  const addBtnStyle: React.CSSProperties = {
    background: `${accentColor}18`,
    color: accentColor,
    border: `1px solid ${accentColor}33`,
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const sentBtnStyle: React.CSSProperties = {
    ...addBtnStyle,
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'default',
  };

  const friendsBtnStyle: React.CSSProperties = {
    ...sentBtnStyle,
  };

  return (
    <div style={{ padding: '16px 0', maxWidth: 520, margin: '0 auto' }}>

      {/* ── Search bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${accentColor}25`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 20,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 15,
          }}
        />
        {loadingSearch && (
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accentColor}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {/* ── Search results ── */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {searchResults.map((user) => {
            const isFriend = friendIds.has(user.id);
            const isSent = sentRequests.has(user.id);
            return (
              <div key={user.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={user.display_name} color={user.avatar_color} />
                <span style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: 500 }}>{user.display_name}</span>
                {isFriend ? (
                  <button style={friendsBtnStyle} disabled>Friends ✓</button>
                ) : isSent ? (
                  <button style={sentBtnStyle} disabled>Sent ✓</button>
                ) : (
                  <button style={addBtnStyle} onClick={() => sendRequest(user.id)}>Add Friend</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Friend requests ── */}
      {friendRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Friend Requests
          </h3>
          {friendRequests.map((req) => (
            <div key={req.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={req.requesterName} color={req.requesterColor} />
              <span style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: 500 }}>{req.requesterName}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => respondToRequest(req.id, 'accept')}
                  style={{
                    background: 'rgba(74,222,128,0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToRequest(req.id, 'decline')}
                  style={{
                    background: 'rgba(248,113,113,0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── My Friends ── */}
      <div>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          My Friends
        </h3>

        {friends.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', margin: '20px 0' }}>
            No friends yet — search above to connect
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
              WebkitOverflowScrolling: 'touch' as any,
            }}
          >
            {friends.map((friend) => (
              <div
                key={friend.friendshipId}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setSelectedFriendId(selectedFriendId === friend.profileId ? null : friend.profileId)}
              >
                <div
                  style={{
                    borderRadius: '50%',
                    padding: 2,
                    border: selectedFriendId === friend.profileId ? `2px solid ${accentColor}` : '2px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Avatar name={friend.display_name} color={friend.avatar_color} size={44} />
                </div>
                <span
                  style={{
                    color: selectedFriendId === friend.profileId ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontSize: 11,
                    fontWeight: 500,
                    maxWidth: 56,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}
                >
                  {friend.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
