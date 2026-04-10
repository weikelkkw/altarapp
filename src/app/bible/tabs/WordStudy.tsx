'use client';

import { useState, useRef, useCallback } from 'react';
import { T, cleanMarkdown } from '../types';

interface Props {
  accentColor: string;
  selectedBibleAbbr: string;
}

const QUICK_WORDS = [
  'grace', 'faith', 'love', 'hope', 'peace',
  'mercy', 'righteousness', 'covenant', 'salvation', 'redemption',
];

interface ParsedSection {
  type: 'language' | 'occurrence' | 'text';
  title?: string;
  reference?: string;
  content: string;
}

function parseResponse(raw: string): ParsedSection[] {
  const text = cleanMarkdown(raw);
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');

  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) currentSection.content += '\n';
      continue;
    }

    // Detect original language / transliteration section
    const langMatch = trimmed.match(/^(Hebrew|Greek|Transliteration|Pronunciation|Root meaning|Original word)/i);
    if (langMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'language', content: trimmed };
      continue;
    }

    // Detect scripture occurrence lines (e.g., "1. Genesis 15:6 -" or "Romans 3:24 -" etc.)
    const refMatch = trimmed.match(/^(?:\d+[\.\)]\s*)?([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+:\d+(?:-\d+)?)\s*[-:]/);
    if (refMatch) {
      if (currentSection) sections.push(currentSection);
      const reference = `${refMatch[1]} ${refMatch[2]}`;
      const context = trimmed.replace(/^(?:\d+[\.\)]\s*)?[1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?\s*[-:]\s*/, '');
      currentSection = { type: 'occurrence', reference, content: context };
      continue;
    }

    // Otherwise, accumulate text
    if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
    } else {
      currentSection = { type: 'text', content: trimmed };
    }
  }
  if (currentSection) sections.push(currentSection);

  return sections;
}

export default function WordStudy({ accentColor, selectedBibleAbbr }: Props) {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState('');
  const [studiedWord, setStudiedWord] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const { cream, dark } = T;

  const doStudy = useCallback(async (w: string) => {
    const target = w.trim().toLowerCase();
    if (!target) return;

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStudiedWord(target);
    setRawResponse('');
    setLoading(true);

    const prompt = [
      `Provide a thorough word study for the English Bible word "${target}".`,
      ``,
      `Include:`,
      `- The original Hebrew (Old Testament) and/or Greek (New Testament) word(s) translated as "${target}"`,
      `- Transliteration and pronunciation for each`,
      `- Root meaning and nuances that are lost in English translation`,
      `- 5-6 key Scripture occurrences with the reference and brief context for each (use ${selectedBibleAbbr} references)`,
      `- How the meaning of this word deepens and develops across the biblical narrative from Old Testament to New Testament`,
      ``,
      `Do not use any markdown formatting, asterisks, or headers. Plain text only.`,
      `Write as a knowledgeable but warm Bible teacher. Be substantive and specific.`,
    ].join('\n');

    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: `Word Study: ${target}`,
          verseText: `Studying the word "${target}" in Scripture`,
          translation: selectedBibleAbbr,
          question: prompt,
        }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setRawResponse(text);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  }, [selectedBibleAbbr]);

  const sections = rawResponse ? parseResponse(rawResponse) : [];

  // Group language sections together
  const languageSections = sections.filter(s => s.type === 'language');
  const occurrenceSections = sections.filter(s => s.type === 'occurrence');
  const textSections = sections.filter(s => s.type === 'text');

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: cream, marginBottom: 4 }}>
          Word Study
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Explore the original Hebrew and Greek meanings
        </div>
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
      }}>
        <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doStudy(word); }}
          placeholder="Type any English word..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            border: `1px solid ${accentColor}33`,
            background: 'rgba(255,255,255,0.04)',
            color: cream,
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          onClick={() => doStudy(word)}
          disabled={loading || !word.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: loading ? `${accentColor}44` : accentColor,
            color: dark,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: !word.trim() ? 0.4 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Studying...' : 'Study'}
        </button>
      </div>

      {/* Quick-tap words */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28,
        justifyContent: 'center',
      }}>
        {QUICK_WORDS.map(w => (
          <button
            key={w}
            onClick={() => { setWord(w); doStudy(w); }}
            disabled={loading}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${studiedWord === w ? accentColor : 'rgba(255,255,255,0.1)'}`,
              background: studiedWord === w ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
              color: studiedWord === w ? accentColor : 'rgba(255,255,255,0.55)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: studiedWord === w ? 600 : 400,
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Results */}
      {(rawResponse || loading) && (
        <div>
          {/* Studied word header */}
          {studiedWord && (
            <div style={{
              textAlign: 'center', marginBottom: 20,
              fontSize: 18, fontWeight: 700, color: accentColor,
              textTransform: 'capitalize',
              letterSpacing: 1,
            }}>
              {studiedWord}
            </div>
          )}

          {/* Original Language Box */}
          {languageSections.length > 0 && (
            <div style={{
              padding: '16px 18px',
              borderRadius: 14,
              background: `${accentColor}0c`,
              border: `1px solid ${accentColor}25`,
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: accentColor,
                textTransform: 'uppercase', letterSpacing: 1.5,
                marginBottom: 10,
              }}>
                Original Language
              </div>
              {languageSections.map((s, i) => (
                <div key={i} style={{
                  fontSize: 14, lineHeight: 1.7, color: cream,
                  marginBottom: i < languageSections.length - 1 ? 6 : 0,
                }}>
                  {s.content}
                </div>
              ))}
            </div>
          )}

          {/* Scripture Occurrences */}
          {occurrenceSections.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', letterSpacing: 1.5,
                marginBottom: 12, paddingLeft: 4,
              }}>
                Key Occurrences
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {occurrenceSections.map((s, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: accentColor,
                      marginBottom: 6,
                    }}>
                      {s.reference}
                    </div>
                    <div style={{
                      fontSize: 14, lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.75)',
                    }}>
                      {s.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining text / narrative sections */}
          {textSections.length > 0 && (
            <div style={{
              padding: '16px 18px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {textSections.map((s, i) => (
                <div key={i} style={{
                  fontSize: 14, lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: i < textSections.length - 1 ? 12 : 0,
                  whiteSpace: 'pre-wrap',
                }}>
                  {s.content}
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              color: 'rgba(255,255,255,0.35)', fontSize: 13,
            }}>
              <span style={{
                display: 'inline-block',
                width: 6, height: 6, borderRadius: '50%',
                background: accentColor,
                animation: 'pulse 1.2s ease-in-out infinite',
                marginRight: 8,
              }} />
              Studying the original languages...
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!rawResponse && !loading && (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          color: 'rgba(255,255,255,0.25)', fontSize: 14,
          lineHeight: 1.7,
        }}>
          Tap a word above or type your own to discover its original
          Hebrew and Greek meaning, every major occurrence in Scripture,
          and how its meaning deepens across the biblical narrative.
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
