'use client';

import { useState } from 'react';

interface Props {
  accentColor: string;
  onDone: () => void;
}

const TOUR_STEPS = [
  {
    icon: '🏠',
    tab: 'Home',
    title: 'Your Daily Walk',
    desc: 'Your daily verse, checklist, reading streak, and morning encounter all live here. Start every day at home.',
    tip: 'Check the daily checklist — it tracks your prayer, reading, and devotional habits.',
  },
  {
    icon: '📖',
    tab: 'Read',
    title: 'Scripture',
    desc: 'Read any chapter of the Bible in dozens of translations. Highlight verses, take notes, and listen with Read Aloud.',
    tip: 'Long-press any verse to highlight it, add a note, or share it.',
  },
  {
    icon: '🔍',
    tab: 'Search',
    title: 'Search the Word',
    desc: 'Search by keyword, topic, or verse reference. Find exactly what God put on your heart.',
    tip: 'Try searching "peace" or "John 3:16" — it finds passages instantly.',
  },
  {
    icon: '✦',
    tab: 'Study',
    title: 'Go Deeper',
    desc: 'AI-powered Bible study, book guides, maps, commentaries, reading plans, and theological tools — all in one place.',
    tip: 'Ask the Study AI anything: "What does Romans 8 mean?" or "Explain the Sermon on the Mount."',
  },
  {
    icon: '⛪',
    tab: 'Church',
    title: 'Together in Faith',
    desc: 'Post prayer requests, share testimonies, and join Kingdom Groups with other believers.',
    tip: 'Create or join a Kingdom Group to study the Bible with your friends or church community.',
  },
];

export default function AppTour({ accentColor, onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Montserrat', system-ui, sans-serif",
    }}>
      {/* Skip */}
      <button onClick={onDone} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700,
        padding: '8px 16px', borderRadius: 10, cursor: 'pointer', letterSpacing: '0.08em',
      }}>
        SKIP
      </button>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'linear-gradient(170deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${accentColor}25`,
        borderRadius: 28, padding: '36px 28px 28px',
        boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px ${accentColor}08`,
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
          background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
          border: `1px solid ${accentColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38,
        }}>
          {current.icon}
        </div>

        {/* Tab label */}
        <p style={{
          fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: accentColor, textAlign: 'center', marginBottom: 8,
        }}>
          {current.tab} Tab
        </p>

        {/* Title */}
        <h2 style={{
          fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center',
          marginBottom: 14, letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          {current.title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 14, color: 'rgba(232,240,236,0.55)', textAlign: 'center',
          lineHeight: 1.75, fontFamily: 'Georgia, serif', marginBottom: 20,
        }}>
          {current.desc}
        </p>

        {/* Tip */}
        <div style={{
          background: `${accentColor}0c`, border: `1px solid ${accentColor}20`,
          borderRadius: 14, padding: '12px 16px', marginBottom: 28,
        }}>
          <p style={{ fontSize: 12, color: `${accentColor}cc`, margin: 0, lineHeight: 1.6 }}>
            <strong>Tip:</strong> {current.tip}
          </p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 6, height: 6, borderRadius: 3,
              background: i <= step ? accentColor : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Button */}
        <button onClick={() => isLast ? onDone() : setStep(s => s + 1)} style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
          color: '#fff', fontSize: 15, fontWeight: 900,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          boxShadow: `0 4px 24px ${accentColor}40`,
        }}>
          {isLast ? "Let's Go" : 'Next'}
        </button>
      </div>
    </div>
  );
}
