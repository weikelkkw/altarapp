'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserIdentity, AVATAR_COLORS } from '../types';
import { createClient } from '@/lib/supabase/client';

type ThemeId = string;

// Curated voice preferences — 3 male, 3 female
// We match against available system voices by keywords
const CURATED_VOICES: { label: string; gender: 'male' | 'female'; keywords: string[] }[] = [
  { label: 'Sarah', gender: 'female', keywords: ['Samantha', 'Karen', 'Google US English', 'Microsoft Zira', 'Fiona'] },
  { label: 'Grace', gender: 'female', keywords: ['Victoria', 'Moira', 'Google UK English Female', 'Microsoft Hazel', 'Tessa'] },
  { label: 'Abigail', gender: 'female', keywords: ['Allison', 'Ava', 'Susan', 'Catherine', 'Kate'] },
  { label: 'David', gender: 'male', keywords: ['Daniel', 'Alex', 'Google US English', 'Microsoft David', 'Tom'] },
  { label: 'James', gender: 'male', keywords: ['Oliver', 'James', 'Google UK English Male', 'Microsoft Mark', 'Fred'] },
  { label: 'Samuel', gender: 'male', keywords: ['Aaron', 'Rishi', 'Luca', 'Thomas', 'Ralph'] },
];

interface Props {
  open: boolean;
  onClose: () => void;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  themes: Record<string, { accent: string; label: string; group?: string }>;
  themeGroups?: { id: string; label: string; icon: string }[];
  accentColor: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  setFontSize: (s: 'sm' | 'base' | 'lg' | 'xl') => void;
  userIdentity: UserIdentity;
  setUserIdentity: (u: UserIdentity) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (v: string) => void;
  ttsRate: number;
  setTtsRate: (v: number) => void;
  ttsMode?: 'narrator' | 'crafted';
  setTtsMode?: (m: 'narrator' | 'crafted') => void;
  defaultBible?: string;
  onSetDefaultBible?: (abbr: string) => void;
  isSignedIn?: boolean;
  userName?: string;
  onSignOut?: () => void | Promise<void>;
  onOpenAuth?: () => void;
  scriptureBackground?: boolean;
  setScriptureBackground?: (v: boolean) => void;
  authUser?: { id: string } | null;
}

export default function SettingsPanel({
  open, onClose,
  themeId, setThemeId, themes, themeGroups, accentColor,
  fontSize, setFontSize,
  userIdentity, setUserIdentity,
  ttsEnabled, setTtsEnabled, ttsVoice, setTtsVoice, ttsRate, setTtsRate,
  ttsMode, setTtsMode,
  defaultBible, onSetDefaultBible,
  isSignedIn, userName, onSignOut, onOpenAuth,
  scriptureBackground, setScriptureBackground,
  authUser,
}: Props) {
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [matchedVoices, setMatchedVoices] = useState<{ label: string; gender: 'male' | 'female'; voiceName: string }[]>([]);
  const [editName, setEditName] = useState(userIdentity.name);
  const [editBio, setEditBio] = useState(userIdentity.bio || '');
  const [editVerse, setEditVerse] = useState(userIdentity.favoriteVerse || '');
  const [nameEditing, setNameEditing] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Draft state — buffer all changes until "Save" is pressed
  const [draftIdentity, setDraftIdentity] = useState<UserIdentity>({ ...userIdentity });
  const [draftThemeId, setDraftThemeId] = useState(themeId);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftTtsEnabled, setDraftTtsEnabled] = useState(ttsEnabled);
  const [draftTtsVoice, setDraftTtsVoice] = useState(ttsVoice);
  const [draftTtsRate, setDraftTtsRate] = useState(ttsRate);
  const [draftBible, setDraftBible] = useState(defaultBible || 'KJV');
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'voice' | 'account'>('profile');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  // Reset drafts when panel opens
  useEffect(() => {
    if (open) {
      setDraftIdentity({ ...userIdentity });
      setDraftThemeId(themeId);
      setDraftFontSize(fontSize);
      setDraftTtsEnabled(ttsEnabled);
      setDraftTtsVoice(ttsVoice);
      setDraftTtsRate(ttsRate);
      setDraftBible(defaultBible || 'KJV');
      setEditName(userIdentity.name);
      setEditBio(userIdentity.bio || '');
      setEditVerse(userIdentity.favoriteVerse || '');
      setHasChanges(false);
      setSaved(false);
    }
  }, [open]);

  const markChanged = () => { setHasChanges(true); setSaved(false); };

  const handleSaveAll = async () => {
    setSaving(true);
    // Commit identity locally
    setUserIdentity(draftIdentity);
    localStorage.setItem('trace-identity', JSON.stringify(draftIdentity));
    // Commit appearance
    setThemeId(draftThemeId);
    setFontSize(draftFontSize);
    // Commit TTS
    setTtsEnabled(draftTtsEnabled);
    setTtsVoice(draftTtsVoice);
    setTtsRate(draftTtsRate);
    // Commit default Bible
    if (onSetDefaultBible) onSetDefaultBible(draftBible);
    setHasChanges(false);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);

    // Sync to Supabase
    if (authUser?.id) {
      try {
        const sb = createClient();
        if (sb) {
          const { bio, testimony, dateOfBirth, location, church, savedDate, baptismDate,
            denomination, favoriteVerse, favoriteBook, spiritualGifts, prayerFor, lifeVerse,
            mentor, discipling, ministryRole, readingGoal, favoriteHymn, favoritePreacher,
            profilePicture, isPublic } = draftIdentity;
          await sb.from('trace_profiles').update({
            display_name: draftIdentity.name,
            avatar_color: draftIdentity.color,
            experience_level: draftIdentity.experienceLevel,
            is_public: isPublic !== false,
            ...(draftIdentity.username ? { username: draftIdentity.username.toLowerCase().replace(/[^a-z0-9_]/g, '') } : {}),
            profile_data: {
              bio, testimony, dateOfBirth, location, church, savedDate, baptismDate,
              denomination, favoriteVerse, favoriteBook, spiritualGifts, prayerFor, lifeVerse,
              mentor, discipling, ministryRole, readingGoal, favoriteHymn, favoritePreacher,
              profilePicture,
            },
            settings_data: {
              themeId: draftThemeId,
              fontSize: draftFontSize,
              ttsEnabled: draftTtsEnabled,
              ttsVoice: draftTtsVoice,
              ttsRate: draftTtsRate,
              defaultBible: draftBible,
            },
          }).eq('auth_id', authUser.id);
        }
      } catch { /* silent — local save already done */ }
    }
  };

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setPreviewingVoiceId(null);
    setPreviewLoadingId(null);
  }, []);

  const previewVoice = useCallback((voiceId: string) => {
    // If already previewing this voice, stop it
    if (previewingVoiceId === voiceId) { stopPreview(); return; }
    // Stop any currently playing preview
    stopPreview();
    setPreviewLoadingId(voiceId);
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'The Lord is my shepherd, I shall not want. He makes me lie down in green pastures.', voiceId }),
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      setPreviewLoadingId(null);
      setPreviewingVoiceId(voiceId);
      audio.play();
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewingVoiceId(null); };
    }).catch(() => { setPreviewLoadingId(null); setPreviewingVoiceId(null); });
  }, [previewingVoiceId, stopPreview]);

  // Load and match voices
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      const english = v.filter(voice => voice.lang.startsWith('en'));
      setAllVoices(english.length > 0 ? english : v);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Match curated labels to actual system voices
  useEffect(() => {
    if (allVoices.length === 0) return;
    const matched: typeof matchedVoices = [];
    for (const curated of CURATED_VOICES) {
      const found = allVoices.find(v =>
        curated.keywords.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
      );
      if (found) {
        matched.push({ label: curated.label, gender: curated.gender, voiceName: found.name });
      }
    }
    // If we couldn't match enough, fill with first available voices
    if (matched.length < 3 && allVoices.length > 0) {
      const used = new Set(matched.map(m => m.voiceName));
      const remaining = allVoices.filter(v => !used.has(v.name));
      const labels = ['Voice 1', 'Voice 2', 'Voice 3', 'Voice 4', 'Voice 5', 'Voice 6'];
      let idx = matched.length;
      for (const v of remaining) {
        if (idx >= 6) break;
        matched.push({ label: labels[idx], gender: idx % 2 === 0 ? 'female' : 'male', voiceName: v.name });
        idx++;
      }
    }
    setMatchedVoices(matched.slice(0, 6));
  }, [allVoices]);

  const testVoice = (voiceName?: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('For God so loved the world, that he gave his only begotten Son.');
    const name = voiceName || ttsVoice;
    const selected = allVoices.find(v => v.name === name);
    if (selected) utterance.voice = selected;
    utterance.rate = ttsRate;
    window.speechSynthesis.speak(utterance);
  };

  const saveIdentity = (updates: Partial<UserIdentity>) => {
    setDraftIdentity(prev => ({ ...prev, ...updates }));
    markChanged();
  };

  const handleProfilePicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('Image must be under 15MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Resize to 200x200 for storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
        saveIdentity({ profilePicture: canvas.toDataURL('image/jpeg', 0.85) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  const id = draftIdentity;

  // ── Profile completion ──────────────────────────────────────
  const profileFields = [id.bio, id.testimony, id.favoriteVerse, id.location, id.church, id.savedDate, id.lifeVerse, id.ministryRole, id.favoriteBook, id.favoritePreacher];
  const filledCount = profileFields.filter(Boolean).length + (id.profilePicture ? 1 : 0) + ((id.spiritualGifts || []).length > 0 ? 1 : 0);
  const totalFields = profileFields.length + 2;
  const completionPct = Math.round((filledCount / totalFields) * 100);
  const completionMessages = [
    'Add your testimony to encourage others',
    'Share your church home',
    'Add your life verse',
    'Share your spiritual gifts',
    'Tell us who you\'re discipling',
    'Your profile is coming together',
    'Almost there — add a few more details',
    'Looking great — a few finishing touches',
    'Your profile is rich and full',
  ];
  const completionMsg = completionMessages[Math.floor((completionPct / 100) * (completionMessages.length - 1))];

  // ── Shared design tokens ────────────────────────────────────
  const BG = '#050908';
  const CARD_BG = 'rgba(255,255,255,0.028)';
  const CARD_BORDER = 'rgba(255,255,255,0.07)';
  const TEXT_PRIMARY = '#e8f0ec';
  const TEXT_MUTED = 'rgba(232,240,236,0.38)';
  const TEXT_FAINT = 'rgba(232,240,236,0.18)';

  /* ── Reusable UI primitives ──────────────────────────────── */

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 52, height: 30, borderRadius: 15, position: 'relative',
        background: value ? accentColor : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', transition: 'background 0.25s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 5, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s', boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        left: value ? 27 : 5,
      }} />
    </button>
  );

  const SectionDivider = ({ icon, title }: { icon: string; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 16px' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_MUTED, fontFamily: 'Montserrat, system-ui' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );

  const PremiumCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: 20,
      padding: '24px',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );

  const FieldLabel = ({ text }: { text: string }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_MUTED, marginBottom: 8, fontFamily: 'Montserrat, system-ui' }}>{text}</div>
  );

  const PremiumInput = ({
    label, value, onChange, placeholder, type = 'text', prefix,
  }: {
    label: string; value?: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; prefix?: string;
  }) => (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel text={label} />
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: accentColor, fontWeight: 700, fontSize: 15, zIndex: 1 }}>{prefix}</span>
        )}
        <input
          autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={e => {
            e.target.style.borderColor = `${accentColor}44`;
            e.target.style.boxShadow = `0 0 0 3px ${accentColor}10`;
          }}
          onBlur={e => {
            e.target.style.borderColor = 'rgba(255,255,255,0.08)';
            e.target.style.boxShadow = 'none';
          }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: prefix ? '14px 16px 14px 32px' : '14px 16px',
            fontSize: 15,
            color: TEXT_PRIMARY,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box' as const,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
      </div>
    </div>
  );

  const PremiumTextarea = ({
    label, value, onChange, placeholder, rows = 4, maxLength, decorative,
  }: {
    label: string; value?: string; onChange: (v: string) => void;
    placeholder?: string; rows?: number; maxLength?: number; decorative?: boolean;
  }) => (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel text={label} />
      <div style={{ position: 'relative' }}>
        {decorative && (
          <div style={{
            position: 'absolute', top: 12, left: 14, fontSize: 32, color: `${accentColor}18`,
            fontFamily: 'Georgia, serif', lineHeight: 1, pointerEvents: 'none', zIndex: 0,
          }}>"</div>
        )}
        <textarea
          autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          onFocus={e => {
            (e.target as HTMLTextAreaElement).style.borderColor = `${accentColor}44`;
            (e.target as HTMLTextAreaElement).style.boxShadow = `0 0 0 3px ${accentColor}10`;
          }}
          onBlur={e => {
            (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.08)';
            (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
          }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: decorative ? '14px 16px 14px 44px' : '14px 16px',
            fontSize: 15,
            color: TEXT_PRIMARY,
            outline: 'none',
            resize: 'none' as const,
            fontFamily: decorative ? 'Georgia, serif' : 'inherit',
            lineHeight: '1.7',
            boxSizing: 'border-box' as const,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            position: 'relative',
            zIndex: 1,
          }}
        />
        {maxLength && (
          <div style={{ textAlign: 'right' as const, marginTop: 6, fontSize: 10, color: TEXT_FAINT }}>
            {(value || '').length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'appearance' as const, label: 'Look' },
    { id: 'voice' as const, label: 'Voice' },
    { id: 'account' as const, label: 'Account' },
  ];

  // ── Voice card render helper ────────────────────────────────
  const VoiceCard = ({ v }: { v: { id: string; name: string; style: string; emoji: string } }) => {
    const vid = v.id.replace('eleven:', '');
    const isSelected = draftTtsVoice === v.id;
    const isPreviewing = previewingVoiceId === vid;
    const isLoading = previewLoadingId === vid;
    return (
      <div style={{
        borderRadius: 18, padding: '18px 14px 14px',
        background: isSelected ? `${accentColor}14` : 'rgba(255,255,255,0.025)',
        border: isSelected ? `1.5px solid ${accentColor}55` : `1px solid rgba(255,255,255,0.06)`,
        boxShadow: isSelected ? `0 0 20px ${accentColor}18` : 'none',
        transition: 'all 0.2s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        minHeight: 130,
      }}>
        <span style={{ fontSize: 24 }}>{v.emoji}</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? accentColor : TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui', textAlign: 'center' as const }}>{v.name}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic', textAlign: 'center' as const, lineHeight: '1.4' }}>{v.style}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', width: '100%' }}>
          <button
            onClick={() => previewVoice(vid)}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: isPreviewing ? `${accentColor}30` : `${accentColor}0e`,
              color: isPreviewing ? accentColor : `${accentColor}77`,
              transition: 'all 0.15s',
            }}>
            {isLoading ? '...' : isPreviewing ? '■ Stop' : '▶ Preview'}
          </button>
          <button
            onClick={() => { setDraftTtsVoice(v.id); setTtsVoice(v.id); markChanged(); }}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: isSelected ? accentColor : 'rgba(255,255,255,0.06)',
              color: isSelected ? '#050908' : TEXT_MUTED,
              transition: 'all 0.15s',
            }}>
            {isSelected ? '✓ Active' : 'Select'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'stretch' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', marginLeft: 'auto', width: '100%', maxWidth: 440,
        height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: BG,
        borderLeft: `1px solid rgba(255,255,255,0.06)`,
        overflowY: 'auto',
      }}>

        {/* ── Sticky Header ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: `linear-gradient(180deg, ${BG} 75%, transparent)`,
          paddingBottom: 4,
        }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 20px' }}>
            <div>
              <div style={{ fontFamily: 'Montserrat, system-ui', fontWeight: 800, fontSize: 24, color: TEXT_PRIMARY, letterSpacing: '-0.03em' }}>Settings</div>
              <div style={{ fontSize: 12, color: `${accentColor}50`, marginTop: 3, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Your Altar, your way</div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)', color: TEXT_MUTED,
                fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
          </div>

          {/* Tab bar — floating pills */}
          <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px' }}>
            {tabs.map(t => {
              const active = settingsTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSettingsTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 40,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'Montserrat, system-ui',
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s',
                    background: active ? accentColor : 'transparent',
                    color: active ? '#050908' : TEXT_MUTED,
                    boxShadow: active ? `0 4px 16px ${accentColor}30` : 'none',
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '0 24px 140px', flex: 1 }}>

          {/* ════════════════════════════════════════
              PROFILE TAB
          ════════════════════════════════════════ */}
          {settingsTab === 'profile' && (
            <div>

              {/* ── Avatar Banner ── */}
              <div style={{
                width: 'calc(100% + 48px)',
                marginLeft: -24,
                height: 160,
                background: `linear-gradient(135deg, ${id.color}55 0%, ${id.color}22 50%, ${BG} 100%)`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 0,
                marginBottom: 60,
              }}>
                {/* Avatar circle */}
                <div style={{ position: 'absolute', bottom: -44, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <div
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {id.profilePicture ? (
                      <img
                        src={id.profilePicture}
                        alt="Profile"
                        style={{
                          width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
                          border: `3px solid ${BG}`,
                          boxShadow: `0 0 0 2px ${id.color}55, 0 12px 32px rgba(0,0,0,0.5)`,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 88, height: 88, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${id.color}, ${id.color}88)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 34, fontWeight: 900, color: '#fff',
                        border: `3px solid ${BG}`,
                        boxShadow: `0 0 0 2px ${id.color}55, 0 12px 32px ${id.color}30`,
                      }}>
                        {(id.name[0] || '?').toUpperCase()}
                      </div>
                    )}
                    {/* Camera overlay */}
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 26, height: 26, borderRadius: '50%',
                      background: accentColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>📷</div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicture} />
                  </div>
                </div>
              </div>

              {/* ── Name & Username ── */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {nameEditing ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, justifyContent: 'center' }}>
                    <input
                      autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); } }}
                      autoFocus
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: `1px solid ${accentColor}33`,
                        borderRadius: 12, padding: '10px 14px', fontSize: 18, fontWeight: 700,
                        color: TEXT_PRIMARY, outline: 'none', fontFamily: 'Montserrat, system-ui',
                        textAlign: 'center', width: 180,
                      }}
                    />
                    <button
                      onClick={() => { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); }}
                      style={{ background: accentColor, color: '#050908', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Done
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => { setEditName(id.name); setNameEditing(true); }}
                    style={{ cursor: 'pointer', marginBottom: 4 }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 800, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui', letterSpacing: '-0.02em' }}>{id.name}</span>
                    <span style={{ fontSize: 13, color: TEXT_MUTED, marginLeft: 8 }}>✏️</span>
                  </div>
                )}
                {id.username && (
                  <div style={{ fontSize: 14, color: accentColor, fontFamily: 'Montserrat, system-ui', fontWeight: 600 }}>@{id.username}</div>
                )}
                {id.profilePicture ? (
                  <button
                    onClick={() => saveIdentity({ profilePicture: undefined })}
                    style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, textDecoration: 'underline', opacity: 0.7 }}>
                    Remove photo
                  </button>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 12, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, opacity: 0.7 }}>
                    Edit Profile Photo
                  </button>
                )}
              </div>

              {/* ── Color picker ── */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' as const }}>
                {(AVATAR_COLORS || []).slice(0, 12).map((c: string) => (
                  <button
                    key={c}
                    onClick={() => { saveIdentity({ color: c }); markChanged(); }}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      border: id.color === c ? `2px solid ${c}` : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: id.color === c ? `0 0 0 3px rgba(255,255,255,0.3), 0 0 12px ${c}60` : 'none',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>

              {/* ── Profile completion bar ── */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: TEXT_MUTED, fontFamily: 'Montserrat, system-ui' }}>Profile {completionPct}% complete</div>
                  <div style={{ fontSize: 11, color: TEXT_FAINT, fontStyle: 'italic' }}>{completionMsg}</div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completionPct}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)`, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* ── Username field ── */}
              <div style={{ marginBottom: 8 }}>
                <PremiumInput
                  label="Username"
                  value={id.username || ''}
                  onChange={v => saveIdentity({ username: v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) })}
                  placeholder="yourname"
                  prefix="@"
                />
                <div style={{ fontSize: 11, color: TEXT_FAINT, marginTop: -10, marginBottom: 18 }}>3–20 characters · letters, numbers, underscores only · used for friend search</div>
              </div>

              {/* ── Experience Level ── */}
              <SectionDivider icon="🌱" title="Experience Level" />
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                {([
                  { id: 'beginner' as const, label: 'Beginner', icon: '🌱', desc: 'Simple & guided' },
                  { id: 'intermediate' as const, label: 'Growing', icon: '🌿', desc: 'More tools' },
                  { id: 'expert' as const, label: 'Deep', icon: '🌳', desc: 'Everything' },
                ]).map(level => {
                  const isActive = (id.experienceLevel || 'beginner') === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => saveIdentity({ experienceLevel: level.id })}
                      style={{
                        flex: 1, padding: '18px 8px', borderRadius: 18,
                        border: isActive ? `2px solid ${accentColor}55` : `1px solid rgba(255,255,255,0.06)`,
                        background: isActive ? `${accentColor}14` : CARD_BG,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        boxShadow: isActive ? `0 4px 20px ${accentColor}18` : 'none',
                        transition: 'all 0.2s',
                        minHeight: 80,
                      }}>
                      <span style={{ fontSize: 28 }}>{level.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? accentColor : TEXT_MUTED, fontFamily: 'Montserrat, system-ui' }}>{level.label}</span>
                      <span style={{ fontSize: 10, color: TEXT_FAINT, fontStyle: 'italic' }}>{level.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Your Story card ── */}
              <SectionDivider icon="📖" title="Your Story" />
              <PremiumCard>
                <PremiumTextarea
                  label="Short Bio"
                  value={id.bio || ''}
                  onChange={v => saveIdentity({ bio: v })}
                  placeholder="Tell others about your faith journey…"
                  rows={4}
                  maxLength={200}
                />
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 22px' }} />
                <PremiumTextarea
                  label="My Testimony"
                  value={id.testimony || ''}
                  onChange={v => saveIdentity({ testimony: v })}
                  placeholder="How did you come to faith? What has God done in your life?…"
                  rows={6}
                  decorative
                />
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 22px' }} />
                <PremiumInput
                  label="Favorite Verse"
                  value={id.favoriteVerse || ''}
                  onChange={v => saveIdentity({ favoriteVerse: v })}
                  placeholder="e.g. John 3:16, Romans 8:28"
                />
              </PremiumCard>

              {/* ── Personal Details card ── */}
              <SectionDivider icon="🏠" title="Personal Details" />
              <PremiumCard>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <PremiumInput label="Date of Birth" value={id.dateOfBirth} onChange={v => saveIdentity({ dateOfBirth: v })} type="date" />
                  <PremiumInput label="Location" value={id.location} onChange={v => saveIdentity({ location: v })} placeholder="City, State" />
                </div>
                <PremiumInput label="Church Home" value={id.church} onChange={v => saveIdentity({ church: v })} placeholder="Grace Community Church…" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <PremiumInput label="Date Saved" value={id.savedDate} onChange={v => saveIdentity({ savedDate: v })} type="date" />
                  <PremiumInput label="Date Baptized" value={id.baptismDate} onChange={v => saveIdentity({ baptismDate: v })} type="date" />
                </div>
              </PremiumCard>

              {/* ── Spiritual Life card ── */}
              <SectionDivider icon="✝️" title="Spiritual Life" />
              <PremiumCard>
                <PremiumInput label="Life Verse" value={id.lifeVerse} onChange={v => saveIdentity({ lifeVerse: v })} placeholder="The verse that defines your walk" />
                <PremiumInput label="Ministry / Role" value={id.ministryRole} onChange={v => saveIdentity({ ministryRole: v })} placeholder="Youth Leader, Worship Team…" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <PremiumInput label="My Mentor" value={id.mentor} onChange={v => saveIdentity({ mentor: v })} placeholder="Who leads you" />
                  <PremiumInput label="I'm Discipling" value={id.discipling} onChange={v => saveIdentity({ discipling: v })} placeholder="Who you lead" />
                  <PremiumInput label="Favorite Book" value={id.favoriteBook} onChange={v => saveIdentity({ favoriteBook: v })} placeholder="Romans" />
                  <PremiumInput label="Favorite Preacher" value={id.favoritePreacher} onChange={v => saveIdentity({ favoritePreacher: v })} placeholder="Name" />
                </div>
              </PremiumCard>

              {/* ── Spiritual Gifts card ── */}
              <SectionDivider icon="🎁" title="Spiritual Gifts" />
              <PremiumCard>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16, lineHeight: '1.5' }}>Tap to select your gifts — they'll show on your profile.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {['Teaching', 'Prophecy', 'Service', 'Leadership', 'Mercy', 'Giving', 'Encouragement', 'Wisdom', 'Faith', 'Healing', 'Discernment', 'Hospitality', 'Evangelism', 'Pastoring'].map(gift => {
                    const selected = (id.spiritualGifts || []).includes(gift);
                    return (
                      <button
                        key={gift}
                        onClick={() => {
                          const current = id.spiritualGifts || [];
                          saveIdentity({ spiritualGifts: selected ? current.filter((g: string) => g !== gift) : [...current, gift] });
                        }}
                        style={{
                          padding: '8px 16px', borderRadius: 40, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: selected ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                          color: selected ? accentColor : TEXT_MUTED,
                          border: selected ? `1px solid ${accentColor}44` : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: selected ? `0 0 12px ${accentColor}18` : 'none',
                          transition: 'all 0.15s',
                          fontFamily: 'Montserrat, system-ui',
                        }}>
                        {gift}
                      </button>
                    );
                  })}
                </div>
              </PremiumCard>

            </div>
          )}

          {/* ════════════════════════════════════════
              LOOK TAB
          ════════════════════════════════════════ */}
          {settingsTab === 'appearance' && (
            <div>

              {/* ── Theme section ── */}
              <SectionDivider icon="🎨" title="Your Theme" />
              {(themeGroups || [{ id: 'all', label: 'All Themes', icon: '🎨' }]).map(group => {
                const groupThemes = Object.entries(themes).filter(([, t]) => (t as any).group === group.id || !themeGroups);
                if (groupThemes.length === 0) return null;
                return (
                  <div key={group.id} style={{ marginBottom: 28 }}>
                    {/* Group label as full-width divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 14 }}>{group.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: TEXT_FAINT, fontFamily: 'Montserrat, system-ui' }}>{group.label}</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10 }}>
                      {groupThemes.map(([tid, t]) => {
                        const isActive = draftThemeId === tid;
                        return (
                          <button
                            key={tid}
                            onClick={() => { setDraftThemeId(tid); markChanged(); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                              padding: '10px 8px', borderRadius: 16,
                              border: isActive ? `1.5px solid ${t.accent}55` : '1px solid rgba(255,255,255,0.06)',
                              background: isActive ? `${t.accent}14` : CARD_BG,
                              cursor: 'pointer', minWidth: 72,
                              boxShadow: isActive ? `0 4px 20px ${t.accent}33` : 'none',
                              transition: 'all 0.2s',
                            }}>
                            {/* Mini preview */}
                            <div style={{
                              width: 48, height: 32, borderRadius: 8,
                              background: '#080c0a',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: `1px solid rgba(255,255,255,0.06)`,
                            }}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent, boxShadow: isActive ? `0 0 8px ${t.accent}88` : 'none' }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? t.accent : TEXT_MUTED, fontFamily: 'Montserrat, system-ui', whiteSpace: 'nowrap' as const }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Font Size section ── */}
              <SectionDivider icon="✏️" title="Reading Font Size" />
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                {(['sm', 'base', 'lg', 'xl'] as const).map((s, i) => {
                  const sizes = [14, 16, 18, 22];
                  const labels = ['Small', 'Medium', 'Large', 'XL'];
                  const isActive = draftFontSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setDraftFontSize(s); markChanged(); }}
                      style={{
                        flex: 1, padding: '16px 4px', borderRadius: 18,
                        border: isActive ? `1.5px solid ${accentColor}55` : `1px solid rgba(255,255,255,0.06)`,
                        background: isActive ? `${accentColor}14` : CARD_BG,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        boxShadow: isActive ? `0 4px 20px ${accentColor}18` : 'none',
                        transition: 'all 0.2s',
                        minHeight: 80,
                      }}>
                      <div style={{ fontSize: sizes[i], fontWeight: 700, color: isActive ? accentColor : TEXT_MUTED, fontFamily: 'Georgia, serif', textAlign: 'center' as const }}>Aa</div>
                      <div style={{ fontSize: 9, color: isActive ? accentColor : TEXT_FAINT, textAlign: 'center' as const, fontFamily: 'Montserrat, system-ui', fontWeight: 700 }}>{labels[i]}</div>
                    </button>
                  );
                })}
              </div>

              {/* ── Scripture Background toggle ── */}
              {setScriptureBackground !== undefined && (
                <>
                  <SectionDivider icon="🌄" title="Reading Experience" />
                  <PremiumCard style={{ padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui' }}>Scripture Background</div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>Landscape image behind reading text</div>
                      </div>
                      <Toggle value={!!scriptureBackground} onChange={v => { setScriptureBackground!(v); markChanged(); }} />
                    </div>
                  </PremiumCard>
                </>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════
              VOICE TAB
          ════════════════════════════════════════ */}
          {settingsTab === 'voice' && (
            <div>

              {/* ── TTS Toggle — big prominent row ── */}
              <PremiumCard style={{ padding: '0 24px', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 0' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: draftTtsEnabled ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>🎙</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui' }}>Text-to-Speech</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>AI-powered voices by ElevenLabs</div>
                  </div>
                  <Toggle value={draftTtsEnabled} onChange={v => { setDraftTtsEnabled(v); markChanged(); }} />
                </div>
              </PremiumCard>

              {!draftTtsEnabled && (
                <div style={{ textAlign: 'center', padding: '40px 24px', color: TEXT_FAINT, fontSize: 13, fontStyle: 'italic' }}>
                  Enable Text-to-Speech to choose your reading voice
                </div>
              )}

              {draftTtsEnabled && (
                <>
                  {/* ── Listening Mode ── */}
                  {setTtsMode && (
                    <>
                      <SectionDivider icon="🎧" title="Listening Mode" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                        {([
                          { id: 'narrator' as const, label: 'My Narrator', icon: '🎧', desc: 'Your chosen voice reads everything' },
                          { id: 'crafted' as const, label: 'Crafted', icon: '✨', desc: 'Era-curated voices shift across the Bible' },
                        ]).map(m => {
                          const active = (ttsMode || 'narrator') === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setTtsMode(m.id)}
                              style={{
                                padding: '20px 16px', borderRadius: 20,
                                border: active ? `1.5px solid ${accentColor}55` : `1px solid rgba(255,255,255,0.06)`,
                                background: active ? `${accentColor}14` : CARD_BG,
                                cursor: 'pointer', textAlign: 'left' as const,
                                position: 'relative',
                                boxShadow: active ? `0 4px 20px ${accentColor}18` : 'none',
                                transition: 'all 0.2s',
                                minHeight: 120,
                              }}>
                              {active && (
                                <div style={{
                                  position: 'absolute', top: 12, right: 12,
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: accentColor,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, color: '#050908', fontWeight: 800,
                                }}>✓</div>
                              )}
                              <div style={{ fontSize: 24, marginBottom: 10 }}>{m.icon}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: active ? accentColor : TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui', marginBottom: 6 }}>{m.label}</div>
                              <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: '1.5', fontStyle: 'italic' }}>{m.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* ── Male Voices ── */}
                  <SectionDivider icon="🌊" title="Male Voices" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      { id: 'eleven:88cgASIFJ5iO94COdgBO', name: 'Bryan',   style: 'American · Steady',    emoji: '🌊' },
                      { id: 'eleven:10xsyNwkKUXCUZPaoXgm', name: 'Marcus',  style: 'Soul · Rich',          emoji: '🎙' },
                      { id: 'eleven:6r6oh5UtSHSD2htZsxdz', name: 'Oliver',  style: 'British · Refined',   emoji: '📜' },
                      { id: 'eleven:957hysTL5aGCO5cymg1G', name: 'Declan',  style: 'Irish · Lyrical',     emoji: '🕊' },
                      { id: 'eleven:UoBLa8QEkrOO2RHnuag7', name: 'Caleb',   style: 'Jamaican · Warm',     emoji: '🌴' },
                      { id: 'eleven:uOVt3U9VZ1ymfF4QwI65', name: 'Ezra',    style: 'Ethiopian · Ancient', emoji: '✦' },
                    ]).map(v => <VoiceCard key={v.id} v={v} />)}
                  </div>

                  {/* ── Female Voices ── */}
                  <SectionDivider icon="🌸" title="Female Voices" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      { id: 'eleven:uTnyvloPM4RqXGSsx4Du', name: 'Ashley',    style: 'American · Bright',   emoji: '🌸' },
                      { id: 'eleven:XXoNoVctCSPJPEz3bIKW', name: 'Grace',     style: 'Soul · Warm',         emoji: '🌙' },
                      { id: 'eleven:b55ueajWHRh5UzJ6mLZ8', name: 'Charlotte', style: 'British · Calm',      emoji: '🕯' },
                      { id: 'eleven:US3Nq8hRtUadsih8oFTK', name: 'Zoe',       style: 'Australian · Clear',  emoji: '🌿' },
                      { id: 'eleven:z7U1SjrEq4fDDDriOQEN', name: 'Katherine', style: 'Powerful & Bold',     emoji: '📖' },
                      { id: 'eleven:Nyip1VgoS6bg9Vl30y8v', name: 'Verity',    style: 'Calm & Meditative',   emoji: '✨' },
                    ]).map(v => <VoiceCard key={v.id} v={v} />)}
                  </div>

                  {/* ── Reading Speed ── */}
                  <SectionDivider icon="⚡" title="Reading Speed" />
                  <PremiumCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, color: TEXT_MUTED }}>Playback Speed</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: accentColor, fontFamily: 'Montserrat, system-ui', letterSpacing: '-0.02em' }}>{draftTtsRate}×</div>
                    </div>
                    <input
                      type="range" min="0.5" max="2" step="0.1" value={draftTtsRate}
                      onChange={e => { setDraftTtsRate(parseFloat(e.target.value)); markChanged(); }}
                      style={{
                        width: '100%', height: 6, borderRadius: 3, cursor: 'pointer',
                        appearance: 'none' as any,
                        background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.08) ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ fontSize: 11, color: TEXT_FAINT }}>0.5× Slower</span>
                      <span style={{ fontSize: 11, color: TEXT_FAINT }}>2× Faster</span>
                    </div>
                  </PremiumCard>
                </>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════
              ACCOUNT TAB
          ════════════════════════════════════════ */}
          {settingsTab === 'account' && (
            <div>

              {/* ── User card ── */}
              <div style={{ marginTop: 8 }}>
                {isSignedIn ? (
                  <>
                    {/* Account card */}
                    <PremiumCard style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, fontWeight: 900, color: '#fff',
                          flexShrink: 0,
                          boxShadow: `0 0 0 2px ${accentColor}30`,
                        }}>
                          {(userName || 'U')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{userName || 'Signed In'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade8088' }} />
                            <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>Account Active</div>
                          </div>
                        </div>
                      </div>

                      {/* Change Password */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔑</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui' }}>Change Password</div>
                          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>We'll send a reset link to your email</div>
                        </div>
                        {passwordResetSent ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>Sent ✓</span>
                        ) : (
                          <button
                            disabled={passwordResetLoading}
                            onClick={async () => {
                              setPasswordResetLoading(true);
                              const sb = createClient();
                              if (sb) {
                                const { data: { session } } = await sb.auth.getSession();
                                const email = session?.user?.email || '';
                                if (email) {
                                  await sb.auth.resetPasswordForEmail(email, {
                                    redirectTo: `${window.location.origin}/bible/auth?reset=1`,
                                  });
                                }
                              }
                              setPasswordResetLoading(false);
                              setPasswordResetSent(true);
                              setTimeout(() => setPasswordResetSent(false), 10000);
                            }}
                            style={{
                              fontSize: 12, fontWeight: 700, color: accentColor,
                              background: `${accentColor}15`, border: `1px solid ${accentColor}30`,
                              borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                              opacity: passwordResetLoading ? 0.5 : 1,
                            }}>
                            {passwordResetLoading ? '...' : 'Send Link'}
                          </button>
                        )}
                      </div>
                    </PremiumCard>

                    {/* Sign Out — destructive, full width */}
                    <button
                      onClick={async () => { if (onSignOut) { await onSignOut(); onClose(); window.location.href = '/bible/auth?logout=1'; } }}
                      style={{
                        width: '100%', padding: '16px', borderRadius: 18,
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.18)',
                        color: '#f87171', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', fontFamily: 'Montserrat, system-ui',
                        marginBottom: 32,
                        transition: 'all 0.15s',
                      }}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { onClose(); onOpenAuth?.(); }}
                    style={{
                      width: '100%', padding: '18px', borderRadius: 18,
                      background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0e)`,
                      border: `1px solid ${accentColor}30`,
                      color: accentColor, fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', fontFamily: 'Montserrat, system-ui',
                      marginBottom: 32,
                    }}>
                    Sign In / Create Account →
                  </button>
                )}
              </div>

              {/* ── App section ── */}
              <SectionDivider icon="📱" title="App" />
              <PremiumCard style={{ padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui' }}>Restart Setup Guide</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Walk through the intro tour again</div>
                  </div>
                  <button
                    onClick={() => {
                      for (let i = localStorage.length - 1; i >= 0; i--) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('trace-onboarding-done')) localStorage.removeItem(k);
                      }
                      window.location.reload();
                    }}
                    style={{
                      fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                    }}>
                    Restart
                  </button>
                </div>
              </PremiumCard>

              {/* ── About section ── */}
              <SectionDivider icon="✦" title="About" />
              <PremiumCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, color: '#fff', fontSize: 24, fontFamily: 'Montserrat, system-ui',
                    boxShadow: `0 4px 16px ${accentColor}30`,
                  }}>T</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY, fontFamily: 'Montserrat, system-ui', letterSpacing: '0.1em' }}>THE ALTAR</div>
                    <div style={{ fontSize: 12, color: `${accentColor}55`, marginTop: 2, fontStyle: 'italic' }}>The Entrance</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: '1.75', fontFamily: 'Georgia, serif', marginBottom: 20 }}>
                  A sacred space to encounter God through His Word. Powered by AI to help you study Scripture deeper.
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, color: TEXT_FAINT, marginBottom: 4 }}>Scripture via api.bible · AI powered by Claude</div>
                  <div style={{ fontSize: 11, color: TEXT_FAINT }}>thealtarco.app</div>
                </div>
              </PremiumCard>

            </div>
          )}

        </div>

        {/* ── Sticky Save Button — slides up when hasChanges ── */}
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 20,
          background: `linear-gradient(0deg, ${BG} 55%, transparent)`,
          padding: '20px 0 0',
          transform: hasChanges || saved ? 'translateY(0)' : 'translateY(80px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <button
            onClick={handleSaveAll}
            disabled={(!hasChanges && !saved) || saving}
            style={{
              display: 'block',
              width: '100%',
              height: 56,
              borderRadius: 0,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              fontFamily: 'Montserrat, system-ui',
              cursor: hasChanges ? 'pointer' : 'default',
              border: 'none',
              transition: 'all 0.2s',
              ...(saved
                ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                : hasChanges
                  ? { background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, color: '#050908', boxShadow: `0 -4px 24px ${accentColor}25` }
                  : { background: 'rgba(255,255,255,0.04)', color: TEXT_FAINT }
              ),
            }}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
