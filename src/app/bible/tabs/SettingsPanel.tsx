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
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Resize to 200x200 for storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
        saveIdentity({ profilePicture: canvas.toDataURL('image/jpeg', 0.8) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  // Use draft for all display in settings — committed on Save
  const id = draftIdentity;

  const sectionTitle = (text: string) => (
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: `${accentColor}55` }}>{text}</p>
  );

  const card = (children: React.ReactNode) => (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}15` }}>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-md h-full overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #0a1410, #080f0c)', borderLeft: `1px solid ${accentColor}22` }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-5 flex items-center justify-between"
          style={{ background: 'rgba(10,20,16,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${accentColor}18` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Settings</h2>
            <p className="text-xs mt-0.5" style={{ color: `${accentColor}55` }}>Customize your experience</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}14`, color: `${accentColor}88` }}>✕</button>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* ── Profile ──────────────────────────────────────────── */}
          {sectionTitle('Profile')}
          {card(
            <div className="space-y-4">
              {/* Avatar / Profile picture */}
              <div className="flex items-start gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {id.profilePicture ? (
                    <img src={id.profilePicture} alt="Profile"
                      className="w-16 h-16 rounded-2xl object-cover" style={{ border: `2px solid ${accentColor}44` }} />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: id.color, boxShadow: `0 4px 12px ${id.color}44` }}>
                      {id.name[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Edit</span>
                  </div>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicture} />
                </div>
                <div className="flex-1">
                  {nameEditing ? (
                    <div className="flex gap-2">
                      <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); } }}
                        autoFocus className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
                        style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                      <button onClick={() => { saveIdentity({ name: editName.trim() || id.name }); setNameEditing(false); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: accentColor, color: '#0a1410' }}>Save</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#f0f8f4' }}>{id.name}</p>
                      <button onClick={() => { setEditName(id.name); setNameEditing(true); }}
                        className="text-xs px-2 py-0.5 rounded" style={{ color: `${accentColor}88`, background: `${accentColor}14` }}>Edit</button>
                    </div>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.3)' }}>Tap photo to upload profile picture</p>
                </div>
              </div>

              {/* Remove profile picture */}
              {id.profilePicture && (
                <button onClick={() => saveIdentity({ profilePicture: undefined })}
                  className="text-xs px-3 py-1 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                  Remove profile picture
                </button>
              )}

              {/* Upload prompt when no picture */}
              {!id.profilePicture && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(100,160,220,0.07)', border: '1.5px dashed rgba(100,160,220,0.3)' }}>
                  <span className="text-lg">📸</span>
                  <div className="text-left">
                    <p className="text-xs font-bold" style={{ color: 'rgba(100,160,220,0.9)' }}>Upload a profile photo</p>
                    <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Show your face to the community</p>
                  </div>
                </button>
              )}

              {/* Favorite verse */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(232,240,236,0.5)' }}>Favorite Verse</p>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={editVerse} onChange={e => setEditVerse(e.target.value)}
                  onBlur={() => saveIdentity({ favoriteVerse: editVerse })}
                  placeholder="e.g. John 3:16"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
              </div>

              {/* Public profile toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f0f8f4' }}>Public Profile</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.3)' }}>Others can see your bio and activity</p>
                </div>
                <button onClick={() => saveIdentity({ isPublic: !id.isPublic })}
                  className="w-12 h-7 rounded-full transition-all relative"
                  style={{ background: id.isPublic !== false ? accentColor : 'rgba(255,255,255,0.1)' }}>
                  <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md"
                    style={{ left: id.isPublic !== false ? '26px' : '2px' }} />
                </button>
              </div>
            </div>
          )}

          {/* ── About Me ──────────────────────────────────────────── */}
          {sectionTitle('About Me')}
          {card(
            <div className="space-y-5">

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'rgba(232,240,236,0.7)' }}>Short Bio</p>
                    <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Visible on your public profile</p>
                  </div>
                  {!bioEditing && (
                    <button onClick={() => setBioEditing(true)}
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ color: accentColor, background: `${accentColor}14` }}>
                      {id.bio ? 'Edit' : '+ Add'}
                    </button>
                  )}
                </div>
                {bioEditing ? (
                  <div className="space-y-2">
                    <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={200}
                      placeholder="Tell others about your faith journey…"
                      autoFocus
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-20"
                      style={{ background: `${accentColor}0a`, border: `1.5px solid ${accentColor}33`, color: '#f0f8f4', lineHeight: '1.6' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>{editBio.length}/200</span>
                      <div className="flex gap-2">
                        <button onClick={() => setBioEditing(false)} className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ color: 'rgba(232,240,236,0.4)' }}>Cancel</button>
                        <button onClick={() => { saveIdentity({ bio: editBio }); setBioEditing(false); }}
                          className="text-xs px-4 py-1.5 rounded-lg font-bold" style={{ background: accentColor, color: '#0a1410' }}>Save</button>
                      </div>
                    </div>
                  </div>
                ) : id.bio ? (
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.55)', fontFamily: 'Georgia, serif' }}>{id.bio}</p>
                ) : (
                  <p className="text-xs italic" style={{ color: 'rgba(232,240,236,0.2)' }}>No bio yet — tap + Add to share your story</p>
                )}
              </div>

              <div className="h-px" style={{ background: `${accentColor}12` }} />

              {/* Testimony */}
              <div>
                <div className="mb-2">
                  <p className="text-xs font-bold" style={{ color: 'rgba(232,240,236,0.7)' }}>My Testimony</p>
                  <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Your story of faith — encourages everyone who reads it</p>
                </div>
                <textarea autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                  defaultValue={id.testimony || ''}
                  onBlur={e => saveIdentity({ testimony: e.target.value })}
                  placeholder="How did you come to faith? What has God done in your life? Even a few sentences can change someone's day…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-28"
                  style={{ background: `${accentColor}0a`, border: `1.5px solid ${accentColor}22`, color: '#f0f8f4', fontFamily: 'Georgia, serif', lineHeight: '1.7' }} />
              </div>

              {/* Date of Birth */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Date of Birth</p>
                  <input type="date"
                    defaultValue={id.dateOfBirth || ''}
                    onChange={e => saveIdentity({ dateOfBirth: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Location</p>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.location || ''}
                    onBlur={e => saveIdentity({ location: e.target.value })}
                    placeholder="City, State"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
              </div>

              {/* Church */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Church Home</p>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                  defaultValue={id.church || ''}
                  onBlur={e => saveIdentity({ church: e.target.value })}
                  placeholder="e.g. Grace Community Church, Austin"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
              </div>

              {/* Faith milestones */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Date Saved</p>
                  <input type="date"
                    defaultValue={id.savedDate || ''}
                    onChange={e => saveIdentity({ savedDate: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Date Baptized</p>
                  <input type="date"
                    defaultValue={id.baptismDate || ''}
                    onChange={e => saveIdentity({ baptismDate: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
              </div>

            </div>
          )}

          {/* ── Spiritual Life ────────────────────────────────────── */}
          {sectionTitle('Spiritual Life')}
          {card(
            <div className="space-y-4">
              {/* Life verse */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Life Verse</p>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                  defaultValue={id.lifeVerse || ''}
                  onBlur={e => saveIdentity({ lifeVerse: e.target.value })}
                  placeholder="The one verse that defines your walk"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
              </div>

              {/* Spiritual gifts */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Spiritual Gifts</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Teaching', 'Prophecy', 'Service', 'Leadership', 'Mercy', 'Giving', 'Encouragement', 'Wisdom', 'Faith', 'Healing', 'Discernment', 'Hospitality', 'Evangelism', 'Pastoring'].map(gift => {
                    const selected = (id.spiritualGifts || []).includes(gift);
                    return (
                      <button key={gift} onClick={() => {
                        const current = id.spiritualGifts || [];
                        const updated = selected ? current.filter(g => g !== gift) : [...current, gift];
                        saveIdentity({ spiritualGifts: updated });
                      }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={selected
                          ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.35)', border: '1px solid transparent' }}>
                        {gift}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ministry role */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Ministry / Role</p>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                  defaultValue={id.ministryRole || ''}
                  onBlur={e => saveIdentity({ ministryRole: e.target.value })}
                  placeholder="e.g. Youth Leader, Worship Team, Small Group Host"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
              </div>

              {/* Mentor / Discipling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>My Mentor</p>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.mentor || ''}
                    onBlur={e => saveIdentity({ mentor: e.target.value })}
                    placeholder="Who leads you"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>I&apos;m Discipling</p>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.discipling || ''}
                    onBlur={e => saveIdentity({ discipling: e.target.value })}
                    placeholder="Who you lead"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
              </div>

              {/* Favorites */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Favorite Book</p>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.favoriteBook || ''}
                    onBlur={e => saveIdentity({ favoriteBook: e.target.value })}
                    placeholder="e.g. Romans"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Favorite Preacher</p>
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                    defaultValue={id.favoritePreacher || ''}
                    onBlur={e => saveIdentity({ favoritePreacher: e.target.value })}
                    placeholder="e.g. Paul Washer"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
                </div>
              </div>

              {/* Favorite hymn */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Favorite Worship Song / Hymn</p>
                <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                  defaultValue={id.favoriteHymn || ''}
                  onBlur={e => saveIdentity({ favoriteHymn: e.target.value })}
                  placeholder="e.g. Amazing Grace, Way Maker"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}22`, color: '#f0f8f4' }} />
              </div>

              {/* Reading goal */}
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,240,236,0.5)' }}>Weekly Reading Goal</p>
                <div className="flex items-center gap-3">
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="range" min="1" max="30" step="1"
                    defaultValue={id.readingGoal || 7}
                    onChange={e => saveIdentity({ readingGoal: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}44)` }} />
                  <span className="text-sm font-bold w-16 text-right" style={{ color: accentColor }}>
                    {id.readingGoal || 7} ch/wk
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Experience Level ─────────────────────────────────── */}
          {sectionTitle('Experience Level')}
          {card(
            <div className="space-y-3">
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.4)' }}>
                Controls which features are visible. You can change this anytime.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'beginner' as const, label: 'Beginner', desc: 'Simple & guided', icon: '🌱' },
                  { id: 'intermediate' as const, label: 'Growing', desc: 'More tools', icon: '🌿' },
                  { id: 'expert' as const, label: 'Deep', desc: 'Everything', icon: '🌳' },
                ]).map(level => {
                  const current = id.experienceLevel || 'beginner';
                  const isActive = current === level.id;
                  return (
                    <button key={level.id} onClick={() => saveIdentity({ experienceLevel: level.id })}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                      style={isActive
                        ? { background: `${accentColor}22`, border: `2px solid ${accentColor}55` }
                        : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}>
                      <span className="text-xl">{level.icon}</span>
                      <span className="text-[10px] font-bold" style={{ color: isActive ? accentColor : 'rgba(232,240,236,0.5)' }}>{level.label}</span>
                      <span className="text-[8px]" style={{ color: 'rgba(232,240,236,0.25)' }}>{level.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Appearance ────────────────────────────────────────── */}
          {sectionTitle('Appearance')}
          {card(
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(232,240,236,0.5)' }}>Theme</p>
                {(themeGroups || [{ id: 'all', label: 'All', icon: '🎨' }]).map(group => {
                  const groupThemes = Object.entries(themes).filter(([, t]) => (t as any).group === group.id || !themeGroups);
                  if (groupThemes.length === 0) return <div key={group.id} />;
                  return (
                    <div key={group.id} className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">{group.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(232,240,236,0.35)' }}>{group.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {groupThemes.map(([id, t]) => {
                          const isBlackBg = (t as any).group === 'black';
                          const isWhiteBg = (t as any).group === 'white';
                          return (
                            <button key={id} onClick={() => { setDraftThemeId(id); markChanged(); }}
                              className="flex flex-col items-center gap-0.5 w-12 py-2 rounded-lg transition-all"
                              style={draftThemeId === id
                                ? { background: `${t.accent}22`, border: `2px solid ${t.accent}55` }
                                : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}>
                              <div className="w-4 h-4 rounded-full overflow-hidden" style={{
                                border: isBlackBg ? '1px solid #444' : isWhiteBg ? `1px solid ${t.accent}` : 'none',
                                boxShadow: draftThemeId === id ? `0 0 6px ${t.accent}44` : 'none',
                                background: isBlackBg
                                  ? `linear-gradient(90deg, #000 50%, ${t.accent} 50%)`
                                  : isWhiteBg
                                    ? `linear-gradient(90deg, #fff 50%, ${t.accent} 50%)`
                                    : t.accent,
                              }} />
                              <span className="text-[7px] font-bold" style={{ color: draftThemeId === id ? t.accent : 'rgba(232,240,236,0.25)' }}>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(232,240,236,0.5)' }}>Reading Font Size</p>
                <div className="flex gap-2">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((s, i) => (
                    <button key={s} onClick={() => { setDraftFontSize(s); markChanged(); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={draftFontSize === s
                        ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 8px ${accentColor}44` }
                        : { background: `${accentColor}0d`, color: `${accentColor}55` }}>
                      {['Small', 'Medium', 'Large', 'XL'][i]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Default Bible version */}
              {onSetDefaultBible && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(232,240,236,0.5)' }}>Default Bible Version</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['NIV', 'KJV', 'NKJV', 'NLT', 'ASV', 'WEB', 'LSV'].map(abbr => (
                      <button key={abbr} onClick={() => { setDraftBible(abbr); markChanged(); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                        style={draftBible === abbr
                          ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 2px 8px ${accentColor}44` }
                          : { background: `${accentColor}0d`, color: `${accentColor}55`, border: `1px solid ${accentColor}18` }}>
                        {abbr}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] mt-1.5" style={{ color: 'rgba(232,240,236,0.2)' }}>This will be your default when you open the Read tab</p>
                </div>
              )}

              {/* Scripture background toggle */}
              {setScriptureBackground && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#f0f8f4' }}>Scripture Background</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.3)' }}>Flowing verse glow behind the app</p>
                  </div>
                  <button
                    onClick={() => setScriptureBackground(!(scriptureBackground ?? true))}
                    className="w-12 h-7 rounded-full transition-all relative"
                    style={{ background: (scriptureBackground ?? true) ? accentColor : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md"
                      style={{ left: (scriptureBackground ?? true) ? '26px' : '2px' }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Read Aloud ────────────────────────────────────────── */}
          {sectionTitle('Read Aloud')}
          {card(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f0f8f4' }}>Text-to-Speech</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.3)' }}>AI-powered voices by ElevenLabs</p>
                </div>
                <button onClick={() => { setDraftTtsEnabled(!draftTtsEnabled); markChanged(); }}
                  className="w-12 h-7 rounded-full transition-all relative"
                  style={{ background: draftTtsEnabled ? accentColor : 'rgba(255,255,255,0.1)' }}>
                  <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md"
                    style={{ left: draftTtsEnabled ? '26px' : '2px' }} />
                </button>
              </div>

              {draftTtsEnabled && (
                <>
                  {/* Listening mode toggle */}
                  {setTtsMode && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}22` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}88` }}>Listening Mode</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { id: 'narrator', label: 'My Narrator', desc: 'Your chosen voice reads everything' },
                          { id: 'crafted', label: 'Crafted Experience', desc: 'Era-curated voices shift across the Bible' },
                        ] as const).map(m => (
                          <button key={m.id} onClick={() => setTtsMode(m.id)}
                            className="rounded-lg p-2.5 text-left transition-all"
                            style={(ttsMode || 'narrator') === m.id
                              ? { background: `${accentColor}22`, border: `1.5px solid ${accentColor}66` }
                              : { background: 'rgba(255,255,255,0.03)', border: '1.5px solid transparent' }}>
                            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: (ttsMode || 'narrator') === m.id ? accentColor : '#f0f8f4' }}>{m.label}</p>
                            <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'rgba(232,240,236,0.35)' }}>{m.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Male voices */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>Male Voices</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'eleven:88cgASIFJ5iO94COdgBO', name: 'Bryan',   style: 'American · Steady',     emoji: '🌊' },
                        { id: 'eleven:10xsyNwkKUXCUZPaoXgm', name: 'Marcus',  style: 'Soul · Rich',           emoji: '🎙' },
                        { id: 'eleven:6r6oh5UtSHSD2htZsxdz', name: 'Oliver',  style: 'British · Refined',    emoji: '📜' },
                        { id: 'eleven:957hysTL5aGCO5cymg1G', name: 'Declan',  style: 'Irish · Lyrical',      emoji: '🕊' },
                        { id: 'eleven:UoBLa8QEkrOO2RHnuag7', name: 'Caleb',   style: 'Jamaican · Warm',      emoji: '🌴' },
                        { id: 'eleven:uOVt3U9VZ1ymfF4QwI65', name: 'Ezra',    style: 'Ethiopian · Ancient',  emoji: '✦' },
                      ]).map(v => (
                        <div key={v.id} className="rounded-xl p-2.5 transition-all"
                          style={draftTtsVoice === v.id
                            ? { background: `${accentColor}22`, border: `2px solid ${accentColor}55` }
                            : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{v.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold" style={{ color: draftTtsVoice === v.id ? accentColor : '#f0f8f4' }}>{v.name}</p>
                              <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>{v.style}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => previewVoice(v.id.replace('eleven:', ''))}
                              className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                              style={previewingVoiceId === v.id.replace('eleven:', '')
                                ? { background: `${accentColor}33`, color: accentColor }
                                : { background: `${accentColor}0d`, color: `${accentColor}88` }}>
                              {previewLoadingId === v.id.replace('eleven:', '') ? '...' : previewingVoiceId === v.id.replace('eleven:', '') ? '■ Stop' : '▶ Preview'}
                            </button>
                            <button onClick={() => { setDraftTtsVoice(v.id); setTtsVoice(v.id); markChanged(); }}
                              className="flex-1 py-1 rounded-lg text-[9px] font-bold"
                              style={draftTtsVoice === v.id
                                ? { background: accentColor, color: '#0a1410' }
                                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)' }}>
                              {draftTtsVoice === v.id ? '✓ Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Female voices */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>Female Voices</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'eleven:uTnyvloPM4RqXGSsx4Du', name: 'Ashley',    style: 'American · Bright',     emoji: '🌸' },
                        { id: 'eleven:XXoNoVctCSPJPEz3bIKW', name: 'Grace',     style: 'Soul · Warm',          emoji: '🌙' },
                        { id: 'eleven:b55ueajWHRh5UzJ6mLZ8', name: 'Charlotte', style: 'British · Calm',       emoji: '🕯' },
                        { id: 'eleven:US3Nq8hRtUadsih8oFTK', name: 'Zoe',       style: 'Australian · Clear',   emoji: '🌿' },
                        { id: 'eleven:z7U1SjrEq4fDDDriOQEN', name: 'Katherine', style: 'Powerful & Commanding',emoji: '📖' },
                        { id: 'eleven:Nyip1VgoS6bg9Vl30y8v', name: 'Verity',    style: 'Calm & Meditative',    emoji: '✨' },
                      ]).map(v => (
                        <div key={v.id} className="rounded-xl p-2.5 transition-all"
                          style={draftTtsVoice === v.id
                            ? { background: `${accentColor}22`, border: `2px solid ${accentColor}55` }
                            : { background: 'rgba(255,255,255,0.03)', border: '2px solid transparent' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{v.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold" style={{ color: draftTtsVoice === v.id ? accentColor : '#f0f8f4' }}>{v.name}</p>
                              <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>{v.style}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => previewVoice(v.id.replace('eleven:', ''))}
                              className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                              style={previewingVoiceId === v.id.replace('eleven:', '')
                                ? { background: `${accentColor}33`, color: accentColor }
                                : { background: `${accentColor}0d`, color: `${accentColor}88` }}>
                              {previewLoadingId === v.id.replace('eleven:', '') ? '...' : previewingVoiceId === v.id.replace('eleven:', '') ? '■ Stop' : '▶ Preview'}
                            </button>
                            <button onClick={() => { setDraftTtsVoice(v.id); setTtsVoice(v.id); markChanged(); }}
                              className="flex-1 py-1 rounded-lg text-[9px] font-bold"
                              style={draftTtsVoice === v.id
                                ? { background: accentColor, color: '#0a1410' }
                                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.5)' }}>
                              {draftTtsVoice === v.id ? '✓ Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color: 'rgba(232,240,236,0.5)' }}>Speed</p>
                      <span className="text-xs font-bold" style={{ color: accentColor }}>{draftTtsRate}x</span>
                    </div>
                    <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} type="range" min="0.5" max="2" step="0.1" value={draftTtsRate}
                      onChange={e => { setDraftTtsRate(parseFloat(e.target.value)); markChanged(); }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((draftTtsRate - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Slow</span>
                      <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Fast</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── About ─────────────────────────────────────────────── */}
          {sectionTitle('About')}
          {card(
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, fontFamily: 'Montserrat, system-ui, sans-serif' }}>T</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: '0.05em' }}>THE ALTAR</p>
                  <p className="text-xs" style={{ color: `${accentColor}66` }}>The Entrance</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.4)' }}>
                A sacred space to encounter God through His Word. Powered by AI to help you study Scripture deeper.
              </p>
              <div className="pt-2" style={{ borderTop: `1px solid ${accentColor}10` }}>
                <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Scripture via api.bible · AI powered by Claude</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.2)' }}>The Altar · thealtarco.app</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Save Button ── */}
        {/* Account section */}
        <div className="px-6 py-4 space-y-2" style={{ borderTop: `1px solid ${accentColor}0a` }}>
          {isSignedIn ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: accentColor }}>
                  {(userName || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f0f8f4' }}>{userName || 'Signed In'}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(232,240,236,0.35)' }}>Signed in</p>
                </div>
              </div>
              <button onClick={async () => {
                  if (onSignOut) {
                    await onSignOut();
                    onClose();
                    window.location.href = '/bible/auth?logout=1';
                  }
                }}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => { onClose(); onOpenAuth?.(); }}
              className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}>
              Sign In / Create Account
            </button>
          )}
          <button onClick={() => {
            // Clear all onboarding keys
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && k.startsWith('trace-onboarding-done')) localStorage.removeItem(k);
            }
            window.location.reload();
          }}
            className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(232,240,236,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
            Restart Setup Guide
          </button>
        </div>

        <div className="sticky bottom-0 px-6 py-4" style={{ background: 'linear-gradient(0deg, rgba(10,20,16,0.98) 60%, transparent)', borderTop: hasChanges || saved ? `1px solid ${accentColor}22` : 'none' }}>
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges && !saved}
            className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
            style={saved
              ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
              : hasChanges
                ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff', boxShadow: `0 4px 15px ${accentColor}30` }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.25)', border: '1px solid rgba(255,255,255,0.05)' }
            }
          >
            {saved ? '✓ Saved' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
