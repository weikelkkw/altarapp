'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BookDef, Passage, T, BOOKS, cleanMarkdown, completeDailyCheck } from '../types';
import VoicePrayer from './VoicePrayer';
import VoiceInput from './VoiceInput';

interface PrayerItem {
  id: string;
  text: string;
  status: 'active' | 'ongoing' | 'answered' | 'archived';
  category?: string;
  createdAt: string;
  answeredAt?: string;
  answeredHow?: string;
  answeredReflection?: string;
  // Legacy compat
  answered?: boolean;
}

const PRAYER_CATEGORIES = ['Personal', 'Family', 'Others', 'Church', 'World', 'Gratitude', 'Guidance', 'Confession'];

interface Props {
  dailyVerse: Passage | null;
  selectedBook: BookDef;
  selectedChapter: number;
  notes: Record<string, string>;
  highlighted: Set<string>;
  accentColor: string;
  ttsVoice?: string;
  onContinueReading: () => void;
  onOpenMorningEncounter: () => void;
  onOpenBedtimeEncounter: () => void;
  onOpenTrophyRoom?: () => void;
  onStudyVerse?: (book: string, chapter: number) => void;
}

// Reusable bold section header
function SectionLabel({ text, accentColor, icon }: { text: string; accentColor: string; icon?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
      {icon && (icon === 'star-img' ? <img src="/star.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : icon === 'praying-hands' ? <img src="/Praying hands.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <span className="text-base">{icon}</span>)}
      <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{text}</h2>
    </div>
  );
}

function GlowDivider({ accentColor, dot = false }: { accentColor: string; dot?: boolean }) {
  return (
    <div className="relative my-5" style={{ height: 3 }}>
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: `linear-gradient(90deg, transparent 5%, ${accentColor}55 50%, transparent 95%)` }} />
      <div className="absolute inset-x-0 top-1/2 h-px overflow-hidden">
        <div style={{ height: '100%', width: '30%', background: `linear-gradient(90deg, transparent, ${accentColor}, ${accentColor}, transparent)`, animation: 'glowSweep 4s ease-in-out infinite', boxShadow: `0 0 10px ${accentColor}88, 0 0 20px ${accentColor}44` }} />
      </div>
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden" style={{ filter: 'blur(3px)' }}>
        <div style={{ height: '100%', width: '30%', background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`, animation: 'glowSweep 4s ease-in-out infinite' }} />
      </div>
      {dot && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}88, 0 0 16px ${accentColor}44`, animation: 'dotPulseGlow 3s ease-in-out infinite' }} />
      )}
    </div>
  );
}

export default function HomeTab({
  dailyVerse, selectedBook, selectedChapter, notes, highlighted,
  accentColor, ttsVoice, onContinueReading, onOpenMorningEncounter, onOpenBedtimeEncounter, onOpenTrophyRoom, onStudyVerse,
}: Props) {
  const [devotional, setDevotional] = useState('');
  const [devotionalLoading, setDevotionalLoading] = useState(false);
  const [devotionalRef, setDevotionalRef] = useState('');
  const [verseAudioLoading, setVerseAudioLoading] = useState(false);
  const [versePlaying, setVersePlaying] = useState(false);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);
  const [streak, setStreak] = useState(0);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [newPrayer, setNewPrayer] = useState('');
  const [newPrayerCategory, setNewPrayerCategory] = useState('');
  const [showAllPrayers, setShowAllPrayers] = useState(false);
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [showVoicePrayer, setShowVoicePrayer] = useState(false);
  const [showIdentityExpand, setShowIdentityExpand] = useState(false);
  const [identityExplain, setIdentityExplain] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [deeperFact, setDeeperFact] = useState('');
  const [quizResults, setQuizResults] = useState<{ book: string; chapter: number; score: number; total: number; date: string }[]>([]);
  const [deeperLoading, setDeeperLoading] = useState(false);
  const [fireSessions, setFireSessions] = useState(0);
  const [gospelCompleted, setGospelCompleted] = useState(false);
  const [devotionalsDone, setDevotionalsDone] = useState(0);
  const [expandedHealthCat, setExpandedHealthCat] = useState<string | null>(null);
  const [journeyIdx, setJourneyIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setJourneyIdx(i => (i + 1) % 3), 12000);
    return () => clearInterval(t);
  }, []);

  // Read verse aloud
  const readVerseAloud = useCallback(async () => {
    if (versePlaying) {
      verseAudioRef.current?.pause();
      if (verseAudioRef.current) {
        verseAudioRef.current.src = '';
        verseAudioRef.current = null;
      }
      setVersePlaying(false);
      return;
    }
    const verseText = dailyVerse?.verses[0]?.text;
    if (!verseText) return;
    setVerseAudioLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: verseText, voiceId: ttsVoice || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`[TTS] API error ${res.status}:`, err);
        throw new Error(`TTS request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      verseAudioRef.current = audio;
      audio.onended = () => { setVersePlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = (e) => { console.error('[TTS] Audio error:', e); setVersePlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
      setVersePlaying(true);
    } catch (e) {
      console.error('[TTS] readVerseAloud failed:', e);
      setVersePlaying(false);
    } finally {
      setVerseAudioLoading(false);
    }
  }, [dailyVerse, ttsVoice, versePlaying]);

  // Faith journey countdown — days since first app use
  const [journeyDays, setJourneyDays] = useState(0);
  useEffect(() => {
    try {
      let firstUse = localStorage.getItem('trace-first-use');
      if (!firstUse) {
        firstUse = new Date().toISOString();
        localStorage.setItem('trace-first-use', firstUse);
      }
      const diff = Math.floor((Date.now() - new Date(firstUse).getTime()) / 86400000);
      setJourneyDays(Math.max(diff, 1));
    } catch { setJourneyDays(1); }
  }, []);

  // Daily checklist
  const [dailyChecks, setDailyChecks] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const key = `trace-daily-checks-${new Date().toDateString()}`;
      const stored = localStorage.getItem(key);
      if (stored) setDailyChecks(JSON.parse(stored));
    } catch {}
  }, []);
  const toggleCheck = (id: string) => {
    const updated = { ...dailyChecks, [id]: !dailyChecks[id] };
    setDailyChecks(updated);
    localStorage.setItem(`trace-daily-checks-${new Date().toDateString()}`, JSON.stringify(updated));
  };
  const dailyItems = [
    { id: 'devotional', label: 'Read today\'s devotional', icon: '📖', img: '/read book.png' },
    { id: 'prayer', label: 'Pray', icon: '🙏', img: '/Praying hands.png' },
    { id: 'scripture', label: 'Read Scripture', icon: '✦', img: '/star.png' },
    { id: 'apply', label: 'Apply what you learned', icon: '🧭', img: '/compass.png' },
    { id: 'share', label: 'Encourage someone', icon: '✝', img: '/cross.png' },
  ];
  const checksCompleted = dailyItems.filter(i => dailyChecks[i.id]).length;
  const [toastMsg, setToastMsg] = useState('');

  // Listen for auto-completions from other parts of the app
  useEffect(() => {
    const messages: Record<string, string> = {
      devotional: 'Devotional complete. Well done.',
      prayer: 'Prayer lifted. God hears you.',
      scripture: 'Scripture read. The Word is alive.',
      apply: 'Applied. Faith in action.',
      share: 'Shared. You encouraged someone today.',
    };
    const handler = (e: Event) => {
      const { itemId } = (e as CustomEvent).detail;
      setDailyChecks(prev => {
        const updated = { ...prev, [itemId]: true };
        localStorage.setItem(`trace-daily-checks-${new Date().toDateString()}`, JSON.stringify(updated));
        return updated;
      });
      if (messages[itemId]) {
        setToastMsg(messages[itemId]);
        setTimeout(() => setToastMsg(''), 3000);
      }
    };
    window.addEventListener('trace-check-complete', handler);
    return () => window.removeEventListener('trace-check-complete', handler);
  }, []);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerHow, setAnswerHow] = useState('');
  const [answerReflection, setAnswerReflection] = useState('');
  const [historicalFact, setHistoricalFact] = useState('');
  const [factLoading, setFactLoading] = useState(false);
  const [devotionalCompleted, setDevotionalCompleted] = useState(false);
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [prayerFilter, setPrayerFilter] = useState<'active' | 'waiting' | 'answered'>('active');
  const [identityStatement, setIdentityStatement] = useState('');

  // Check if today's devotional was already completed
  useEffect(() => {
    try {
      const key = `trace-devotional-done-${new Date().toDateString()}`;
      setDevotionalCompleted(localStorage.getItem(key) === 'true');
    } catch {}
  }, []);

  // Fetch weekly message of the week
  useEffect(() => {
    // Cache key based on Sunday-week so it rotates every Sunday at midnight
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay()); // rewind to Sunday (getDay() 0=Sun)
    sunday.setHours(0, 0, 0, 0);
    const weekNum = Math.floor(sunday.getTime() / (7 * 24 * 60 * 60 * 1000));
    const cacheKey = `trace-identity-w${weekNum}`;
    // Clean up old week caches
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('trace-identity-') && k !== cacheKey) localStorage.removeItem(k);
      }
    } catch {}
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setIdentityStatement(cached); return; }
    const themes = [
      'identity in Christ', 'God\'s faithfulness', 'courage and strength', 'grace and forgiveness',
      'hope and perseverance', 'purpose and calling', 'peace that surpasses understanding',
      'belonging to God', 'walking in love', 'living without fear',
    ];
    const theme = themes[weekNum % themes.length];
    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: '',
        verseText: '',
        translation: '',
        question: `Give me ONE powerful, short declaration of truth from Scripture about ${theme}. It should be a statement spoken directly to the reader — like "You are chosen", "You are not defined by your past", "You were made for this moment". Just the statement itself, nothing else. No markdown, no quotes, no explanation. Make it feel fresh and personal, not clichéd.`,
      }),
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setIdentityStatement(result);
        }
        localStorage.setItem(cacheKey, result);
      })
      .catch(() => null);
  }, [selectedBook]);

  const noteCount = Object.values(notes).filter(n => n.trim()).length;
  const highlightCount = highlighted.size;
  const chaptersWithNotesGlobal = Object.keys(notes).filter(k => notes[k]?.trim()).length;
  const chaptersHighlightedGlobal = new Set([...highlighted].map(k => { const p = k.split('-'); return `${p[0]}-${p[1]}`; })).size;
  const chaptersStudied = Math.max(chaptersWithNotesGlobal, chaptersHighlightedGlobal);
  const highlightedVerses = [...highlighted].slice(0, 6);

  // Load streak + prayers from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem('trace-streak');
      const todayUtc = new Date().toISOString().split('T')[0];
      const yesterdayUtc = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (s) {
        const data = JSON.parse(s);
        const lastDate = new Date(data.lastDate).toISOString().split('T')[0];
        if (lastDate === todayUtc) setStreak(data.count);
        else if (lastDate === yesterdayUtc) {
          const updated = { count: data.count + 1, lastDate: todayUtc };
          localStorage.setItem('trace-streak', JSON.stringify(updated));
          setStreak(updated.count);
        } else {
          const reset = { count: 1, lastDate: todayUtc };
          localStorage.setItem('trace-streak', JSON.stringify(reset));
          setStreak(1);
        }
      } else {
        const init = { count: 1, lastDate: todayUtc };
        localStorage.setItem('trace-streak', JSON.stringify(init));
        setStreak(1);
      }

      const p = localStorage.getItem('trace-prayers');
      if (p) setPrayers(JSON.parse(p));
      const qr = localStorage.getItem('trace-quiz-results');
      if (qr) setQuizResults(JSON.parse(qr));
    } catch {}
  }, []);

  // Generate personalized devotional
  useEffect(() => {
    if (!dailyVerse?.verses[0]) return;
    const devotionalCacheKey = `trace-devotional-${new Date().toDateString()}`;
    // Clear old days from localStorage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('trace-devotional-') && k !== devotionalCacheKey && k !== 'trace-devotional-count') localStorage.removeItem(k);
      }
    } catch {}
    const cached = localStorage.getItem(devotionalCacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      setDevotional(data.text);
      setDevotionalRef(data.ref);
      return;
    }
    setDevotionalLoading(true);
    const ref = dailyVerse.reference;
    const text = dailyVerse.verses[0].text;
    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: ref,
        verseText: text,
        translation: 'KJV',
        question: `Write a brief, warm daily devotional (3-4 sentences max) based on this verse. Make it personal and encouraging — like a note from a pastor friend. End with one short prayer. Do NOT include the verse text or reference in your response.`,
      }),
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setDevotional(result);
        }
        setDevotionalRef(ref);
        localStorage.setItem(devotionalCacheKey, JSON.stringify({ text: result, ref }));
      })
      .catch(() => setDevotional(''))
      .finally(() => setDevotionalLoading(false));
  }, [dailyVerse]);

  // Load localStorage-based milestone data after mount to avoid hydration mismatch
  useEffect(() => {
    try { setFireSessions(JSON.parse(localStorage.getItem('trace-fire-sessions') || '[]').length); } catch {}
    try { setGospelCompleted(localStorage.getItem('trace-gospel-completed') === 'true'); } catch {}
    try { setDevotionalsDone(parseInt(localStorage.getItem('trace-devotional-count') || '0')); } catch {}
  }, []);

  // Generate historical fact
  useEffect(() => {
    const cached = sessionStorage.getItem('trace-fact-today');
    if (cached) { setHistoricalFact(cached); return; }

    setFactLoading(true);
    const today = new Date();
    const month = today.toLocaleString('default', { month: 'long' });
    const day = today.getDate();

    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: `${month} ${day}`,
        verseText: `Today is ${month} ${day}`,
        translation: '',
        question: `Share one fascinating historical fact related to the Bible or Christianity for ${month} ${day}. This could be a church history event, an archaeological discovery, a manuscript date, a saint's feast day, or a significant biblical event traditionally dated near this time. Keep it to 2-3 sentences. Be specific with dates and names. Do NOT make anything up — only share well-documented facts.`,
      }),
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setHistoricalFact(result);
        }
        sessionStorage.setItem('trace-fact-today', result);
      })
      .catch(() => null)
      .finally(() => setFactLoading(false));
  }, []);

  const savePrayers = (updated: PrayerItem[]) => {
    setPrayers(updated);
    localStorage.setItem('trace-prayers', JSON.stringify(updated));
  };

  const addPrayer = () => {
    if (!newPrayer.trim()) return;
    const item: PrayerItem = {
      id: crypto.randomUUID(),
      text: newPrayer.trim(),
      status: 'active',
      category: newPrayerCategory,
      createdAt: new Date().toISOString(),
    };
    savePrayers([item, ...prayers]);
    setNewPrayer('');
  };

  const markAnswered = (id: string) => {
    savePrayers(prayers.map(p => p.id === id ? {
      ...p,
      status: 'answered' as const,
      answered: true,
      answeredAt: new Date().toISOString(),
      answeredHow: answerHow || undefined,
      answeredReflection: answerReflection || undefined,
    } : p));
    setAnsweringId(null);
    setAnswerHow('');
    setAnswerReflection('');
  };

  const markOngoing = (id: string) => {
    savePrayers(prayers.map(p => p.id === id ? { ...p, status: 'ongoing' as const } : p));
  };

  const archivePrayer = (id: string) => {
    savePrayers(prayers.map(p => p.id === id ? { ...p, status: 'archived' as const } : p));
  };

  const removePrayer = (id: string) => {
    savePrayers(prayers.filter(p => p.id !== id));
  };

  // Compat: migrate old prayers that used boolean `answered`
  const migratedPrayers = prayers.map(p => ({
    ...p,
    status: p.status || (p.answered ? 'answered' as const : 'active' as const),
  }));
  const activePrayers = migratedPrayers.filter(p => p.status === 'active');
  const waitingPrayers = migratedPrayers.filter(p => p.status === 'ongoing' || p.status === 'waiting' as any);
  const answeredPrayers = migratedPrayers.filter(p => p.status === 'answered');
  const totalPrayers = migratedPrayers.filter(p => p.status !== 'archived').length;

  // Parse highlighted verse keys to readable format
  const parseVerseKey = (key: string) => {
    const parts = key.split('-');
    if (parts.length >= 3) {
      const book = BOOKS.find(b => b.osis === parts[0]);
      return book ? `${book.name} ${parts[1]}:${parts[2]}` : key;
    }
    return key;
  };

  return (
    <div className="space-y-4 pb-6">

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl"
          style={{ background: accentColor, color: '#0a1410', fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 13, fontWeight: 700, boxShadow: `0 8px 32px ${accentColor}44`, animation: 'fadeSlideDown 0.3s ease' }}>
          {toastMsg}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeSlideDown { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes glowSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes dotPulseGlow { 0%, 100% { opacity: 0.8; box-shadow: 0 0 8px ${accentColor}88, 0 0 16px ${accentColor}44; } 50% { opacity: 1; box-shadow: 0 0 12px ${accentColor}aa, 0 0 24px ${accentColor}66; } }
      ` }} />

      {/* ── Hero: Your Word Today ────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}06)`, border: `1px solid ${accentColor}22`, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div className="px-6 py-6">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
            <h2 className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Message of the Week</h2>
          </div>

          {/* Weekly identity declaration — expandable */}
          {identityStatement && (
            <div className="mb-4">
              <p className="text-lg font-black leading-snug" style={{ color: '#ffffff', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '-0.01em' }}>
                {cleanMarkdown(identityStatement)}
              </p>
              <button onClick={() => setShowIdentityExpand(v => !v)}
                className="mt-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: `${accentColor}88` }}>
                {showIdentityExpand ? '▲ Less' : '▼ What does this mean?'}
              </button>
              {showIdentityExpand && (
                <div className="mt-3 rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}15` }}>
                  {!identityExplain ? (
                    (() => {
                      // Fetch explanation
                      fetch('/api/altar/explain', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reference: 'Identity', verseText: identityStatement, translation: 'KJV',
                          question: `In 2-3 sentences, explain what it means that "${identityStatement}" according to Scripture. Give 2 supporting verse references. Be warm and personal. No markdown or asterisks.` }),
                      }).then(async r => {
                        const reader = r.body?.getReader(); if (!reader) return;
                        const d = new TextDecoder(); let t = '';
                        while (true) { const { done, value } = await reader.read(); if (done) break; t += d.decode(value, { stream: true }); setIdentityExplain(t); }
                      }).catch(() => setIdentityExplain('God declares this over you. Meditate on it today.'));
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                          <span className="text-xs" style={{ color: 'rgba(232,240,236,0.35)' }}>Reflecting…</span>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif' }}>
                      {cleanMarkdown(identityExplain)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Your Word Today label */}
          <div className="flex items-center gap-2 mt-5 mb-3" style={{ borderTop: `1px solid ${accentColor}15`, paddingTop: 16 }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, opacity: 0.7 }} />
            <h3 className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}99`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Your Word Today</h3>
          </div>

          {/* Daily verse */}
          {dailyVerse?.verses[0] ? (
            <>
              <p className="text-base leading-relaxed mb-2 italic" style={{ color: 'rgba(240,248,244,0.8)', fontFamily: 'Georgia, serif' }}>
                &ldquo;{dailyVerse.verses[0].text}&rdquo;
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-semibold" style={{ color: accentColor }}>{dailyVerse.reference}</p>
                {onStudyVerse && (
                  <button onClick={() => {
                    // Parse reference to get book and chapter
                    const ref = dailyVerse.reference;
                    const match = ref.match(/^(.+?)\s+(\d+)/);
                    if (match) onStudyVerse(match[1], parseInt(match[2]));
                  }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                    <img src="/star.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} /> Study This Verse
                  </button>
                )}
                <button
                  onClick={readVerseAloud}
                  disabled={verseAudioLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={versePlaying
                    ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }
                    : { background: `${accentColor}0d`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                  {verseAudioLoading ? (
                    <span className="inline-block w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                  ) : versePlaying ? '■' : '▶'}
                  {verseAudioLoading ? ' Loading…' : versePlaying ? ' Stop' : ' Read Aloud'}
                </button>
              </div>
            </>
          ) : (
            <div className="h-12 flex items-center">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            </div>
          )}

          {/* Divider + Devotional */}
          {(devotional || devotionalLoading) && (
            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${accentColor}15` }}>
              <div className="relative flex items-center justify-between mb-3" style={{ minHeight: 72 }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                    <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Today&apos;s Devotional</h2>
                  </div>
                  <p className="text-[10px] pl-3" style={{ color: 'rgba(232,240,236,0.3)' }}>{devotionalRef || 'Daily Word'}</p>
                </div>
                <img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.9, flexShrink: 0 }} />
              </div>
              {devotionalLoading && !devotional ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                  <span className="text-xs" style={{ color: 'rgba(232,240,236,0.35)' }}>Preparing your devotional…</span>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>
                    {cleanMarkdown(devotional)}
                    {devotionalLoading && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: accentColor, borderRadius: 1 }} />}
                  </p>
                  {!devotionalLoading && devotional && (
                    <button onClick={() => {
                      const key = `trace-devotional-done-${new Date().toDateString()}`;
                      localStorage.setItem(key, 'true');
                      const count = parseInt(localStorage.getItem('trace-devotional-count') || '0');
                      localStorage.setItem('trace-devotional-count', String(count + 1));
                      setDevotionalCompleted(true);
                      completeDailyCheck('devotional');
                    }}
                      disabled={devotionalCompleted}
                      className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={devotionalCompleted
                        ? { background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}22` }
                        : { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 8px ${accentColor}33` }}>
                      {devotionalCompleted ? '✓ Devotional Complete' : 'Mark as Read'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Checklist ──────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${accentColor}08` }}>
          <div className="flex items-center justify-between" style={{ minHeight: 72 }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Today&apos;s Walk</h2>
              </div>
              <p className="text-[10px] pl-3" style={{ color: checksCompleted === dailyItems.length ? '#22c55e' : `${accentColor}55` }}>
                {checksCompleted}/{dailyItems.length} complete
              </p>
            </div>
            <img src="/compass.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.9, flexShrink: 0 }} />
          </div>
        </div>
        <div className="px-3 py-2">
          {dailyItems.map(item => (
            <button key={item.id} onClick={() => toggleCheck(item.id)}
              className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all"
              style={dailyChecks[item.id] ? { background: `${accentColor}08` } : {}}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                style={dailyChecks[item.id]
                  ? { background: accentColor, boxShadow: `0 0 8px ${accentColor}33` }
                  : { border: `2px solid ${accentColor}33` }}>
                {dailyChecks[item.id] && <span className="text-[10px] text-white font-bold">✓</span>}
              </div>
              <span className="flex-1 text-xs" style={{ color: dailyChecks[item.id] ? 'rgba(232,240,236,0.4)' : 'rgba(232,240,236,0.7)', textDecoration: dailyChecks[item.id] ? 'line-through' : 'none' }}>
                {item.label}
              </span>
              {(item as any).img
                ? <img src={(item as any).img} alt="" style={{ width: 42, height: 42, objectFit: 'contain', opacity: dailyChecks[item.id] ? 0.25 : 0.92, flexShrink: 0 }} />
                : <span className="text-xl shrink-0">{item.icon}</span>
              }
            </button>
          ))}
        </div>
        {checksCompleted === dailyItems.length && (
          <div className="px-4 py-2 text-center" style={{ borderTop: `1px solid ${accentColor}08` }}>
            <p className="text-[10px] font-bold" style={{ color: '#22c55e' }}>🎉 All done today! God is pleased with your faithfulness.</p>
          </div>
        )}
      </div>

      <GlowDivider accentColor={accentColor} dot />

      {/* ── Daily Encounters — Sunrise to Sunset fade ─────────────────── */}
      <div className="relative flex items-center justify-between mb-2" style={{ minHeight: 72 }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
            <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Daily Encounters</h2>
          </div>
          <p className="text-[10px] pl-3" style={{ color: 'rgba(232,240,236,0.3)' }}>Morning &amp; Bedtime with God</p>
        </div>
        <img src="/star.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.9, flexShrink: 0 }} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes staticTwinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 0.6; } }
        @keyframes sunrisePulse { 0%,100% { opacity: 0.15; } 50% { opacity: 0.3; } }
        @keyframes shimmerSweep { 0% { left: -30%; opacity: 0; } 20% { opacity: 0.2; } 80% { opacity: 0.2; } 100% { left: 130%; opacity: 0; } }
      `}} />
      {/* Single card — sunrise fading to sunset */}
      <div className="rounded-2xl overflow-hidden relative -mt-1" style={{ border: '1px solid rgba(251,146,60,0.15)', minHeight: 130 }}>
        {/* Full gradient: warm sunrise left → sunset middle → night sky right */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #2d1f06 0%, #4a2c0a 20%, #3d1a2e 45%, #1a1040 65%, #0a0a20 100%)' }} />
        {/* Sun glow on left */}
        <div className="absolute pointer-events-none" style={{ left: '-5%', bottom: '-20%', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.2), transparent 65%)', animation: 'sunrisePulse 5s ease-in-out infinite' }} />
        {/* Horizon line */}
        <div className="absolute pointer-events-none" style={{ bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, rgba(251,191,36,0.2), rgba(251,146,60,0.15), rgba(244,114,182,0.1), rgba(129,140,248,0.08), transparent)' }} />
        {/* Shimmer sweep */}
        <div className="absolute pointer-events-none" style={{ top: 0, width: '20%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', animation: 'shimmerSweep 6s ease-in-out infinite', transform: 'skewX(-15deg)' }} />
        {/* Stars on the right side only */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{
              left: `${55 + ((i * 41 + 7) % 42)}%`,
              top: `${((i * 53 + 11) % 85) + 5}%`,
              width: i % 5 === 0 ? 1.8 : 1, height: i % 5 === 0 ? 1.8 : 1,
              background: ['#e2e8f0', '#c4b5fd', '#93c5fd'][i % 3],
              animation: `staticTwinkle ${2 + (i % 4)}s ease-in-out ${i * 0.3}s infinite`,
            }} />
        ))}
        {/* Moon on far right */}
        <div className="absolute rounded-full pointer-events-none" style={{ top: 12, right: '8%', width: 12, height: 12, background: 'rgba(226,232,240,0.12)', boxShadow: '0 0 10px rgba(226,232,240,0.08)' }} />

        {/* Two tap zones side by side */}
        <div className="relative z-10 flex">
          <button onClick={onOpenMorningEncounter} className="flex-1 py-4 flex flex-col items-center text-center gap-2 transition-all group">
            <img src="/sun.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain', mixBlendMode: 'screen', transition: 'transform 0.2s' }} className="group-hover:scale-110" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#fbbf24', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Morning</p>
              <p className="text-[8px] mt-0.5" style={{ color: 'rgba(251,191,36,0.45)' }}>Start grounded</p>
            </div>
          </button>
          {/* Subtle center divider */}
          <div className="w-px self-stretch my-4" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          <button onClick={onOpenBedtimeEncounter} className="flex-1 py-4 flex flex-col items-center text-center gap-2 transition-all group">
            <img src="/moon.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: '50%', filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))', transition: 'transform 0.2s' }} className="group-hover:scale-110" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#818cf8', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Bedtime</p>
              <p className="text-[8px] mt-0.5" style={{ color: 'rgba(129,140,248,0.45)' }}>Rest in His Word</p>
            </div>
          </button>
        </div>
      </div>

      <GlowDivider accentColor={accentColor} dot />

      {/* ── Prayer Journal (Stepped Flow) ──────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <img src="/prayer journal.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.25, pointerEvents: 'none', zIndex: 0 }} />
        <div className="px-5 pt-5 pb-4" style={{ position: 'relative', zIndex: 1 }}>

          {/* ── Header ── */}
          <div className="relative flex items-center justify-between mb-4" style={{ minHeight: 72 }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Prayer Journal</h2>
              </div>
              <div className="flex items-center gap-2 pl-3">
                {activePrayers.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#22c55e18', color: '#22c55e' }}>{activePrayers.length} active</span>}
                {answeredPrayers.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#a855f718', color: '#a855f7' }}>{answeredPrayers.length} answered ✓</span>}
              </div>
            </div>
            <img src="/Praying hands.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.95, flexShrink: 0 }} />
          </div>

          {/* ── Step 1: "Do you need to pray?" button ── */}
          {!showPrayerForm && !showVoicePrayer ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setShowPrayerForm(true)}
                className="rounded-xl transition-all overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(202,138,4,0.55), rgba(120,70,0,0.45))', border: '1px solid rgba(234,179,8,0.4)', boxShadow: '0 2px 12px rgba(202,138,4,0.2), 0 0 0 1px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.7)', position: 'relative', minHeight: 90, display: 'flex', alignItems: 'flex-end', padding: '12px 14px' }}>
                <img src="/quill 2.png" alt="" style={{ position: 'absolute', left: 8, bottom: 10, width: 52, height: 52, objectFit: 'contain', opacity: 0.95 }} />
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', marginLeft: 'auto' }}>
                  <p className="text-sm font-bold" style={{ color: '#fde68a', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Write</p>
                  <p className="text-[9px]" style={{ color: 'rgba(253,230,138,0.6)' }}>Type your prayer</p>
                </div>
              </button>
              <button onClick={() => setShowVoicePrayer(true)}
                className="rounded-xl transition-all overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(120,70,30,0.6), rgba(80,40,10,0.5))', border: '1px solid rgba(180,110,40,0.4)', boxShadow: '0 2px 12px rgba(120,70,30,0.25), 0 0 0 1px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.7)', position: 'relative', minHeight: 90, display: 'flex', alignItems: 'flex-end', padding: '12px 14px' }}>
                <img src="/microphone final.png" alt="" style={{ position: 'absolute', left: 8, bottom: 10, width: 52, height: 52, objectFit: 'contain', opacity: 0.95 }} />
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', marginLeft: 'auto' }}>
                  <p className="text-sm font-bold" style={{ color: '#fcd9a0', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Aloud</p>
                  <p className="text-[9px]" style={{ color: 'rgba(252,217,160,0.55)' }}>Speak your prayer</p>
                </div>
              </button>
            </div>
          ) : showVoicePrayer ? (
            /* ── Voice Prayer ── */
            <div className="mb-4">
              <VoicePrayer
                accentColor={accentColor}
                onComplete={(text) => {
                  const item: PrayerItem = { id: crypto.randomUUID(), text, status: 'active', category: 'Personal', createdAt: new Date().toISOString() };
                  savePrayers([item, ...prayers]);
                  setShowVoicePrayer(false);
                  completeDailyCheck('prayer');
                }}
                onClose={() => setShowVoicePrayer(false)}
              />
            </div>
          ) : (
            /* ── Step 2 & 3: Select type → Write prayer ── */
            <div className="mb-4 rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}22` }}>
              {!newPrayerCategory ? (
                /* Step 2: Select prayer type */
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: accentColor }}>What kind of prayer is this?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRAYER_CATEGORIES.map(cat => {
                      const icons: Record<string, string> = { Personal: '👤', Family: '👨‍👩‍👧', Others: '🤝', Church: '⛪', World: '🌍', Gratitude: '🙏', Guidance: '🧭', Confession: '💔' };
                      return (
                        <button key={cat} onClick={() => setNewPrayerCategory(cat)}
                          className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="text-base">{icons[cat] || '🙏'}</span>
                          <span className="text-xs font-semibold" style={{ color: 'rgba(232,240,236,0.7)' }}>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setShowPrayerForm(false)}
                    className="w-full mt-3 text-xs py-2" style={{ color: 'rgba(232,240,236,0.3)' }}>Cancel</button>
                </div>
              ) : (
                /* Step 3: Write prayer */
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setNewPrayerCategory('')}
                        className="text-xs" style={{ color: `${accentColor}66` }}>← Back</button>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${accentColor}22`, color: accentColor }}>{newPrayerCategory}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                      value={newPrayer}
                      onChange={e => setNewPrayer(e.target.value)}
                      autoFocus
                      placeholder="Pour out your heart to God…"
                      className="flex-1 rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-20"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}15`, color: '#f0f8f4', fontFamily: 'Georgia, serif', lineHeight: '1.7' }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <VoiceInput accentColor={accentColor} onResult={(text) => setNewPrayer(prev => prev ? prev + ' ' + text : text)} />
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPrayerForm(false); setNewPrayerCategory(''); setNewPrayer(''); }}
                        className="px-3 py-2 rounded-lg text-xs" style={{ color: 'rgba(232,240,236,0.4)' }}>Cancel</button>
                      <button onClick={() => { addPrayer(); setShowPrayerForm(false); setNewPrayerCategory(''); completeDailyCheck('prayer'); }}
                        disabled={!newPrayer.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-30"
                        style={{ background: accentColor, color: '#0a1410' }}>
                        Pray 🙏
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab filter ── */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {([
              { key: 'active' as const, label: 'Active', count: activePrayers.length },
              { key: 'waiting' as const, label: 'Waiting', count: waitingPrayers.length },
              { key: 'answered' as const, label: 'Answered', count: answeredPrayers.length },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setPrayerFilter(tab.key)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                style={prayerFilter === tab.key ? { background: `${accentColor}22`, color: accentColor } : { color: 'rgba(232,240,236,0.35)' }}>
                {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          {/* ── Prayer cards ── */}
          <div className="space-y-3">
            {(() => {
              const filtered =
                prayerFilter === 'active' ? activePrayers :
                prayerFilter === 'waiting' ? waitingPrayers :
                answeredPrayers;

              if (filtered.length === 0) {
                return (
                  <p className="text-xs text-center py-6" style={{ color: 'rgba(232,240,236,0.25)' }}>
                    {prayerFilter === 'active' && prayers.length === 0
                      ? 'Bring your first prayer request to God above'
                      : `No ${prayerFilter} prayers`}
                  </p>
                );
              }

              return filtered.map(p => {
                const statusColor =
                  p.status === 'answered' ? '#a855f7' :
                  (p.status === 'ongoing' || p.status === ('waiting' as any)) ? '#f59e0b' :
                  '#22c55e';

                const categoryColors: Record<string, string> = {
                  Personal: '#60a5fa', Family: '#f472b6', Others: '#34d399',
                  Church: '#fbbf24', World: '#06b6d4', Gratitude: '#2dd4bf',
                  Guidance: '#a78bfa', Confession: '#f87171',
                };
                const catColor = categoryColors[p.category || 'Other'] || '#94a3b8';

                return (
                  <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 0 1px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.6)' }}>
                    <div className="flex">
                      {/* Left color bar */}
                      <div className="w-1 shrink-0" style={{ background: statusColor }} />

                      <div className="flex-1 px-4 py-3">
                        {/* Top row: category badge + date */}
                        <div className="flex items-center justify-between mb-2">
                          {p.category && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${catColor}18`, color: catColor }}
                            >
                              {p.category}
                            </span>
                          )}
                          {!p.category && <span />}
                          <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>
                            {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Prayer text */}
                        <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif' }}>
                          {p.text}
                        </p>

                        {/* Answered details */}
                        {p.status === 'answered' && (
                          <div className="mb-3 rounded-lg p-3" style={{ background: '#a855f70a' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span style={{ color: '#22c55e' }}>&#10003;</span>
                              <span className="text-[11px] font-semibold" style={{ color: '#a855f7' }}>Answered</span>
                              {p.answeredAt && (
                                <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>
                                  &middot; {new Date(p.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {p.answeredHow && (
                              <p className="text-[11px] mt-1" style={{ color: 'rgba(232,240,236,0.5)' }}>
                                <span className="font-semibold" style={{ color: `${accentColor}88` }}>How:</span> {p.answeredHow}
                              </p>
                            )}
                            {p.answeredReflection && (
                              <p className="text-[11px] mt-1.5 italic leading-relaxed" style={{ color: 'rgba(232,240,236,0.45)', fontFamily: 'Georgia, serif' }}>
                                &ldquo;{p.answeredReflection}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        {/* Answering flow — expanded inline */}
                        {answeringId === p.id && (
                          <div className="space-y-2 rounded-xl p-3 mb-3" style={{ background: `${accentColor}0a`, border: `1px solid ${accentColor}18` }}>
                            <p className="text-xs font-bold" style={{ color: accentColor }}>How was this prayer answered?</p>
                            <select
                              value={answerHow}
                              onChange={e => setAnswerHow(e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                              style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }}
                            >
                              <option value="" style={{ background: '#0a1410' }}>Select&hellip;</option>
                              <option value="Immediately" style={{ background: '#0a1410' }}>Immediately</option>
                              <option value="Gradually" style={{ background: '#0a1410' }}>Gradually over time</option>
                              <option value="Unexpectedly" style={{ background: '#0a1410' }}>In an unexpected way</option>
                              <option value="Differently" style={{ background: '#0a1410' }}>Different than expected</option>
                              <option value="Partially" style={{ background: '#0a1410' }}>Partially</option>
                            </select>
                            <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                              value={answerReflection}
                              onChange={e => setAnswerReflection(e.target.value)}
                              placeholder="What did God teach you through this? (optional)"
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none min-h-16"
                              style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setAnsweringId(null); setAnswerHow(''); setAnswerReflection(''); }}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ color: 'rgba(232,240,236,0.4)' }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => markAnswered(p.id)}
                                className="text-xs px-4 py-1.5 rounded-lg font-bold"
                                style={{ background: accentColor, color: '#0a1410' }}
                              >
                                Mark Answered
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          {p.status === 'active' && (
                            <button
                              onClick={() => markOngoing(p.id)}
                              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
                              style={{ color: '#f59e0b', background: '#f59e0b0d' }}
                            >
                              🕐 Waiting
                            </button>
                          )}
                          {(p.status === 'active' || p.status === 'ongoing') && answeringId !== p.id && (
                            <button
                              onClick={() => { setAnsweringId(p.id); setAnswerHow(''); setAnswerReflection(''); }}
                              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
                              style={{ color: '#a855f7', background: '#a855f70d' }}
                            >
                              &#x1F338; Answered
                            </button>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => { if (window.confirm('Are you sure you want to delete this prayer?')) removePrayer(p.id); }}
                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
                            style={{ color: '#ef4444', background: '#ef44440d' }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

        </div>
      </div>

      <GlowDivider accentColor={accentColor} dot />

      {/* ── Bible Journey + Milestones ─────────────────────────────────── */}
      {(() => {
        const TOTAL_CHAPTERS = 1189;
        const chaptersWithNotes = Object.keys(notes).filter(k => notes[k]?.trim()).length;
        const chaptersHighlighted = new Set([...highlighted].map(k => { const p = k.split('-'); return `${p[0]}-${p[1]}`; })).size;
        const chaptersStudied = Math.max(chaptersWithNotes, chaptersHighlighted);
        const progressPct = Math.round((chaptersStudied / TOTAL_CHAPTERS) * 100 * 10) / 10;

        // Milestone definitions with badges + progress tracking
        const milestones = [
          { id: 'gospel',       cat: 'Foundation',   badge: '✝',  label: 'The Foundation',     desc: 'Hear the Gospel and respond.',     check: gospelCompleted, current: gospelCompleted ? 1 : 0, target: 1 },
          { id: 'devotional-1', cat: 'Foundation',   badge: '📖', label: 'First Devotional',   desc: 'Complete your first devotional.',                      check: devotionalsDone >= 1, current: Math.min(devotionalsDone, 1), target: 1 },
          { id: 'devotional-7', cat: 'Foundation',   badge: '📚', label: 'Week of the Word',   desc: '7 devotionals completed.',       check: devotionalsDone >= 7, current: Math.min(devotionalsDone, 7), target: 7 },
          { id: 'devotional-30',cat: 'Foundation',   badge: '🏆', label: 'Devoted Reader',     desc: '30 devotionals completed.',       check: devotionalsDone >= 30, current: Math.min(devotionalsDone, 30), target: 30 },
          { id: 'streak-3',     cat: 'Consistency',  badge: '🔥', label: 'Kindling',           desc: '3-day reading streak.',                        check: streak >= 3, current: Math.min(streak, 3), target: 3 },
          { id: 'streak-7',     cat: 'Consistency',  badge: '🔥', label: 'On Fire',            desc: '7-day reading streak.',                     check: streak >= 7, current: Math.min(streak, 7), target: 7 },
          { id: 'streak-30',    cat: 'Consistency',  badge: '⚡', label: 'Unshakeable',        desc: '30-day reading streak.',                 check: streak >= 30, current: Math.min(streak, 30), target: 30 },
          { id: 'notes-5',      cat: 'Study',        badge: '✍', label: 'First Reflections',   desc: 'Notes on 5 chapters.',            check: chaptersWithNotes >= 5, current: Math.min(chaptersWithNotes, 5), target: 5 },
          { id: 'notes-25',     cat: 'Study',        badge: '📝', label: 'Student of the Word', desc: '25 chapters with notes.',                check: chaptersWithNotes >= 25, current: Math.min(chaptersWithNotes, 25), target: 25 },
          { id: 'notes-100',    cat: 'Study',        badge: '🎓', label: 'Scholar',            desc: '100 chapters with notes.',              check: chaptersWithNotes >= 100, current: Math.min(chaptersWithNotes, 100), target: 100 },
          // Scripture — expanded
          { id: 'highlights-1', cat: 'Scripture',    badge: '✨', label: 'First Highlight',      desc: 'Save your first verse.',                   check: highlightCount >= 1, current: Math.min(highlightCount, 1), target: 1 },
          { id: 'highlights-10',cat: 'Scripture',    badge: '💎', label: 'Collector',            desc: '10 highlighted verses.',                   check: highlightCount >= 10, current: Math.min(highlightCount, 10), target: 10 },
          { id: 'highlights-25',cat: 'Scripture',    badge: '💫', label: 'Gem Finder',           desc: '25 highlighted verses.',                   check: highlightCount >= 25, current: Math.min(highlightCount, 25), target: 25 },
          { id: 'highlights-50',cat: 'Scripture',    badge: '👑', label: 'Treasure Hunter',      desc: '50 highlighted verses.',                   check: highlightCount >= 50, current: Math.min(highlightCount, 50), target: 50 },
          { id: 'highlights-100',cat:'Scripture',    badge: '🏅', label: 'Scripture Vault',      desc: '100 verses saved.',                        check: highlightCount >= 100, current: Math.min(highlightCount, 100), target: 100 },
          { id: 'chapters-1',  cat: 'Scripture',     badge: '📗', label: 'First Chapter',        desc: 'Read your first chapter.',                 check: chaptersStudied >= 1, current: Math.min(chaptersStudied, 1), target: 1 },
          { id: 'chapters-10', cat: 'Scripture',     badge: '🗺', label: 'Explorer',             desc: '10 chapters engaged.',                     check: chaptersStudied >= 10, current: Math.min(chaptersStudied, 10), target: 10 },
          { id: 'chapters-30', cat: 'Scripture',     badge: '📘', label: 'Deep Reader',          desc: '30 chapters read.',                        check: chaptersStudied >= 30, current: Math.min(chaptersStudied, 30), target: 30 },
          { id: 'chapters-66', cat: 'Scripture',     badge: '📜', label: 'Every Book',           desc: '66 chapters — one per book.',              check: chaptersStudied >= 66, current: Math.min(chaptersStudied, 66), target: 66 },
          { id: 'chapters-200',cat: 'Scripture',     badge: '🏛', label: 'Temple Builder',       desc: '200 chapters studied.',                    check: chaptersStudied >= 200, current: Math.min(chaptersStudied, 200), target: 200 },
          { id: 'chapters-500',cat: 'Scripture',     badge: '⭐', label: 'Half the Bible',       desc: '500 chapters — almost halfway.',            check: chaptersStudied >= 500, current: Math.min(chaptersStudied, 500), target: 500 },
          { id: 'chapters-1189',cat:'Scripture',     badge: '🌟', label: 'The Whole Word',       desc: 'Every chapter in the Bible.',              check: chaptersStudied >= 1189, current: Math.min(chaptersStudied, 1189), target: 1189 },
          // Prayer — expanded
          { id: 'prayer-1',     cat: 'Prayer',       badge: '🙏', label: 'First Prayer',        desc: 'Write your first prayer.',                  check: totalPrayers >= 1, current: Math.min(totalPrayers, 1), target: 1 },
          { id: 'prayer-5',     cat: 'Prayer',       badge: '📿', label: 'Prayer Life',         desc: '5 prayers written.',                        check: totalPrayers >= 5, current: Math.min(totalPrayers, 5), target: 5 },
          { id: 'prayer-10',    cat: 'Prayer',       badge: '🕊', label: 'Faithful Asker',      desc: '10 prayers written.',                       check: totalPrayers >= 10, current: Math.min(totalPrayers, 10), target: 10 },
          { id: 'prayer-25',    cat: 'Prayer',       badge: '🔥', label: 'Prayer Warrior',      desc: '25 prayers written.',                       check: totalPrayers >= 25, current: Math.min(totalPrayers, 25), target: 25 },
          { id: 'prayer-50',    cat: 'Prayer',       badge: '⚔️', label: 'Intercessor',         desc: '50 prayers. Standing in the gap.',          check: totalPrayers >= 50, current: Math.min(totalPrayers, 50), target: 50 },
          { id: 'prayer-100',   cat: 'Prayer',       badge: '👼', label: 'Prayer Legend',        desc: '100 prayers lifted to God.',                check: totalPrayers >= 100, current: Math.min(totalPrayers, 100), target: 100 },
          { id: 'answered-1',   cat: 'Prayer',       badge: '🌸', label: 'First Testimony',     desc: '1 answered prayer.',                        check: answeredPrayers.length >= 1, current: Math.min(answeredPrayers.length, 1), target: 1 },
          { id: 'answered-5',   cat: 'Prayer',       badge: '🌻', label: 'Testimony Builder',   desc: '5 answered prayers.',                       check: answeredPrayers.length >= 5, current: Math.min(answeredPrayers.length, 5), target: 5 },
          { id: 'answered-10',  cat: 'Prayer',       badge: '🌳', label: 'Faithful Witness',    desc: '10 answered prayers.',                      check: answeredPrayers.length >= 10, current: Math.min(answeredPrayers.length, 10), target: 10 },
          { id: 'answered-25',  cat: 'Prayer',       badge: '🏆', label: 'God Is Faithful',     desc: '25 answered prayers.',                      check: answeredPrayers.length >= 25, current: Math.min(answeredPrayers.length, 25), target: 25 },
          // Application — expanded
          { id: 'encounter-1',  cat: 'Application',  badge: '☀️', label: 'First Encounter',     desc: '1 Daily Encounter.',                        check: fireSessions >= 1, current: Math.min(fireSessions, 1), target: 1 },
          { id: 'encounter-7',  cat: 'Application',  badge: '🌅', label: 'Devoted',             desc: '7 Daily Encounters.',                       check: fireSessions >= 7, current: Math.min(fireSessions, 7), target: 7 },
          { id: 'encounter-21', cat: 'Application',  badge: '⚡', label: 'Habit Formed',        desc: '21 encounters. It\'s a habit now.',          check: fireSessions >= 21, current: Math.min(fireSessions, 21), target: 21 },
          { id: 'encounter-50', cat: 'Application',  badge: '🌟', label: 'Transformed',         desc: '50 encounters with God.',                   check: fireSessions >= 50, current: Math.min(fireSessions, 50), target: 50 },
        ];

        const unlocked = milestones.filter(m => m.check);
        // One next milestone per category
        const allCategories = ['Foundation', 'Consistency', 'Study', 'Scripture', 'Prayer', 'Application'];
        const nextMilestones = allCategories
          .map(cat => milestones.find(m => m.cat === cat && !m.check))
          .filter(Boolean) as typeof milestones;

        // Spiritual health — graded on active days out of last 30
        // Miss 1 day from a 30-day streak = 29/30 = still A+
        // Gradually drifts down as you go quiet. No brutal one-day resets.

        function activeDaysInLast30(checkKey: string): number {
          let count = 0;
          for (let i = 0; i < 30; i++) {
            try {
              const d = new Date(); d.setDate(d.getDate() - i);
              const raw = localStorage.getItem(`trace-daily-checks-${d.toDateString()}`);
              const checks: Record<string, boolean> = raw ? JSON.parse(raw) : {};
              if (checks[checkKey]) count++;
            } catch {}
          }
          return count;
        }

        // For Consistency, count any day with at least one check done
        function anyActiveDaysInLast30(): number {
          let count = 0;
          for (let i = 0; i < 30; i++) {
            try {
              const d = new Date(); d.setDate(d.getDate() - i);
              const raw = localStorage.getItem(`trace-daily-checks-${d.toDateString()}`);
              const checks: Record<string, boolean> = raw ? JSON.parse(raw) : {};
              if (Object.values(checks).some(Boolean)) count++;
            } catch {}
          }
          return count;
        }

        // Grade scale: days active out of 30
        // A+: 27–30 (90%+)  A: 22–26 (75%+)  B: 18–21 (60%+)
        // C:  12–17 (40%+)  D: 6–11  (20%+)  F: 0–5   (<20%)
        function consistencyGrade(activeDays: number): { grade: string; gpaPoints: number; score: number } {
          const grade = activeDays >= 27 ? 'A+' : activeDays >= 22 ? 'A' : activeDays >= 18 ? 'B' : activeDays >= 12 ? 'C' : activeDays >= 6 ? 'D' : 'F';
          const gpaPoints = grade === 'A+' ? 4.3 : grade === 'A' ? 4.0 : grade === 'B' ? 3.0 : grade === 'C' ? 2.0 : grade === 'D' ? 1.0 : 0;
          const score = Math.round((activeDays / 30) * 100);
          return { grade, gpaPoints, score };
        }

        const catActiveDays = {
          Foundation:   activeDaysInLast30('devotional'),
          Consistency:  anyActiveDaysInLast30(),
          Study:        activeDaysInLast30('devotional'),
          Scripture:    activeDaysInLast30('scripture'),
          Prayer:       activeDaysInLast30('prayer'),
          Application:  activeDaysInLast30('apply'),
        };

        const catScores = (Object.entries(catActiveDays) as [string, number][]).map(([cat, days]) => ({
          cat, days, ...consistencyGrade(days),
        }));
        const gpa = Math.round((catScores.reduce((sum, c) => sum + c.gpaPoints, 0) / catScores.length) * 10) / 10;
        const gpaLabel = gpa >= 4.0 ? 'Excellent' : gpa >= 3.0 ? 'Strong' : gpa >= 2.0 ? 'Growing' : gpa >= 1.0 ? 'Building' : 'New';
        const strongest = catScores.reduce((a, b) => b.gpaPoints > a.gpaPoints ? b : a);
        const weakest   = catScores.reduce((a, b) => b.gpaPoints < a.gpaPoints ? b : a);

        const catColors: Record<string, string> = { Foundation: '#60a5fa', Consistency: '#fb923c', Study: '#a855f7', Scripture: '#22c55e', Prayer: '#f472b6', Application: '#06b6d4' };
        const catIcons: Record<string, { img?: string; emoji: string }> = {
          Foundation:  { emoji: '✝' },
          Consistency: { emoji: '🔥' },
          Study:       { img: '/read book.png', emoji: '📖' },
          Scripture:   { img: '/star.png', emoji: '✦' },
          Prayer:      { img: '/Praying hands.png', emoji: '🙏' },
          Application: { img: '/sun.png', emoji: '☀️' },
        };
        function renderCatIcon(icon: { img?: string; emoji: string }, size = 26) {
          return icon.img ? <img src={icon.img} alt="" style={{ width: size, height: size, objectFit: 'contain' }} /> : <span style={{ fontSize: size * 0.85 }}>{icon.emoji}</span>;
        }
        function gradeColor(grade: string, catColor?: string) {
          if (grade === 'A+' || grade === 'A') return '#22c55e';
          if (grade === 'B') return '#60a5fa';
          if (grade === 'C') return '#fbbf24';
          if (grade === 'D') return '#fb923c';
          // F: use category color at lower opacity so it's distinct but not all the same red
          return catColor ? catColor : '#ef4444';
        }
        const overallGrade = gpa >= 4.0 ? 'A+' : gpa >= 3.5 ? 'A' : gpa >= 3.0 ? 'B' : gpa >= 2.0 ? 'C' : gpa >= 1.0 ? 'D' : 'F';
        const overallGradeColor = gradeColor(overallGrade);
        function badgeImg(badge: string): string | null {
          if (['📖','📚','📗','📘','📜'].includes(badge)) return '/read book.png';
          if (badge === '🙏') return '/Praying hands.png';
          if (badge === '☀️') return '/sun.png';
          return null;
        }
        function renderBadge(badge: string, size = 28) {
          const src = badgeImg(badge);
          return src ? <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain' }} /> : <span style={{ fontSize: size }}>{badge}</span>;
        }

        const journeyImgs = ['/bilbe journey pic 1.png', '/bible journey pic 2.png', '/bible journy pic 3.png'];
        return (
          <div className="rounded-2xl overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.75)', border: `1px solid ${accentColor}20`, boxShadow: `0 8px 32px rgba(0,0,0,0.6)` }}>
            {/* Crossfading background images */}
            {journeyImgs.map((src, i) => (
              <img key={src} src={src} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                opacity: i === journeyIdx ? 0.38 : 0,
                transition: 'opacity 2s ease-in-out',
                pointerEvents: 'none',
              }} />
            ))}
            {/* Dark overlay to keep text readable */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)', zIndex: 1 }} />
            {/* Sweep glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
              <style>{`@keyframes journeyGlow { 0%,100% { transform: translateX(-120%); } 50% { transform: translateX(280%); } }`}</style>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(200,220,255,0.06), transparent)', animation: 'journeyGlow 10s ease-in-out infinite' }} />
            </div>
            {/* Ambient glow */}
            <div className="absolute pointer-events-none" style={{ zIndex: 1, top: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}08, transparent 70%)` }} />

            {/* Header with big progress ring */}
            <div className="px-5 pt-5 pb-4" style={{ position: 'relative', zIndex: 2 }}>
              <div className="flex items-center justify-between mb-5" style={{ minHeight: 72 }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                    <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>My Bible Journey</h2>
                  </div>
                  <p className="text-[10px] pl-3" style={{ color: 'rgba(232,240,236,0.35)' }} suppressHydrationWarning>
                    {chaptersStudied} of {TOTAL_CHAPTERS} chapters · {unlocked.length} trophies
                  </p>
                </div>
                {/* Circular progress — right side, same position as praying hands */}
                <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke={`${accentColor}18`} strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${progressPct * 0.94} ${94 - progressPct * 0.94}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-black leading-none" style={{ color: accentColor }}>{progressPct}%</span>
                    <span className="text-[8px] mt-0.5" style={{ color: `${accentColor}66` }}>complete</span>
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { val: streak, label: 'Day Streak', desc: `${streak === 1 ? 'Keep going!' : streak < 7 ? 'Building momentum' : 'On fire!'}`, icon: '🔥', color: '#fbbf24' },
                  { val: highlightCount, label: 'Saved Verses', desc: `${highlightCount === 0 ? 'Tap verses to save' : highlightCount < 10 ? 'Growing collection' : 'Rich in the Word'}`, icon: 'star', color: '#a855f7' },
                  { val: chaptersStudied, label: 'Chapters Read', desc: `${TOTAL_CHAPTERS - chaptersStudied} remaining`, icon: 'read-book', color: '#22c55e' },
                  { val: chaptersWithNotes, label: 'Study Notes', desc: `${chaptersWithNotes === 0 ? 'Start writing' : chaptersWithNotes < 10 ? 'Keep studying' : 'Deep roots'}`, icon: 'read-book', color: '#60a5fa' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3.5 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.88), rgba(0,0,0,0.78))`, border: `1px solid ${s.color}44`, boxShadow: `0 2px 12px rgba(0,0,0,0.5)` }}>
                    <div className="absolute -top-2 -right-2 pointer-events-none select-none" style={{ opacity: 0.06 }}>{s.icon === 'star' ? <img src="/star.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : s.icon === 'read-book' ? <img src="/read book.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : <span className="text-4xl">{s.icon}</span>}</div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        {s.icon === 'star' ? <img src="/star.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : s.icon === 'read-book' ? <img src="/read book.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : <span className="text-2xl">{s.icon}</span>}
                        <p className="text-2xl font-black" style={{ color: '#fff' }}>{s.val}</p>
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'rgba(232,240,236,0.35)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quiz Performance */}
              {(() => {
                try {
                  const results = quizResults;
                  if (results.length === 0) return null;
                  const totalCorrect = results.reduce((s, r) => s + r.score, 0);
                  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
                  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                  const grade = overallPct >= 90 ? 'A' : overallPct >= 80 ? 'B' : overallPct >= 70 ? 'C' : overallPct >= 60 ? 'D' : 'F';
                  const gradeColor = overallPct >= 90 ? '#22c55e' : overallPct >= 80 ? '#60a5fa' : overallPct >= 70 ? '#fbbf24' : overallPct >= 60 ? '#fb923c' : '#ef4444';
                  const recent = results.slice(-5).reverse();
                  const perfectCount = results.filter(r => r.score === r.total).length;

                  return (
                    <div className="rounded-2xl p-4 mb-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${gradeColor}0c, ${gradeColor}04)`, border: `1px solid ${gradeColor}1a` }}>
                      <div className="absolute -top-3 -right-3 text-6xl pointer-events-none select-none" style={{ opacity: 0.04 }}>🧠</div>
                      <div className="flex items-center gap-4 mb-3">
                        {/* Grade circle */}
                        <div className="relative w-14 h-14 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke={`${gradeColor}15`} strokeWidth="3" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke={gradeColor} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${overallPct * 0.94} ${94 - overallPct * 0.94}`} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-black" style={{ color: gradeColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{grade}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Quiz Grade</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.35)' }}>
                            {totalCorrect}/{totalQuestions} correct · {results.length} quizzes · {perfectCount} perfect
                          </p>
                        </div>
                      </div>
                      {/* Recent results */}
                      <div className="flex gap-1.5">
                        {recent.map((r, i) => {
                          const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                          const c = pct >= 80 ? '#22c55e' : pct >= 60 ? '#fbbf24' : '#ef4444';
                          return (
                            <div key={i} className="flex-1 rounded-lg p-2 text-center" style={{ background: `${c}0c`, border: `1px solid ${c}15` }}>
                              <p className="text-xs font-black" style={{ color: c }}>{r.score}/{r.total}</p>
                              <p className="text-[8px] mt-0.5 truncate" style={{ color: 'rgba(232,240,236,0.3)' }}>{r.book} {r.chapter}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              <GlowDivider accentColor={accentColor} />

              {/* Spiritual Health */}
              <div className="mb-4">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                  <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Spiritual Health</h2>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span suppressHydrationWarning className="text-lg font-black" style={{ color: overallGradeColor, fontFamily: 'Montserrat, system-ui, sans-serif', textShadow: `0 0 16px ${overallGradeColor}88` }}>{overallGrade}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${overallGradeColor}18`, color: `${overallGradeColor}66` }}>Overall</span>
                  </div>
                </div>

                {/* 3-col grade cards */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {catScores.map(c => {
                    const color = catColors[c.cat] || accentColor;
                    const icon = catIcons[c.cat] || { emoji: '•' };
                    const gc = gradeColor(c.grade, color);
                    const isExpanded = expandedHealthCat === c.cat;
                    return (
                      <button key={c.cat}
                        onClick={() => setExpandedHealthCat(isExpanded ? null : c.cat)}
                        className="rounded-xl relative overflow-hidden transition-all active:scale-95 text-center"
                        style={{
                          background: 'linear-gradient(160deg, rgba(3,3,8,0.98), rgba(7,5,14,0.96))',
                          border: `1px solid ${isExpanded ? color + '70' : color + '38'}`,
                          boxShadow: isExpanded
                            ? `0 0 20px ${gc}30, 0 0 0 1px rgba(0,0,0,0.95), inset 0 1px 0 ${color}14`
                            : `0 2px 14px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.95)`,
                          padding: '12px 6px 10px 6px',
                        }}>
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-1.5">
                          {renderCatIcon(icon, 22)}
                        </div>
                        {/* BIG GRADE */}
                        <p suppressHydrationWarning className="font-black leading-none mb-1.5" style={{
                          fontSize: c.grade === 'A+' ? 26 : 30,
                          color: gc,
                          fontFamily: 'Montserrat, system-ui, sans-serif',
                          textShadow: `0 0 20px ${gc}88, 0 0 40px ${gc}33`,
                        }}>{c.grade}</p>
                        {/* Category name */}
                        <p suppressHydrationWarning className="text-[8px] font-black uppercase tracking-wide mb-2" style={{ color: `${color}99`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{c.cat}</p>
                        {/* Progress bar */}
                        <div className="rounded-full overflow-hidden mx-1 mb-1" style={{ height: 3, background: `${color}18` }}>
                          <div suppressHydrationWarning className="h-full rounded-full" style={{ width: `${Math.max((c.days / 30) * 100, 4)}%`, background: `linear-gradient(90deg, ${gc}55, ${gc})` }} />
                        </div>
                        <p suppressHydrationWarning className="text-[8px]" style={{ color: 'rgba(232,240,236,0.2)' }}>{c.days}/30d</p>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded detail panel */}
                {expandedHealthCat && (() => {
                  const catDetails: Record<string, { desc: string; tip: string }> = {
                    Foundation:  { desc: 'Tracks daily devotional completions over the last 30 days.', tip: 'Open a devotional each day and read it through fully.' },
                    Consistency: { desc: 'Tracks any day you open and engage with the app.', tip: 'Even 5 minutes a day counts — just show up daily.' },
                    Study:       { desc: 'Tracks how often you engage with devotional study content.', tip: 'Read the full devotional and reflect before moving on.' },
                    Scripture:   { desc: 'Tracks days you read Scripture in the Read tab.', tip: 'Open a chapter in the Read tab at least once a day.' },
                    Prayer:      { desc: 'Tracks days you engage with the prayer section.', tip: 'Add a prayer request or check in with your prayer list daily.' },
                    Application: { desc: 'Tracks days you mark the Apply check — putting the Word into practice.', tip: 'After reading, ask: "How does this apply to my life today?" and mark it done.' },
                  };
                  const c = catScores.find(x => x.cat === expandedHealthCat);
                  if (!c) return null;
                  const color = catColors[c.cat] || accentColor;
                  const icon = catIcons[c.cat] || { emoji: '•' };
                  const detail = catDetails[c.cat];
                  const gc = gradeColor(c.grade, color);
                  const isF = c.grade === 'F';
                  const nextGrade = c.grade === 'F' ? 'D' : c.grade === 'D' ? 'C' : c.grade === 'C' ? 'B' : c.grade === 'B' ? 'A' : c.grade === 'A' ? 'A+' : null;
                  const daysNeeded = nextGrade === 'D' ? 6 : nextGrade === 'C' ? 12 : nextGrade === 'B' ? 18 : nextGrade === 'A' ? 22 : nextGrade === 'A+' ? 27 : null;
                  const daysLeft = daysNeeded ? Math.max(0, daysNeeded - c.days) : 0;
                  return (
                    <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(3,3,8,0.99), rgba(7,5,14,0.97))', border: `1px solid ${color}44`, boxShadow: `0 0 24px ${gc}22, 0 0 0 1px rgba(0,0,0,0.95)` }}>
                      {/* Top accent */}
                      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${gc}88, transparent)` }} />
                      <div className="p-4 space-y-3">
                        {/* Header row */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center rounded-xl" style={{ width: 52, height: 52, background: `${gc}10`, border: `1px solid ${gc}30`, flexShrink: 0 }}>
                            <span suppressHydrationWarning className="font-black leading-none" style={{ fontSize: c.grade === 'A+' ? 18 : 22, color: gc, fontFamily: 'Montserrat, system-ui, sans-serif', textShadow: `0 0 12px ${gc}88` }}>{c.grade}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {renderCatIcon(icon, 16)}
                              <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{c.cat}</p>
                            </div>
                            <p suppressHydrationWarning className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.days} active days out of the last 30</p>
                          </div>
                          <button onClick={() => setExpandedHealthCat(null)} style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, padding: 4 }}>✕</button>
                        </div>
                        {/* Progress bar */}
                        <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.06)' }}>
                          <div suppressHydrationWarning className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.round((c.days / 30) * 100)}%`, background: isF ? 'rgba(255,255,255,0.12)' : `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: isF ? 'none' : `0 0 8px ${color}88` }} />
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{detail.desc}</p>
                        {/* How to improve */}
                        <div className="rounded-xl p-3" style={{ background: `${color}0d`, border: `1px solid ${color}33` }}>
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color }}>How to improve</p>
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{detail.tip}</p>
                        </div>
                        {nextGrade && (
                          <p suppressHydrationWarning className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {daysLeft === 0 ? `You&apos;ve reached ${c.grade}!` : `${daysLeft} more active day${daysLeft === 1 ? '' : 's'} to reach ${nextGrade}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <GlowDivider accentColor={accentColor} />

              {/* Next milestones — 2x2 grid, card style with progress */}
              {nextMilestones.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                    <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Next Milestones</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nextMilestones.map(m => {
                      const pct = m.target > 0 ? (m.current / m.target) * 100 : 0;
                      const color = catColors[m.cat] || accentColor;
                      return (
                        <div key={m.id} className="rounded-xl p-3.5 relative overflow-hidden"
                          style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.88), rgba(0,0,0,0.78))`, border: `1px solid ${color}44`, boxShadow: `0 2px 12px rgba(0,0,0,0.5)` }}>
                          {/* Ghost badge watermark */}
                          <div className="absolute -top-1 -right-1 pointer-events-none select-none" style={{ opacity: 0.07 }}>{renderBadge(m.badge, 36)}</div>
                          {/* Badge + label */}
                          <div className="flex items-center gap-2 mb-2">
                            {renderBadge(m.badge, 22)}
                            <p className="text-[11px] font-bold leading-tight" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{m.label}</p>
                          </div>
                          {/* Description */}
                          <p className="text-[9px] mb-2" style={{ color: 'rgba(232,240,236,0.4)' }}>{m.desc}</p>
                          {/* Progress bar */}
                          <div className="rounded-full overflow-hidden h-1.5 mb-1" style={{ background: `${color}15` }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                          </div>
                          <p className="text-[9px] font-bold" style={{ color }}>{m.current} / {m.target}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <GlowDivider accentColor={accentColor} />

              {/* Earned badges — scrollable row */}
              {unlocked.length > 0 && (
                <div className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: `${accentColor}44` }}>Earned · {unlocked.length}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {unlocked.map(m => (
                      <div key={m.id} className="flex flex-col items-center gap-1 min-w-[52px] py-2 px-1 rounded-xl shrink-0"
                        style={{ background: `rgba(0,0,0,0.82)`, border: `1px solid ${accentColor}33` }}>
                        {renderBadge(m.badge, 22)}
                        <span className="text-[7px] font-bold text-center leading-tight" style={{ color: 'rgba(232,240,236,0.5)' }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insight */}
              {strongest.grade !== '—' && (
                <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: `${accentColor}06`, borderLeft: `3px solid ${accentColor}44` }}>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(232,240,236,0.4)' }}>
                    Strongest: <strong style={{ color: `${accentColor}` }}>{strongest.cat}</strong>
                    {weakest.cat !== strongest.cat && <> · Grow in: <strong style={{ color: `${accentColor}88` }}>{weakest.cat}</strong></>}
                  </p>
                </div>
              )}

              {/* Trophy Room link */}
              {onOpenTrophyRoom && (
                <button onClick={onOpenTrophyRoom} className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all group"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.18)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg transition-transform group-hover:scale-110">🏆</span>
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#fbbf24', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Trophy Room</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: 'rgba(251,191,36,0.5)' }}>{unlocked.length} earned →</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <GlowDivider accentColor={accentColor} dot />

      {/* ── Continue Reading ─────────────────────────────────────────── */}
      <button onClick={onContinueReading} className="w-full text-left rounded-xl p-4 transition-all active:scale-[0.99] relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}22`, boxShadow: `0 2px 16px rgba(0,0,0,0.4)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at right, ${accentColor}06, transparent 65%)` }} />
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <h3 className="text-[9px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: `${accentColor}77`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Continue Reading</h3>
            <p className="text-base font-black" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{selectedBook.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: `${accentColor}66` }}>Chapter {selectedChapter} · {selectedBook.chapters - selectedChapter} chapters left</p>
            <div className="mt-2.5 rounded-full overflow-hidden h-1.5" style={{ background: `${accentColor}15` }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((selectedChapter / selectedBook.chapters) * 100, 3)}%`, background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})` }} />
            </div>
            <p className="text-[9px] mt-1" style={{ color: `${accentColor}33` }}>{selectedChapter} of {selectedBook.chapters} chapters</p>
          </div>
          <img src="/read book.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain', opacity: 0.85, flexShrink: 0 }} />
        </div>
      </button>

      {/* ── Expanded Highlights View ──────────────────────────────────── */}
      {showAllHighlights && highlighted.size > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
          <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${accentColor}10` }}>
            <SectionLabel text="All Saved Verses" accentColor={accentColor} icon="✦" />
            <span className="text-[10px] font-bold" style={{ color: `${accentColor}55` }}>{highlighted.size} verse{highlighted.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="px-4 py-2 max-h-64 overflow-y-auto">
            {(() => {
              // Group highlights by book + chapter
              const grouped: Record<string, string[]> = {};
              [...highlighted].forEach(key => {
                const parts = key.split('-');
                const book = BOOKS.find(b => b.osis === parts[0]);
                const groupKey = book ? `${book.name} ${parts[1]}` : `${parts[0]} ${parts[1]}`;
                if (!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push(parts[2] || '?');
              });

              return Object.entries(grouped).map(([chapter, verses]) => (
                <div key={chapter} className="py-2" style={{ borderBottom: `1px solid ${accentColor}06` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: '#f0f8f4' }}>{chapter}</p>
                    <button onClick={() => {
                      const parts = chapter.split(' ');
                      const chNum = parseInt(parts[parts.length - 1]);
                      const bookName = parts.slice(0, -1).join(' ');
                      const book = BOOKS.find(b => b.name === bookName);
                      if (book) {
                        onContinueReading();
                      }
                    }} className="text-[9px] font-semibold" style={{ color: `${accentColor}88` }}>
                      Read →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {verses.sort((a, b) => parseInt(a) - parseInt(b)).map(v => (
                      <span key={v} className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: `${accentColor}14`, color: '#f0f8f4' }}>
                        v.{v}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── This Week ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.72), rgba(0,0,0,0.60))`, border: `1px solid ${accentColor}20`, boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left, ${accentColor}07, transparent 60%)` }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}88`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>This Week</p>
            <p suppressHydrationWarning className="text-[9px]" style={{ color: 'rgba(232,240,236,0.25)' }}>{journeyDays} day{journeyDays === 1 ? '' : 's'} on your journey</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}><img src="/read book.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> Chapters Read</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{chaptersStudied}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}><img src="/Praying hands.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> Prayers</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{totalPrayers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}>🔥 Streak</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{streak} day{streak === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}><img src="/star.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> Saved Verses</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{highlightCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}><img src="/sun.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', mixBlendMode: 'screen' }} /> Encounters</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{fireSessions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(232,240,236,0.45)' }}>📜 Notes</span>
              <span className="text-[11px] font-black" style={{ color: '#fff' }}>{chaptersWithNotesGlobal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── This Day in History — interactive ──────────────────────────── */}
      {(() => {
        const today = new Date();
        const monthName = today.toLocaleString('default', { month: 'long' });
        const dayNum = today.getDate();

        const loadDeeper = () => {
          if (deeperFact || deeperLoading) { setHistoryExpanded(!historyExpanded); return; }
          setHistoryExpanded(true);
          setDeeperLoading(true);
          fetch('/api/altar/explain', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: `${monthName} ${dayNum}`, verseText: historicalFact || `Today is ${monthName} ${dayNum}`, translation: '',
              question: `Based on this historical fact about ${monthName} ${dayNum}: "${historicalFact}"\n\nGive exactly 3 short points in this format:\n\nWHY IT MATTERS: (one sentence on why Christians should care)\nSCRIPTURE: (one related verse reference and a brief quote)\nSURPRISING: (one surprising detail most people don't know)\n\nKeep each to ONE sentence max. No markdown, no asterisks, no bullet points. Use the exact labels above.` }),
          }).then(async r => {
            const reader = r.body?.getReader(); if (!reader) return;
            const d = new TextDecoder(); let t = '';
            while (true) { const { done, value } = await reader.read(); if (done) break; t += d.decode(value, { stream: true }); setDeeperFact(t); }
          }).catch(() => setDeeperFact('Could not load more details.')).finally(() => setDeeperLoading(false));
        };

        return (
          <div className="rounded-2xl overflow-hidden relative" style={{
            background: 'linear-gradient(160deg, rgba(10,10,18,0.97) 0%, rgba(18,14,28,0.95) 100%)',
            border: `1px solid ${accentColor}28`,
            boxShadow: `0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.8), inset 0 1px 0 ${accentColor}14`,
          }}>
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${accentColor}88 30%, ${accentColor} 60%, ${accentColor}44 85%, transparent 100%)` }} />
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 85% 10%, ${accentColor}08, transparent 65%)` }} />
            {/* Large decorative quote mark */}
            <div className="absolute pointer-events-none select-none" style={{ top: 20, left: 14, fontSize: 80, lineHeight: 1, color: `${accentColor}09`, fontFamily: 'Georgia, serif', fontWeight: 900 }}>&ldquo;</div>

            <div className="px-5 pt-5 pb-5 relative z-10">
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: `${accentColor}55`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>This Day in History</p>
                  <h2 className="text-sm font-black uppercase tracking-[0.1em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Did You Know?</h2>
                </div>
                {/* Date badge */}
                <div className="rounded-xl px-3 py-2 text-center shrink-0" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28`, minWidth: 48 }}>
                  <p className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: `${accentColor}66` }}>{today.toLocaleString('default', { month: 'short' })}</p>
                  <p className="text-xl font-black leading-none" style={{ color: accentColor }}>{dayNum}</p>
                </div>
              </div>

              {/* Fact */}
              {factLoading && !historicalFact ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                  <span className="text-xs italic" style={{ color: `${accentColor}44`, fontFamily: 'Georgia, serif' }}>Discovering what happened today…</span>
                </div>
              ) : historicalFact ? (
                <>
                  {/* Pull-quote style fact */}
                  <div className="relative pl-4 mb-4" style={{ borderLeft: `2px solid ${accentColor}44` }}>
                    <p className="text-[14px] leading-[1.7]" style={{ color: 'rgba(232,240,236,0.82)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      {cleanMarkdown(historicalFact)}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button onClick={loadDeeper}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}12)`, color: accentColor, border: `1px solid ${accentColor}33`, boxShadow: `0 2px 12px ${accentColor}14` }}>
                      {historyExpanded ? '▲ Close' : '✦ Go Deeper'}
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(`Did you know? (${monthName} ${dayNum})\n\n${historicalFact}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Copy
                    </button>
                  </div>

                  {/* Expanded deep-dive */}
                  {historyExpanded && (
                    <div className="mt-4 space-y-2">
                      {deeperLoading && !deeperFact ? (
                        <div className="flex items-center gap-2 py-3">
                          <div className="w-4 h-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                          <span className="text-xs italic" style={{ color: `${accentColor}44`, fontFamily: 'Georgia, serif' }}>Digging deeper…</span>
                        </div>
                      ) : (
                        (() => {
                          const cleaned = cleanMarkdown(deeperFact);
                          const points = [
                            { img: null, emoji: '💡', label: 'Why It Matters', text: cleaned.match(/WHY IT MATTERS:\s*(.+?)(?=SCRIPTURE:|SURPRISING:|$)/i)?.[1]?.trim() },
                            { img: '/read book.png', emoji: '📖', label: 'Scripture Connection', text: cleaned.match(/SCRIPTURE:\s*(.+?)(?=WHY IT MATTERS:|SURPRISING:|$)/i)?.[1]?.trim() },
                            { img: null, emoji: '🤯', label: 'Surprising Fact', text: cleaned.match(/SURPRISING:\s*(.+?)(?=WHY IT MATTERS:|SCRIPTURE:|$)/i)?.[1]?.trim() },
                          ].filter(p => p.text);

                          if (points.length === 0) {
                            return <p className="text-xs leading-relaxed italic rounded-xl p-4" style={{ color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif', background: `${accentColor}05` }}>{cleaned}</p>;
                          }

                          return points.map((p, i) => (
                            <div key={i} className="rounded-xl p-3.5 relative overflow-hidden" style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid ${accentColor}14` }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                {p.img ? <img src={p.img} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} /> : <span className="text-sm">{p.emoji}</span>}
                                <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: `${accentColor}77`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{p.label}</p>
                              </div>
                              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>{p.text}</p>
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs py-6 text-center italic" style={{ color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif' }}>Could not load today&apos;s fact.</p>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
