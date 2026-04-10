'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuth: (user: any) => void;
  accentColor: string;
}

export default function AuthModal({ open, onClose, onAuth, accentColor }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  if (!open) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setMessage('');
    setShowForgot(false);
  }

  function switchMode(m: 'signin' | 'signup') {
    setMode(m);
    setError('');
    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter a display name.');
      return;
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
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.user) {
          resetForm();
          onAuth(data.user);
          onClose();
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: displayName.trim() },
          },
        });
        if (authError) throw authError;
        if (data.user) {
          // If email confirmation is required, the user object still exists
          // but session may be null
          if (data.session) {
            resetForm();
            onAuth(data.user);
            onClose();
          } else {
            setMessage('Check your email for a confirmation link, then sign in.');
            setMode('signin');
          }
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
      setError('Enter your email address first, then click "Forgot password?"');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Unable to connect. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setMessage('Password reset link sent. Check your email.');
      setShowForgot(false);
    } catch (err: any) {
      setError(err?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }

  // Shared inline styles
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid rgba(255,255,255,0.1)`,
    background: 'rgba(255,255,255,0.04)',
    color: '#e0e0e0',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  };

  const inputFocusColor = accentColor;

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 0',
    borderRadius: 10,
    border: 'none',
    background: accentColor,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'Montserrat, sans-serif',
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'opacity 0.2s, transform 0.1s',
    letterSpacing: '0.02em',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    fontFamily: 'Montserrat, sans-serif',
    color: active ? accentColor : 'rgba(255,255,255,0.45)',
    borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? accentColor : 'transparent',
    cursor: 'pointer',
    transition: 'color 0.2s, border-color 0.2s',
    letterSpacing: '0.03em',
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => { resetForm(); onClose(); }}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-md mx-4"
        style={{
          background: 'linear-gradient(170deg, #111a16 0%, #0d1512 60%, #0a110e 100%)',
          borderRadius: 18,
          border: `1px solid rgba(255,255,255,0.06)`,
          boxShadow: `0 0 80px ${accentColor}12, 0 24px 60px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
        }}
      >
        {/* Decorative top glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 120,
            background: `radial-gradient(ellipse, ${accentColor}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center', position: 'relative' }}>
          {/* Cross icon */}
          <div style={{
            fontSize: 28,
            marginBottom: 6,
            opacity: 0.5,
            filter: `drop-shadow(0 0 8px ${accentColor}40)`,
          }}>
            &#10013;
          </div>
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Trace Bible
          </h2>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 4,
            marginBottom: 0,
          }}>
            {mode === 'signin' ? 'Welcome back' : 'Begin your journey'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          margin: '20px 28px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button"
            style={tabStyle(mode === 'signin')}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            style={tabStyle(mode === 'signup')}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 24px' }}>
          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: '#f87171',
              lineHeight: 1.45,
            }}>
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div style={{
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}30`,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: accentColor,
              lineHeight: 1.45,
            }}>
              {message}
            </div>
          )}

          {/* Display Name (sign up only) */}
          {mode === 'signup' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 6,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Display Name
              </label>
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = inputFocusColor;
                  e.target.style.boxShadow = `0 0 0 2px ${inputFocusColor}20`;
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Email
            </label>
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = inputFocusColor;
                e.target.style.boxShadow = `0 0 0 2px ${inputFocusColor}20`;
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: mode === 'signin' ? 8 : 18 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Password
            </label>
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = inputFocusColor;
                e.target.style.boxShadow = `0 0 0 2px ${inputFocusColor}20`;
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Forgot password (sign in only) */}
          {mode === 'signin' && (
            <div style={{ marginBottom: 18, textAlign: 'right' }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')
            }
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '18px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Continue without account */}
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            Continue without account
          </button>
        </form>
      </div>
    </div>
  );
}
