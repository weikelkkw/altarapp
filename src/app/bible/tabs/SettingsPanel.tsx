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
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'voice' | 'account'>('profile');

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
            profile_data: {
              bio, testimony, dateOfBirth, location, church, savedDate, baptismDate,
              denomination, favoriteVerse, favoriteBook, spiritualGifts, prayerFor, lifeVerse,
              mentor, discipling, ministryRole, readingGoal, favoriteHymn, favoritePreacher,
              profilePicture,
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

  /* ── Reusable UI primitives ──────────────────────────────── */

  const Row = ({ icon, label, sub, right }: { icon: string; label: string; sub?: string; right: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f0ec', fontFamily: 'Montserrat, system-ui' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.35)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 28, borderRadius: 14, position: 'relative',
        background: value ? accentColor : 'rgba(255,255,255,0.08)',
        border: 'none', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        left: value ? 24 : 4,
      }} />
    </button>
  );

  const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '0 16px', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: `${accentColor}70`, fontFamily: 'Montserrat, system-ui', marginBottom: 10, marginTop: 24 }}>{text}</div>
  );

  const FieldInput = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,240,236,0.4)', marginBottom: 6, letterSpacing: '0.06em' }}>{label}</div>
      <input
        autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
        type={type}
        defaultValue={value || ''}
        onBlur={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#e8f0ec', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
      />
    </div>
  );

  const tabs = [
    { id: 'profile' as const, icon: '👤', label: 'Profile' },
    { id: 'appearance' as const, icon: '🎨', label: 'Look' },
    { id: 'voice' as const, icon: '🎙', label: 'Voice' },
    { id: 'account' as const, icon: '⚙️', label: 'Account' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'stretch' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', marginLeft: 'auto', width: '100%', maxWidth: 420,
        height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: '#040706',
        borderLeft: `1px solid ${accentColor}18`,
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, padding: '20px 20px 0',
          background: 'linear-gradient(180deg, #040706 80%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'Montserrat, system-ui', fontWeight: 800, fontSize: 22, color: '#e8f0ec', letterSpacing: '-0.02em' }}>Settings</div>
              <div style={{ fontSize: 12, color: `${accentColor}55`, marginTop: 2 }}>Your Altar, your way</div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,240,236,0.5)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 4, marginBottom: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setSettingsTab(t.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s',
                background: settingsTab === t.id ? `${accentColor}22` : 'transparent',
              }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: settingsTab === t.id ? accentColor : 'rgba(232,240,236,0.3)', fontFamily: 'Montserrat, system-ui', textTransform: 'uppercase' as const }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '8px 20px 120px', flex: 1 }}>

          {/* PROFILE TAB */}
          {settingsTab === 'profile' && (
            <div>
              <SectionLabel text="Your Avatar" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                  {id.profilePicture ? (
                    <img src={id.profilePicture} alt="Profile" style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', border: `2px solid ${accentColor}55` }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${id.color}, ${id.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', boxShadow: `0 0 0 3px ${id.color}30, 0 8px 24px ${id.color}25` }}>
                      {(id.name[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicture} />
                </div>
                <div style={{ flex: 1 }}>
                  {nameEditing ? (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                        value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); } }}
                        autoFocus
                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${accentColor}33`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#e8f0ec', outline: 'none', fontFamily: 'Montserrat, system-ui' }}
                      />
                      <button onClick={() => { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); }}
                        style={{ background: accentColor, color: '#040706', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Done</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#e8f0ec', fontFamily: 'Montserrat, system-ui' }}>{id.name}</span>
                      <button onClick={() => { setEditName(id.name); setNameEditing(true); }}
                        style={{ fontSize: 11, background: `${accentColor}18`, color: accentColor, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {(AVATAR_COLORS || []).slice(0, 8).map((c: string) => (
                      <button key={c} onClick={() => { saveIdentity({ color: c }); markChanged(); }}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: id.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: id.color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                    ))}
                  </div>
                </div>
              </div>

              {id.profilePicture && (
                <button onClick={() => saveIdentity({ profilePicture: undefined })}
                  style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginBottom: 16 }}>
                  Remove photo
                </button>
              )}

              {!id.profilePicture && (
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ width: '100%', borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(100,160,220,0.04)', border: '1.5px dashed rgba(100,160,220,0.2)', cursor: 'pointer', marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>📸</span>
                  <div style={{ textAlign: 'left' as const }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(100,160,220,0.8)' }}>Upload profile photo</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.25)', marginTop: 2 }}>Up to 15MB — Photos app size is fine</div>
                  </div>
                </button>
              )}

              {/* Experience Level */}
              <SectionLabel text="Experience Level" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {([
                  { id: 'beginner' as const, label: 'Beginner', icon: '🌱', desc: 'Simple & guided' },
                  { id: 'intermediate' as const, label: 'Growing', icon: '🌿', desc: 'More tools' },
                  { id: 'expert' as const, label: 'Deep', icon: '🌳', desc: 'Everything' },
                ]).map(level => {
                  const isActive = (id.experienceLevel || 'beginner') === level.id;
                  return (
                    <button key={level.id} onClick={() => saveIdentity({ experienceLevel: level.id })} style={{
                      flex: 1, padding: '12px 8px', borderRadius: 14, border: isActive ? `2px solid ${accentColor}55` : '2px solid transparent', background: isActive ? `${accentColor}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 20 }}>{level.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? accentColor : 'rgba(232,240,236,0.45)', fontFamily: 'Montserrat, system-ui' }}>{level.label}</span>
                      <span style={{ fontSize: 9, color: 'rgba(232,240,236,0.2)' }}>{level.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* About Me */}
              <SectionLabel text="About Me" />
              <Card style={{ padding: '16px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,240,236,0.7)' }}>Short Bio</div>
                    {!bioEditing && (
                      <button onClick={() => setBioEditing(true)} style={{ fontSize: 11, color: accentColor, background: `${accentColor}14`, border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>{id.bio ? 'Edit' : '+ Add'}</button>
                    )}
                  </div>
                  {bioEditing ? (
                    <div>
                      <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={200} autoFocus
                        placeholder="Tell others about your faith journey…"
                        style={{ width: '100%', background: `${accentColor}0a`, border: `1.5px solid ${accentColor}30`, borderRadius: 12, padding: '12px', fontSize: 13, color: '#e8f0ec', outline: 'none', resize: 'none' as const, minHeight: 80, fontFamily: 'Georgia, serif', lineHeight: '1.6', boxSizing: 'border-box' as const }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(232,240,236,0.25)' }}>{editBio.length}/200</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setBioEditing(false)} style={{ fontSize: 12, color: 'rgba(232,240,236,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
                          <button onClick={() => { saveIdentity({ bio: editBio }); setBioEditing(false); }}
                            style={{ fontSize: 12, fontWeight: 700, color: '#040706', background: accentColor, border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Save</button>
                        </div>
                      </div>
                    </div>
                  ) : id.bio ? (
                    <div style={{ fontSize: 13, color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif', lineHeight: '1.6' }}>{id.bio}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'rgba(232,240,236,0.2)', fontStyle: 'italic' }}>No bio yet</div>
                  )}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 -16px 16px' }} />

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,240,236,0.7)', marginBottom: 6 }}>My Testimony</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.25)', marginBottom: 8 }}>Your story of faith — encourages everyone who reads it</div>
                  <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.testimony || ''}
                    onBlur={e => saveIdentity({ testimony: e.target.value })}
                    placeholder="How did you come to faith? What has God done in your life?…"
                    style={{ width: '100%', background: `${accentColor}08`, border: `1.5px solid ${accentColor}20`, borderRadius: 12, padding: '12px', fontSize: 13, color: '#e8f0ec', outline: 'none', resize: 'none' as const, minHeight: 90, fontFamily: 'Georgia, serif', lineHeight: '1.7', boxSizing: 'border-box' as const }} />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,240,236,0.7)', marginBottom: 6 }}>Favorite Verse</div>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.favoriteVerse || ''}
                    onBlur={e => saveIdentity({ favoriteVerse: e.target.value })}
                    placeholder="e.g. John 3:16, Romans 8:28"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#e8f0ec', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                </div>
              </Card>

              {/* Personal Details */}
              <SectionLabel text="Personal Details" />
              <Card style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FieldInput label="Date of Birth" value={id.dateOfBirth} onChange={v => saveIdentity({ dateOfBirth: v })} type="date" />
                  <FieldInput label="Location" value={id.location} onChange={v => saveIdentity({ location: v })} placeholder="City, State" />
                </div>
                <FieldInput label="Church Home" value={id.church} onChange={v => saveIdentity({ church: v })} placeholder="Grace Community Church…" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FieldInput label="Date Saved" value={id.savedDate} onChange={v => saveIdentity({ savedDate: v })} type="date" />
                  <FieldInput label="Date Baptized" value={id.baptismDate} onChange={v => saveIdentity({ baptismDate: v })} type="date" />
                </div>
              </Card>

              {/* Spiritual Life */}
              <SectionLabel text="Spiritual Life" />
              <Card style={{ padding: '16px' }}>
                <FieldInput label="Life Verse" value={id.lifeVerse} onChange={v => saveIdentity({ lifeVerse: v })} placeholder="The verse that defines your walk" />
                <FieldInput label="Ministry / Role" value={id.ministryRole} onChange={v => saveIdentity({ ministryRole: v })} placeholder="Youth Leader, Worship Team…" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FieldInput label="My Mentor" value={id.mentor} onChange={v => saveIdentity({ mentor: v })} placeholder="Who leads you" />
                  <FieldInput label="I'm Discipling" value={id.discipling} onChange={v => saveIdentity({ discipling: v })} placeholder="Who you lead" />
                  <FieldInput label="Favorite Book" value={id.favoriteBook} onChange={v => saveIdentity({ favoriteBook: v })} placeholder="Romans" />
                  <FieldInput label="Favorite Preacher" value={id.favoritePreacher} onChange={v => saveIdentity({ favoritePreacher: v })} placeholder="Name" />
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,240,236,0.4)', marginBottom: 10, letterSpacing: '0.06em' }}>SPIRITUAL GIFTS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {['Teaching', 'Prophecy', 'Service', 'Leadership', 'Mercy', 'Giving', 'Encouragement', 'Wisdom', 'Faith', 'Healing', 'Discernment', 'Hospitality', 'Evangelism', 'Pastoring'].map(gift => {
                      const selected = (id.spiritualGifts || []).includes(gift);
                      return (
                        <button key={gift} onClick={() => {
                          const current = id.spiritualGifts || [];
                          saveIdentity({ spiritualGifts: selected ? current.filter((g: string) => g !== gift) : [...current, gift] });
                        }} style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: selected ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                          color: selected ? accentColor : 'rgba(232,240,236,0.35)',
                          border: selected ? `1px solid ${accentColor}44` : '1px solid transparent',
                        }}>{gift}</button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {settingsTab === 'appearance' && (
            <div>
              <SectionLabel text="Theme Color" />
              {(themeGroups || [{ id: 'all', label: 'All', icon: '🎨' }]).map(group => {
                const groupThemes = Object.entries(themes).filter(([, t]) => (t as any).group === group.id || !themeGroups);
                if (groupThemes.length === 0) return null;
                return (
                  <div key={group.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 13 }}>{group.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(232,240,236,0.3)' }}>{group.label}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                      {groupThemes.map(([tid, t]) => {
                        const isActive = draftThemeId === tid;
                        return (
                          <button key={tid} onClick={() => { setDraftThemeId(tid); markChanged(); }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 14, border: isActive ? `2px solid ${t.accent}66` : '2px solid transparent', background: isActive ? `${t.accent}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer', minWidth: 52, transition: 'all 0.15s' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.accent, boxShadow: isActive ? `0 0 10px ${t.accent}55` : 'none' }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? t.accent : 'rgba(232,240,236,0.3)', fontFamily: 'Montserrat, system-ui', whiteSpace: 'nowrap' as const }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <SectionLabel text="Reading Font Size" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['sm', 'base', 'lg', 'xl'] as const).map((s, i) => (
                  <button key={s} onClick={() => { setDraftFontSize(s); markChanged(); }}
                    style={{ flex: 1, padding: '14px 4px', borderRadius: 14, border: draftFontSize === s ? `2px solid ${accentColor}55` : '2px solid transparent', background: draftFontSize === s ? `${accentColor}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                    <div style={{ fontSize: 10 + i * 2, fontWeight: 700, color: draftFontSize === s ? accentColor : 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif', textAlign: 'center' as const }}>Aa</div>
                    <div style={{ fontSize: 9, color: 'rgba(232,240,236,0.25)', textAlign: 'center' as const, marginTop: 4, fontFamily: 'Montserrat, system-ui', fontWeight: 600 }}>{['Sm', 'Med', 'Lg', 'XL'][i]}</div>
                  </button>
                ))}
              </div>

              {setScriptureBackground !== undefined && (
                <>
                  <SectionLabel text="Reading Experience" />
                  <Card>
                    <Row
                      icon="🌄"
                      label="Scripture Background"
                      sub="Landscape image behind reading text"
                      right={<Toggle value={!!scriptureBackground} onChange={v => { setScriptureBackground!(v); markChanged(); }} />}
                    />
                  </Card>
                </>
              )}
            </div>
          )}

          {/* VOICE TAB */}
          {settingsTab === 'voice' && (
            <div>
              <SectionLabel text="Read Aloud" />
              <Card>
                <Row
                  icon="🎙"
                  label="Text-to-Speech"
                  sub="AI-powered voices by ElevenLabs"
                  right={<Toggle value={draftTtsEnabled} onChange={v => { setDraftTtsEnabled(v); markChanged(); }} />}
                />
              </Card>

              {draftTtsEnabled && (
                <>
                  {setTtsMode && (
                    <>
                      <SectionLabel text="Listening Mode" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        {([
                          { id: 'narrator' as const, label: 'My Narrator', icon: '🎧', desc: 'Your chosen voice reads everything' },
                          { id: 'crafted' as const, label: 'Crafted', icon: '✨', desc: 'Era-curated voices shift across the Bible' },
                        ]).map(m => (
                          <button key={m.id} onClick={() => setTtsMode(m.id)} style={{
                            padding: '14px 12px', borderRadius: 16, border: (ttsMode || 'narrator') === m.id ? `2px solid ${accentColor}55` : '2px solid transparent', background: (ttsMode || 'narrator') === m.id ? `${accentColor}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' as const,
                          }}>
                            <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: (ttsMode || 'narrator') === m.id ? accentColor : '#e8f0ec', fontFamily: 'Montserrat, system-ui', marginBottom: 4 }}>{m.label}</div>
                            <div style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)', lineHeight: '1.4' }}>{m.desc}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <SectionLabel text="Male Voices" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {([
                      { id: 'eleven:88cgASIFJ5iO94COdgBO', name: 'Bryan',   style: 'American · Steady',    emoji: '🌊' },
                      { id: 'eleven:10xsyNwkKUXCUZPaoXgm', name: 'Marcus',  style: 'Soul · Rich',          emoji: '🎙' },
                      { id: 'eleven:6r6oh5UtSHSD2htZsxdz', name: 'Oliver',  style: 'British · Refined',   emoji: '📜' },
                      { id: 'eleven:957hysTL5aGCO5cymg1G', name: 'Declan',  style: 'Irish · Lyrical',     emoji: '🕊' },
                      { id: 'eleven:UoBLa8QEkrOO2RHnuag7', name: 'Caleb',   style: 'Jamaican · Warm',     emoji: '🌴' },
                      { id: 'eleven:uOVt3U9VZ1ymfF4QwI65', name: 'Ezra',    style: 'Ethiopian · Ancient', emoji: '✦' },
                    ]).map(v => {
                      const vid = v.id.replace('eleven:', '');
                      const isSelected = draftTtsVoice === v.id;
                      const isPreviewing = previewingVoiceId === vid;
                      const isLoading = previewLoadingId === vid;
                      return (
                        <div key={v.id} style={{ borderRadius: 16, padding: '12px', background: isSelected ? `${accentColor}18` : 'rgba(255,255,255,0.03)', border: isSelected ? `2px solid ${accentColor}44` : '2px solid transparent', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 18 }}>{v.emoji}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? accentColor : '#e8f0ec' }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)' }}>{v.style}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => previewVoice(vid)}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: isPreviewing ? `${accentColor}30` : `${accentColor}0e`, color: isPreviewing ? accentColor : `${accentColor}77` }}>
                              {isLoading ? '...' : isPreviewing ? '■ Stop' : '▶ Play'}
                            </button>
                            <button onClick={() => { setDraftTtsVoice(v.id); setTtsVoice(v.id); markChanged(); }}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: isSelected ? accentColor : 'rgba(255,255,255,0.06)', color: isSelected ? '#040706' : 'rgba(232,240,236,0.4)' }}>
                              {isSelected ? '✓ On' : 'Use'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <SectionLabel text="Female Voices" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {([
                      { id: 'eleven:uTnyvloPM4RqXGSsx4Du', name: 'Ashley',    style: 'American · Bright',   emoji: '🌸' },
                      { id: 'eleven:XXoNoVctCSPJPEz3bIKW', name: 'Grace',     style: 'Soul · Warm',         emoji: '🌙' },
                      { id: 'eleven:b55ueajWHRh5UzJ6mLZ8', name: 'Charlotte', style: 'British · Calm',      emoji: '🕯' },
                      { id: 'eleven:US3Nq8hRtUadsih8oFTK', name: 'Zoe',       style: 'Australian · Clear',  emoji: '🌿' },
                      { id: 'eleven:z7U1SjrEq4fDDDriOQEN', name: 'Katherine', style: 'Powerful & Bold',     emoji: '📖' },
                      { id: 'eleven:Nyip1VgoS6bg9Vl30y8v', name: 'Verity',    style: 'Calm & Meditative',   emoji: '✨' },
                    ]).map(v => {
                      const vid = v.id.replace('eleven:', '');
                      const isSelected = draftTtsVoice === v.id;
                      const isPreviewing = previewingVoiceId === vid;
                      const isLoading = previewLoadingId === vid;
                      return (
                        <div key={v.id} style={{ borderRadius: 16, padding: '12px', background: isSelected ? `${accentColor}18` : 'rgba(255,255,255,0.03)', border: isSelected ? `2px solid ${accentColor}44` : '2px solid transparent', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 18 }}>{v.emoji}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? accentColor : '#e8f0ec' }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: 'rgba(232,240,236,0.3)' }}>{v.style}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => previewVoice(vid)}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: isPreviewing ? `${accentColor}30` : `${accentColor}0e`, color: isPreviewing ? accentColor : `${accentColor}77` }}>
                              {isLoading ? '...' : isPreviewing ? '■ Stop' : '▶ Play'}
                            </button>
                            <button onClick={() => { setDraftTtsVoice(v.id); setTtsVoice(v.id); markChanged(); }}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: isSelected ? accentColor : 'rgba(255,255,255,0.06)', color: isSelected ? '#040706' : 'rgba(232,240,236,0.4)' }}>
                              {isSelected ? '✓ On' : 'Use'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <SectionLabel text="Reading Speed" />
                  <Card>
                    <div style={{ padding: '16px 0 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, color: 'rgba(232,240,236,0.5)' }}>Speed</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>{draftTtsRate}×</span>
                      </div>
                      <input type="range" min="0.5" max="2" step="0.1" value={draftTtsRate}
                        onChange={e => { setDraftTtsRate(parseFloat(e.target.value)); markChanged(); }}
                        style={{ width: '100%', height: 4, borderRadius: 2, cursor: 'pointer', appearance: 'none' as any, background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(232,240,236,0.2)' }}>Slower</span>
                        <span style={{ fontSize: 10, color: 'rgba(232,240,236,0.2)' }}>Faster</span>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ACCOUNT TAB */}
          {settingsTab === 'account' && (
            <div>
              <SectionLabel text="Account" />
              {isSignedIn ? (
                <Card>
                  <div style={{ padding: '16px 0 4px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                      {(userName || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f0ec', fontFamily: 'Montserrat, system-ui' }}>{userName || 'Signed In'}</div>
                      <div style={{ fontSize: 11, color: `${accentColor}55`, marginTop: 2 }}>Account active</div>
                    </div>
                  </div>
                  <Row icon="🚪" label="Sign Out" sub="You can sign back in anytime" right={
                    <button onClick={async () => { if (onSignOut) { await onSignOut(); onClose(); window.location.href = '/bible/auth?logout=1'; } }}
                      style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}>
                      Sign Out
                    </button>
                  } />
                </Card>
              ) : (
                <button onClick={() => { onClose(); onOpenAuth?.(); }}
                  style={{ width: '100%', padding: '16px', borderRadius: 16, background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0e)`, border: `1px solid ${accentColor}30`, color: accentColor, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Montserrat, system-ui' }}>
                  Sign In / Create Account →
                </button>
              )}

              <SectionLabel text="App" />
              <Card>
                <Row icon="📖" label="Restart Setup Guide" sub="Walk through the intro tour again" right={
                  <button onClick={() => {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                      const k = localStorage.key(i);
                      if (k && k.startsWith('trace-onboarding-done')) localStorage.removeItem(k);
                    }
                    window.location.reload();
                  }} style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,240,236,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                    Restart
                  </button>
                } />
              </Card>

              <SectionLabel text="About" />
              <Card>
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 20, fontFamily: 'Montserrat, system-ui' }}>T</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#e8f0ec', fontFamily: 'Montserrat, system-ui', letterSpacing: '0.08em' }}>THE ALTAR</div>
                      <div style={{ fontSize: 11, color: `${accentColor}55`, marginTop: 2 }}>The Entrance</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(232,240,236,0.35)', lineHeight: '1.7', fontFamily: 'Georgia, serif', marginBottom: 14 }}>
                    A sacred space to encounter God through His Word. Powered by AI to help you study Scripture deeper.
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.2)' }}>Scripture via api.bible · AI powered by Claude</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,236,0.15)', marginTop: 4 }}>thealtarco.app</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>

        {/* Sticky Save Button */}
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 20px 28px', background: 'linear-gradient(0deg, #040706 60%, transparent)', borderTop: hasChanges || saved ? `1px solid ${accentColor}14` : 'none' }}>
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges && !saved}
            style={{
              width: '100%', padding: '15px', borderRadius: 16, fontWeight: 800, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'Montserrat, system-ui', cursor: hasChanges ? 'pointer' : 'default', transition: 'all 0.2s', border: 'none',
              ...(saved
                ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                : hasChanges
                  ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 6px 20px ${accentColor}35` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.2)' }
              ),
            }}
          >
            {saved ? '✓ Saved' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

