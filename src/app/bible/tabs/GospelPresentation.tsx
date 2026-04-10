'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { completeDailyCheck } from '../types';

/* ───────────────────────────── Props ───────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  accentColor: string;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
}

/* ───────────────────────────── Slide data ──────────────────────── */

interface GospelSlide {
  id: string;
  headline: string;
  subtitle: string;
  verses: { ref: string; text: string }[];
  explanation: string;
  icon: string; // SVG path data for background icon
}

const SLIDES: GospelSlide[] = [
  {
    id: 'love',
    headline: "God's Love",
    subtitle: 'God created you and loves you deeply',
    verses: [
      { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
      { ref: 'Jeremiah 31:3', text: 'Yea, I have loved thee with an everlasting love: therefore with lovingkindness have I drawn thee.' },
      { ref: 'Genesis 1:27', text: 'So God created man in his own image, in the image of God created he him; male and female created he them.' },
      { ref: 'Psalm 139:13-14', text: 'For thou hast possessed my reins: thou hast covered me in my mother\'s womb. I will praise thee; for I am fearfully and wonderfully made.' },
      { ref: '1 John 4:9-10', text: 'In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him.' },
    ],
    explanation:
      'Before anything existed — before the mountains, the oceans, the stars — there was God. And out of pure love, He created you. Not because He needed you, but because He wanted you. He shaped you with His own hands, breathed life into your lungs, and called you His masterpiece. You are not an accident. You are not a mistake. You were dreamed of, designed, and deeply loved before you ever took your first breath.',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  },
  {
    id: 'problem',
    headline: 'The Problem',
    subtitle: 'Sin separates us from God',
    verses: [
      { ref: 'Romans 3:23', text: 'For all have sinned, and come short of the glory of God.' },
      { ref: 'Isaiah 59:2', text: 'But your iniquities have separated between you and your God, and your sins have hid his face from you.' },
      { ref: 'Genesis 3:6-7', text: 'And when the woman saw that the tree was good for food... she took of the fruit thereof, and did eat, and gave also unto her husband.' },
      { ref: 'Ecclesiastes 7:20', text: 'For there is not a just man upon earth, that doeth good, and sinneth not.' },
      { ref: 'James 4:17', text: 'Therefore to him that knoweth to do good, and doeth it not, to him it is sin.' },
    ],
    explanation:
      'Something went wrong. In a garden called Eden, the first humans were given everything — intimacy with God, purpose, beauty, freedom. But they chose their own way. And that single choice cracked everything. That fracture didn\'t stay in the garden. It spread to every human heart that has ever beaten. We all carry it. We all feel it — that sense that something is broken, that we are not who we were made to be. The Bible calls it sin. And it separates us from the God who made us.',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    id: 'cost',
    headline: 'The Cost',
    subtitle: 'The consequence of sin is death',
    verses: [
      { ref: 'Romans 6:23a', text: 'For the wages of sin is death...' },
      { ref: 'Ezekiel 18:20', text: 'The soul that sinneth, it shall die.' },
      { ref: 'Genesis 2:17', text: 'But of the tree of the knowledge of good and evil, thou shalt not eat of it: for in the day that thou eatest thereof thou shalt surely die.' },
      { ref: 'Hebrews 9:27', text: 'It is appointed unto men once to die, but after this the judgment.' },
      { ref: 'Revelation 20:12', text: 'And I saw the dead, small and great, stand before God; and the books were opened.' },
    ],
    explanation:
      'Here is the weight of it. Sin is not just a bad feeling — it carries a real price. God warned Adam in the very beginning: the day you turn from Me, death enters the story. And it did. Not just physical death, but a spiritual separation — being cut off from the source of all life, all joy, all love. Every human being who has ever lived stands under that same weight. We cannot pay it off. We cannot work it away. Left on our own, we are lost. But God did not leave us on our own.',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    id: 'solution',
    headline: "God's Solution",
    subtitle: 'Jesus died in your place',
    verses: [
      { ref: 'Romans 5:8', text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
      { ref: '1 Peter 3:18', text: 'For Christ also hath once suffered for sins, the just for the unjust, that he might bring us to God.' },
      { ref: 'Isaiah 53:5', text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.' },
      { ref: 'John 14:6', text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
      { ref: 'Colossians 2:14', text: 'Blotting out the handwriting of ordinances that was against us... nailing it to his cross.' },
    ],
    explanation:
      'This is the heart of everything. Seven hundred years before it happened, the prophet Isaiah described a man who would be "wounded for our transgressions" and "bruised for our iniquities." That man was Jesus — God Himself, wrapped in human flesh, walking into our broken world. He healed the sick. He loved the outcast. He spoke truth that shook empires. And then, willingly, He walked to a cross. Not because He was weak. Because He loved you. On that cross, He took every sin you have ever committed and every sin you ever will — and He absorbed the full weight of it. He died in your place. It was the greatest rescue mission in the history of the universe. And it was planned before the world began.',
    icon: 'M12 2v20M2 12h20',
  },
  {
    id: 'gift',
    headline: 'The Gift',
    subtitle: 'Salvation is a free gift through faith',
    verses: [
      { ref: 'Ephesians 2:8-9', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.' },
      { ref: 'Romans 6:23b', text: '...but the gift of God is eternal life through Jesus Christ our Lord.' },
      { ref: 'Titus 3:5', text: 'Not by works of righteousness which we have done, but according to his mercy he saved us.' },
      { ref: 'John 1:12', text: 'But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name.' },
      { ref: 'Acts 16:31', text: 'Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.' },
    ],
    explanation:
      'Here is the part that changes everything. You might expect God to say, "Now earn your way back to Me." But He doesn\'t. He says the opposite. Salvation — being made right with God — is a gift. You cannot earn it by being good enough. You cannot buy it with money or effort. You cannot achieve it through religion. It is free. Completely free. The price was already paid in full on that cross. All you have to do is open your hands and receive it. That is grace — getting what you do not deserve, from a God who loves you more than you can imagine.',
    icon: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  },
  {
    id: 'response',
    headline: 'Your Response',
    subtitle: 'Believe, confess, follow',
    verses: [
      { ref: 'Romans 10:9-10', text: 'If thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
      { ref: 'Acts 2:38', text: 'Repent, and be baptized every one of you in the name of Jesus Christ for the remission of sins, and ye shall receive the gift of the Holy Ghost.' },
      { ref: 'Mark 1:15', text: 'The time is fulfilled, and the kingdom of God is at hand: repent ye, and believe the gospel.' },
      { ref: 'Luke 9:23', text: 'If any man will come after me, let him deny himself, and take up his cross daily, and follow me.' },
      { ref: 'Joshua 24:15', text: 'Choose you this day whom ye will serve... but as for me and my house, we will serve the LORD.' },
    ],
    explanation:
      'God will never force Himself on you. He stands at the door and knocks — but you have to open it. This is your moment. Not religion. Not rules. Relationship. Jesus\' first words when He began His ministry were simple: "Repent and believe." Turn from the old life. Turn toward Him. Believe that He is who He says He is. Confess it out loud — not to earn anything, but because your heart is overflowing with what it has found. Then follow Him. One day at a time. One step at a time. This decision will change everything about your life, your eternity, and your identity.',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  },
  {
    id: 'new-life',
    headline: 'New Life',
    subtitle: 'You are a new creation in Christ',
    verses: [
      { ref: '2 Corinthians 5:17', text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
      { ref: 'Romans 8:1', text: 'There is therefore now no condemnation to them which are in Christ Jesus.' },
      { ref: 'Galatians 2:20', text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me.' },
      { ref: 'Revelation 21:5', text: 'And he that sat upon the throne said, Behold, I make all things new.' },
      { ref: 'Philippians 1:6', text: 'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.' },
    ],
    explanation:
      'The moment you say yes to Jesus, something supernatural happens. The old you — the guilt, the shame, the weight of everything you have ever done — is gone. Dead. Buried. And something brand new rises in its place. You are not a cleaned-up version of your old self. You are an entirely new creation. Christ Himself takes up residence inside you. The God who spoke galaxies into existence now lives in your heart. There is no more condemnation. No more fear. No more separation. And here is the promise: He who began this good work in you will carry it to completion. This is not the end of your story. It is the very beginning of the life you were always meant to live.',
    icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  },
];

/* ────────────────────────── Salvation prayer ───────────────────── */

const PRAYER_TEXT = `Lord Jesus, I come to You just as I am.

I believe You are the Son of God, that You died on the cross for my sins, and that You rose again on the third day.

I confess that I have sinned and fallen short. I am sorry, and I turn away from my old life.

I ask You to forgive me and to come into my heart as my Lord and Savior. I receive Your gift of eternal life.

Fill me with Your Holy Spirit and help me to follow You all of my days.

Thank You for loving me. Thank You for saving me. I am Yours.

In Jesus' name, Amen.`;

/* ──────────────────── Share text generation ────────────────────── */

function buildShareText(): string {
  let text = 'THE GOSPEL — The Greatest Story Ever Told\n\n';
  SLIDES.forEach((s, i) => {
    text += `${i + 1}. ${s.headline} — ${s.subtitle}\n`;
    s.verses.forEach(v => {
      text += `   "${v.text}" — ${v.ref}\n`;
    });
    text += `   ${s.explanation}\n\n`;
  });
  text += '— — —\n\nA Prayer of Salvation:\n\n' + PRAYER_TEXT;
  return text;
}

/* ──────────────────────────── Component ─────────────────────────── */

export default function GospelPresentation({ open, onClose, accentColor, ttsEnabled, ttsVoice, ttsRate }: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const stopTTS = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    setSpeaking(false);
  }, []);

  const speakSlide = useCallback((slide: GospelSlide) => {
    if (speaking) { stopTTS(); return; }
    const text = `${slide.headline}. ${slide.explanation} ${slide.verses[0].text} — ${slide.verses[0].ref}`;
    const verses = [{ verse: 1, text }];
    const narratorVoiceId = ttsVoice ? ttsVoice.replace('eleven:', '') : '88cgASIFJ5iO94COdgBO';
    setSpeaking(true);
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verses, narratorVoiceId, bookIndex: 0, chapter: 1, mode: 'narrator' }),
    })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        if (blob.size < 100) { setSpeaking(false); return; }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = ttsRate || 1;
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
        audio.onerror = () => { setSpeaking(false); audioRef.current = null; };
        audioRef.current = audio;
        audio.play().catch(() => { setSpeaking(false); audioRef.current = null; });
      })
      .catch(() => setSpeaking(false));
  }, [speaking, stopTTS, ttsVoice, ttsRate]);

  // Stop TTS on slide change or close
  useEffect(() => { stopTTS(); }, [current]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) stopTTS(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrent(0);
      setShowPrayer(false);
      setCopied(false);
      setAnimating(false);
      setExpandedVerse(null);
      setShowCelebration(false);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const goTo = useCallback((index: number, dir: 'next' | 'prev') => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 340);
  }, [animating]);

  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) goTo(current + 1, 'next');
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    if (current > 0) goTo(current - 1, 'prev');
  }, [current, goTo]);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback: select-all prompt
      const ta = document.createElement('textarea');
      ta.value = buildShareText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  if (!open) return null;

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  // Force heavenly blue regardless of theme accent
  const gospelBlue = '96,165,250';
  const accentRgb = gospelBlue;
  const accentFaint = `rgba(${accentRgb},0.08)`;
  const accentGlow = `rgba(${accentRgb},0.35)`;
  const accentMid = `rgba(${accentRgb},0.55)`;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #04081a 0%, #0a1535 30%, #0f1f4a 60%, #06102a 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      {/* ─── Heavenly ambient effects ─── */}
      <style>{`
        @keyframes gospelStarInner { 0%,100% { opacity: 0.08; } 50% { opacity: 0.5; } }
        @keyframes heavenlyBreath { 0%,100% { opacity: 0.06; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.05); } }
      `}</style>
      {/* Stars */}
      {[...Array(25)].map((_, i) => (
        <div key={`gs${i}`} className="absolute rounded-full pointer-events-none" style={{
          left: `${((i * 59 + 13) % 95) + 2}%`, top: `${((i * 43 + 7) % 92) + 3}%`,
          width: i % 6 === 0 ? 2 : i % 3 === 0 ? 1.5 : 0.8,
          height: i % 6 === 0 ? 2 : i % 3 === 0 ? 1.5 : 0.8,
          background: i % 4 === 0 ? '#c4b5fd' : i % 2 === 0 ? '#93c5fd' : '#e0eeff',
          animation: `gospelStarInner ${2.5 + (i % 5)}s ease-in-out ${i * 0.25}s infinite`,
        }} />
      ))}
      {/* Breathing light */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(96,165,250,0.08), transparent 60%)', animation: 'heavenlyBreath 8s ease-in-out infinite', pointerEvents: 'none' }} />
      {/* Dark vignette at top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 25% 80%, rgba(147,197,253,0.04), transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 35% at 80% 70%, rgba(196,181,253,0.03), transparent 50%)', pointerEvents: 'none' }} />




      {/* ─── Prayer image ─── */}
      {showPrayer && (
        <img
          src="/gospel-prayer.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            width: '100%', height: '65%',
            objectFit: 'cover', objectPosition: 'center center',
            opacity: 0.50,
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}

      {/* ─── Slide image ─── */}
      {!showPrayer && slide.id === 'love' && (
        <img
          src="/gospel-love.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'problem' && (
        <img
          src="/gospel-problem.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            width: '100%', height: '65%',
            objectFit: 'cover', objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'cost' && (
        <img
          src="/gospel-cost.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'solution' && (
        <img
          src="/gospel-solution.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'response' && (
        <img
          src="/gospel-response.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'gift' && (
        <img
          src="/gospel-gift.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}
      {!showPrayer && slide.id === 'new-life' && (
        <img
          src="/gospel-new-life.jpg"
          alt=""
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '65%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: animating ? 0 : 0.50,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.75) 52%, rgba(0,0,0,0.97) 100%)',
          }}
        />
      )}

      {/* ─── Top bar ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'none'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <span
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 11,
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          The Gospel
        </span>

        <button
          onClick={handleShare}
          style={{
            background: copied ? accentFaint : 'none',
            border: 'none',
            color: copied ? accentColor : 'rgba(255,255,255,0.5)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 8,
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'none'; } }}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          )}
          <span style={{ fontSize: 12 }}>{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {/* ─── Main slide content ─── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '20px 24px 180px',
          position: 'relative',
          zIndex: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {showPrayer ? (
          /* ── Prayer overlay ── */
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              animation: 'gospelFadeUp 0.5s ease both',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: accentColor,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              A Prayer of Salvation
            </div>
            <div
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 17,
                lineHeight: 2,
                color: 'rgba(255,255,255,0.88)',
                whiteSpace: 'pre-line',
                textAlign: 'left',
                padding: '28px 32px',
                background: `linear-gradient(135deg, rgba(${accentRgb},0.06) 0%, rgba(${accentRgb},0.02) 100%)`,
                borderRadius: 16,
                border: `1px solid rgba(${accentRgb},0.12)`,
                maxHeight: '55vh',
                overflowY: 'auto',
              }}
            >
              {PRAYER_TEXT}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 32, width: '100%' }}>
              <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, margin: 0 }}>Make it official</p>
              <button
                onClick={() => {
                  try { localStorage.setItem('trace-gospel-completed', 'true'); } catch {}
                  completeDailyCheck('apply');
                  setShowCelebration(true);
                }}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '20px 32px',
                  borderRadius: 18,
                  border: '1px solid rgba(186,230,253,0.3)',
                  cursor: 'pointer',
                  background: 'linear-gradient(160deg, #bfdbfe 0%, #7dd3fc 40%, #38bdf8 100%)',
                  color: '#fff',
                  boxShadow: '0 0 60px rgba(125,211,252,0.55), 0 0 120px rgba(56,189,248,0.25), 0 8px 32px rgba(0,0,0,0.5)',
                  animation: 'ctaPulse 2.5s ease-in-out infinite',
                  transition: 'all 0.3s ease',
                  lineHeight: 1.3,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', opacity: 0.6, marginBottom: 4 }}>I declare</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>I Accept Jesus as My<br/>Lord and Savior</div>
              </button>
              <button onClick={() => setShowPrayer(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
                Back to slides
              </button>
            </div>
          </div>
        ) : (
          /* ── Slide content ── */
          <div
            key={slide.id}
            style={{
              maxWidth: 560,
              width: '100%',
              textAlign: 'center',
              animation: animating
                ? `gospelSlide${direction === 'next' ? 'Out' : 'OutReverse'} 0.34s ease both`
                : `gospelSlide${direction === 'next' ? 'In' : 'InReverse'} 0.34s ease both`,
            }}
          >
            {/* Step number */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `1.5px solid ${accentMid}`,
                color: accentColor,
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 20,
                background: accentFaint,
              }}
            >
              {current + 1}
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(32px, 6vw, 48px)',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 8px',
                letterSpacing: -1,
                lineHeight: 1.1,
                fontFamily: "'Montserrat', system-ui, sans-serif",
              }}
            >
              {slide.headline}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 16,
                color: accentColor,
                margin: '0 0 32px',
                fontWeight: 500,
                letterSpacing: 0.5,
                opacity: 0.85,
              }}
            >
              {slide.subtitle}
            </p>

            {/* TTS read-aloud button */}
            {ttsEnabled && (
              <button
                onClick={() => speakSlide(slide)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginBottom: 24, padding: '8px 18px', borderRadius: 20,
                  background: speaking ? `rgba(${accentRgb},0.18)` : `rgba(${accentRgb},0.10)`,
                  border: `1px solid rgba(${accentRgb},0.3)`,
                  color: `rgba(${accentRgb},1)`,
                  fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 14 }}>{speaking ? '⏸' : '▶'}</span>
                {speaking ? 'Stop' : 'Read Aloud'}
              </button>
            )}

            {/* Narrative — story first, scripture woven in */}
            <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
              {/* The story */}
              <p style={{
                fontSize: 16, lineHeight: 2, color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Georgia, "Times New Roman", serif', margin: '0 0 24px',
              }}>
                {slide.explanation}
              </p>

              {/* Key verse — featured prominently */}
              <div style={{
                padding: '24px 28px', borderRadius: 16, marginBottom: 20, textAlign: 'center',
                borderLeft: `3px solid rgba(${accentRgb},0.4)`,
              }}>
                <p style={{
                  fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.9)', margin: 0, fontStyle: 'italic',
                }}>
                  &ldquo;{slide.verses[0].text}&rdquo;
                </p>
                <p style={{ marginTop: 12, marginBottom: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: `rgba(${accentRgb},0.7)` }}>
                  — {slide.verses[0].ref}
                </p>
              </div>

              {/* Supporting scripture — tap to expand */}
              {slide.verses.length > 1 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: `rgba(${accentRgb},0.4)`, marginBottom: 10 }}>
                    More from Scripture
                  </p>
                  {slide.verses.slice(1).map((v, vi) => {
                    const isExpanded = expandedVerse === vi;
                    return (
                      <div key={vi} style={{ marginBottom: 12 }}>
                        {isExpanded ? (
                          /* Expanded — same featured style as key verse */
                          <div
                            onClick={() => setExpandedVerse(null)}
                            style={{
                              padding: '20px 24px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                              background: `linear-gradient(135deg, rgba(0,0,0,0.45), rgba(0,0,0,0.35))`,
                              borderLeft: `3px solid rgba(${accentRgb},0.4)`,
                              animation: 'gospelFadeUp 0.3s ease both',
                            }}>
                            <p style={{
                              fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 16, lineHeight: 1.8,
                              color: 'rgba(255,255,255,0.9)', margin: 0, fontStyle: 'italic',
                            }}>
                              &ldquo;{v.text}&rdquo;
                            </p>
                            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: `rgba(${accentRgb},0.7)` }}>
                              — {v.ref}
                            </p>
                          </div>
                        ) : (
                          /* Collapsed — tap to expand */
                          <button
                            onClick={() => setExpandedVerse(vi)}
                            style={{
                              width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
                              padding: '8px 12px 8px 14px', borderRadius: 10, borderLeft: `2px solid rgba(${accentRgb},0.25)`,
                              transition: 'all 0.2s',
                            }}>
                            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: `rgba(${accentRgb},0.6)`, margin: 0, fontWeight: 600 }}>
                              {v.ref}
                            </p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>
                              Tap to read →
                            </p>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accept button on last slide — goes straight to prayer + celebration */}
            {isLast && (
              <div style={{ width: '100%', marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, margin: 0 }}>This is the moment</p>
                <button
                  onClick={() => setShowPrayer(true)}
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    padding: '20px 32px',
                    background: 'linear-gradient(160deg, #bfdbfe 0%, #7dd3fc 40%, #38bdf8 100%)',
                    border: '1px solid rgba(186,230,253,0.3)',
                    borderRadius: 18,
                    color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 0 60px rgba(125,211,252,0.55), 0 0 120px rgba(56,189,248,0.25), 0 8px 32px rgba(0,0,0,0.5)',
                    animation: 'ctaPulse 2.5s ease-in-out infinite',
                    transition: 'all 0.3s ease',
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', opacity: 0.6, marginBottom: 4 }}>I&apos;m ready</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>Take Me to the Prayer</div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom navigation ─── */}
      {!showPrayer && (
        <div
          style={{
            padding: '20px 24px 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== current) goTo(i, i > current ? 'next' : 'prev');
                }}
                style={{
                  width: i === current ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: i === current
                    ? accentColor
                    : i < current
                      ? `rgba(${accentRgb},0.3)`
                      : 'rgba(255,255,255,0.12)',
                }}
                aria-label={`Go to slide ${i + 1}: ${SLIDES[i].headline}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={goPrev}
              disabled={current === 0}
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                border: `1px solid ${current === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)'}`,
                background: 'none',
                color: current === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.65)',
                fontSize: 14,
                fontWeight: 600,
                cursor: current === 0 ? 'default' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Montserrat', system-ui, sans-serif",
              }}
              onMouseEnter={e => { if (current > 0) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (current > 0) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
            >
              Back
            </button>
            <button
              onClick={goNext}
              disabled={current === SLIDES.length - 1}
              style={{
                padding: '14px 40px',
                borderRadius: 14,
                border: current === SLIDES.length - 1 ? 'none' : '1px solid rgba(186,230,253,0.3)',
                background: current === SLIDES.length - 1
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(160deg, #bfdbfe 0%, #7dd3fc 40%, #38bdf8 100%)',
                color: current === SLIDES.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: current === SLIDES.length - 1 ? 'default' : 'pointer',
                transition: 'all 0.25s',
                letterSpacing: 0.5,
                fontFamily: "'Montserrat', system-ui, sans-serif",
                boxShadow: current === SLIDES.length - 1 ? 'none' : '0 0 40px rgba(125,211,252,0.5), 0 4px 16px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={e => { if (!isLast) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(125,211,252,0.75), 0 6px 20px rgba(0,0,0,0.5)'; } }}
              onMouseLeave={e => { if (!isLast) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(125,211,252,0.5), 0 4px 16px rgba(0,0,0,0.4)'; } }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ─── Celebration overlay — separate full screen ─── */}
      {showCelebration && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'linear-gradient(180deg, #04081a 0%, #0f1f4a 40%, #0a1535 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 32px', overflow: 'auto',
        }}>
          {/* Welcome Home background image */}
          <img src="/welcome-home.jpg" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center center',
            opacity: 0.35, pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
          }} />
          {/* Stars */}
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              left: `${((i * 59 + 13) % 95) + 2}%`, top: `${((i * 43 + 7) % 92) + 3}%`,
              width: i % 6 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 0.8,
              height: i % 6 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 0.8,
              background: i % 4 === 0 ? '#c4b5fd' : i % 2 === 0 ? '#93c5fd' : '#e0eeff',
              animation: `gospelStarInner ${2.5 + (i % 5)}s ease-in-out ${i * 0.25}s infinite`,
            }} />
          ))}
          {/* Breathing glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(96,165,250,0.1), transparent 60%)', animation: 'heavenlyBreath 8s ease-in-out infinite', pointerEvents: 'none' }} />

          <div style={{ textAlign: 'center', maxWidth: 440, position: 'relative', zIndex: 10, animation: 'gospelFadeUp 0.8s ease both' }}>
            {/* SVG Cross */}
            <div style={{ marginBottom: 24, animation: 'crossGlow 3s ease-in-out infinite' }}>
              <svg width="72" height="88" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="28" y="0" width="16" height="88" rx="4" fill="url(#crossGrad)"/>
                <rect x="0" y="24" width="72" height="16" rx="4" fill="url(#crossGrad)"/>
                <defs>
                  <linearGradient id="crossGrad" x1="0" y1="0" x2="72" y2="88" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#93c5fd"/>
                    <stop offset="50%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h1 style={{
              fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 12px',
              fontFamily: 'Montserrat, system-ui, sans-serif', letterSpacing: -1, lineHeight: 1.1,
            }}>
              Welcome Home
            </h1>

            <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)', margin: '0 auto 24px' }} />

            <p style={{ fontSize: 16, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)', margin: '0 0 28px', fontFamily: 'Georgia, serif' }}>
              Heaven is rejoicing right now. The angels are celebrating. You have made the most important decision of your entire life.
            </p>

            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 8px', fontFamily: 'Montserrat, sans-serif' }}>
              You are forgiven. You are free.
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', margin: '0 0 28px', fontFamily: 'Montserrat, sans-serif' }}>
              You are a child of God.
            </p>

            <div style={{ padding: '16px 24px', borderRadius: 16, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: 'rgba(147,197,253,0.7)', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
                &ldquo;I say unto you, there is joy in the presence of the angels of God over one sinner that repenteth.&rdquo;
              </p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(96,165,250,0.5)', marginTop: 8, marginBottom: 0 }}>— Luke 15:10</p>
            </div>

            {/* Trophy */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px',
              borderRadius: 16, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)',
              marginBottom: 32,
            }}>
              <span style={{ fontSize: 28 }}>🏆</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>Trophy Earned</p>
                <p style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', margin: '2px 0 0' }}>The Foundation — your first milestone</p>
              </div>
            </div>

            <div style={{ marginTop: 8, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600, margin: 0 }}>Your journey starts now</p>
              <button onClick={onClose}
                style={{
                  width: '100%', maxWidth: 380,
                  padding: '20px 32px', borderRadius: 18,
                  border: '1px solid rgba(186,230,253,0.3)', cursor: 'pointer',
                  background: 'linear-gradient(160deg, #bfdbfe 0%, #7dd3fc 40%, #38bdf8 100%)',
                  color: '#fff',
                  boxShadow: '0 0 60px rgba(125,211,252,0.55), 0 0 120px rgba(56,189,248,0.25), 0 8px 32px rgba(0,0,0,0.5)',
                  animation: 'ctaPulse 2.5s ease-in-out infinite',
                  transition: 'all 0.3s ease',
                  lineHeight: 1.3,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', opacity: 0.6, marginBottom: 4 }}>My journey starts now</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>Begin My Walk with God</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CSS keyframes (injected once) ─── */}
      <style>{`
        @keyframes gospelSlideIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gospelSlideOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-60px); }
        }
        @keyframes gospelSlideInReverse {
          from { opacity: 0; transform: translateX(-60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gospelSlideOutReverse {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(60px); }
        }
        @keyframes gospelFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(125,211,252,0.55), 0 0 120px rgba(56,189,248,0.25), 0 8px 32px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 90px rgba(125,211,252,0.8), 0 0 180px rgba(56,189,248,0.4), 0 8px 40px rgba(0,0,0,0.6); }
        }
        @keyframes crossGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(96,165,250,0.6)) drop-shadow(0 0 28px rgba(96,165,250,0.3)); }
          50% { filter: drop-shadow(0 0 20px rgba(96,165,250,0.9)) drop-shadow(0 0 48px rgba(96,165,250,0.5)); }
        }
      `}</style>
    </div>
  );
}

/* ─── Utility helpers ─── */

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}

function adjustBrightness(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, (parseInt(h.substring(0, 2), 16) || 0) + amount));
  const g = Math.max(0, Math.min(255, (parseInt(h.substring(2, 4), 16) || 0) + amount));
  const b = Math.max(0, Math.min(255, (parseInt(h.substring(4, 6), 16) || 0) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
