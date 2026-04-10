'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpotifyTrack {
  name: string;
  artists: string[];
  album: string;
  albumArt: string;
  durationMs: number;
}

export interface SpotifyState {
  connected: boolean;
  isPremium: boolean;
  isReady: boolean;            // Web Playback SDK device is registered
  isPlaying: boolean;
  track: SpotifyTrack | null;
  positionMs: number;
  volume: number;              // 0–100
  deviceId: string | null;
  error: string | null;
}

export interface SpotifyActions {
  connect: () => void;
  disconnect: () => void;
  playPlaylist: (playlistId: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (pct: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_ACCESS  = 'spotify_access_token';
const KEY_REFRESH = 'spotify_refresh_token';
const KEY_EXPIRY  = 'spotify_token_expiry'; // unix ms

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSpotify(): SpotifyState & SpotifyActions {
  const [connected, setConnected]   = useState(false);
  const [isPremium, setIsPremium]   = useState(false);
  const [isReady, setIsReady]       = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [track, setTrack]           = useState<SpotifyTrack | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [volume, setVolumeState]    = useState(80);
  const [deviceId, setDeviceId]     = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const playerRef    = useRef<any>(null);
  const accessRef    = useRef<string | null>(null);
  const refreshRef   = useRef<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Token management ──────────────────────────────────────────────────────

  const storeTokens = useCallback((access: string, refresh: string, expiresIn: number) => {
    const expiry = Date.now() + expiresIn * 1000 - 60_000; // 1 min buffer
    localStorage.setItem(KEY_ACCESS,  access);
    localStorage.setItem(KEY_REFRESH, refresh);
    localStorage.setItem(KEY_EXPIRY,  String(expiry));
    accessRef.current  = access;
    refreshRef.current = refresh;
    scheduleRefresh(expiry);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleRefresh = useCallback((expiry: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const ms = Math.max(expiry - Date.now(), 0);
    refreshTimer.current = setTimeout(async () => {
      if (!refreshRef.current) return;
      try {
        const res  = await fetch('/api/spotify/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshRef.current }),
        });
        const data = await res.json();
        if (data.accessToken) {
          storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
        }
      } catch { /* silent */ }
    }, ms);
  }, [storeTokens]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const expiry = parseInt(localStorage.getItem(KEY_EXPIRY) || '0', 10);
    if (Date.now() < expiry && accessRef.current) return accessRef.current;

    // Proactively refresh
    if (!refreshRef.current) return null;
    try {
      const res  = await fetch('/api/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshRef.current }),
      });
      const data = await res.json();
      if (data.accessToken) {
        storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
        return data.accessToken;
      }
    } catch { /* silent */ }
    return null;
  }, [storeTokens]);

  // ── Read tokens from hash or localStorage on mount ───────────────────────

  useEffect(() => {
    // 1. Check for new tokens in the URL hash (post-OAuth redirect)
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const access  = params.get('spotify_access_token');
      const refresh = params.get('spotify_refresh_token');
      const expires = params.get('spotify_expires_in');
      if (access && refresh && expires) {
        storeTokens(access, refresh, parseInt(expires, 10));
        // Clean hash without triggering a reload
        const clean = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', clean);
      }
    }

    // 2. Load existing tokens from localStorage
    const stored = localStorage.getItem(KEY_ACCESS);
    const stored_r = localStorage.getItem(KEY_REFRESH);
    const expiry  = parseInt(localStorage.getItem(KEY_EXPIRY) || '0', 10);
    if (stored && stored_r) {
      accessRef.current  = stored;
      refreshRef.current = stored_r;
      if (Date.now() < expiry) {
        setConnected(true);
        scheduleRefresh(expiry);
        checkPremium(stored);
      } else {
        // Token expired — refresh immediately
        fetch('/api/spotify/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: stored_r }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.accessToken) {
              storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
              setConnected(true);
              checkPremium(data.accessToken);
            }
          })
          .catch(() => null);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check Premium status ─────────────────────────────────────────────────

  const checkPremium = useCallback(async (token: string) => {
    try {
      const res  = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIsPremium(data.product === 'premium');
      setConnected(true);
    } catch { /* silent */ }
  }, []);

  // ── Web Playback SDK ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!connected) return;

    // Load the Spotify Web Playback SDK script once
    if (!document.getElementById('spotify-sdk')) {
      const script   = document.createElement('script');
      script.id      = 'spotify-sdk';
      script.src     = 'https://sdk.scdn.co/spotify-player.js';
      script.async   = true;
      document.head.appendChild(script);
    }

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: 'Trace Bible App',
        getOAuthToken: async (cb: (t: string) => void) => {
          const token = await getAccessToken();
          if (token) cb(token);
        },
        volume: volume / 100,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('not_ready', () => {
        setIsReady(false);
        setDeviceId(null);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setPositionMs(state.position);
        const item = state.track_window?.current_track;
        if (item) {
          setTrack({
            name:       item.name,
            artists:    item.artists.map((a: any) => a.name),
            album:      item.album.name,
            albumArt:   item.album.images?.[0]?.url || '',
            durationMs: item.duration_ms,
          });
        }
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        setError(`SDK init: ${message}`);
      });
      player.addListener('authentication_error', ({ message }: { message: string }) => {
        setError(`Auth: ${message}`);
        disconnect();
      });
      player.addListener('account_error', ({ message }: { message: string }) => {
        setError(`Account: ${message}`);
        setIsPremium(false);
      });

      player.connect();
      playerRef.current = player;
    };

    return () => {
      playerRef.current?.disconnect();
    };
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_EXPIRY);
    accessRef.current  = null;
    refreshRef.current = null;
    setConnected(false);
    setIsReady(false);
    setIsPlaying(false);
    setTrack(null);
    setDeviceId(null);
    setIsPremium(false);
  }, []);

  // Transfer playback to this device and start a playlist
  const playPlaylist = useCallback(async (playlistId: string) => {
    const token = await getAccessToken();
    if (!token) return;

    // If Premium + SDK device ready: play in-app
    if (isPremium && deviceId) {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
      });
      return;
    }

    // Fallback: open playlist in Spotify app
    window.open(`https://open.spotify.com/playlist/${playlistId}`, '_blank');
  }, [getAccessToken, isPremium, deviceId]);

  const togglePlay = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.togglePlay();
    }
  }, []);

  const seek = useCallback(async (ms: number) => {
    if (playerRef.current) {
      await playerRef.current.seek(ms);
    }
  }, []);

  const setVolume = useCallback(async (pct: number) => {
    setVolumeState(pct);
    if (playerRef.current) {
      await playerRef.current.setVolume(pct / 100);
    }
  }, []);

  const nextTrack = useCallback(async () => {
    if (playerRef.current) await playerRef.current.nextTrack();
  }, []);

  const prevTrack = useCallback(async () => {
    if (playerRef.current) await playerRef.current.previousTrack();
  }, []);

  return {
    connected, isPremium, isReady, isPlaying, track, positionMs, volume, deviceId, error,
    connect, disconnect, playPlaylist, togglePlay, seek, setVolume, nextTrack, prevTrack,
  };
}
