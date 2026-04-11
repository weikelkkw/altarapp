'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Props {
  accentColor: string;
  currentUserId: string; // trace_profiles.id
  authToken: string;     // resolved JWT (component already handles this)
}

interface SearchUser {
  id: string;
  display_name: string;
  username?: string;
  avatar_color: string;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requesterName: string;
  requesterColor: string;
  requesterUsername?: string;
}

interface Friend {
  friendshipId: string;
  profileId: string;
  display_name: string;
  username?: string;
  avatar_color: string;
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */

function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
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
        fontFamily: 'Montserrat, system-ui, sans-serif',
      }}
    >
      {initials || '?'}
    </div>
  );
}

/* ─── Spinner ────────────────────────────────────────────────────────────── */

function Spinner({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: 'ff-spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Section Label ──────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)',
        margin: '0 0 12px',
        fontFamily: 'Montserrat, system-ui, sans-serif',
      }}
    >
      {children}
    </p>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 4 }}>{icon}</div>
      <p
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'Montserrat, system-ui, sans-serif',
          margin: 0,
          textAlign: 'center',
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: 'rgba(255,255,255,0.28)',
          fontSize: 13,
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 260,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function FindFriends({ accentColor, currentUserId, authToken }: Props) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState(authToken);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  /* ── Resolve session token ── */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      const token = data.session?.access_token;
      if (token) setResolvedToken(token);
    });
  }, []);

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

      const requesterIds = requests.map((r: any) => r.requester_id);
      if (requesterIds.length === 0) {
        setFriendRequests([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('trace_profiles')
        .select('id, display_name, username, avatar_color')
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
          requesterUsername: profile?.username,
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
        .select('id, display_name, username, avatar_color')
        .in('id', otherIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const enriched: Friend[] = friendships.map((f: any) => {
        const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
        const profile = profileMap.get(otherId) as any;
        return {
          friendshipId: f.id,
          profileId: otherId,
          display_name: profile?.display_name ?? 'Unknown',
          username: profile?.username,
          avatar_color: profile?.avatar_color ?? '#6366f1',
        };
      });

      setFriends(enriched);
    } catch {
      setFriends([]);
    }
  }, [supabase, currentUserId]);

  /* ── Load suggestions ── */
  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/suggestions', {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const filtered = (json.suggestions ?? []).filter((u: SearchUser) => u.id !== currentUserId);
      setSuggestions(filtered);
    } catch {
      setSuggestions([]);
    }
  }, [resolvedToken, currentUserId]);

  /* ── Mount ── */
  useEffect(() => {
    loadFriendRequests();
    loadFriends();
  }, [loadFriendRequests, loadFriends]);

  useEffect(() => {
    if (resolvedToken) loadSuggestions();
  }, [resolvedToken, loadSuggestions]);

  /* ── Debounced username search ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends?q=${encodeURIComponent(trimmed)}`, {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const json = await res.json();
        setSearchResults(
          (json.users ?? []).filter((u: SearchUser) => u.id !== currentUserId)
        );
      } catch {
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, resolvedToken, currentUserId]);

  /* ── Send friend request ── */
  async function sendRequest(toUserId: string) {
    setSentRequests((prev) => new Set(prev).add(toUserId));
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok && res.status !== 409) {
        setSentRequests((prev) => {
          const next = new Set(prev);
          next.delete(toUserId);
          return next;
        });
      }
    } catch {
      setSentRequests((prev) => {
        const next = new Set(prev);
        next.delete(toUserId);
        return next;
      });
    }
  }

  /* ── Accept / decline request ── */
  async function respondToRequest(friendshipId: string, action: 'accept' | 'decline') {
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
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

  /* ── Remove friend ── */
  async function removeFriend(friendshipId: string) {
    setRemovingId(friendshipId);
    setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId)); // optimistic
    setOpenMenuId(null);
    try {
      const res = await fetch('/api/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ friendshipId }),
      });
      if (!res.ok) {
        // Revert on failure
        loadFriends();
      }
    } catch {
      loadFriends();
    } finally {
      setRemovingId(null);
    }
  }

  /* ── Helpers ── */
  const friendIds = new Set(friends.map((f) => f.profileId));
  const isSearching = query.trim().length >= 2;
  const showHint = query.trim().length === 1;

  /* ── Style constants ── */
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '14px 16px',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  };

  const accentBtn: React.CSSProperties = {
    background: accentColor + '20',
    color: accentColor,
    border: '1px solid ' + accentColor + '40',
    borderRadius: 20,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'Montserrat, system-ui, sans-serif',
    flexShrink: 0,
    transition: 'background 0.15s, opacity 0.15s',
  };

  const mutedBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'default',
    whiteSpace: 'nowrap',
    fontFamily: 'Montserrat, system-ui, sans-serif',
    flexShrink: 0,
  };

  const nameStyle: React.CSSProperties = {
    color: '#e8f0ec',
    fontFamily: 'Montserrat, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: 15,
    margin: 0,
    lineHeight: 1.2,
  };

  const usernameStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    margin: 0,
    fontFamily: 'Montserrat, system-ui, sans-serif',
    lineHeight: 1.4,
  };

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div style={{ padding: '20px 0 40px', maxWidth: 520, margin: '0 auto' }}>

      {/* ── Search bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${query ? accentColor + '35' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 6,
          transition: 'border-color 0.2s',
        }}
      >
        {/* Search icon */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* @ prefix */}
        <span
          style={{
            color: query ? accentColor : 'rgba(255,255,255,0.25)',
            fontWeight: 700,
            fontSize: 16,
            fontFamily: 'Montserrat, system-ui, sans-serif',
            transition: 'color 0.2s',
            flexShrink: 0,
          }}
        >
          @
        </span>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by @username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 15,
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontWeight: 500,
            minWidth: 0,
          }}
        />

        {loadingSearch && <Spinner color={accentColor} />}

        {/* Clear button */}
        {query.length > 0 && !loadingSearch && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Hint for < 2 chars */}
      {showHint && (
        <p
          style={{
            color: 'rgba(255,255,255,0.28)',
            fontSize: 12,
            margin: '6px 4px 16px',
            fontFamily: 'Montserrat, system-ui, sans-serif',
          }}
        >
          Type at least 2 characters to search
        </p>
      )}

      <div style={{ height: showHint ? 0 : 16 }} />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SEARCH RESULTS STATE                                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {isSearching && (
        <div>
          <SectionLabel>Search Results</SectionLabel>

          {!loadingSearch && searchResults.length === 0 && (
            <EmptyState
              icon="🔍"
              title="No users found"
              subtitle={`Nobody matching "@${query.trim()}" yet. Check the spelling or try a different username.`}
            />
          )}

          {searchResults.map((user) => {
            const isFriend = friendIds.has(user.id);
            const isSent = sentRequests.has(user.id);
            return (
              <div key={user.id} style={card}>
                <Avatar name={user.display_name} color={user.avatar_color} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={nameStyle}>{user.display_name}</p>
                  {user.username && (
                    <p style={usernameStyle}>@{user.username}</p>
                  )}
                </div>
                {isFriend ? (
                  <button style={mutedBtn} disabled>Friends ✓</button>
                ) : isSent ? (
                  <button style={mutedBtn} disabled>Sent ✓</button>
                ) : (
                  <button style={accentBtn} onClick={() => sendRequest(user.id)}>
                    Add Friend
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DEFAULT STATE (no search)                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {!isSearching && (
        <>
          {/* ── Suggested Friends ── */}
          {suggestions.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>Suggested Friends</SectionLabel>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  WebkitOverflowScrolling: 'touch' as any,
                  scrollbarWidth: 'none' as any,
                  msOverflowStyle: 'none' as any,
                }}
              >
                {suggestions.map((user) => {
                  const isSent = sentRequests.has(user.id);
                  const isFriend = friendIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 16,
                        padding: '16px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                        width: 120,
                        textAlign: 'center',
                      }}
                    >
                      <Avatar name={user.display_name} color={user.avatar_color} size={48} />
                      <div style={{ width: '100%' }}>
                        <p
                          style={{
                            ...nameStyle,
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user.display_name}
                        </p>
                        {user.username && (
                          <p
                            style={{
                              ...usernameStyle,
                              fontSize: 11,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            @{user.username}
                          </p>
                        )}
                      </div>
                      {isFriend ? (
                        <button style={{ ...mutedBtn, padding: '5px 10px', fontSize: 11, borderRadius: 12 }} disabled>
                          Friends ✓
                        </button>
                      ) : isSent ? (
                        <button style={{ ...mutedBtn, padding: '5px 10px', fontSize: 11, borderRadius: 12 }} disabled>
                          Sent ✓
                        </button>
                      ) : (
                        <button
                          style={{ ...accentBtn, padding: '6px 12px', fontSize: 12, borderRadius: 12 }}
                          onClick={() => sendRequest(user.id)}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Friend Requests ── */}
          {friendRequests.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>
                Friend Requests ({friendRequests.length})
              </SectionLabel>
              {friendRequests.map((req) => (
                <div key={req.id} style={card}>
                  {/* Accent left bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 12,
                      bottom: 12,
                      width: 3,
                      borderRadius: '0 3px 3px 0',
                      background: accentColor,
                      opacity: 0.7,
                    }}
                  />
                  <Avatar name={req.requesterName} color={req.requesterColor} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={nameStyle}>{req.requesterName}</p>
                    {req.requesterUsername && (
                      <p style={usernameStyle}>@{req.requesterUsername}</p>
                    )}
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.2)',
                        fontSize: 11,
                        margin: '3px 0 0',
                        fontFamily: 'Montserrat, system-ui, sans-serif',
                      }}
                    >
                      Wants to connect
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => respondToRequest(req.id, 'accept')}
                      style={{
                        background: 'rgba(74,222,128,0.14)',
                        color: '#4ade80',
                        border: '1px solid rgba(74,222,128,0.28)',
                        borderRadius: 20,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Montserrat, system-ui, sans-serif',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToRequest(req.id, 'decline')}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Montserrat, system-ui, sans-serif',
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
            <SectionLabel>
              {friends.length > 0 ? `My Friends (${friends.length})` : 'My Friends'}
            </SectionLabel>

            {friends.length === 0 ? (
              <EmptyState
                icon="✝️"
                title="No friends yet"
                subtitle="Search by @username above to find and connect with others in Trace."
              />
            ) : (
              <div>
                {friends.map((friend) => {
                  const isMenuOpen = openMenuId === friend.friendshipId;
                  return (
                    <div
                      key={friend.friendshipId}
                      style={{
                        ...card,
                        marginBottom: 10,
                        opacity: removingId === friend.friendshipId ? 0.4 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Avatar name={friend.display_name} color={friend.avatar_color} size={46} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={nameStyle}>{friend.display_name}</p>
                        {friend.username && (
                          <p style={usernameStyle}>@{friend.username}</p>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: accentColor,
                              opacity: 0.7,
                            }}
                          />
                          <span
                            style={{
                              color: 'rgba(255,255,255,0.25)',
                              fontSize: 11,
                              fontFamily: 'Montserrat, system-ui, sans-serif',
                            }}
                          >
                            Connected
                          </span>
                        </div>
                      </div>

                      {/* Three-dot menu */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={() =>
                            setOpenMenuId(isMenuOpen ? null : friend.friendshipId)
                          }
                          style={{
                            background: isMenuOpen
                              ? 'rgba(255,255,255,0.08)'
                              : 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: 18,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            lineHeight: 1,
                            fontFamily: 'system-ui',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          aria-label="Friend options"
                        >
                          ···
                        </button>

                        {isMenuOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 'calc(100% + 4px)',
                              background: '#1a1f1c',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 12,
                              overflow: 'hidden',
                              minWidth: 148,
                              zIndex: 10,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}
                          >
                            <button
                              onClick={() => removeFriend(friend.friendshipId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '11px 16px',
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'Montserrat, system-ui, sans-serif',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.background =
                                  'rgba(248,113,113,0.08)')
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.background =
                                  'transparent')
                              }
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                              Remove Friend
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Dismiss dropdown on outside click ── */}
      {openMenuId && (
        <div
          onClick={() => setOpenMenuId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9,
          }}
        />
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes ff-spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
