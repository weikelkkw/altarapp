'use client';

import { useState } from 'react';
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

const TAB_ICONS: Record<Tab, string> = {
  home: '🏠',
  read: '📖',
  search: '🔍',
  study: '✦',
  community: '💬',
};


export default function Header({
  tab, selectedBook, selectedChapter, accentColor, headerBg, onOpenSettings, onOpenAuth, isSignedIn, userName,
}: Props) {
  const isOT = BOOKS.indexOf(selectedBook) < 39;


  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const contextLine = tab === 'read'
    ? `${isOT ? 'Old Testament' : 'New Testament'} · ${selectedBook.name} ${selectedChapter}`
    : TAB_SUBTITLES[tab];

  return (
    <header className="relative shrink-0 overflow-hidden select-none">
      <div className="absolute inset-0" style={{ background: headerBg }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 80% at 80% 40%, ${accentColor}14 0%, transparent 70%)` }} />




      {/* Bottom line — glowing */}
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
            <div className="mb-2">
              {/* TRACE wordmark */}
              <div className="flex items-baseline gap-0 relative w-fit">
                {/* Crisp T — Trace green, no glow */}
                <span className="relative font-black select-none" style={{
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                  fontSize: 26, lineHeight: 1,
                  letterSpacing: '0.06em',
                  color: '#00d084',
                }}>T</span>
                {/* RACE — white */}
                <span className="relative font-black select-none" style={{
                  fontFamily: 'Montserrat, system-ui, sans-serif',
                  fontSize: 26, lineHeight: 1,
                  letterSpacing: '0.06em',
                  color: '#ffffff',
                }}>RACE</span>
                {/* Live dot */}
                <div className="absolute -top-1 -right-2.5 w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)', animation: 'dotPulse 2s ease-in-out infinite' }} />
              </div>
              {/* Subtitle below with glisten shimmer */}
              <div className="relative mt-0.5 w-fit overflow-hidden">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#00d08488', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Truth & Grace</p>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(90deg, transparent 0%, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%, transparent 100%)',
                  animation: 'glistenSweep 6s ease-in-out 1.5s infinite',
                }} />
              </div>
            </div>

            {/* Minimal context — only show on Read tab */}
            {tab === 'read' && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md inline-flex" style={{ background: `${accentColor}0a` }}>
                <span className="text-[10px] font-semibold" style={{ color: `${accentColor}66` }}>{contextLine}</span>
              </div>
            )}
          </div>

          {/* Settings / Auth button — unified */}
          <div className="flex items-center gap-2">
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
        @keyframes headerFloat { 0% { transform: translateY(0) translateX(0); opacity: 0.15; } 100% { transform: translateY(-12px) translateX(6px); opacity: 0.05; } }
        @keyframes crossPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes dotPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
        @keyframes glowLetterPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes glistenSweep { 0%, 100% { transform: translateX(-150%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 95%, 100% { transform: translateX(250%); opacity: 0; } }
        @keyframes headerScriptureGlow { 0% { background-position: 0% 100%; } 100% { background-position: 0% -100%; } }
        @keyframes headerPhraseFade { 0% { opacity: 0; transform: scale(0.95); } 15% { opacity: 1; transform: scale(1); } 85% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.02); } }
      `}} />
    </header>
  );
}
