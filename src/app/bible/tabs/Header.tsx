'use client';

import { BookDef, BOOKS } from '../types';

type Tab = 'home' | 'read' | 'search' | 'study' | 'community';

interface Props {
  tab: Tab;
  selectedBook: BookDef;
  selectedChapter: number;
  accentColor: string;
  headerBg: string;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  onOpenNotifications?: () => void;
  notifUnread?: number;
  isSignedIn?: boolean;
  userName?: string;
}

const TAB_SUBTITLES: Record<Tab, string> = {
  home: 'Your Daily Walk',
  read: 'Scripture',
  search: 'Search the Word',
  study: 'Go Deeper',
  community: 'Together in Faith',
};

export default function Header({
  tab, selectedBook, selectedChapter, accentColor, headerBg,
  onOpenSettings, onOpenAuth, onOpenNotifications, notifUnread,
  isSignedIn, userName,
}: Props) {
  const isOT = BOOKS.indexOf(selectedBook) < 39;

  const contextLine = tab === 'read'
    ? `${isOT ? 'Old Testament' : 'New Testament'} · ${selectedBook.name} ${selectedChapter}`
    : TAB_SUBTITLES[tab];

  return (
    <header className="relative shrink-0 overflow-hidden select-none">
      <div className="absolute inset-0" style={{ background: headerBg }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 80% at 80% 40%, ${accentColor}14 0%, transparent 70%)` }} />

      {/* Bottom glow line */}
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent 10%, ${accentColor}44 50%, transparent 90%)` }} />
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div className="h-full w-1/4" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, ${accentColor}, transparent)`, animation: 'shimmer 4s ease-in-out infinite', boxShadow: `0 0 8px ${accentColor}66, 0 0 16px ${accentColor}33` }} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden" style={{ filter: `blur(2px)` }}>
        <div className="h-full w-1/4" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)`, animation: 'shimmer 4s ease-in-out infinite' }} />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5">
              {/* The Altar logo lockup */}
              <div className="flex items-center gap-2.5">
                {/* Cross icon */}
                <svg width="14" height="20" viewBox="0 0 14 20" fill="none" style={{ filter: `drop-shadow(0 0 4px ${accentColor}88)`, flexShrink: 0 }}>
                  <rect x="5.5" y="0" width="3" height="20" rx="0.75" fill={accentColor} />
                  <rect x="0" y="5" width="14" height="3" rx="0.75" fill={accentColor} />
                </svg>
                {/* Wordmark */}
                <div className="relative overflow-hidden">
                  <span className="font-black select-none block" style={{
                    fontFamily: 'Montserrat, system-ui, sans-serif',
                    fontSize: 22, lineHeight: 1, letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    background: `linear-gradient(160deg, #fff 0%, ${accentColor} 70%)`,
                    backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
                    filter: `drop-shadow(0 0 8px ${accentColor}44)`,
                  }}>The Altar</span>
                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, width: '30%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                      animation: 'shimmer 6s ease-in-out 2s infinite',
                    }} />
                  </div>
                </div>
              </div>
              <p className="text-[8px] font-bold uppercase mt-1" style={{
                color: `${accentColor}55`,
                letterSpacing: '0.22em',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                paddingLeft: 22,
              }}>The Entrance</p>
            </div>

            {tab === 'read' && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md inline-flex" style={{ background: `${accentColor}0a` }}>
                <span className="text-[10px] font-semibold" style={{ color: `${accentColor}66` }}>{contextLine}</span>
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Bell button */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}2e` }}
                aria-label="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifUnread != null && notifUnread > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black px-1"
                    style={{ background: accentColor, color: '#000' }}
                  >
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </button>
            )}

            {!isSignedIn && onOpenAuth && (
              <button onClick={onOpenAuth}
                className="h-9 rounded-xl flex items-center justify-center transition-all px-3 gap-1.5"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                <span className="text-[10px] font-bold" style={{ color: 'rgba(96,165,250,0.8)' }}>Sign In</span>
              </button>
            )}

            <button onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}2e` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.7 }}>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <circle cx="8" cy="6" r="2" fill={accentColor} />
                <circle cx="16" cy="12" r="2" fill={accentColor} />
                <circle cx="10" cy="18" r="2" fill={accentColor} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
      `}} />
    </header>
  );
}
