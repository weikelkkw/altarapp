'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);
  const router = useRouter();

  const MESSAGES = [
    { text: 'He was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought us peace was on Him.', ref: 'Isaiah 53:5' },
    { text: 'While we were still sinners, Christ died for us. Not after we cleaned up. Not after we earned it. While we were still lost.', ref: 'Romans 5:8' },
    { text: 'Neither death nor life, nor angels nor rulers, nor things present nor things to come — nothing will be able to separate you from the love of God.', ref: 'Romans 8:38-39' },
    { text: 'He left the ninety-nine to come find you. That is how much you matter to Him.', ref: 'Luke 15:4' },
    { text: 'Before you were formed in the womb, He knew you. You were never an accident. You were always the plan.', ref: 'Jeremiah 1:5' },
    { text: 'Come to Me, all who are weary and heavy laden, and I will give you rest. His invitation has never been revoked.', ref: 'Matthew 11:28' },
    { text: 'The cross was not Plan B. It was the rescue mission planned before the foundation of the world.', ref: '1 Peter 1:20' },
    { text: 'He does not remember your sins. He has removed them as far as the east is from the west. That is finished.', ref: 'Psalm 103:12' },
    { text: 'You are a new creation. The old has passed away. Everything has become new. That is who you are now.', ref: '2 Corinthians 5:17' },
    { text: 'God is not ashamed to be called your God. Think about that. The Creator of everything — not ashamed of you.', ref: 'Hebrews 11:16' },
  ];

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  useEffect(() => {
    const interval = setInterval(() => setMessageIdx(i => (i + 1) % MESSAGES.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const searchParams = useSearchParams();

  // Check if already signed in (skip if came from logout)
  useEffect(() => {
    if (searchParams.get('logout') === '1') {
      // Sign out first, then show the form
      const supabase = createClient();
      if (supabase) supabase.auth.signOut();
      setCheckingAuth(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) { setCheckingAuth(false); return; }
    const timeout = setTimeout(() => setCheckingAuth(false), 3000);
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      clearTimeout(timeout);
      if (session?.user) router.push('/bible');
      else setCheckingAuth(false);
    }).catch(() => { clearTimeout(timeout); setCheckingAuth(false); });
  }, [router, searchParams]);

  const accent = '#60a5fa';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter a display name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must include at least one uppercase letter.');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError('Password must include at least one number.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreedTerms) {
        setError('Please agree to the Terms of Service and Privacy Policy.');
        return;
      }
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Unable to connect. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (authError) throw authError;
        if (data.user) router.push('/bible');
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { name: displayName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push('/bible');
        } else {
          setMessage('Check your email for a confirmation link, then sign in.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setMessage('Password reset link sent. Check your email.');
    } catch (err: any) {
      setError(err?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }

  // Loading screen while checking auth
  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #000 0%, #020810 30%, #050d1a 60%, #000 100%)',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
          border: `1px solid ${accent}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${accent}20`,
        }}>
          <span style={{ fontSize: 32, color: accent, fontWeight: 900 }}>✦</span>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${accent}33`, borderTopColor: accent, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #000 0%, #020810 30%, #050d1a 60%, #000 100%)',
      fontFamily: "'Montserrat', system-ui, sans-serif",
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Cormorant Garamond for Scripture texture */}
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap" rel="stylesheet" />

      {/* ── Ambient effects ──────────────────────────────── */}
      <style>{`
        @keyframes authFloat1 { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.07; } 50% { transform: translate(40px,-30px) scale(1.2); opacity: 0.14; } }
        @keyframes authFloat2 { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.05; } 50% { transform: translate(-30px,40px) scale(1.1); opacity: 0.1; } }
        @keyframes authStar { 0%,100% { opacity: 0.05; } 50% { opacity: 0.5; } }
        @keyframes authGlow { 0%,100% { box-shadow: 0 0 40px ${accent}20, 0 0 80px ${accent}08; } 50% { box-shadow: 0 0 60px ${accent}30, 0 0 120px ${accent}12; } }
        @keyframes crownRotate { 0% { transform: translateX(-50%) rotate(0deg); } 100% { transform: translateX(-50%) rotate(360deg); } }
        @keyframes scriptureGlow { 0% { background-position: 0% 150%; } 100% { background-position: 0% -50%; } }
        @keyframes authSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Orbs */}
      <div style={{ position: 'absolute', top: '5%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${accent}10, transparent 70%)`, animation: 'authFloat1 14s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, rgba(147,197,253,0.08), transparent 70%)`, animation: 'authFloat2 18s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Stars */}
      {[...Array(25)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${((i * 71 + 13) % 96) + 2}%`,
          top: `${((i * 47 + 19) % 94) + 3}%`,
          width: i % 6 === 0 ? 2.5 : 1,
          height: i % 6 === 0 ? 2.5 : 1,
          borderRadius: '50%',
          background: i % 3 === 0 ? '#c4b5fd' : '#93c5fd',
          animation: `authStar ${2.5 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Flowing Scripture texture */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
          transform: 'rotate(-8deg)',
          fontSize: 11, lineHeight: 2.2, fontWeight: 400,
          fontFamily: "'Cormorant Garamond', serif",
          wordSpacing: '0.15em',
          color: 'transparent',
          backgroundImage: `linear-gradient(180deg, ${accent}08 0%, ${accent}08 42%, ${accent}55 48%, ${accent} 50%, ${accent}55 52%, ${accent}08 58%, ${accent}08 100%)`,
          backgroundSize: '100% 300%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          animation: 'scriptureGlow 60s ease-in-out infinite',
        }}>
          {'In the beginning was the Word and the Word was with God and the Word was God The Lord is my shepherd I shall not want He maketh me to lie down in green pastures He leadeth me beside the still waters He restoreth my soul For God so loved the world that He gave His only begotten Son that whosoever believeth in Him should not perish but have everlasting life I am the way the truth and the life no man cometh unto the Father but by me The Lord is my light and my salvation whom shall I fear Trust in the Lord with all thine heart and lean not unto thine own understanding In all thy ways acknowledge Him and He shall direct thy paths Be strong and of good courage fear not for the Lord thy God is with thee whithersoever thou goest Come unto me all ye that labour and are heavy laden and I will give you rest For I know the plans I have for you declares the Lord plans to prosper you and not to harm you plans to give you hope and a future The Lord bless thee and keep thee the Lord make His face shine upon thee and be gracious unto thee I can do all things through Christ which strengtheneth me And we know that all things work together for good to them that love God But they that wait upon the Lord shall renew their strength they shall mount up with wings as eagles they shall run and not be weary The grass withereth the flower fadeth but the word of our God shall stand forever Thy word is a lamp unto my feet and a light unto my path He healeth the broken in heart and bindeth up their wounds Great is our Lord and of great power His understanding is infinite The heavens declare the glory of God and the firmament showeth His handywork Create in me a clean heart O God and renew a right spirit within me Cast thy burden upon the Lord and He shall sustain thee Blessed is the man that walketh not in the counsel of the ungodly The Lord is nigh unto them that are of a broken heart Fear thou not for I am with thee be not dismayed for I am thy God '
            .repeat(4)}
        </div>
      </div>

      {/* Wooden cross — large, behind everything */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)',
        pointerEvents: 'none', userSelect: 'none', opacity: 0.06,
      }}>
        <svg width="500" height="650" viewBox="0 0 200 260" fill="none">
          {/* Wood grain texture lines — vertical beam */}
          <rect x="85" y="10" width="30" height="240" rx="2" fill={accent} opacity="0.3" />
          <rect x="87" y="10" width="26" height="240" rx="1" fill={accent} opacity="0.15" />
          {/* Wood grain lines on vertical */}
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`vg-${i}`} x1={89 + (i % 5) * 5} y1={10 + i * 12} x2={90 + (i % 5) * 5} y2={22 + i * 12}
              stroke={accent} strokeWidth="0.5" opacity="0.2" />
          ))}
          {/* Knots */}
          <circle cx="95" cy="80" r="2" fill={accent} opacity="0.15" />
          <circle cx="105" cy="180" r="1.5" fill={accent} opacity="0.12" />
          <circle cx="92" cy="200" r="2.5" fill={accent} opacity="0.1" />

          {/* Horizontal beam */}
          <rect x="30" y="60" width="140" height="26" rx="2" fill={accent} opacity="0.3" />
          <rect x="30" y="62" width="140" height="22" rx="1" fill={accent} opacity="0.15" />
          {/* Wood grain lines on horizontal */}
          {Array.from({ length: 14 }, (_, i) => (
            <line key={`hg-${i}`} x1={35 + i * 10} y1={64 + (i % 4) * 4} x2={40 + i * 10} y2={64 + (i % 4) * 4}
              stroke={accent} strokeWidth="0.5" opacity="0.2" />
          ))}
          {/* Knots on horizontal */}
          <circle cx="55" cy="72" r="1.8" fill={accent} opacity="0.12" />
          <circle cx="145" cy="68" r="2" fill={accent} opacity="0.1" />

          {/* Nail marks */}
          <circle cx="100" cy="73" r="3" stroke={accent} strokeWidth="1" fill="none" opacity="0.2" />
          <circle cx="50" cy="73" r="2.5" stroke={accent} strokeWidth="0.8" fill="none" opacity="0.15" />
          <circle cx="150" cy="73" r="2.5" stroke={accent} strokeWidth="0.8" fill="none" opacity="0.15" />
          <circle cx="100" cy="210" r="3" stroke={accent} strokeWidth="1" fill="none" opacity="0.2" />

          {/* Shadow/depth on edges */}
          <line x1="85" y1="10" x2="85" y2="250" stroke={accent} strokeWidth="0.8" opacity="0.12" />
          <line x1="115" y1="10" x2="115" y2="250" stroke={accent} strokeWidth="0.8" opacity="0.12" />
          <line x1="30" y1="60" x2="170" y2="60" stroke={accent} strokeWidth="0.8" opacity="0.12" />
          <line x1="30" y1="86" x2="170" y2="86" stroke={accent} strokeWidth="0.8" opacity="0.12" />

          {/* Rough hewn edges — irregular marks */}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`edge-${i}`}
              x1={83 + (i % 2) * 32} y1={20 + i * 28}
              x2={82 + (i % 2) * 34} y2={26 + i * 28}
              stroke={accent} strokeWidth="1.2" opacity="0.08" strokeLinecap="round" />
          ))}

          {/* Subtle glow behind intersection */}
          <circle cx="100" cy="73" r="20" fill={accent} opacity="0.04" />
        </svg>
      </div>

      {/* ── Auth Card ────────────────────────────────────── */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 420, margin: '0 24px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
            border: `1px solid ${accent}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'authGlow 4s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 32, color: accent, fontWeight: 900 }}>✦</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Trace <span style={{ color: accent }}>Bible</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.4)', marginTop: 6, fontFamily: 'Georgia, serif' }}>
            {mode === 'signin' ? 'Welcome back. Continue your journey.' : 'Your personal Bible companion.'}
          </p>

          {/* Social proof */}
          <p style={{ fontSize: 11, color: `${accent}44`, marginTop: 10, fontWeight: 700, letterSpacing: '0.05em' }}>
            Join believers worldwide
          </p>

          {/* Feature preview — only on signup */}
          {mode === 'signup' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
              {[
                { icon: '✦', label: 'AI Study' },
                { icon: '📖', label: 'Reading Plans' },
                { icon: '🙏', label: 'Prayer' },
                { icon: '💬', label: 'Community' },
              ].map(f => (
                <div key={f.label} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{f.icon}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(232,240,236,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Denomination-neutral statement */}
          {mode === 'signup' && (
            <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.25)', marginTop: 14, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              For all believers. Every denomination. Every background.
            </p>
          )}
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(170deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${accent}08`,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }}
                style={{
                  flex: 1, padding: '16px 0', border: 'none', cursor: 'pointer',
                  background: mode === m ? `${accent}08` : 'transparent',
                  borderBottom: mode === m ? `2px solid ${accent}` : '2px solid transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontSize: 14, fontWeight: mode === m ? 800 : 500,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  transition: 'all 0.3s ease',
                }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                fontSize: 13, color: '#f87171',
              }}>{error}</div>
            )}

            {message && (
              <div style={{
                background: `${accent}08`, border: `1px solid ${accent}25`,
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                fontSize: 13, color: accent,
              }}>{message}</div>
            )}

            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: `${accent}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Display Name
                </label>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name" autoComplete="name"
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}18`,
                    color: '#fff', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = `0 0 20px ${accent}12`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `${accent}18`; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: `${accent}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Email
              </label>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}18`,
                  color: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = `0 0 20px ${accent}12`; }}
                onBlur={e => { e.currentTarget.style.borderColor = `${accent}18`; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: mode === 'signin' ? 8 : 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: `${accent}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Password
              </label>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 8 chars, 1 uppercase, 1 number' : 'Your password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}18`,
                  color: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = `0 0 20px ${accent}12`; }}
                onBlur={e => { e.currentTarget.style.borderColor = `${accent}18`; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: `${accent}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Confirm Password
                </label>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${confirmPassword && confirmPassword === password ? '#22c55e33' : accent + '18'}`,
                    color: '#fff', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = `0 0 20px ${accent}12`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = confirmPassword && confirmPassword === password ? '#22c55e33' : `${accent}18`; e.currentTarget.style.boxShadow = 'none'; }}
                />
                {confirmPassword && confirmPassword === password && (
                  <p style={{ fontSize: 10, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>Passwords match</p>
                )}
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>Passwords do not match</p>
                )}
              </div>
            )}

            {mode === 'signin' && (
              <div style={{ marginBottom: 24, textAlign: 'right' }}>
                <button type="button" onClick={handleForgotPassword} disabled={loading}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms checkbox — signup only */}
            {mode === 'signup' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                  style={{ marginTop: 2, accentColor: accent, width: 16, height: 16 }} />
                <span style={{ fontSize: 11, color: 'rgba(232,240,236,0.4)', lineHeight: 1.5 }}>
                  I agree to the <span style={{ color: accent, fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: accent, fontWeight: 600 }}>Privacy Policy</span>
                </span>
              </label>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff',
                fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: `0 4px 24px ${accent}40`,
                opacity: loading ? 0.7 : 1, transition: 'all 0.3s ease',
              }}>
              {loading
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                : (mode === 'signin' ? 'Sign In' : 'Begin Your Journey')}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* Social sign-in */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={async () => {
                  const supabase = createClient();
                  if (!supabase) return;
                  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/bible` } });
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button type="button" onClick={async () => {
                  const supabase = createClient();
                  if (!supabase) return;
                  await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/bible` } });
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.52-3.06-.4C3.79 16.17 4.36 9.02 8.67 8.76c1.25.07 2.12.72 2.88.76.97-.2 1.9-.77 2.93-.7 1.24.1 2.17.58 2.78 1.48-2.56 1.53-1.95 4.89.6 5.82-.47 1.21-.68 1.75-1.28 2.82-.93 1.64-2.24 3.28-3.53 3.34zM12.05 8.68c-.15-2.23 1.66-4.15 3.74-4.34.28 2.38-2.07 4.5-3.74 4.34z"/></svg>
                Apple
              </button>
            </div>

          </form>
        </div>

        {/* Bottom carousel — bold, moving messages */}
        <style>{`
          @keyframes authMsgFade { 0% { opacity: 0; transform: translateY(12px); } 8% { opacity: 1; transform: translateY(0); } 88% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-12px); } }
        `}</style>
        <div style={{ marginTop: 32, textAlign: 'center', minHeight: 80 }}>
          <p key={messageIdx} style={{
            fontSize: 14, fontWeight: 700, color: 'rgba(232,240,236,0.35)',
            fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.7,
            maxWidth: 360, margin: '0 auto',
            animation: 'authMsgFade 6s ease-in-out',
          }}>
            &ldquo;{MESSAGES[messageIdx].text}&rdquo;
          </p>
          <p key={`ref-${messageIdx}`} style={{
            fontSize: 11, fontWeight: 800, color: `${accent}33`, marginTop: 8,
            letterSpacing: '0.05em',
            animation: 'authMsgFade 6s ease-in-out',
          }}>
            — {MESSAGES[messageIdx].ref}
          </p>
        </div>
      </div>
    </div>
  );
}
