'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiBible, Passage, PassageSection, AltarNote, UserIdentity, BookDef,
  T, BOOKS, POPULAR_ABBRS, DAILY_VERSE_REFS, AVATAR_COLORS,
  stripHtml, parseVerseText, parseSectionedHtml,
} from './types';
import HomeTab from './tabs/HomeTab';
import ReadTab from './tabs/ReadTab';
import SearchTab from './tabs/SearchTab';
import StudyTab from './tabs/StudyTab';
import CommunityTab from './tabs/CommunityTab';
import NotificationsTab from './tabs/NotificationsTab';
import Header from './tabs/Header';
import SettingsPanel from './tabs/SettingsPanel';
import FireMode from './tabs/FireMode';
import GospelPresentation from './tabs/GospelPresentation';
import { IdentityWidget } from './tabs/IdentityBuilder';
import TrophyRoom from './tabs/TrophyRoom';
import AuthModal from './tabs/AuthModal';
import Onboarding from './tabs/Onboarding';
import AppTour from './tabs/AppTour';
import { useAuth } from './lib/useAuth';
import { createClient } from '@/lib/supabase/client';

type Tab = 'home' | 'read' | 'search' | 'study' | 'community';

const TAB_CONFIG: { id: Tab; label: string; icon: string; img?: string }[] = [
  { id: 'home',      label: 'Home',   icon: '🏠', img: '/home.png' },
  { id: 'read',      label: 'Read',   icon: '📖', img: '/read book.png' },
  { id: 'search',    label: 'Search', icon: '🔍', img: '/magifying glass.png' },
  { id: 'study',     label: 'Study',  icon: '✦', img: '/star.png'  },
  { id: 'community', label: 'Church', icon: '⛪', img: '/png_church-removebg-preview.png' },
];

function getOrCreateIdentity(): UserIdentity {
  try {
    const stored = localStorage.getItem('trace-identity');
    if (stored) return JSON.parse(stored);
  } catch {}
  const names = ['Pilgrim', 'Seeker', 'Scholar', 'Reader', 'Shepherd', 'Disciple', 'Wayfarer', 'Scribe'];
  const identity: UserIdentity = {
    token: crypto.randomUUID(),
    name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 999),
    color: '#5B9BD5',
  };
  localStorage.setItem('trace-identity', JSON.stringify(identity));
  return identity;
}

export default function AltarApp() {
  const [tab, setTab] = useState<Tab>(() => {
    try { return (localStorage.getItem('altar-active-tab') as Tab) || 'home'; } catch { return 'home'; }
  });

  const handleSetTab = useCallback((t: Tab) => {
    setTab(t);
    try { localStorage.setItem('altar-active-tab', t); } catch {}
  }, []);

  // Navigation
  const [selectedBook, setSelectedBook] = useState(BOOKS[39]); // Matthew
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [jumpToVerse, setJumpToVerse] = useState<number | undefined>(undefined);

  // Translations
  const [bibles, setBibles] = useState<ApiBible[]>([]);
  const [biblesLoading, setBiblesLoading] = useState(true);
  const [selectedBible, setSelectedBible] = useState<ApiBible | null>(null);

  // Compare
  const [compareMode, setCompareMode] = useState(false);
  const [compareSet, setCompareSet] = useState<ApiBible[]>([]);
  const [comparePassages, setComparePassages] = useState<Record<string, Passage>>({});
  const [compareLoading, setCompareLoading] = useState(false);

  // Passage
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyVerse, setDailyVerse] = useState<Passage | null>(null);

  // Highlights & notes
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Theme system — organized by background type
  type ThemeId = string;
  interface ThemeDef { accent: string; bg: string; headerBg: string; label: string; group: 'black' | 'white' | 'dark' }
  const THEMES: Record<string, ThemeDef> = {
    // ── Pure Black backgrounds ─────────────────────────────────
    'black-green':   { accent: '#00d084', bg: '#000000', headerBg: '#000000', label: 'Green',    group: 'black' },
    'black-blue':    { accent: '#60a5fa', bg: '#000000', headerBg: '#000000', label: 'Blue',     group: 'black' },
    'black-white':   { accent: '#e2e8f0', bg: '#000000', headerBg: '#000000', label: 'White',    group: 'black' },
    'black-red':     { accent: '#ef4444', bg: '#000000', headerBg: '#000000', label: 'Red',      group: 'black' },
    'black-purple':  { accent: '#a855f7', bg: '#000000', headerBg: '#000000', label: 'Purple',   group: 'black' },
    'black-gold':    { accent: '#d4a853', bg: '#000000', headerBg: '#000000', label: 'Gold',     group: 'black' },
    'black-cyan':    { accent: '#06b6d4', bg: '#000000', headerBg: '#000000', label: 'Cyan',     group: 'black' },
    'black-pink':    { accent: '#f472b6', bg: '#000000', headerBg: '#000000', label: 'Pink',     group: 'black' },
    'black-orange':  { accent: '#fb923c', bg: '#000000', headerBg: '#000000', label: 'Orange',   group: 'black' },
    // ── White backgrounds ──────────────────────────────────────
    'white-green':   { accent: '#059669', bg: '#ffffff', headerBg: '#f8faf9', label: 'Green',    group: 'white' },
    'white-blue':    { accent: '#2563eb', bg: '#ffffff', headerBg: '#f8f9fc', label: 'Blue',     group: 'white' },
    'white-black':   { accent: '#1e293b', bg: '#ffffff', headerBg: '#f8f8f8', label: 'Black',    group: 'white' },
    'white-red':     { accent: '#dc2626', bg: '#ffffff', headerBg: '#fdf8f8', label: 'Red',      group: 'white' },
    'white-purple':  { accent: '#7c3aed', bg: '#ffffff', headerBg: '#faf8fd', label: 'Purple',   group: 'white' },
    'white-brown':   { accent: '#92400e', bg: '#ffffff', headerBg: '#faf9f6', label: 'Brown',    group: 'white' },
    'white-teal':    { accent: '#0d9488', bg: '#ffffff', headerBg: '#f6fafa', label: 'Teal',     group: 'white' },
    'white-pink':    { accent: '#db2777', bg: '#ffffff', headerBg: '#fdf8fa', label: 'Pink',     group: 'white' },
    'white-slate':   { accent: '#475569', bg: '#f8fafc', headerBg: '#f1f5f9', label: 'Slate',    group: 'white' },
    // ── Dark themed backgrounds ────────────────────────────────
    'trace':         { accent: '#00d084', bg: 'linear-gradient(160deg,#080f0c 0%,#0f1f18 50%,#080f0c 100%)', headerBg: 'linear-gradient(135deg,#050505 0%,#0a0a0a 35%,#080808 65%,#050505 100%)', label: 'Trace', group: 'dark' },
    'midnight':      { accent: '#60a5fa', bg: 'linear-gradient(160deg,#080c14 0%,#0f1729 50%,#080c14 100%)', headerBg: 'linear-gradient(135deg,#060a12 0%,#0c1a3d 35%,#0a1225 65%,#060a12 100%)', label: 'Midnight', group: 'dark' },
    'warm':          { accent: '#d4a853', bg: 'linear-gradient(160deg,#0e0c09 0%,#1a1610 50%,#0e0c09 100%)', headerBg: 'linear-gradient(135deg,#0e0a04 0%,#2d1f06 35%,#1a1206 65%,#0e0a04 100%)', label: 'Warm', group: 'dark' },
    'rose':          { accent: '#f472b6', bg: 'linear-gradient(160deg,#0e080b 0%,#1f1018 50%,#0e080b 100%)', headerBg: 'linear-gradient(135deg,#0a0508 0%,#2d0a1e 35%,#1a0812 65%,#0a0508 100%)', label: 'Rose', group: 'dark' },
    'ocean':         { accent: '#06b6d4', bg: 'linear-gradient(160deg,#06090e 0%,#0a1a2a 50%,#06090e 100%)', headerBg: 'linear-gradient(135deg,#050608 0%,#0a1825 35%,#070d14 65%,#050608 100%)', label: 'Ocean', group: 'dark' },
    'forest':        { accent: '#22c55e', bg: 'linear-gradient(160deg,#060d08 0%,#0c1f10 50%,#060d08 100%)', headerBg: 'linear-gradient(135deg,#040805 0%,#0a1a0d 35%,#06120a 65%,#040805 100%)', label: 'Forest', group: 'dark' },
    'sunset':        { accent: '#fb923c', bg: 'linear-gradient(160deg,#0e0906 0%,#1f1408 50%,#0e0906 100%)', headerBg: 'linear-gradient(135deg,#0a0704 0%,#2d1a06 35%,#1a1005 65%,#0a0704 100%)', label: 'Sunset', group: 'dark' },
    'royal':         { accent: '#a855f7', bg: 'linear-gradient(160deg,#0a070e 0%,#160f24 50%,#0a070e 100%)', headerBg: 'linear-gradient(135deg,#08050a 0%,#1a0f2d 35%,#100a1a 65%,#08050a 100%)', label: 'Royal', group: 'dark' },
    'crimson':       { accent: '#ef4444', bg: 'linear-gradient(160deg,#0e0606 0%,#1f0a0a 50%,#0e0606 100%)', headerBg: 'linear-gradient(135deg,#0a0404 0%,#2d0808 35%,#1a0606 65%,#0a0404 100%)', label: 'Crimson', group: 'dark' },
    'ember':         { accent: '#f97316', bg: 'linear-gradient(160deg,#0e0805 0%,#1f1208 50%,#0e0805 100%)', headerBg: 'linear-gradient(135deg,#0a0604 0%,#2d1506 35%,#1a0e05 65%,#0a0604 100%)', label: 'Ember', group: 'dark' },
  };
  const THEME_GROUPS = [
    { id: 'black', label: 'Black', icon: '⬛' },
    { id: 'white', label: 'White', icon: '⬜' },
    { id: 'dark', label: 'Dark Themed', icon: '🌑' },
  ];
  const [themeId, setThemeId] = useState<ThemeId>('black-blue');
  const theme = THEMES[themeId] || THEMES['trace']; // fallback if saved theme no longer exists

  // Identity & community
  const [userIdentity, setUserIdentity] = useState<UserIdentity>({ token: '', name: '', color: '' });
  const [communityNotes, setCommunityNotes] = useState<AltarNote[]>([]);

  // Settings, TTS, Fire Mode, Gospel
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // ── Auth guard — redirect to sign-in if not authenticated ───────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/bible/auth');
    }
  }, [authLoading, user, router]);

  // Check onboarding status — wait for auth to finish loading first
  const authDone = !authLoading;
  const userId = user?.id || null;
  useEffect(() => {
    if (!authDone) return;
    try {
      if (localStorage.getItem('trace-onboarding-done')) return;
      if (userId && localStorage.getItem(`trace-onboarding-done-${userId}`)) return;
      setShowOnboarding(true);
    } catch {}
  }, [authDone, userId]);
  const [fireOpen, setFireOpen] = useState(false);
  const [fireMode, setFireMode] = useState<'morning' | 'bedtime'>('morning');
  const [gospelOpen, setGospelOpen] = useState(false);
  const [gospelIdx, setGospelIdx] = useState(0);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('');
  const [scriptureBackground, setScriptureBackground] = useState(true);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsMode, setTtsMode] = useState<'narrator' | 'crafted'>('narrator');
  const [defaultBible, setDefaultBible] = useState('KJV');

  // ── Gospel cycling text ─────────────────────────────────────────────────────
  const gospelLines = ['God loves you. He sent His Son for you.', 'He offers you a brand new life.', 'The cross was not an accident. It was a rescue.', 'You are forgiven. You are free.', 'This changes everything.'];
  useEffect(() => {
    const interval = setInterval(() => setGospelIdx(i => (i + 1) % gospelLines.length), 4000);
    return () => clearInterval(interval);
  }, []);

  // Badge count is driven entirely by onUnreadChange from NotificationsTab

  // ── Sync real profile into identity when signed in ───────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    if (!sb) return;
    sb.from('trace_profiles')
      .select('display_name, avatar_color, experience_level, is_public, profile_data')
      .eq('auth_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const pd: Record<string, any> = (data as any).profile_data || {};
        setUserIdentity(prev => ({
          ...prev,
          name: (data as any).display_name || prev.name,
          color: (data as any).avatar_color || prev.color,
          experienceLevel: (data as any).experience_level || prev.experienceLevel,
          isPublic: (data as any).is_public !== false,
          // Merge profile_data fields — only override if Supabase has a non-empty value
          ...(pd.bio        ? { bio: pd.bio }               : {}),
          ...(pd.testimony  ? { testimony: pd.testimony }   : {}),
          ...(pd.church     ? { church: pd.church }         : {}),
          ...(pd.location   ? { location: pd.location }     : {}),
          ...(pd.lifeVerse  ? { lifeVerse: pd.lifeVerse }   : {}),
          ...(pd.favoriteVerse ? { favoriteVerse: pd.favoriteVerse } : {}),
          ...(pd.spiritualGifts ? { spiritualGifts: pd.spiritualGifts } : {}),
          ...(pd.ministryRole   ? { ministryRole: pd.ministryRole }   : {}),
          ...(pd.profilePicture ? { profilePicture: pd.profilePicture } : {}),
          ...(pd.dateOfBirth    ? { dateOfBirth: pd.dateOfBirth }     : {}),
          ...(pd.savedDate      ? { savedDate: pd.savedDate }         : {}),
          ...(pd.baptismDate    ? { baptismDate: pd.baptismDate }     : {}),
          ...(pd.denomination   ? { denomination: pd.denomination }   : {}),
          ...(pd.prayerFor      ? { prayerFor: pd.prayerFor }         : {}),
          ...(pd.mentor         ? { mentor: pd.mentor }               : {}),
          ...(pd.discipling     ? { discipling: pd.discipling }       : {}),
          ...(pd.readingGoal    ? { readingGoal: pd.readingGoal }     : {}),
          ...(pd.favoriteHymn   ? { favoriteHymn: pd.favoriteHymn }   : {}),
          ...(pd.favoritePreacher ? { favoritePreacher: pd.favoritePreacher } : {}),
        }));
        // Persist merged identity locally
        localStorage.setItem('trace-identity', JSON.stringify({
          ...JSON.parse(localStorage.getItem('trace-identity') || '{}'),
          ...pd,
          name: (data as any).display_name,
          color: (data as any).avatar_color,
        }));
      })
      .catch(() => {});
  }, [user?.id]);

  // ── Init identity + load saved settings ─────────────────────────────────────
  useEffect(() => {
    setUserIdentity(getOrCreateIdentity());
    try {
      const stored = localStorage.getItem('trace-community-notes');
      if (stored) setCommunityNotes(JSON.parse(stored));
    } catch {}
    // Load saved settings
    try {
      const settings = localStorage.getItem('trace-settings');
      if (settings) {
        const s = JSON.parse(settings);
        if (s.themeId && THEMES[s.themeId]) setThemeId(s.themeId);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.ttsEnabled !== undefined) setTtsEnabled(s.ttsEnabled);
        if (s.ttsVoice) setTtsVoice(s.ttsVoice);
        if (s.ttsRate) setTtsRate(s.ttsRate);
        if (s.ttsMode) setTtsMode(s.ttsMode);
        if (s.scriptureBackground !== undefined) setScriptureBackground(s.scriptureBackground);
      }
    } catch {}
  }, []);

  // ── Auto-save settings on change ───────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('trace-settings', JSON.stringify({ themeId, fontSize, ttsEnabled, ttsVoice, ttsRate, ttsMode, scriptureBackground }));
    } catch {}
  }, [themeId, fontSize, ttsEnabled, ttsVoice, ttsRate, ttsMode, scriptureBackground]);

  // ── Load translations ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/bible?path=bibles')
      .then(r => r.json())
      .then(data => {
        const raw: { id: string; name: string; abbreviationLocal: string; language?: { id: string; name: string; nameLocal: string } }[] = data.data || [];
        const seen = new Set<string>();
        const deduped: ApiBible[] = [];
        for (const b of raw) {
          const langId = b.language?.id || 'eng';
          const abbr = b.abbreviationLocal;
          const dedupeKey = `${langId}:${abbr}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          const group = (langId === 'eng' && POPULAR_ABBRS.includes(abbr)) ? 'popular' : 'other';
          deduped.push({
            id: b.id,
            name: b.name,
            abbreviationLocal: abbr,
            group,
            languageId: langId,
            languageName: b.language?.nameLocal || b.language?.name || 'English',
          });
        }
        deduped.sort((a, b) => {
          const ai = POPULAR_ABBRS.indexOf(a.abbreviationLocal);
          const bi = POPULAR_ABBRS.indexOf(b.abbreviationLocal);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.abbreviationLocal.localeCompare(b.abbreviationLocal);
        });
        setBibles(deduped);
        const savedDefault = localStorage.getItem('trace-default-bible') || 'KJV';
        setSelectedBible(deduped.find(b => b.abbreviationLocal === savedDefault) || deduped.find(b => b.abbreviationLocal === 'KJV') || deduped[0]);
      })
      .finally(() => setBiblesLoading(false));
  }, []);

  // ── Fetch passage helper (plain text, no sections) ─────────────────────────
  const fetchPassage = useCallback(async (bibleId: string, passageId: string, label: string): Promise<Passage | null> => {
    const params = new URLSearchParams({
      path: `bibles/${bibleId}/passages/${passageId}`,
      'content-type': 'text',
      'include-verse-numbers': 'true',
      'include-titles': 'false',
      'include-chapter-numbers': 'false',
    });
    const res = await fetch(`/api/bible?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.data;
    if (!d) return null;
    return { reference: d.reference, translationName: label, verses: parseVerseText(stripHtml(d.content || '')) };
  }, []);

  // ── Fetch passage with section headings (HTML with titles) ────────────────
  const fetchSectionedPassage = useCallback(async (bibleId: string, passageId: string, label: string): Promise<Passage | null> => {
    // Fetch HTML version with titles for section parsing
    const htmlParams = new URLSearchParams({
      path: `bibles/${bibleId}/passages/${passageId}`,
      'content-type': 'html',
      'include-verse-numbers': 'true',
      'include-titles': 'true',
      'include-chapter-numbers': 'false',
    });
    const htmlRes = await fetch(`/api/bible?${htmlParams}`);
    if (!htmlRes.ok) return null;
    const htmlData = await htmlRes.json();
    const hd = htmlData.data;
    if (!hd) return null;

    const sections = parseSectionedHtml(hd.content || '');
    const allVerses = sections.flatMap(s => s.verses);

    // If HTML parsing yielded verses, use them with sections
    if (allVerses.length > 0) {
      return {
        reference: hd.reference,
        translationName: label,
        verses: allVerses,
        sections: sections.length > 1 || sections[0]?.title ? sections : undefined,
      };
    }

    // Fallback: re-fetch as plain text if HTML parsing failed
    return fetchPassage(bibleId, passageId, label);
  }, [fetchPassage]);

  // ── Load passage when nav changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedBible) return;
    const passageId = `${selectedBook.osis}.${selectedChapter}`;
    const label = selectedBible.abbreviationLocal;
    if (compareMode) {
      if (compareSet.length === 0) return;
      setCompareLoading(true);
      Promise.all(compareSet.map(b => fetchPassage(b.id, passageId, b.abbreviationLocal).then(p => ({ b, p }))))
        .then(results => {
          const map: Record<string, Passage> = {};
          results.forEach(({ b, p }) => { if (p) map[b.id] = p; });
          setComparePassages(map);
        })
        .finally(() => setCompareLoading(false));
    } else {
      setLoading(true); setError('');
      fetchSectionedPassage(selectedBible.id, passageId, label)
        .then(p => { if (p) setPassage(p); else setError('Could not load passage.'); })
        .catch(() => setError('Could not load passage. Check your connection.'))
        .finally(() => setLoading(false));
    }
  }, [selectedBible, selectedBook, selectedChapter, compareMode, compareSet, fetchPassage, fetchSectionedPassage]);

  // ── Personalized daily verse (AI-powered) ───────────────────────────────────
  useEffect(() => {
    if (!selectedBible) return;

    // Check if we already have a verse cached for today (date-only key, not book/chapter dependent)
    const today = new Date().toDateString();
    const cacheKey = `trace-daily-verse-${today}`;
    // Clear old days' caches
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('trace-daily-verse-') && k !== cacheKey) localStorage.removeItem(k);
      }
    } catch {}
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setDailyVerse(JSON.parse(cached)); return; } catch {}
    }

    // Build reading context
    const recentHighlights = [...highlighted].slice(0, 5).map(k => {
      const parts = k.split('-');
      const book = BOOKS.find(b => b.osis === parts[0]);
      return book ? `${book.name} ${parts[1]}:${parts[2]}` : '';
    }).filter(Boolean);

    const recentNoteBooks = Object.keys(notes).filter(k => notes[k]?.trim()).slice(0, 3);

    // Build a list of recently shown verses to avoid repeats (last 30 days)
    const recentVerses: string[] = [];
    try {
      const historyRaw = localStorage.getItem('trace-verse-history');
      if (historyRaw) {
        const history: { date: string; ref: string }[] = JSON.parse(historyRaw);
        recentVerses.push(...history.slice(-30).map(h => h.ref).filter(Boolean));
      }
    } catch {}

    // Ask Claude to pick a personalized verse
    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: 'Daily Verse Selection',
        verseText: `Current date: ${new Date().toLocaleDateString()}`,
        translation: selectedBible.abbreviationLocal,
        question: `Pick ONE Bible verse for today's "Word for the Day" personalized for this reader.

Their context:
- Currently reading: ${selectedBook.name} chapter ${selectedChapter}
- Recent highlights: ${recentHighlights.length > 0 ? recentHighlights.join(', ') : 'none yet'}
- Notes on: ${recentNoteBooks.length > 0 ? recentNoteBooks.join(', ') : 'just getting started'}

Rules:
- Pick a verse that COMPLEMENTS what they're reading (not the same passage)
- If they're in a Gospel, pick something from Psalms, Proverbs, or the Epistles
- If they're in the OT, pick something from the NT that connects thematically
- Vary it — never pick John 3:16, Romans 8:28, or Jeremiah 29:11 (too common)
- Pick something they might not have seen before but will find powerful
${recentVerses.length > 0 ? `- NEVER repeat these recently shown verses: ${recentVerses.join(', ')}` : ''}

Return ONLY this format, nothing else:
REF: [Book Chapter:Verse]
TEXT: [The exact verse text from ${selectedBible.abbreviationLocal}]`,
      }),
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        // Parse the response
        const refMatch = fullText.match(/REF:\s*(.+)/);
        const textMatch = fullText.match(new RegExp('TEXT:\\s*([\\s\\S]+)'));
        if (refMatch && textMatch) {
          const verse: Passage = {
            reference: refMatch[1].trim().replace(/\*+/g, ''),
            translationName: selectedBible.abbreviationLocal,
            verses: [{ verse: 1, text: textMatch[1].trim().replace(/\*+/g, '').replace(/^[""]|[""]$/g, '') }],
          };
          setDailyVerse(verse);
          localStorage.setItem(cacheKey, JSON.stringify(verse));
          // Track verse history to avoid repeats
          try {
            const historyRaw = localStorage.getItem('trace-verse-history');
            const history: { date: string; ref: string }[] = historyRaw ? JSON.parse(historyRaw) : [];
            history.push({ date: today, ref: verse.reference });
            // Keep last 60 entries
            if (history.length > 60) history.splice(0, history.length - 60);
            localStorage.setItem('trace-verse-history', JSON.stringify(history));
          } catch {}
        }
      })
      .catch(() => {
        // Fallback to a simple fetch if AI fails
        const fallbackRefs = ['PSA.46.1', 'ISA.40.31', 'PHP.4.6-PHP.4.7', 'PSA.37.4', 'ROM.15.13', 'HEB.12.1-HEB.12.2', 'PRO.16.3', 'JHN.15.5', 'ROM.12.2', 'GAL.2.20', 'EPH.2.10', 'LAM.3.22-LAM.3.23', 'PSA.119.105', 'COL.3.23'];
        const _now = new Date();
        const dayOfYear = Math.floor((_now.getTime() - new Date(_now.getFullYear(), 0, 0).getTime()) / 86400000);
        const ref = fallbackRefs[dayOfYear % fallbackRefs.length];
        const params = new URLSearchParams({
          path: `bibles/${selectedBible.id}/passages/${ref}`,
          'content-type': 'text', 'include-verse-numbers': 'true',
          'include-titles': 'false', 'include-chapter-numbers': 'false',
        });
        fetch(`/api/bible?${params}`)
          .then(r => r.json())
          .then(data => {
            const d = data.data;
            if (!d) return;
            setDailyVerse({ reference: d.reference, translationName: '', verses: parseVerseText(stripHtml(d.content || '')) });
          }).catch(() => null);
      });
  }, [selectedBible, selectedBook, selectedChapter, highlighted, notes]);

  // ── Local storage ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const h = localStorage.getItem('trace-highlights');
      const n = localStorage.getItem('trace-notes');
      if (h) setHighlighted(new Set(JSON.parse(h)));
      if (n) setNotes(JSON.parse(n));
    } catch {}
  }, []);

  const toggleHighlight = (vKey: string) => {
    const updated = new Set(highlighted);
    updated.has(vKey) ? updated.delete(vKey) : updated.add(vKey);
    setHighlighted(updated);
    localStorage.setItem('trace-highlights', JSON.stringify([...updated]));
  };

  const saveNote = (key: string, text: string) => {
    const updated = { ...notes, [key]: text };
    setNotes(updated);
    localStorage.setItem('trace-notes', JSON.stringify(updated));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const xp = userIdentity.experienceLevel || 'beginner';
  const isWhiteTheme = (THEMES[themeId] as any)?.group === 'white';
  const { gold, goldFaint, goldBorder, dark } = T;

  // ── Onboarding handler ─────────────────────────────────────────────────────
  const handleOnboardingComplete = (result: { name: string; experienceLevel: 'beginner' | 'intermediate' | 'expert'; focuses: string[]; weeklyGoals: { chapters: number; prayers: number; devotionals: number; quizzes: number }; themeId: string; defaultBible: string; voiceId: string }) => {
    // Save identity
    const identity = getOrCreateIdentity();
    identity.name = result.name;
    identity.experienceLevel = result.experienceLevel;
    localStorage.setItem('trace-identity', JSON.stringify(identity));
    setUserIdentity(identity);

    // Save theme
    setThemeId(result.themeId);

    // Save weekly goals
    localStorage.setItem('trace-weekly-goals', JSON.stringify(result.weeklyGoals));

    // Save focuses
    localStorage.setItem('trace-focuses', JSON.stringify(result.focuses));

    // Save default bible
    setDefaultBible(result.defaultBible);
    localStorage.setItem('trace-default-bible', result.defaultBible);
    // Update selected bible to match
    const match = bibles.find(b => b.abbreviationLocal === result.defaultBible);
    if (match) setSelectedBible(match);

    // Save voice
    if (result.voiceId) {
      setTtsVoice(result.voiceId);
      localStorage.setItem('trace-tts-voice', result.voiceId);
    }

    // Mark onboarding done
    const userId = user?.id || 'anon';
    localStorage.setItem(`trace-onboarding-done-${userId}`, 'true');
    localStorage.setItem('trace-onboarding-done', 'true'); // legacy fallback
    setShowOnboarding(false);
    setShowTour(true);
  };

  // Show nothing (black screen) while auth loads or if unauthenticated — router.replace handles redirect
  if (authLoading || !user) {
    return <div className="min-h-screen" style={{ background: '#000' }} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, position: 'relative', overflow: 'hidden' }} suppressHydrationWarning>
      {/* Onboarding */}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* App Tour */}
      {showTour && <AppTour accentColor={theme.accent} onDone={() => setShowTour(false)} />}

      {/* Full-page flowing Scripture background */}
      {!isWhiteTheme && scriptureBackground && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes pageScriptureGlow { 0% { background-position: 0% 100%; } 100% { background-position: 0% -100%; } }
          `}} />
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            overflow: 'hidden', pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          }}>
            <div style={{
              position: 'absolute', top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
              transform: 'rotate(-8deg)',
              fontSize: 10, lineHeight: 2.4, fontWeight: 400,
              fontFamily: "'Georgia', serif",
              wordSpacing: '0.12em',
              color: 'transparent',
              backgroundImage: `linear-gradient(180deg, ${theme.accent}06 0%, ${theme.accent}06 42%, ${theme.accent}33 48%, ${theme.accent}66 50%, ${theme.accent}33 52%, ${theme.accent}06 58%, ${theme.accent}06 100%)`,
              backgroundSize: '100% 250%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              animation: 'pageScriptureGlow 20s linear infinite',
            }}>
              {'The Lord is my shepherd I shall not want He maketh me to lie down in green pastures He leadeth me beside the still waters He restoreth my soul Thy word is a lamp unto my feet and a light unto my path For God so loved the world that He gave His only begotten Son In the beginning was the Word and the Word was with God and the Word was God I am the way the truth and the life Trust in the Lord with all thine heart Be strong and of good courage The Lord bless thee and keep thee He healeth the broken in heart and bindeth up their wounds Come unto me all ye that labour and are heavy laden and I will give you rest For I know the plans I have for you declares the Lord plans to prosper you and not to harm you I can do all things through Christ which strengtheneth me '.repeat(8)}
            </div>
          </div>
        </>
      )}
      {/* Light mode style overrides */}
      {isWhiteTheme && (
        <style dangerouslySetInnerHTML={{ __html: `
          .trace-light-mode * { color: inherit; }
          .trace-light-mode { color: #1e293b; }
          .trace-light-mode [style*="Georgia"] { color: #334155 !important; }
          .trace-light-mode sup { color: ${theme.accent} !important; }
          .trace-light-mode textarea, .trace-light-mode input, .trace-light-mode select {
            color: #1e293b !important;
            background: rgba(0,0,0,0.04) !important;
            border-color: rgba(0,0,0,0.12) !important;
          }
          .trace-light-mode textarea::placeholder, .trace-light-mode input::placeholder {
            color: rgba(0,0,0,0.35) !important;
          }
        `}} />
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Header
        tab={tab}
        selectedBook={selectedBook}
        selectedChapter={selectedChapter}
        accentColor={theme.accent}
        headerBg={theme.headerBg}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
        notifUnread={notifUnread}
        isSignedIn={!!user}
        userName={profile?.display_name}
      />

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto pb-20 ${isWhiteTheme ? 'trace-light-mode' : ''}`}
        style={isWhiteTheme ? { color: '#1a1a2e' } : {}}>
        <div className="max-w-4xl mx-auto px-5 py-4 space-y-4">

          {tab === 'home' && (
            <>
              {/* Gospel Presentation — heavenly, cycling text */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes gospelGlow { 0%,100% { opacity: 0.08; transform: scale(1); } 50% { opacity: 0.15; transform: scale(1.05); } }
                @keyframes gospelShimmer { 0% { left: -40%; } 100% { left: 140%; } }
                @keyframes gospelStar { 0%,100% { opacity: 0.1; } 50% { opacity: 0.7; } }
                @keyframes crossPulseGospel { 0%,100% { box-shadow: 0 0 20px rgba(96,165,250,0.3), 0 0 40px rgba(96,165,250,0.1); } 50% { box-shadow: 0 0 30px rgba(96,165,250,0.5), 0 0 60px rgba(147,197,253,0.2), 0 0 80px rgba(96,165,250,0.08); } }
                @keyframes gospelTextFade { 0% { opacity: 0; transform: translateY(8px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-8px); } }
                @keyframes gospelImgSweep { 0%, 10% { transform: translateX(-160%); } 65%, 100% { transform: translateX(360%); } }
              `}} />
              {(() => {
                return (
                  <button onClick={() => setGospelOpen(true)}
                    className="w-full rounded-2xl overflow-hidden text-left transition-all relative group"
                    style={{ background: 'linear-gradient(160deg, #06102a 0%, #0f1f4a 25%, #1a2d6b 50%, #0f1f4a 75%, #06102a 100%)', border: '1px solid rgba(96,165,250,0.2)', boxShadow: '0 8px 32px rgba(6,16,42,0.8), 0 0 1px rgba(96,165,250,0.3)' }}>
                    {/* Glows */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(96,165,250,0.1), transparent 60%)', animation: 'gospelGlow 6s ease-in-out infinite' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 40% 50% at 20% 80%, rgba(147,197,253,0.05), transparent 60%)' }} />
                    {/* Shimmer */}
                    <div className="absolute top-0 h-full w-1/3 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), rgba(147,197,253,0.04), transparent)', animation: 'gospelShimmer 6s ease-in-out infinite', transform: 'skewX(-15deg)' }} />
                    {/* Stars */}
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="absolute rounded-full pointer-events-none" style={{
                        left: `${((i * 59 + 7) % 92) + 4}%`, top: `${((i * 41 + 13) % 85) + 7}%`,
                        width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
                        background: i % 3 === 0 ? '#c4b5fd' : '#93c5fd',
                        animation: `gospelStar ${2.5 + (i % 4)}s ease-in-out ${i * 0.3}s infinite`,
                      }} />
                    ))}
                    {/* Jesus image with soft drifting glow */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ isolation: 'isolate' }}>
                      <img src="/jesus.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%', opacity: 0.40, WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)' }} />
                      {/* Soft blurry light blob */}
                      <div style={{
                        position: 'absolute', top: '-30%', left: '-15%',
                        width: '40%', height: '160%',
                        background: 'rgba(210,228,255,0.45)',
                        filter: 'blur(38px)',
                        borderRadius: '50%',
                        animation: 'gospelImgSweep 10s ease-in-out infinite',
                        mixBlendMode: 'soft-light',
                      }} />
                    </div>

                    <div className="px-5 relative z-10" style={{ paddingBottom: '16px' }}>
                      {/* Greatest Story — pinned near top */}
                      <p className="text-center" style={{ paddingTop: 22, fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(147,197,253,0.45)' }}>The Greatest Story Ever Told</p>

                      {/* The Gospel — lower, bigger */}
                      <h2 className="text-center font-black uppercase tracking-wider" style={{ marginTop: 64, fontSize: 26, color: '#e0eeff', fontFamily: 'Montserrat, system-ui, sans-serif' }}>The Gospel</h2>

                      {/* Cycling text — below gospel */}
                      <div className="h-8 flex items-center justify-center overflow-hidden" style={{ marginTop: 14 }}>
                        <p key={gospelIdx} className="text-[12px] italic text-center" style={{
                          color: 'rgba(255,255,255,0.75)', fontFamily: 'Georgia, serif',
                          animation: 'gospelTextFade 4s ease-in-out',
                        }}>
                          {gospelLines[gospelIdx]}
                        </p>
                      </div>

                      {/* CTA */}
                      <p className="text-center text-[11px] font-black uppercase tracking-[0.2em]" style={{ marginTop: 14, color: 'rgba(96,165,250,0.7)', textShadow: '0 0 12px rgba(96,165,250,0.5), 0 0 28px rgba(96,165,250,0.2)', letterSpacing: '0.18em' }}>
                        Tap to Experience →
                      </p>
                    </div>
                    {/* Bottom glow bar */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.35), transparent)' }} />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-4 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(96,165,250,0.08), transparent 80%)', filter: 'blur(4px)' }} />
                  </button>
                );
              })()}

              <HomeTab
                dailyVerse={dailyVerse}
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                notes={notes}
                highlighted={highlighted}
                accentColor={theme.accent}
                ttsVoice={ttsVoice}
                onContinueReading={() => handleSetTab('read')}
                onOpenMorningEncounter={() => { setFireMode('morning'); setFireOpen(true); }}
                onOpenBedtimeEncounter={() => { setFireMode('bedtime'); setFireOpen(true); }}
                onOpenTrophyRoom={() => setTrophyOpen(true)}
                onStudyVerse={(bookName, chapter) => {
                  const book = BOOKS.find(b => b.name === bookName);
                  if (book) { setSelectedBook(book); setSelectedChapter(chapter); }
                  handleSetTab('study');
                }}
              />

            </>
          )}

          {tab === 'read' && (
            <ReadTab
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              setSelectedBook={setSelectedBook}
              setSelectedChapter={setSelectedChapter}
              bibles={bibles}
              biblesLoading={biblesLoading}
              selectedBible={selectedBible}
              setSelectedBible={setSelectedBible}
              passage={passage}
              loading={loading}
              error={error}
              compareMode={compareMode}
              setCompareMode={setCompareMode}
              compareSet={compareSet}
              setCompareSet={setCompareSet}
              comparePassages={comparePassages}
              compareLoading={compareLoading}
              highlighted={highlighted}
              toggleHighlight={toggleHighlight}
              notes={notes}
              saveNote={saveNote}
              fontSize={fontSize}
              accentColor={theme.accent}
              themeGroup={theme.group}
              ttsEnabled={ttsEnabled}
              ttsVoice={ttsVoice}
              ttsRate={ttsRate}
              ttsMode={ttsMode}
              experienceLevel={xp}
              jumpToVerse={jumpToVerse}
              onJumpHandled={() => setJumpToVerse(undefined)}
              onShareNote={async (noteText, bookName, chapter) => {
                // Share note to community via Supabase if signed in
                if (profile?.id) {
                  try {
                    const supabase = createClient();
                    if (supabase) {
                      await supabase.from('trace_posts').insert({
                        author_id: profile.id,
                        type: 'note',
                        content: noteText,
                        verse_ref: `${bookName} ${chapter}`,
                      });
                    }
                  } catch {}
                }
                handleSetTab('community');
              }}
            />
          )}

          {tab === 'search' && (
            <SearchTab
              selectedBible={selectedBible}
              fetchPassage={fetchPassage}
              fontSize={fontSize}
              accentColor={theme.accent}
              experienceLevel={xp}
              onOpenInReader={(book, chapter, verse) => {
                setSelectedBook(book);
                setSelectedChapter(chapter);
                setJumpToVerse(verse);
                handleSetTab('read');
              }}
            />
          )}

          {tab === 'study' && (
            <StudyTab
              experienceLevel={xp}
              bibles={bibles}
              biblesLoading={biblesLoading}
              defaultBible={selectedBible}
              fetchPassage={fetchPassage}
              fontSize={fontSize}
              accentColor={theme.accent}
              onNavigateToRead={(book, chapter) => {
                setSelectedBook(book);
                setSelectedChapter(chapter);
                handleSetTab('read');
              }}
            />
          )}

          {tab === 'community' && (
            <CommunityTab
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              userIdentity={userIdentity}
              accentColor={theme.accent}
              onOpenGospel={() => setGospelOpen(true)}
              authUser={user}
              onOpenAuth={() => setAuthOpen(true)}
            />
          )}

        </div>
      </div>

      {/* SVG filter: strips white/bright pixels to transparent for church icon */}
      <svg style={{ width: 0, height: 0, position: 'absolute', overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="removeWhiteBg" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1.2 -1.2 -1.2 3.5 0" />
          </filter>
        </defs>
      </svg>

      {/* ── BOTTOM NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,15,12,0.97) 20%)' }} />
        <div className="relative max-w-4xl mx-auto">
          <div style={{ borderTop: `1px solid ${theme.accent}22` }}>
            <div className="flex items-center justify-around px-2 pt-2 pb-1">
              {TAB_CONFIG.map(t => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => handleSetTab(t.id)}
                    className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px]"
                    style={active ? { background: `${theme.accent}18` } : {}}>
                    <span style={{ transform: active ? 'scale(1.15)' : 'scale(1)', display: 'block', mixBlendMode: 'screen' }}>
                      {t.img ? (
                        <img src={t.img} alt={t.label} style={{
                          width: 52, height: 52, objectFit: 'contain', display: 'block',
                          opacity: active ? 1 : 0.45,
                        }} />
                      ) : (
                        <span className="text-lg" style={{ opacity: active ? 1 : 0.4 }}>{t.icon}</span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider transition-all" style={{
                      color: active ? theme.accent : 'rgba(232,240,236,0.25)',
                    }}>
                      {t.label}
                    </span>
                    {active && (
                      <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}aa)` }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Fire Mode ──────────────────────────────────────────────────────── */}
      <FireMode
        open={fireOpen}
        onClose={() => setFireOpen(false)}
        accentColor={theme.accent}
        selectedBook={selectedBook}
        selectedChapter={selectedChapter}
        highlighted={highlighted}
        notes={notes}
        selectedBibleAbbr={selectedBible?.abbreviationLocal || 'KJV'}
        encounterMode={fireMode}
      />

      {/* ── Trophy Room ──────────────────────────────────────────────────── */}
      {trophyOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTrophyOpen(false)} />
          <div className="relative ml-auto w-full max-w-md h-full overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #0a0a08, #0f0d08)', borderLeft: '1px solid rgba(251,191,36,0.15)' }}>
            <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
              style={{ background: 'rgba(10,10,8,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
              <h2 className="text-base font-black uppercase tracking-wider" style={{ color: '#fbbf24', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Trophy Room</h2>
              <button onClick={() => setTrophyOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.6)' }}>✕</button>
            </div>
            <div className="px-4 py-4">
              <TrophyRoom accentColor={theme.accent} highlighted={highlighted} notes={notes} />
            </div>
          </div>
        </div>
      )}

      {/* ── Gospel Presentation ──────────────────────────────────────────── */}
      <GospelPresentation
        open={gospelOpen}
        onClose={() => setGospelOpen(false)}
        accentColor={theme.accent}
        ttsEnabled={ttsEnabled}
        ttsVoice={ttsVoice}
        ttsRate={ttsRate}
      />

      {/* ── Auth Modal ───────────────────────────────────────────────────── */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuth={() => setAuthOpen(false)}
        accentColor={theme.accent}
      />

      {/* ── Settings Panel ─────────────────────────────────────────────────── */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeId={themeId}
        setThemeId={setThemeId}
        themes={THEMES}
        themeGroups={THEME_GROUPS}
        accentColor={theme.accent}
        fontSize={fontSize}
        setFontSize={setFontSize}
        userIdentity={userIdentity}
        setUserIdentity={setUserIdentity}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        ttsRate={ttsRate}
        setTtsRate={setTtsRate}
        ttsMode={ttsMode}
        setTtsMode={setTtsMode}
        defaultBible={defaultBible}
        onSetDefaultBible={(abbr) => {
          setDefaultBible(abbr);
          const match = bibles.find(b => b.abbreviationLocal === abbr);
          if (match) setSelectedBible(match);
          try { localStorage.setItem('trace-default-bible', abbr); } catch {}
        }}
        isSignedIn={!!user}
        userName={profile?.display_name || user?.email?.split('@')[0] || ''}
        onSignOut={signOut}
        onOpenAuth={() => { setSettingsOpen(false); setAuthOpen(true); }}
        scriptureBackground={scriptureBackground}
        setScriptureBackground={setScriptureBackground}
        authUser={user}
      />

      {/* ── Notifications Panel ─────────────────────────────────────────────── */}
      {notifOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setNotifOpen(false); setNotifUnread(0); }}
          />
          {/* Slide-down panel */}
          <div
            className="fixed top-0 inset-x-0 z-[91] max-w-lg mx-auto"
            style={{
              background: 'linear-gradient(180deg, #060e0a 0%, #0a140e 100%)',
              borderBottom: `1px solid ${theme.accent}22`,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              boxShadow: `0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px ${theme.accent}12`,
              animation: 'notifSlideDown 0.25s cubic-bezier(0.32,0.72,0,1)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Panel handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: `${theme.accent}30` }} />
            </div>

            <div className="px-4 pb-8">
              <NotificationsTab
                accentColor={theme.accent}
                authUser={user}
                highlighted={highlighted}
                notes={notes}
                onNavigate={(t) => { setNotifOpen(false); handleSetTab(t as Tab); }}
                onUnreadChange={setNotifUnread}
              />
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes notifSlideDown {
              from { transform: translateY(-100%); opacity: 0; }
              to   { transform: translateY(0);     opacity: 1; }
            }
          `}} />
        </>
      )}
    </div>
    </div>
  );
}
