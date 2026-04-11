'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string; // HH:MM:SS
  isNote: boolean;
}

interface StudyRecap {
  summary: string;
  themes: string[];
  scriptures: string[];
  questions: string[];
  insights: string[];
  prayerPoints: string[];
}

interface Props {
  accentColor: string;
  groupName?: string;
  onClose: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseRecap(raw: string): StudyRecap {
  const get = (key: string): string => {
    const m = raw.match(new RegExp(`${key}:\\s*([\\s\\S]+?)(?=\\n[A-Z_]+:|$)`));
    return m ? m[1].trim() : '';
  };
  const getList = (key: string): string[] => {
    const block = get(key);
    if (!block) return [];
    return block
      .split(/\n|,(?=\s*[A-Z1-9])/)
      .map(s => s.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);
  };
  return {
    summary: get('SUMMARY'),
    themes: getList('THEMES'),
    scriptures: getList('SCRIPTURES'),
    questions: getList('QUESTIONS'),
    insights: getList('INSIGHTS'),
    prayerPoints: getList('PRAYER_POINTS'),
  };
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function BibleStudyMode({ accentColor, groupName, onClose }: Props) {
  const [phase, setPhase] = useState<'setup' | 'recording' | 'paused' | 'recap'>('setup');

  // Setup
  const [passage, setPassage] = useState('');
  const [speakerName, setSpeakerName] = useState('');

  // Recording
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [micError, setMicError] = useState('');

  // Recap
  const [recapRaw, setRecapRaw] = useState('');
  const [recap, setRecap] = useState<StudyRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  /* ── Timer ── */
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  /* ── Speech Recognition ── */
  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicError('Speech recognition is not supported in this browser. Try Chrome or Safari.');
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      let interimText = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTranscript(prev => [
          ...prev,
          {
            id: `t-${Date.now()}`,
            speaker: speakerName || 'Speaker',
            text: finalText.trim(),
            timestamp: formatTime(secs),
            isNote: false,
          },
        ]);
        setInterim('');
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setMicError('Microphone access denied. Please allow mic access and try again.');
      else if (e.error !== 'no-speech') setMicError(`Mic error: ${e.error}`);
    };

    rec.onend = () => {
      setListening(false);
      // Auto-restart if still in recording phase
      if (recognitionRef.current === rec) {
        try { rec.start(); setListening(true); } catch {}
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setMicError('');
  }, [speakerName]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch {}
    }
    setListening(false);
    setInterim('');
  }, []);

  /* ── Start Study ── */
  const startStudy = () => {
    if (!speakerName.trim()) return;
    startTimeRef.current = Date.now();
    setPhase('recording');
    startRecognition();
  };

  /* ── Pause ── */
  const pauseStudy = () => {
    stopRecognition();
    setPhase('paused');
  };

  /* ── Resume ── */
  const resumeStudy = () => {
    setPhase('recording');
    startRecognition();
  };

  /* ── Add Note ── */
  const addNote = () => {
    if (!noteInput.trim()) return;
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTranscript(prev => [
      ...prev,
      {
        id: `n-${Date.now()}`,
        speaker: speakerName || 'Note',
        text: noteInput.trim(),
        timestamp: formatTime(secs),
        isNote: true,
      },
    ]);
    setNoteInput('');
    setShowNoteInput(false);
  };

  /* ── End & Generate Recap ── */
  const endStudy = async () => {
    stopRecognition();
    setPhase('recap');
    setRecapLoading(true);
    setRecapRaw('');
    setRecap(null);

    const fullTranscript = transcript
      .map(e => `[${e.timestamp}] ${e.isNote ? '📌 NOTE' : e.speaker}: ${e.text}`)
      .join('\n');

    const prompt = `The following is a transcript from a group Bible study session${passage ? ` on "${passage}"` : ''}${groupName ? ` by ${groupName}` : ''}:

---
${fullTranscript}
---

Please provide a thorough recap of this Bible study from a confident, orthodox Christian perspective — the Bible is God's inspired Word and Jesus is Lord. Write as a knowledgeable pastor reviewing a meaningful study session.

Use EXACTLY this format (use these exact keys):

SUMMARY: [2-3 sentences capturing what the group studied and the overall spirit of the discussion]

THEMES: [list each main theme on its own line, starting with - ]

SCRIPTURES: [list each Bible reference mentioned or discussed, one per line starting with - ]

QUESTIONS: [list the significant questions raised during the study, one per line starting with - ]

INSIGHTS: [list 3-5 key insights or revelations from the discussion, one per line starting with - ]

PRAYER_POINTS: [list 2-3 specific prayer points that emerged naturally from this study, one per line starting with - ]

Be warm, pastoral, and encouraging. Capture the heart of what God was saying through this study.`;

    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: passage || 'Bible Study',
          verseText: fullTranscript.slice(0, 4000),
          translation: 'NIV',
          question: prompt,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setRecapRaw(full);
        const parsed = parseRecap(full);
        if (parsed.summary) setRecap(parsed);
      }
    } catch {
      setRecapRaw('Could not generate recap. Check your connection.');
    } finally {
      setRecapLoading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(4,18,10,0.99)' }}>

      {/* ── SETUP PHASE ── */}
      {phase === 'setup' && (
        <>
          <div className="flex items-center gap-3 px-5 pt-8 pb-5 flex-shrink-0" style={{ borderBottom: `1px solid ${accentColor}15` }}>
            <button onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ✕
            </button>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Bible Study Mode</h2>
              {groupName && <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>{groupName}</p>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            {/* Intro */}
            <div className="rounded-2xl p-5 text-center" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}18` }}>
              <div className="mb-3"><img src="/read book.png" alt="" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto' }} /></div>
              <h3 className="text-base font-black mb-2" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Record Your Study</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif' }}>
                Speak freely — your words are transcribed in real time. When you&apos;re done, AI generates a full recap: key themes, scriptures, insights, and prayer points to share with your group.
              </p>
            </div>

            {/* Your name */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: `${accentColor}66` }}>Your Name (Speaker Label)</p>
              <input autoCorrect="off" autoCapitalize="words"
                value={speakerName}
                onChange={e => setSpeakerName(e.target.value)}
                placeholder="e.g. Pastor James"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}20`, color: '#f0f8f4' }}
              />
            </div>

            {/* Passage / topic */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: `${accentColor}66` }}>Passage or Topic <span style={{ color: 'rgba(232,240,236,0.25)' }}>(optional)</span></p>
              <input autoCorrect="on" autoCapitalize="sentences"
                value={passage}
                onChange={e => setPassage(e.target.value)}
                placeholder="e.g. Romans 8, The Armor of God, Forgiveness"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}20`, color: '#f0f8f4' }}
              />
            </div>

            {/* How it works */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${accentColor}55` }}>How It Works</p>
              {[
                { icon: 'mic', text: 'Speak naturally — your words are transcribed automatically' },
                { icon: '📌', text: 'Add manual notes at any point during the study' },
                { icon: '⏸', text: 'Pause and resume whenever needed' },
                { icon: '✦', text: 'End the session — AI writes a full recap for your group' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
                  {item.icon === 'mic' ? <img src="/microphone final.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} /> : <span className="text-base flex-shrink-0">{item.icon}</span>}
                  <p className="text-xs" style={{ color: 'rgba(232,240,236,0.55)' }}>{item.text}</p>
                </div>
              ))}
            </div>

            {micError && (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs" style={{ color: '#ef4444' }}>{micError}</p>
              </div>
            )}
          </div>

          <div className="px-5 pb-8 pt-4 flex-shrink-0" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
            <button
              disabled={!speakerName.trim()}
              onClick={startStudy}
              className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30"
              style={{ background: speakerName.trim() ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.06)', color: '#fff', boxShadow: speakerName.trim() ? `0 4px 24px ${accentColor}44` : 'none' }}>
              <img src="/microphone final.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'inline', marginRight: 8, verticalAlign: 'middle' }} /> Start Recording
            </button>
          </div>
        </>
      )}

      {/* ── RECORDING / PAUSED PHASE ── */}
      {(phase === 'recording' || phase === 'paused') && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-8 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${accentColor}15` }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {phase === 'recording' && (
                <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#ef4444' }} />
              )}
              {phase === 'paused' && (
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {phase === 'recording' ? 'Recording…' : 'Paused'}
                </p>
                {passage && <p className="text-[10px] truncate" style={{ color: `${accentColor}70` }}>{passage}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-black tabular-nums" style={{ color: phase === 'recording' ? accentColor : 'rgba(232,240,236,0.4)', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                {formatTime(elapsed)}
              </p>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {transcript.length === 0 && !interim && (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-sm" style={{ color: 'rgba(232,240,236,0.25)' }}>
                  {phase === 'recording' ? 'Start speaking — your words will appear here…' : 'No transcript yet'}
                </p>
              </div>
            )}

            {transcript.map(entry => (
              <div key={entry.id} className={`rounded-xl px-4 py-3 ${entry.isNote ? 'flex items-start gap-2' : ''}`}
                style={{
                  background: entry.isNote ? `${accentColor}0a` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${entry.isNote ? accentColor + '20' : 'rgba(255,255,255,0.05)'}`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  {entry.isNote && <span className="text-sm flex-shrink-0">📌</span>}
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: entry.isNote ? accentColor : `${accentColor}70` }}>
                    {entry.isNote ? 'Note' : entry.speaker}
                  </p>
                  <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.2)' }}>{entry.timestamp}</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: entry.isNote ? accentColor : 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif' }}>
                  {entry.text}
                </p>
              </div>
            ))}

            {/* Interim / live text */}
            {interim && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.04)` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: `${accentColor}55` }}>{speakerName} (speaking…)</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  {interim}
                </p>
              </div>
            )}
          </div>

          {/* Note input */}
          {showNoteInput && (
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex gap-2 items-center rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}25` }}>
                <span className="pl-3 text-base">📌</span>
                <input autoCorrect="on" autoCapitalize="sentences" autoFocus
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addNote(); if (e.key === 'Escape') { setShowNoteInput(false); setNoteInput(''); } }}
                  placeholder="Add a note or key point…"
                  className="flex-1 py-3 text-sm outline-none bg-transparent"
                  style={{ color: '#f0f8f4' }}
                />
                <button onClick={addNote} disabled={!noteInput.trim()}
                  className="px-4 py-3 text-xs font-bold"
                  style={{ color: noteInput.trim() ? accentColor : 'rgba(232,240,236,0.2)' }}>
                  Add
                </button>
              </div>
            </div>
          )}

          {micError && (
            <div className="mx-4 mb-2 px-4 py-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-[11px]" style={{ color: '#ef4444' }}>{micError}</p>
            </div>
          )}

          {/* Controls */}
          <div className="px-4 pb-8 pt-3 flex-shrink-0 space-y-2" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setShowNoteInput(v => !v); setNoteInput(''); }}
                className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: showNoteInput ? `${accentColor}20` : 'rgba(255,255,255,0.05)', color: showNoteInput ? accentColor : 'rgba(232,240,236,0.55)', border: `1px solid ${showNoteInput ? accentColor + '30' : 'rgba(255,255,255,0.07)'}` }}>
                📌 Note
              </button>
              <button
                onClick={phase === 'recording' ? pauseStudy : resumeStudy}
                className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {phase === 'recording' ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                onClick={endStudy}
                disabled={transcript.length === 0}
                className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-30"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                ■ End
              </button>
            </div>

            <button
              onClick={endStudy}
              disabled={transcript.length === 0}
              className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30"
              style={{ background: transcript.length > 0 ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.05)', color: '#fff', boxShadow: transcript.length > 0 ? `0 4px 20px ${accentColor}33` : 'none' }}>
              ✦ End Study & Generate Recap
            </button>
          </div>
        </>
      )}

      {/* ── RECAP PHASE ── */}
      {phase === 'recap' && (
        <>
          <div className="flex items-center gap-3 px-5 pt-8 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${accentColor}15` }}>
            <button onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ✕ Done
            </button>
            <div className="flex-1">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}66` }}>Study Complete</p>
              <h2 className="text-sm font-black" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                {passage || 'Bible Study'} Recap
              </h2>
            </div>
            {recapLoading && (
              <div className="w-5 h-5 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            )}
          </div>

          {/* Loading */}
          {recapLoading && !recap && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">✦</div>
              </div>
              <div className="text-center px-8">
                <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(232,240,236,0.6)' }}>Generating your recap…</p>
                <p className="text-xs" style={{ color: 'rgba(232,240,236,0.25)', fontFamily: 'Georgia, serif' }}>
                  Reviewing {transcript.length} transcript entries
                </p>
              </div>
            </div>
          )}

          {/* Recap content */}
          {recap && (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Duration', value: formatTime(elapsed) },
                  { label: 'Entries', value: String(transcript.length) },
                  { label: 'Notes', value: String(transcript.filter(e => e.isNote).length) },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${accentColor}0a`, border: `1px solid ${accentColor}18` }}>
                    <p className="text-base font-black" style={{ color: '#fff' }}>{s.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: `${accentColor}70` }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {recap.summary && (
                <div className="rounded-xl p-4" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}18` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}66` }}>Overview</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif' }}>
                    {recap.summary}
                    {recapLoading && <span className="inline-block w-0.5 h-4 ml-1 animate-pulse rounded-sm" style={{ background: accentColor, verticalAlign: 'middle' }} />}
                  </p>
                </div>
              )}

              {/* Themes */}
              {recap.themes.length > 0 && (
                <RecapSection label="Main Themes" icon="🔑" accentColor={accentColor}>
                  <div className="flex flex-wrap gap-2">
                    {recap.themes.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </RecapSection>
              )}

              {/* Key Insights */}
              {recap.insights.length > 0 && (
                <RecapSection label="Key Insights" icon="💡" accentColor={accentColor}>
                  <div className="space-y-2.5">
                    {recap.insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black"
                          style={{ background: `${accentColor}20`, color: accentColor }}>{i + 1}</div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif' }}>{ins}</p>
                      </div>
                    ))}
                  </div>
                </RecapSection>
              )}

              {/* Questions Raised */}
              {recap.questions.length > 0 && (
                <RecapSection label="Questions Raised" icon="❓" accentColor={accentColor}>
                  <div className="space-y-2">
                    {recap.questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.05)` }}>
                        <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: `${accentColor}55` }}>Q</span>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif' }}>{q}</p>
                      </div>
                    ))}
                  </div>
                </RecapSection>
              )}

              {/* Scriptures */}
              {recap.scriptures.length > 0 && (
                <RecapSection label="Scriptures Referenced" icon="📖" accentColor={accentColor}>
                  <div className="flex flex-wrap gap-2">
                    {recap.scriptures.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.6)', border: `1px solid rgba(255,255,255,0.07)` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </RecapSection>
              )}

              {/* Prayer Points */}
              {recap.prayerPoints.length > 0 && (
                <RecapSection label="Prayer Points" icon="🙏" accentColor={accentColor}>
                  <div className="space-y-2">
                    {recap.prayerPoints.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}15` }}>
                        <span className="text-sm flex-shrink-0">🙏</span>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif' }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </RecapSection>
              )}

              {/* Share */}
              {!recapLoading && (
                <button
                  onClick={() => {
                    const text = [
                      `📚 Bible Study Recap${passage ? ` — ${passage}` : ''}`,
                      groupName ? `Group: ${groupName}` : '',
                      `Duration: ${formatTime(elapsed)}`,
                      '',
                      recap.summary,
                      '',
                      recap.themes.length ? `🔑 Themes: ${recap.themes.join(', ')}` : '',
                      recap.insights.length ? `\n💡 Key Insights:\n${recap.insights.map((i, n) => `${n + 1}. ${i}`).join('\n')}` : '',
                      recap.prayerPoints.length ? `\n🙏 Prayer Points:\n${recap.prayerPoints.join('\n')}` : '',
                    ].filter(Boolean).join('\n');
                    if (navigator.share) {
                      navigator.share({ title: 'Bible Study Recap', text });
                    } else {
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 4px 20px ${accentColor}33` }}>
                  Share Recap with Group
                </button>
              )}

              <div className="h-8" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── RecapSection sub-component ────────────────────────────────────── */

function RecapSection({ label, icon, accentColor, children }: { label: string; icon: string; accentColor: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)` }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{label}</p>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
