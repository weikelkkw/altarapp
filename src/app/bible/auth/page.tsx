'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

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

function AuthPageInner() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const gold = '#c9a84c';

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 14000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (searchParams.get('logout') === '1') {
      const s = createClient(); if (s) s.auth.signOut();
      return;
    }
    const s = createClient();
    if (!s) return;
    setCheckingAuth(true);
    const t = setTimeout(() => setCheckingAuth(false), 3000);
    s.auth.getSession().then(({ data: { session } }: any) => {
      clearTimeout(t);
      const next = searchParams.get('next') || '/bible';
      if (session?.user) router.push(next); else setCheckingAuth(false);
    }).catch(() => { clearTimeout(t); setCheckingAuth(false); });
  }, [router, searchParams]);

  async function ensureProfile(sb: any, authId: string, name: string) {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#00d084'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await sb.from('trace_profiles').upsert(
      { auth_id: authId, display_name: name || 'Friend', avatar_color: color },
      { onConflict: 'auth_id', ignoreDuplicates: true }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    if (mode === 'signup') {
      if (!displayName.trim()) { setError('Please enter a display name.'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (!/[A-Z]/.test(password)) { setError('Password must include at least one uppercase letter.'); return; }
      if (!/[0-9]/.test(password)) { setError('Password must include at least one number.'); return; }
      if (!/[^A-Za-z0-9]/.test(password)) { setError('Password must include at least one special character (e.g. !, @, #, $).'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (!agreedTerms) { setError('Please agree to the Terms of Service and Privacy Policy.'); return; }
    }
    const sb = createClient();
    if (!sb) { setError('Unable to connect. Please try again later.'); return; }
    const nextUrl = searchParams.get('next') || '/bible';
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { data, error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        if (data.user) {
          await ensureProfile(sb, data.user.id, data.user.user_metadata?.name || email.split('@')[0]);
          try { localStorage.setItem('trace-onboarding-done', 'true'); localStorage.setItem(`trace-onboarding-done-${data.user.id}`, 'true'); } catch {}
          router.push(nextUrl);
        }
      } else {
        const { data, error: err } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { name: displayName.trim() } } });
        if (err) throw err;
        if (data.session && data.user) { await ensureProfile(sb, data.user.id, displayName.trim()); router.push(nextUrl); }
        else { setMessage('Check your email for a confirmation link, then sign in.'); setMode('signin'); }
      }
    } catch (err: any) { setError(err?.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    setError(''); setMessage('');
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    const sb = createClient(); if (!sb) return;
    setLoading(true);
    try {
      const { error: err } = await sb.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      setMessage('Password reset link sent. Check your email.');
    } catch (err: any) { setError(err?.message || 'Could not send reset email.'); }
    finally { setLoading(false); }
  }

  if (checkingAuth) {
    return (
      <div suppressHydrationWarning style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div suppressHydrationWarning style={{ width: 28, height: 28, borderRadius: 14, border: `2px solid ${gold}22`, borderTopColor: gold, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#000', fontFamily: "'Montserrat', system-ui, sans-serif",
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        @keyframes altarGlow   { 0%,100% { opacity: 0.18; } 50% { opacity: 0.32; } }
        @keyframes altarStar   { 0%,100% { opacity: 0.06; } 50% { opacity: 0.55; } }
        @keyframes altarMsg    { 0% { opacity:0; transform:translateY(10px); } 8% { opacity:1; transform:translateY(0); } 88% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-8px); } }
        @keyframes altarPulse  { 0%,100% { box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 80px ${gold}0a; } 50% { box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 120px ${gold}18; } }
        @keyframes scriptScroll{ 0% { background-position: 0% 100%; } 100% { background-position: 0% -100%; } }
        @keyframes shimLine    { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes spin        { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Altar fire glow ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', bottom: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: '80vw', height: '55vh',
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${gold}28 0%, ${gold}10 35%, transparent 70%)`,
          animation: 'altarGlow 5s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '100vw', height: '50vh',
          background: 'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(120,30,10,0.22) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)',
        }} />
      </div>

      {/* ── Stars ── */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: `${((i * 73 + 11) % 96) + 2}%`,
          top: `${((i * 41 + 7) % 70) + 2}%`,
          width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: i % 4 === 0 ? gold : 'rgba(255,255,255,0.55)',
          animation: `altarStar ${3 + (i % 5)}s ease-in-out ${i * 0.18}s infinite`,
          pointerEvents: 'none', zIndex: 0,
        }} />
      ))}

      {/* ── Flowing scripture background ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', userSelect: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%', right: '-5%', bottom: '-10%',
          transform: 'rotate(-6deg)',
          fontSize: 10, lineHeight: 2.6, fontFamily: 'Georgia, serif', fontWeight: 300,
          color: 'transparent',
          backgroundImage: `linear-gradient(180deg, ${gold}04 0%, ${gold}04 40%, ${gold}22 48%, ${gold}44 50%, ${gold}22 52%, ${gold}04 60%, ${gold}04 100%)`,
          backgroundSize: '100% 200%',
          backgroundClip: 'text', WebkitBackgroundClip: 'text',
          animation: 'scriptScroll 80s linear infinite',
        }}>
          {'The Lord is my shepherd I shall not want In the beginning was the Word and the Word was with God and the Word was God For God so loved the world that He gave His only begotten Son Come unto me all ye that labour and I will give you rest The Lord bless thee and keep thee the Lord make His face shine upon thee I am the way the truth and the life no man cometh unto the Father but by me He was pierced for our transgressions He was crushed for our iniquities the punishment that brought us peace was upon Him And the Word became flesh and dwelt among us full of grace and truth I will never leave thee nor forsake thee Fear thou not for I am with thee be not dismayed for I am thy God I will strengthen thee yea I will help thee The Lord is my light and my salvation whom shall I fear Create in me a clean heart O God and renew a right spirit within me Great is Thy faithfulness O God my Father morning by morning new mercies I see '.repeat(6)}
        </div>
      </div>

      {/* ── Large cross silhouette ── */}
      <div style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0, opacity: 0.07 }}>
        <svg width="340" height="480" viewBox="0 0 170 240" fill="none">
          <rect x="76" y="0" width="18" height="240" rx="1.5" fill={gold} />
          <rect x="20" y="50" width="130" height="18" rx="1.5" fill={gold} />
        </svg>
      </div>
      <div style={{
        position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${gold}14 0%, transparent 70%)`,
        animation: 'altarGlow 6s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <div style={{
          textAlign: 'center', padding: '48px 24px 24px',
          opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(24px)',
          transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Cross icon */}
          <div style={{ marginBottom: 24 }}>
            <svg width="40" height="56" viewBox="0 0 40 56" fill="none" style={{ filter: `drop-shadow(0 0 12px ${gold}66)` }}>
              <rect x="17" y="0" width="6" height="56" rx="1" fill={gold} />
              <rect x="4" y="14" width="32" height="6" rx="1" fill={gold} />
            </svg>
          </div>

          {/* Wordmark */}
          <div style={{ marginBottom: 6, position: 'relative' }}>
            <div style={{
              fontSize: 'clamp(42px, 12vw, 68px)', fontWeight: 900,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: 'Montserrat, system-ui, sans-serif', lineHeight: 1,
              backgroundImage: `linear-gradient(160deg, #fff 0%, ${gold} 60%, ${gold}99 100%)`,
              backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
              filter: `drop-shadow(0 0 28px #60a5fa66) drop-shadow(0 0 60px #60a5fa22)`,
              position: 'relative',
            }}>
              THE ALTAR
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 4, pointerEvents: 'none' }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: '20%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'shimLine 5s ease-in-out 2s infinite',
                }} />
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: `${gold}77`, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600, marginTop: 12 }}>
            The Ultimate Bible Study App.
          </p>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px auto', maxWidth: 280 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${gold}44)` }} />
            <span style={{ color: `${gold}66`, fontSize: 10 }}>✦</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${gold}44, transparent)` }} />
          </div>

          {/* Scripture quote — fixed height, no layout shift */}
          <div style={{ height: 72, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <p key={msgIdx} style={{
              fontSize: 11, fontWeight: 400,
              color: 'rgba(255,255,255,0.62)', fontFamily: 'Georgia, serif',
              fontStyle: 'italic', lineHeight: 1.65, maxWidth: 340,
              textAlign: 'center', animation: 'altarMsg 14s ease-in-out',
              margin: '0 auto 5px',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              &ldquo;{MESSAGES[msgIdx].text}&rdquo;
            </p>
            <p key={`r-${msgIdx}`} style={{
              fontSize: 9, fontWeight: 800, color: gold,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              animation: 'altarMsg 14s ease-in-out', opacity: 0.65,
            }}>
              {MESSAGES[msgIdx].ref}
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div style={{
          width: '100%', maxWidth: 440, margin: '0 auto', padding: '0 20px 60px',
          opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(32px)',
          transition: 'all 0.9s cubic-bezier(0.4,0,0.2,1) 0.15s',
        }}>
          <div style={{
            background: 'linear-gradient(170deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            borderRadius: 28, overflow: 'hidden',
            border: `1px solid ${gold}22`,
            boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 80px ${gold}0a`,
            animation: 'altarPulse 6s ease-in-out infinite',
            backdropFilter: 'blur(24px)',
          }}>
            {/* Gold top bar */}
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${gold}88 30%, ${gold} 50%, ${gold}88 70%, transparent 100%)` }} />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${gold}18` }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }} style={{
                  flex: 1, padding: '20px 12px', border: 'none', cursor: 'pointer',
                  background: mode === m ? `${gold}0c` : 'transparent',
                  borderBottom: mode === m ? `2px solid ${gold}` : '2px solid transparent',
                  color: mode === m ? gold : 'rgba(255,255,255,0.3)',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                  lineHeight: 1.6, transition: 'all 0.3s ease', fontFamily: 'Montserrat, system-ui, sans-serif',
                }}>
                  {m === 'signin' ? <>Return to<br />the Altar</> : <>Come for<br />the First Time</>}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '28px 28px 32px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
                  {error}
                </div>
              )}
              {message && (
                <div style={{ background: `${gold}0a`, border: `1px solid ${gold}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: gold, lineHeight: 1.5 }}>
                  {message}
                </div>
              )}

              {mode === 'signup' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: `${gold}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Your Name</label>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="What shall we call you?" autoComplete="name"
                    style={{ width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: `1px solid ${gold}20`, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${gold}55`; e.currentTarget.style.boxShadow = `0 0 20px ${gold}10`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = `${gold}20`; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: `${gold}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Email</label>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: `1px solid ${gold}20`, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${gold}55`; e.currentTarget.style.boxShadow = `0 0 20px ${gold}10`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `${gold}20`; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginBottom: mode === 'signin' ? 10 : 18 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: `${gold}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Password</label>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 8 chars, uppercase, number, symbol' : '••••••••'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: `1px solid ${gold}20`, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${gold}55`; e.currentTarget.style.boxShadow = `0 0 20px ${gold}10`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `${gold}20`; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {mode === 'signup' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: `${gold}66`, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Confirm Password</label>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password" autoComplete="new-password"
                    style={{ width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: `1px solid ${confirmPassword && confirmPassword === password ? '#22c55e44' : gold + '20'}`, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${gold}55`; e.currentTarget.style.boxShadow = `0 0 20px ${gold}10`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = confirmPassword && confirmPassword === password ? '#22c55e44' : `${gold}20`; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {confirmPassword && confirmPassword === password && <p style={{ fontSize: 10, color: '#22c55e', marginTop: 5, fontWeight: 700 }}>Passwords match ✓</p>}
                  {confirmPassword && confirmPassword !== password && <p style={{ fontSize: 10, color: '#f87171', marginTop: 5, fontWeight: 700 }}>Passwords do not match</p>}
                </div>
              )}

              {mode === 'signin' && (
                <div style={{ marginBottom: 24, textAlign: 'right' }}>
                  <button type="button" onClick={handleForgotPassword} disabled={loading}
                    style={{ background: 'none', border: 'none', color: `${gold}55`, fontSize: 12, cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'inherit' }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 22, cursor: 'pointer' }}>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                    style={{ marginTop: 2, accentColor: gold, width: 16, height: 16 }} />
                  <span style={{ fontSize: 11, color: 'rgba(232,240,236,0.35)', lineHeight: 1.6 }}>
                    I agree to the <Link href="/bible/terms" style={{ color: gold, fontWeight: 700, textDecoration: 'none' }}>Terms of Service</Link> and <Link href="/bible/privacy" style={{ color: gold, fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>
                  </span>
                </label>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '20px', borderRadius: 20, border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                background: loading ? `${gold}22` : gold,
                color: loading ? `${gold}55` : '#000',
                fontSize: 14, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase',
                boxShadow: loading ? 'none' : `0 0 30px ${gold}40, 0 4px 16px ${gold}30`,
                transition: 'all 0.2s ease', fontFamily: 'Montserrat, system-ui, sans-serif',
              }}>
                {loading ? '···' : 'The Entrance'}
              </button>


            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  );
}
