'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BookDef, BOOKS, cleanMarkdown, completeDailyCheck } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  accentColor: string;
  selectedBook: BookDef;
  selectedChapter: number;
  highlighted: Set<string>;
  notes: Record<string, string>;
  selectedBibleAbbr: string;
  encounterMode: 'morning' | 'bedtime';
}

interface FireSession {
  id: string;
  date: string;
  book: string;
  chapter: number;
  verse: string;
  verseText: string;
  insight: string;
  action: string;
  prayer: string;
}

const STEP_LABELS = ['Verse', 'Insight', 'Action', 'Prayer'] as const;

export default function FireMode({
  open, onClose, accentColor, selectedBook, selectedChapter,
  highlighted, notes, selectedBibleAbbr, encounterMode,
}: Props) {
  const [step, setStep] = useState(0); // 0-3 = cards, 4 = complete
  const [loading, setLoading] = useState(false);
  const [verse, setVerse] = useState('');
  const [verseText, setVerseText] = useState('');
  const [insight, setInsight] = useState('');
  const [action, setAction] = useState('');
  const [prayer, setPrayer] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Build context strings for the prompt
  const buildContext = useCallback(() => {
    const highlightedVerses = [...highlighted].slice(0, 10).map(key => {
      const parts = key.split('-');
      if (parts.length >= 3) {
        const book = BOOKS.find(b => b.osis === parts[0]);
        return book ? `${book.name} ${parts[1]}:${parts[2]}` : key;
      }
      return key;
    });

    const noteEntries = Object.entries(notes)
      .filter(([, v]) => v.trim())
      .slice(0, 5)
      .map(([k, v]) => {
        const parts = k.split('-');
        const book = BOOKS.find(b => b.osis === parts[0]);
        const ref = book ? `${book.name} ${parts[1]}:${parts[2]}` : k;
        return `${ref}: "${v.trim().slice(0, 100)}"`;
      });

    return { highlightedVerses, noteEntries };
  }, [highlighted, notes]);

  // Generate session when opened
  useEffect(() => {
    if (!open) return;

    // Reset state
    setStep(0);
    setVerse('');
    setVerseText('');
    setInsight('');
    setAction('');
    setPrayer('');
    setSaved(false);
    setError('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const { highlightedVerses, noteEntries } = buildContext();

    const contextParts = [
      `Currently reading: ${selectedBook.name} chapter ${selectedChapter} (${selectedBibleAbbr}).`,
      highlightedVerses.length > 0
        ? `Recently highlighted verses: ${highlightedVerses.join(', ')}.`
        : '',
      noteEntries.length > 0
        ? `Recent notes: ${noteEntries.join('; ')}.`
        : '',
    ].filter(Boolean).join('\n');

    const isMorning = encounterMode === 'morning';
    const moodGuide = isMorning
      ? 'This is a MORNING encounter. The tone should be energizing, purposeful, and forward-looking. Help them start their day grounded in truth and ready to walk with God.'
      : 'This is a BEDTIME encounter. The tone should be calming, reflective, and restful. Help them release the day to God, find peace, and rest in His promises.';

    const question = [
      `You are a warm, pastoral Bible guide leading a focused ${isMorning ? 'morning' : 'bedtime'} spiritual session.`,
      moodGuide,
      `The reader's context:\n${contextParts}`,
      ``,
      `Generate a personalized 4-part session. Use this exact format with these markers on their own lines:`,
      ``,
      `VERSE: [Book Chapter:Verse reference — ${isMorning ? 'choose something that speaks to purpose, strength, or starting fresh' : 'choose something about rest, peace, trust, or God\'s faithfulness'}]`,
      `TEXT: [The actual text of that verse]`,
      `INSIGHT: [2-3 sentences of warm, pastoral insight. ${isMorning ? 'Help them see what God has for them today.' : 'Help them reflect on God\'s goodness and let go of the day.'}]`,
      `ACTION: [${isMorning ? 'One specific thing they can do today to live out this verse.' : 'One thing they can release to God tonight or one truth to meditate on as they fall asleep.'}]`,
      `PRAYER: [A short, personal ${isMorning ? 'morning' : 'bedtime'} prayer written in first person.]`,
      ``,
      `Do not use any markdown formatting, asterisks, headers, or bullet points. Plain text only.`,
      `Each section marker (VERSE:, TEXT:, INSIGHT:, ACTION:, PRAYER:) must appear on its own line followed by the content.`,
    ].join('\n');

    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: `${selectedBook.name} ${selectedChapter}`,
        verseText: `Reading ${selectedBook.name} chapter ${selectedChapter}`,
        translation: selectedBibleAbbr,
        question,
      }),
      signal: controller.signal,
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          parseStream(full);
        }
        parseStream(full, true);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError('Could not generate session. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Parse streaming response by markers
  const parseStream = useCallback((text: string, final = false) => {
    const extract = (marker: string, nextMarkers: string[]): string => {
      const idx = text.indexOf(marker);
      if (idx === -1) return '';
      const start = idx + marker.length;
      let end = text.length;
      for (const nm of nextMarkers) {
        const ni = text.indexOf(nm, start);
        if (ni !== -1 && ni < end) end = ni;
      }
      return text.slice(start, end).trim();
    };

    const v = extract('VERSE:', ['TEXT:', 'INSIGHT:', 'ACTION:', 'PRAYER:']);
    const t = extract('TEXT:', ['INSIGHT:', 'ACTION:', 'PRAYER:']);
    const i = extract('INSIGHT:', ['ACTION:', 'PRAYER:']);
    const a = extract('ACTION:', ['PRAYER:']);
    const p = extract('PRAYER:', []);

    if (v) setVerse(v);
    if (t) setVerseText(t);
    if (i) setInsight(i);
    if (a) setAction(a);
    if (p) setPrayer(p);
  }, []);

  const canAdvance = useCallback(() => {
    if (step === 0) return verse.length > 0 && verseText.length > 0;
    if (step === 1) return insight.length > 0;
    if (step === 2) return action.length > 0;
    if (step === 3) return prayer.length > 0;
    return false;
  }, [step, verse, verseText, insight, action, prayer]);

  const handleNext = () => {
    if (step < 4) {
      const next = step + 1;
      setStep(next);
      if (next === 4) completeDailyCheck('apply');
    }
  };

  const handleSave = () => {
    const session: FireSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      book: selectedBook.name,
      chapter: selectedChapter,
      verse: cleanMarkdown(verse),
      verseText: cleanMarkdown(verseText),
      insight: cleanMarkdown(insight),
      action: cleanMarkdown(action),
      prayer: cleanMarkdown(prayer),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('trace-fire-sessions') || '[]');
      existing.unshift(session);
      localStorage.setItem('trace-fire-sessions', JSON.stringify(existing.slice(0, 100)));
      setSaved(true);
    } catch {
      setSaved(true);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  if (!open) return null;

  const progressPct = step <= 3 ? ((step + 1) / 4) * 100 : 100;

  // Card content per step
  const renderCard = () => {
    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>!</p>
          <p style={{ color: 'rgba(232,240,236,0.6)', fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.7 }}>
            {error}
          </p>
          <button onClick={handleClose} style={{
            marginTop: 24, padding: '12px 32px', borderRadius: 12,
            background: accentColor, color: '#0a1410', fontWeight: 700,
            fontSize: 14, border: 'none', cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      );
    }

    // Step 0: Verse
    if (step === 0) {
      const hasContent = verse && verseText;
      return (
        <div style={{ padding: '40px 24px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${accentColor}88`, marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
            Key Verse
          </p>
          {hasContent ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: accentColor, marginBottom: 16, fontFamily: 'Montserrat, sans-serif' }}>
                {cleanMarkdown(verse)}
              </p>
              <p style={{ fontSize: 20, lineHeight: 1.7, color: '#f0f8f4', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                &ldquo;{cleanMarkdown(verseText)}&rdquo;
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${accentColor}33`,
                borderTopColor: accentColor, animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: 'rgba(232,240,236,0.35)', fontSize: 13 }}>Finding your verse...</span>
            </div>
          )}
        </div>
      );
    }

    // Step 1: Insight
    if (step === 1) {
      return (
        <div style={{ padding: '40px 24px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${accentColor}88`, marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
            Insight
          </p>
          {insight ? (
            <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif' }}>
              {cleanMarkdown(insight)}
              {loading && !action && <span style={{ display: 'inline-block', width: 6, height: 14, marginLeft: 3, background: accentColor, borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />}
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${accentColor}33`,
                borderTopColor: accentColor, animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: 'rgba(232,240,236,0.35)', fontSize: 13 }}>Preparing insight...</span>
            </div>
          )}
        </div>
      );
    }

    // Step 2: Action
    if (step === 2) {
      return (
        <div style={{ padding: '40px 24px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${accentColor}88`, marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
            Action Step
          </p>
          {action ? (
            <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif' }}>
              {cleanMarkdown(action)}
              {loading && !prayer && <span style={{ display: 'inline-block', width: 6, height: 14, marginLeft: 3, background: accentColor, borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />}
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${accentColor}33`,
                borderTopColor: accentColor, animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: 'rgba(232,240,236,0.35)', fontSize: 13 }}>Preparing action step...</span>
            </div>
          )}
        </div>
      );
    }

    // Step 3: Prayer
    if (step === 3) {
      return (
        <div style={{ padding: '40px 24px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${accentColor}88`, marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
            Guided Prayer
          </p>
          {prayer ? (
            <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {cleanMarkdown(prayer)}
              {loading && <span style={{ display: 'inline-block', width: 6, height: 14, marginLeft: 3, background: accentColor, borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />}
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${accentColor}33`,
                borderTopColor: accentColor, animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: 'rgba(232,240,236,0.35)', fontSize: 13 }}>Preparing prayer...</span>
            </div>
          )}
        </div>
      );
    }

    // Step 4: Complete
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: `${accentColor}18`,
          border: `2px solid ${accentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f8f4', marginBottom: 8, fontFamily: 'Montserrat, sans-serif' }}>
          Session Complete
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif', maxWidth: 280, marginBottom: 32 }}>
          Well done. You showed up, and that matters. Carry this word with you today.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!saved ? (
            <button onClick={handleSave} style={{
              padding: '14px 28px', borderRadius: 12, background: accentColor,
              color: '#0a1410', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}>
              Save Session
            </button>
          ) : (
            <span style={{ padding: '14px 28px', borderRadius: 12, background: `${accentColor}18`, color: accentColor, fontWeight: 700, fontSize: 14, fontFamily: 'Montserrat, sans-serif' }}>
              Saved
            </span>
          )}
          <button onClick={handleClose} style={{
            padding: '14px 28px', borderRadius: 12, background: 'rgba(255,255,255,0.06)',
            color: 'rgba(232,240,236,0.6)', fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
          }}>
            Done
          </button>
        </div>
      </div>
    );
  };

  const isMorning = encounterMode === 'morning';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isMorning
        ? 'linear-gradient(180deg, #1a1005 0%, #2d1f06 30%, #3d2208 60%, #0a0804 100%)'
        : 'linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #06061a 100%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Ambient effects */}
      {isMorning ? (
        <>
          {/* Sunlight glow */}
          <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '140%', height: '60%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(251,146,60,0.12) 0%, rgba(251,146,60,0.04) 40%, transparent 70%)', pointerEvents: 'none' }} />
          {/* Sun rays */}
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', top: '5%', left: '50%',
              width: 2, height: '25%',
              background: `linear-gradient(180deg, rgba(251,191,36,${0.08 + i * 0.01}), transparent)`,
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
              transformOrigin: 'top center',
              pointerEvents: 'none',
              animation: `sunRayPulse ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite alternate`,
            }} />
          ))}
          {/* Warm particles */}
          {[...Array(6)].map((_, i) => (
            <div key={`p${i}`} style={{
              position: 'absolute',
              left: `${15 + i * 14}%`, top: `${10 + (i % 3) * 20}%`,
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(251,191,36,0.2)',
              animation: `floatUp ${4 + i}s ease-in-out ${i * 0.8}s infinite alternate`,
              pointerEvents: 'none',
            }} />
          ))}
        </>
      ) : (
        <>
          {/* Night sky glow */}
          <div style={{ position: 'absolute', top: '10%', left: '70%', width: '40%', height: '30%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          {/* Twinkling stars */}
          {[...Array(25)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 70}%`,
              width: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
              borderRadius: '50%',
              background: i % 7 === 0 ? '#c4b5fd' : i % 5 === 0 ? '#93c5fd' : '#e2e8f0',
              animation: `twinkle ${2 + (i % 4) * 1.5}s ease-in-out ${i * 0.3}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
          {/* Moon glow */}
          <div style={{ position: 'absolute', top: '8%', right: '15%', width: 20, height: 20, borderRadius: '50%', background: 'rgba(226,232,240,0.15)', boxShadow: '0 0 30px rgba(226,232,240,0.1), 0 0 60px rgba(226,232,240,0.05)', pointerEvents: 'none' }} />
        </>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes twinkle { 0%,100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes sunRayPulse { 0% { opacity: 0.3; } 100% { opacity: 0.8; } }
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-20px); opacity: 0.05; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '8px 14px', color: 'rgba(232,240,236,0.5)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
          }}>
            Close
          </button>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.02em' }}>
            {encounterMode === 'morning' ? 'Morning Encounter' : 'Bedtime Encounter'}
          </p>
          <div style={{ width: 60 }} /> {/* spacer */}
        </div>

        {/* ── Progress bar ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{
                height: 3, borderRadius: 2, overflow: 'hidden',
                background: `${accentColor}15`,
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: i < step ? accentColor : i === step ? `${accentColor}88` : 'transparent',
                  width: i < step ? '100%' : i === step ? (step === 4 ? '100%' : '50%') : '0%',
                  transition: 'all 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
        {step <= 3 && (
          <p style={{ fontSize: 10, color: `${accentColor}55`, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
            {step + 1} of 4 &middot; {STEP_LABELS[step]}
          </p>
        )}
      </div>

      {/* ── Card area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px', overflow: 'auto' }}>
        <div
          key={step}
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${accentColor}15`,
            borderRadius: 20,
            animation: 'fadeSlideIn 0.4s ease',
          }}
        >
          {renderCard()}
        </div>
      </div>

      {/* ── Bottom navigation ──────────────────────────────────────────── */}
      {step <= 3 && (
        <div style={{ padding: '16px 20px 32px', flexShrink: 0 }}>
          {(() => {
            const morningBtn = { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1a0f05', disabledBg: 'rgba(251,191,36,0.15)', disabledColor: 'rgba(251,191,36,0.4)' };
            const nightBtn = { bg: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#0a0a1a', disabledBg: 'rgba(129,140,248,0.15)', disabledColor: 'rgba(129,140,248,0.4)' };
            const btn = isMorning ? morningBtn : nightBtn;
            return (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 14,
                  background: canAdvance() ? btn.bg : btn.disabledBg,
                  color: canAdvance() ? btn.color : btn.disabledColor,
                  fontWeight: 700, fontSize: 15, border: 'none', cursor: canAdvance() ? 'pointer' : 'default',
                  fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.02em',
                  transition: 'all 0.3s ease',
                  boxShadow: canAdvance() ? (isMorning ? '0 4px 16px rgba(251,191,36,0.3)' : '0 4px 16px rgba(99,102,241,0.3)') : 'none',
                }}
              >
                {step < 3 ? 'Next' : 'Complete'}
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
