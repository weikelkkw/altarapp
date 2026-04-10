'use client';

import { useState, useEffect, useRef } from 'react';

interface OnboardingResult {
  name: string;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  focuses: string[];
  weeklyGoals: { chapters: number; prayers: number; devotionals: number; quizzes: number };
  themeId: string;
  defaultBible: string;
  voiceId: string;
}

const ONBOARDING_VOICES = [
  { id: 'eleven:88cgASIFJ5iO94COdgBO', name: 'Bryan',     style: 'American · Steady',   emoji: '🌊', gender: 'male' },
  { id: 'eleven:10xsyNwkKUXCUZPaoXgm', name: 'Marcus',    style: 'Soul · Rich',          emoji: '🎙', gender: 'male' },
  { id: 'eleven:6r6oh5UtSHSD2htZsxdz', name: 'Oliver',    style: 'British · Refined',    emoji: '📜', gender: 'male' },
  { id: 'eleven:uTnyvloPM4RqXGSsx4Du', name: 'Ashley',    style: 'American · Bright',    emoji: '🌸', gender: 'female' },
  { id: 'eleven:XXoNoVctCSPJPEz3bIKW', name: 'Grace',     style: 'Soul · Warm',          emoji: '🌙', gender: 'female' },
  { id: 'eleven:b55ueajWHRh5UzJ6mLZ8', name: 'Charlotte', style: 'British · Calm',       emoji: '🕯', gender: 'female' },
];

interface Props {
  onComplete: (result: OnboardingResult) => void;
}

const STEPS = ['welcome', 'experience', 'focus', 'goals', 'theme', 'translation', 'voice', 'ready'] as const;
type Step = typeof STEPS[number];

const EXPERIENCE_OPTIONS = [
  { id: 'beginner' as const, label: 'Just Starting', desc: 'New to the Bible or coming back after a long time', icon: '🌱' },
  { id: 'intermediate' as const, label: 'Growing', desc: 'I read regularly and want to go deeper', icon: '🌿' },
  { id: 'expert' as const, label: 'Deep Study', desc: 'I want original languages, theology, and advanced tools', icon: '🌳' },
];

const FOCUS_OPTIONS = [
  { id: 'reading', label: 'Daily Reading', icon: '📖', desc: 'Build a habit of reading Scripture' },
  { id: 'prayer', label: 'Prayer Life', icon: '🙏', desc: 'Grow in prayer and conversation with God' },
  { id: 'study', label: 'Deep Study', icon: '✦', desc: 'Study with AI tools and guides' },
  { id: 'memorization', label: 'Memorization', icon: '🧠', desc: 'Memorize and internalize God\'s Word' },
  { id: 'community', label: 'Community', icon: '💬', desc: 'Connect with other believers' },
  { id: 'devotional', label: 'Devotionals', icon: '☀️', desc: 'Daily devotionals and encounters' },
];

const THEME_PICKS = [
  { id: 'black-blue', label: 'Blue', accent: '#60a5fa', bg: '#000' },
  { id: 'black-green', label: 'Green', accent: '#00d084', bg: '#000' },
  { id: 'black-gold', label: 'Gold', accent: '#d4a853', bg: '#000' },
  { id: 'black-purple', label: 'Purple', accent: '#a855f7', bg: '#000' },
  { id: 'black-red', label: 'Red', accent: '#ef4444', bg: '#000' },
  { id: 'black-cyan', label: 'Cyan', accent: '#06b6d4', bg: '#000' },
  { id: 'trace', label: 'The Altar', accent: '#00d084', bg: '#0f1f18' },
  { id: 'midnight', label: 'Midnight', accent: '#60a5fa', bg: '#0f1729' },
  { id: 'warm', label: 'Warm', accent: '#d4a853', bg: '#1a1610' },
  { id: 'white-blue', label: 'Light Blue', accent: '#2563eb', bg: '#fff' },
  { id: 'white-green', label: 'Light Green', accent: '#059669', bg: '#fff' },
  { id: 'white-black', label: 'Light', accent: '#1e293b', bg: '#fff' },
];

const TRANSLATIONS = [
  { abbr: 'NIV', name: 'New International Version', desc: 'Most popular modern translation' },
  { abbr: 'KJV', name: 'King James Version', desc: 'Classic, poetic English' },
  { abbr: 'ESV', name: 'English Standard Version', desc: 'Accurate and readable' },
  { abbr: 'NLT', name: 'New Living Translation', desc: 'Easy to understand' },
  { abbr: 'NKJV', name: 'New King James Version', desc: 'Updated KJV language' },
  { abbr: 'NASB', name: 'New American Standard', desc: 'Word-for-word accuracy' },
  { abbr: 'ASV', name: 'American Standard', desc: 'Formal, precise' },
  { abbr: 'WEB', name: 'World English Bible', desc: 'Modern, public domain' },
  { abbr: 'AMP', name: 'Amplified Bible', desc: 'Expanded meanings' },
  { abbr: 'MSG', name: 'The Message', desc: 'Conversational paraphrase' },
  { abbr: 'CSB', name: 'Christian Standard Bible', desc: 'Balance of accuracy and clarity' },
  { abbr: 'BBE', name: 'Bible in Basic English', desc: 'Simple vocabulary' },
];

const GOAL_PRESETS = {
  beginner: { chapters: 3, prayers: 3, devotionals: 3, quizzes: 1 },
  intermediate: { chapters: 7, prayers: 5, devotionals: 5, quizzes: 2 },
  expert: { chapters: 14, prayers: 7, devotionals: 7, quizzes: 3 },
};

const STEP_VERSES: Record<Step, string> = {
  welcome: '"Your word is a lamp to my feet and a light to my path." — Psalm 119:105',
  experience: '"I can do all things through Christ who strengthens me." — Philippians 4:13',
  focus: '"For where your treasure is, there your heart will be also." — Matthew 6:21',
  goals: '"Commit your way to the Lord; trust in Him." — Psalm 37:5',
  theme: '"He has made everything beautiful in its time." — Ecclesiastes 3:11',
  translation: '"All Scripture is breathed out by God." — 2 Timothy 3:16',
  voice: '"Let everything that has breath praise the Lord." — Psalm 150:6',
  ready: '"Behold, I am making all things new." — Revelation 21:5',
};

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'expert' | ''>('');
  const [focuses, setFocuses] = useState<string[]>([]);
  const [goals, setGoals] = useState({ chapters: 7, prayers: 5, devotionals: 5, quizzes: 2 });
  const [themeId, setThemeId] = useState('black-blue');
  const [defaultBible, setDefaultBible] = useState('NIV');
  const [voiceId, setVoiceId] = useState('eleven:88cgASIFJ5iO94COdgBO');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [memorialSlide, setMemorialSlide] = useState(0); // 0,1,2 = slides; 3 = done

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const accent = THEME_PICKS.find(t => t.id === themeId)?.accent || '#60a5fa';

  const goNext = () => {
    if (animating) return;
    const next = STEPS[stepIndex + 1];
    if (!next) return;
    setAnimating(true);
    setTimeout(() => { setStep(next); setAnimating(false); }, 400);
  };

  const goBack = () => {
    if (animating || stepIndex === 0) return;
    setAnimating(true);
    setTimeout(() => { setStep(STEPS[stepIndex - 1]); setAnimating(false); }, 400);
  };

  const toggleFocus = (id: string) => setFocuses(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  const adjustGoal = (key: keyof typeof goals, delta: number) => setGoals(prev => ({ ...prev, [key]: Math.max(1, Math.min(99, prev[key] + delta)) }));

  const previewVoice = (id: string) => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current.src = ''; }
    if (previewingId === id) { setPreviewingId(null); return; }
    setPreviewingId(id);
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'The Lord is my shepherd. I shall not want.', voiceId: id }),
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play();
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewingId(null); };
    }).catch(() => setPreviewingId(null));
  };

  const handleComplete = () => {
    onComplete({ name: name.trim() || 'Friend', experienceLevel: experience || 'beginner', focuses, weeklyGoals: goals, themeId, defaultBible, voiceId });
  };

  // Shared button style
  const primaryBtn = {
    width: '100%', padding: '18px', borderRadius: 16,
    border: '1px solid rgba(186,230,253,0.3)', cursor: 'pointer',
    background: 'linear-gradient(160deg, #93c5fd 0%, #3b82f6 45%, #1d4ed8 100%)',
    color: '#fff',
    fontSize: 16, fontWeight: 900 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    fontFamily: "'Montserrat', system-ui, sans-serif",
    boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.2), 0 4px 20px rgba(0,0,0,0.4)',
    transition: 'all 0.3s ease',
  };

  const disabledBtn = { ...primaryBtn, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', boxShadow: 'none', cursor: 'default' as const };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #04081a 0%, #0b1535 30%, #0f1f4a 60%, #07102a 100%)',
      fontFamily: "'Montserrat', system-ui, sans-serif",
    }}>
      {/* ── Ambient effects ──────────────────────────────────── */}
      <style>{`
        @keyframes obFloat1 { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.06; } 50% { transform: translate(30px,-20px) scale(1.15); opacity: 0.12; } }
        @keyframes obFloat2 { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.04; } 50% { transform: translate(-20px,30px) scale(1.1); opacity: 0.09; } }
        @keyframes obFloat3 { 0%,100% { transform: translate(0,0); opacity: 0.03; } 50% { transform: translate(15px,15px); opacity: 0.07; } }
        @keyframes obStar { 0%,100% { opacity: 0.05; } 50% { opacity: 0.5; } }
        @keyframes obPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes obSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes obGlowPulse { 0%,100% { box-shadow: 0 4px 24px ${accent}40, 0 0 60px ${accent}15; } 50% { box-shadow: 0 4px 32px ${accent}55, 0 0 80px ${accent}25; } }
      `}</style>

      {/* Floating orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${accent}12, transparent 70%)`, animation: 'obFloat1 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 250, height: 250, borderRadius: '50%', background: `radial-gradient(circle, ${accent}0a, transparent 70%)`, animation: 'obFloat2 15s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '60%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(147,197,253,0.06), transparent 70%)', animation: 'obFloat3 10s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Stars */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${((i * 67 + 11) % 96) + 2}%`,
          top: `${((i * 43 + 17) % 94) + 3}%`,
          width: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
          height: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
          borderRadius: '50%',
          background: i % 4 === 0 ? '#c4b5fd' : i % 3 === 0 ? accent : '#e0eeff',
          animation: `obStar ${2 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Background cross watermark */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)', opacity: 0.03, pointerEvents: 'none', userSelect: 'none' }}>
        <svg width="300" height="360" viewBox="0 0 300 360" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="116" y="0" width="68" height="360" rx="10" fill="#93c5fd"/>
          <rect x="0" y="100" width="300" height="68" rx="10" fill="#93c5fd"/>
        </svg>
      </div>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.04)', zIndex: 10 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: `linear-gradient(90deg, ${accent}88, ${accent})`,
          transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
          borderRadius: 2,
          boxShadow: `0 0 12px ${accent}44`,
        }} />
      </div>

      {/* Step indicator dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0 0', position: 'relative', zIndex: 10 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{
            width: i === stepIndex ? 24 : 6, height: 6, borderRadius: 3,
            background: i <= stepIndex ? accent : 'rgba(255,255,255,0.08)',
            transition: 'all 0.4s ease',
            boxShadow: i === stepIndex ? `0 0 8px ${accent}55` : 'none',
          }} />
        ))}
      </div>

      {/* Back button */}
      {stepIndex > 0 && (
        <button onClick={goBack} style={{
          position: 'absolute', top: 28, left: 16, zIndex: 20,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
          padding: '8px 16px', borderRadius: 10, fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}>
          ←
        </button>
      )}

      {/* ── Content ──────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        width: '100%', position: 'relative', zIndex: 10,
      }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: '20px 24px 48px', maxWidth: 440, margin: '0 auto', width: '100%',
        opacity: animating ? 0 : (mounted ? 1 : 0),
        transform: animating ? 'translateY(20px) scale(0.98)' : 'translateY(0) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* ── Memorial slides ─────────────────────────────── */}
        {step === 'welcome' && memorialSlide < 3 && (() => {
          const slides = [
            {
              eyebrow: 'A word for the journey',
              body: '"Well done, good and faithful servant."',
              sub: '— Matthew 25:23',
            },
            {
              eyebrow: 'In his memory',
              body: 'He was a man of Jesus — a good father, and a faithful servant of the Lord.',
              sub: 'His faith lives on in the lives he touched.',
            },
            {
              eyebrow: 'In Loving Memory',
              body: 'Bruce Mavis',
              sub: '1962 – 2026',
            },
          ];
          const s = slides[memorialSlide];
          return (
            <div style={{ textAlign: 'center', width: '100%' }}>
              {/* Cross */}
              <div style={{ margin: '0 auto 32px', width: 56, filter: 'drop-shadow(0 0 14px rgba(147,197,253,0.6)) drop-shadow(0 0 32px rgba(96,165,250,0.3))', animation: 'obGlowPulse 4s ease-in-out infinite' }}>
                <svg width="56" height="68" viewBox="0 0 56 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="22" y="0" width="12" height="68" rx="3" fill="url(#memCross)"/>
                  <rect x="0" y="18" width="56" height="12" rx="3" fill="url(#memCross)"/>
                  <defs>
                    <linearGradient id="memCross" x1="0" y1="0" x2="56" y2="68" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#bfdbfe"/>
                      <stop offset="50%" stopColor="#93c5fd"/>
                      <stop offset="100%" stopColor="#60a5fa"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(147,197,253,0.45)', marginBottom: 24, fontFamily: 'Montserrat, sans-serif' }}>
                {s.eyebrow}
              </p>

              <p style={{ fontSize: memorialSlide === 2 ? 28 : 20, fontWeight: memorialSlide === 2 ? 700 : 400, color: 'rgba(255,255,255,0.88)', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: memorialSlide === 0 ? 'italic' : 'normal', lineHeight: 1.7, marginBottom: 16 }}>
                {s.body}
              </p>

              <p style={{ fontSize: memorialSlide === 2 ? 16 : 13, color: 'rgba(147,197,253,0.5)', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginBottom: 48, letterSpacing: memorialSlide === 2 ? 2 : 0 }}>
                {s.sub}
              </p>

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: i === memorialSlide ? 24 : 6, height: 6, borderRadius: 3, background: i === memorialSlide ? 'rgba(147,197,253,0.7)' : 'rgba(255,255,255,0.1)', transition: 'all 0.4s ease' }} />
                ))}
              </div>

              <button
                onClick={() => setMemorialSlide(s => s + 1)}
                style={{ ...primaryBtn, background: 'none', border: '1px solid rgba(147,197,253,0.2)', boxShadow: 'none', color: 'rgba(147,197,253,0.6)', fontSize: 13, letterSpacing: 2, padding: '14px' }}
              >
                {memorialSlide < 2 ? 'Continue' : 'Enter The Altar'}
              </button>
            </div>
          );
        })()}

        {/* ── Welcome ──────────────────────────────────────── */}
        {step === 'welcome' && memorialSlide >= 3 && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            {/* Logo mark */}
            <div style={{ margin: '0 auto 28px', width: 80, animation: 'obGlowPulse 4s ease-in-out infinite', filter: `drop-shadow(0 0 18px ${accent}88) drop-shadow(0 0 40px ${accent}44)` }}>
              <svg width="80" height="96" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="31" y="0" width="18" height="96" rx="5" fill="url(#obCrossGrad)"/>
                <rect x="0" y="26" width="80" height="18" rx="5" fill="url(#obCrossGrad)"/>
                <defs>
                  <linearGradient id="obCrossGrad" x1="0" y1="0" x2="80" y2="96" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#bfdbfe"/>
                    <stop offset="50%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Welcome to<br /><span style={{ color: accent }}>The Altar</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(232,240,236,0.45)', marginBottom: 36, fontFamily: 'Georgia, serif', lineHeight: 1.7 }}>
              Your personal Bible companion.<br />Let&apos;s make it yours.
            </p>

            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: `${accent}66`, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>What should we call you?</p>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: 16, fontSize: 18, fontWeight: 700,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}22`,
                  color: '#fff', outline: 'none', textAlign: 'center',
                  boxShadow: `inset 0 0 20px ${accent}06`,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = `inset 0 0 20px ${accent}0d, 0 0 20px ${accent}15`; }}
                onBlur={e => { e.currentTarget.style.borderColor = `${accent}22`; e.currentTarget.style.boxShadow = `inset 0 0 20px ${accent}06`; }}
              />
            </div>
            <button onClick={goNext} style={primaryBtn}>Get Started</button>
          </div>
        )}

        {/* ── Experience Level ──────────────────────────────── */}
        {step === 'experience' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Where are you<br />on your journey?</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 32, fontFamily: 'Georgia, serif' }}>This helps us show you the right tools.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {EXPERIENCE_OPTIONS.map(opt => {
                const sel = experience === opt.id;
                return (
                  <button key={opt.id} onClick={() => { setExperience(opt.id); setGoals(GOAL_PRESETS[opt.id]); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderRadius: 18, cursor: 'pointer',
                      background: sel ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.02)',
                      border: sel ? `2px solid ${accent}55` : '2px solid rgba(255,255,255,0.05)',
                      textAlign: 'left', transition: 'all 0.3s ease',
                      boxShadow: sel ? `0 4px 20px ${accent}15, inset 0 0 30px ${accent}06` : 'none',
                      transform: sel ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: sel ? `${accent}18` : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, flexShrink: 0,
                      border: sel ? `1px solid ${accent}33` : '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {opt.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: sel ? '#fff' : 'rgba(232,240,236,0.6)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'rgba(232,240,236,0.3)', margin: '4px 0 0', fontFamily: 'Georgia, serif', lineHeight: 1.4 }}>{opt.desc}</p>
                    </div>
                    {sel && <div style={{ width: 24, height: 24, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>✓</span>
                    </div>}
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} disabled={!experience} style={experience ? primaryBtn : disabledBtn}>Continue</button>
          </div>
        )}

        {/* ── Focus Areas ──────────────────────────────────── */}
        {step === 'focus' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>What matters<br />most to you?</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 28, fontFamily: 'Georgia, serif' }}>Pick as many as you want.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
              {FOCUS_OPTIONS.map(opt => {
                const sel = focuses.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => toggleFocus(opt.id)}
                    style={{
                      padding: '20px 12px', borderRadius: 18, cursor: 'pointer', textAlign: 'center',
                      background: sel ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.02)',
                      border: sel ? `2px solid ${accent}55` : '2px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.3s ease',
                      boxShadow: sel ? `0 4px 16px ${accent}15` : 'none',
                      transform: sel ? 'scale(1.03)' : 'scale(1)',
                      position: 'relative', overflow: 'hidden',
                    }}>
                    {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>
                    </div>}
                    <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>{opt.icon}</span>
                    <p style={{ fontSize: 13, fontWeight: 800, color: sel ? '#fff' : 'rgba(232,240,236,0.55)', margin: 0 }}>{opt.label}</p>
                    <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.25)', margin: '4px 0 0', fontFamily: 'Georgia, serif' }}>{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} style={primaryBtn}>{focuses.length > 0 ? 'Continue' : 'Skip for Now'}</button>
          </div>
        )}

        {/* ── Weekly Goals ─────────────────────────────────── */}
        {step === 'goals' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Your Weekly<br />Goals</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 28, fontFamily: 'Georgia, serif' }}>We set defaults for your level. Make them yours.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {([
                { key: 'chapters' as const, label: 'Chapters to Read', icon: '📖', color: '#22c55e' },
                { key: 'prayers' as const, label: 'Times to Pray', icon: '🙏', color: '#f472b6' },
                { key: 'devotionals' as const, label: 'Devotionals', icon: '☀️', color: '#fbbf24' },
                { key: 'quizzes' as const, label: 'Quizzes to Take', icon: '🧠', color: '#60a5fa' },
              ]).map(g => (
                <div key={g.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 18px', borderRadius: 18,
                  background: `linear-gradient(135deg, ${g.color}08, ${g.color}03)`,
                  border: `1px solid ${g.color}18`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 14,
                      background: `${g.color}12`, border: `1px solid ${g.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>{g.icon}</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.7)', margin: 0 }}>{g.label}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => adjustGoal(g.key, -1)} style={{
                      width: 36, height: 36, borderRadius: 12, border: `1px solid ${g.color}22`, cursor: 'pointer',
                      background: `${g.color}08`, color: g.color, fontSize: 18, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>−</button>
                    <span style={{ fontSize: 22, fontWeight: 900, color: g.color, minWidth: 36, textAlign: 'center' }}>{goals[g.key]}</span>
                    <button onClick={() => adjustGoal(g.key, 1)} style={{
                      width: 36, height: 36, borderRadius: 12, border: `1px solid ${g.color}33`, cursor: 'pointer',
                      background: `${g.color}15`, color: g.color, fontSize: 18, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={goNext} style={primaryBtn}>Continue</button>
          </div>
        )}

        {/* ── Theme ────────────────────────────────────────── */}
        {step === 'theme' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Pick Your<br />Look</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 28, fontFamily: 'Georgia, serif' }}>You can always change this later.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 32 }}>
              {THEME_PICKS.map(t => {
                const sel = themeId === t.id;
                return (
                  <button key={t.id} onClick={() => setThemeId(t.id)}
                    style={{
                      padding: '18px 8px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                      background: t.bg === '#fff' ? '#fff' : t.bg === '#000' ? 'rgba(0,0,0,0.8)' : t.bg,
                      border: sel ? `2px solid ${t.accent}` : '2px solid rgba(255,255,255,0.04)',
                      boxShadow: sel ? `0 0 20px ${t.accent}44, 0 0 40px ${t.accent}15` : 'none',
                      transition: 'all 0.3s ease',
                      transform: sel ? 'scale(1.08)' : 'scale(1)',
                    }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', margin: '0 auto 8px',
                      background: `linear-gradient(135deg, ${t.accent}, ${t.accent}88)`,
                      boxShadow: sel ? `0 0 12px ${t.accent}66` : 'none',
                    }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: t.bg === '#fff' ? '#333' : 'rgba(232,240,236,0.5)', margin: 0 }}>{t.label}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} style={primaryBtn}>Continue</button>
          </div>
        )}

        {/* ── Translation ──────────────────────────────────── */}
        {step === 'translation' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Choose Your<br />Translation</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 28, fontFamily: 'Georgia, serif' }}>You can switch anytime while reading.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 32 }}>
              {TRANSLATIONS.map(t => {
                const sel = defaultBible === t.abbr;
                return (
                  <button key={t.abbr} onClick={() => setDefaultBible(t.abbr)}
                    style={{
                      padding: '14px 10px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                      background: sel ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.02)',
                      border: sel ? `2px solid ${accent}55` : '2px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.3s ease',
                      boxShadow: sel ? `0 2px 12px ${accent}20` : 'none',
                      transform: sel ? 'scale(1.04)' : 'scale(1)',
                    }}>
                    <p style={{ fontSize: 17, fontWeight: 900, color: sel ? accent : 'rgba(232,240,236,0.5)', margin: 0 }}>{t.abbr}</p>
                    <p style={{ fontSize: 9, color: sel ? 'rgba(232,240,236,0.5)' : 'rgba(232,240,236,0.2)', margin: '4px 0 0', fontFamily: 'Georgia, serif' }}>{t.desc}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} style={primaryBtn}>Continue</button>
          </div>
        )}

        {/* ── Voice ────────────────────────────────────────── */}
        {step === 'voice' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Pick Your<br />Reading Voice</h2>
            <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', marginBottom: 28, fontFamily: 'Georgia, serif' }}>Tap a name to preview. Tap again to stop.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {ONBOARDING_VOICES.map(v => {
                const sel = voiceId === v.id;
                const previewing = previewingId === v.id;
                return (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18,
                    background: sel ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.02)',
                    border: sel ? `2px solid ${accent}55` : '2px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', transition: 'all 0.3s ease',
                    boxShadow: sel ? `0 4px 20px ${accent}15` : 'none',
                  }} onClick={() => setVoiceId(v.id)}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      background: sel ? `${accent}18` : 'rgba(255,255,255,0.04)',
                      border: sel ? `1px solid ${accent}33` : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    }}>{v.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: sel ? '#fff' : 'rgba(232,240,236,0.6)', margin: 0 }}>{v.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.3)', margin: '3px 0 0', fontFamily: 'Georgia, serif' }}>{v.style}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); previewVoice(v.id); }} style={{
                      width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: previewing ? accent : `${accent}18`,
                      color: previewing ? '#fff' : accent,
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s',
                    }}>
                      {previewing ? '■' : '▶'}
                    </button>
                    {sel && <div style={{ width: 22, height: 22, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>
                    </div>}
                  </div>
                );
              })}
            </div>
            <button onClick={goNext} style={primaryBtn}>Continue</button>
          </div>
        )}

        {/* ── Ready ────────────────────────────────────────── */}
        {step === 'ready' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            {/* Big glowing logo */}
            <div style={{ margin: '0 auto 24px', width: 96, animation: 'obGlowPulse 3s ease-in-out infinite', filter: `drop-shadow(0 0 24px ${accent}99) drop-shadow(0 0 60px ${accent}55)` }}>
              <svg width="96" height="116" viewBox="0 0 96 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="37" y="0" width="22" height="116" rx="6" fill="url(#obCrossGrad2)"/>
                <rect x="0" y="30" width="96" height="22" rx="6" fill="url(#obCrossGrad2)"/>
                <defs>
                  <linearGradient id="obCrossGrad2" x1="0" y1="0" x2="96" y2="116" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#bfdbfe"/>
                    <stop offset="50%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              You&apos;re ready{name ? ',' : ''}<br />{name && <span style={{ color: accent }}>{name}</span>}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(232,240,236,0.4)', marginBottom: 28, fontFamily: 'Georgia, serif', lineHeight: 1.7 }}>
              Your experience has been personalized.
            </p>

            {/* Summary card */}
            <div style={{
              padding: '20px', borderRadius: 20, marginBottom: 32,
              background: `linear-gradient(135deg, ${accent}08, ${accent}03)`,
              border: `1px solid ${accent}18`,
              boxShadow: `inset 0 0 30px ${accent}05`,
            }}>
              {[
                { label: 'Level', value: EXPERIENCE_OPTIONS.find(e => e.id === experience)?.label || 'Beginner', icon: EXPERIENCE_OPTIONS.find(e => e.id === experience)?.icon || '🌱' },
                { label: 'Weekly Reading', value: `${goals.chapters} chapters`, icon: '📖' },
                { label: 'Weekly Prayer', value: `${goals.prayers} times`, icon: '🙏' },
                { label: 'Translation', value: defaultBible, icon: '📜' },
              ].map((item, i) => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < 3 ? `1px solid ${accent}0a` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>{item.value}</span>
                </div>
              ))}
            </div>

            <button onClick={handleComplete} style={{
              ...primaryBtn,
              fontSize: 16, padding: '18px',
              animation: 'obGlowPulse 3s ease-in-out infinite',
            }}>
              Enter The Altar ✦
            </button>
          </div>
        )}

        {/* ── Step verse — always below content ── */}
        <p style={{
          marginTop: 32, fontSize: 11, color: 'rgba(232,240,236,0.15)',
          fontFamily: 'Georgia, serif', fontStyle: 'italic', textAlign: 'center',
          animation: 'obPulse 6s ease-in-out infinite', paddingBottom: 8,
        }}>
          {STEP_VERSES[step]}
        </p>
      </div>
      </div>

    </div>
  );
}
