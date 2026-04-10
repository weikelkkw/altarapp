'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onResult: (text: string) => void;
  accentColor: string;
  className?: string;
}

export default function VoiceInput({ onResult, accentColor, className = '' }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    setListening(true);
  }, [listening, onResult]);

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-all ${className}`}
      style={{
        background: listening ? 'rgba(239,68,68,0.2)' : `${accentColor}0d`,
        border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : `${accentColor}22`}`,
        boxShadow: listening ? '0 0 12px rgba(239,68,68,0.3)' : 'none',
        animation: listening ? 'voicePulse 1.5s ease-in-out infinite' : 'none',
      }}
      title={listening ? 'Stop listening' : 'Voice input'}
      type="button"
    >
      <style>{`
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.25); }
          50% { box-shadow: 0 0 18px rgba(239,68,68,0.5); }
        }
      `}</style>
      {listening ? (
        <span style={{ color: '#ef4444' }}>&#9679;</span>
      ) : (
        <span role="img" aria-label="microphone">&#127908;</span>
      )}
    </button>
  );
}
