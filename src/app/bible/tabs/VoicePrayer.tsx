'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  accentColor: string;
  onComplete: (text: string) => void;
  onClose: () => void;
}

export default function VoicePrayer({ accentColor, onComplete, onClose }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        setError('');

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'prayer.webm');

          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.error) {
            setError(data.error);
          } else {
            setTranscription(data.text);
          }
        } catch {
          setError('Could not transcribe. Check your connection.');
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(1000);
      mediaRef.current = recorder;
      setRecording(true);
      setDuration(0);
      setTranscription('');
      setError('');

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      setError('Could not access microphone. Please allow microphone access.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop();
      setRecording(false);
    }
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03))', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div className="px-5 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙</span>
            <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: '#818cf8', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Pray Aloud</h3>
          </div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'rgba(232,240,236,0.3)' }}>✕</button>
        </div>

        {!transcription && !transcribing && (
          <>
            {/* Recording UI */}
            <div className="text-center py-4">
              {recording ? (
                <>
                  {/* Recording indicator */}
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-full absolute animate-ping" style={{ background: 'rgba(239,68,68,0.15)' }} />
                    <div className="w-20 h-20 rounded-full absolute" style={{ background: 'rgba(239,68,68,0.1)', animation: 'pulse 2s ease-in-out infinite' }} />
                    <button onClick={stopRecording}
                      className="w-16 h-16 rounded-full flex items-center justify-center relative z-10"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
                      <div className="w-5 h-5 rounded-sm bg-white" />
                    </button>
                  </div>
                  <p className="text-lg font-bold mb-1" style={{ color: '#ef4444' }}>{formatTime(duration)}</p>
                  <p className="text-xs" style={{ color: 'rgba(232,240,236,0.4)' }}>Recording… tap to stop</p>
                </>
              ) : (
                <>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif' }}>
                    Speak your prayer aloud. It will be perfectly transcribed and saved to your journal.
                  </p>
                  <button onClick={startRecording}
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 0 24px rgba(99,102,241,0.3)' }}>
                    <span className="text-2xl">🎙</span>
                  </button>
                  <p className="text-xs" style={{ color: 'rgba(232,240,236,0.35)' }}>Tap to start recording</p>
                </>
              )}
            </div>
          </>
        )}

        {/* Transcribing */}
        {transcribing && (
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(129,140,248,0.2)', borderTopColor: '#818cf8' }} />
            <p className="text-sm font-semibold" style={{ color: '#818cf8' }}>Transcribing your prayer…</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(232,240,236,0.3)' }}>Powered by OpenAI Whisper</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={() => { setError(''); setTranscription(''); }}
              className="text-xs px-4 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Try Again</button>
          </div>
        )}

        {/* Transcription result */}
        {transcription && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(129,140,248,0.5)' }}>Your Prayer</p>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,0,0,0.15)', borderLeft: '3px solid rgba(129,140,248,0.3)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif' }}>
                {transcription}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setTranscription(''); setDuration(0); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(232,240,236,0.5)' }}>
                Record Again
              </button>
              <button onClick={() => onComplete(transcription)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}>
                Save to Journal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
