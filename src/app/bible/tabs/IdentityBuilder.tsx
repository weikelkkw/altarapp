'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookDef, T, cleanMarkdown } from '../types';

interface Props {
  accentColor: string;
  selectedBook: BookDef;
  highlighted: Set<string>;
  notes: Record<string, string>;
}

interface IdentityData {
  identity: string;
  verses: string[];
  explanation: string;
  reflection: string;
  prayer: string;
}

interface SavedIdentity {
  identity: string;
  verses: string[];
  savedAt: string;
}

const STORAGE_KEY = 'trace-saved-identities';
const SESSION_KEY = 'trace-identity-today';

function parseIdentityResponse(raw: string): IdentityData {
  const text = cleanMarkdown(raw);

  const identityMatch = text.match(new RegExp('IDENTITY:\\s*([\\s\\S]+?)(?=\\s*VERSES:)', 'i'));
  const versesMatch = text.match(new RegExp('VERSES:\\s*([\\s\\S]+?)(?=\\s*EXPLANATION:)', 'i'));
  const explanationMatch = text.match(new RegExp('EXPLANATION:\\s*([\\s\\S]+?)(?=\\s*REFLECTION:)', 'i'));
  const reflectionMatch = text.match(new RegExp('REFLECTION:\\s*([\\s\\S]+?)(?=\\s*PRAYER:)', 'i'));
  const prayerMatch = text.match(new RegExp('PRAYER:\\s*([\\s\\S]+)', 'i'));

  return {
    identity: cleanMarkdown(identityMatch?.[1]?.trim() || 'You are loved beyond measure'),
    verses: (versesMatch?.[1]?.trim() || '')
      .split(/,\s*/)
      .map(v => v.trim())
      .filter(Boolean),
    explanation: cleanMarkdown(explanationMatch?.[1]?.trim() || ''),
    reflection: cleanMarkdown(reflectionMatch?.[1]?.trim() || ''),
    prayer: cleanMarkdown(prayerMatch?.[1]?.trim() || ''),
  };
}

function getSavedIdentities(): SavedIdentity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIdentity(data: IdentityData) {
  const saved = getSavedIdentities();
  const exists = saved.some(s => s.identity === data.identity);
  if (exists) return saved;
  const updated: SavedIdentity[] = [
    { identity: data.identity, verses: data.verses, savedAt: new Date().toISOString() },
    ...saved,
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

function removeIdentity(identity: string): SavedIdentity[] {
  const saved = getSavedIdentities().filter(s => s.identity !== identity);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return saved;
}

function buildPrompt(selectedBook: BookDef, notes: Record<string, string>, highlighted: Set<string>): string {
  const noteEntries = Object.entries(notes).filter(([, v]) => v.trim());
  const noteContext = noteEntries.length > 0
    ? `The reader has notes on: ${noteEntries.slice(0, 5).map(([k]) => k).join(', ')}.`
    : '';
  const highlightContext = highlighted.size > 0
    ? `They have highlighted ${highlighted.size} verse(s) including: ${[...highlighted].slice(0, 5).join(', ')}.`
    : '';

  return [
    `The reader is currently studying ${selectedBook.name}.`,
    noteContext,
    highlightContext,
    '',
    'Based on their reading context, give ONE powerful biblical identity declaration — a statement about who they are in Christ, rooted in Scripture.',
    '',
    'Respond in EXACTLY this format with no deviation:',
    'IDENTITY: [A bold "You are..." or "You have..." statement]',
    'VERSES: [ref1, ref2] (2-3 supporting verse references with the actual verse text after each reference)',
    'EXPLANATION: [2-3 sentences connecting this identity truth to their reading]',
    'REFLECTION: [One journaling question to help them internalize this truth]',
    'PRAYER: [A short prayer response they can pray aloud, written in first person]',
    '',
    'No markdown, no asterisks, plain text only. Keep the identity statement concise and memorable.',
  ].join('\n');
}

function useIdentity(selectedBook: BookDef, notes: Record<string, string>, highlighted: Set<string>) {
  const [data, setData] = useState<IdentityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        setData(JSON.parse(cached));
        return;
      } catch { /* fall through */ }
    }

    setLoading(true);
    const prompt = buildPrompt(selectedBook, notes, highlighted);

    fetch('/api/altar/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: selectedBook.name,
        verseText: `Currently reading ${selectedBook.name}`,
        translation: '',
        question: prompt,
      }),
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setStreaming(result);
        }
        const parsed = parseIdentityResponse(result);
        setData(parsed);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
      })
      .catch(() => {
        setData({
          identity: 'You are chosen and deeply loved',
          verses: ['Ephesians 1:4', '1 Peter 2:9'],
          explanation: 'Before the foundation of the world, God chose you. This is not based on anything you have done but on His sovereign love.',
          reflection: 'What would change in your daily life if you truly believed you were chosen before time began?',
          prayer: 'Father, thank You for choosing me before the world was made. Help me live today as someone who is truly chosen and loved. Amen.',
        });
      })
      .finally(() => {
        setLoading(false);
        setStreaming('');
      });
  }, [selectedBook.name]);

  return { data, loading, streaming };
}

/* ─── Compact Widget (for homepage) ─────────────────────────────────────────── */

export function IdentityWidget({ accentColor, selectedBook, highlighted, notes }: Props) {
  const { data, loading, streaming } = useIdentity(selectedBook, notes, highlighted);
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <IdentityBuilder
        accentColor={accentColor}
        selectedBook={selectedBook}
        highlighted={highlighted}
        notes={notes}
      />
    );
  }

  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${accentColor}22`,
        borderRadius: 16,
        padding: '20px 20px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`,
          borderRadius: '16px 16px 0 0',
        }}
      />

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: accentColor, marginBottom: 10, fontWeight: 600 }}>
        Identity for Today
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60 }}>
          <div
            style={{
              width: 18,
              height: 18,
              border: `2px solid ${accentColor}44`,
              borderTop: `2px solid ${accentColor}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ color: '#aaa', fontSize: 13 }}>
            {streaming ? 'Discovering your identity...' : 'Preparing your declaration...'}
          </span>
        </div>
      ) : data ? (
        <>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.3,
              marginBottom: 10,
            }}
          >
            {data.identity}
          </div>

          {data.verses.length > 0 && (
            <div
              style={{
                fontFamily: "'Georgia', serif",
                fontStyle: 'italic',
                fontSize: 13,
                color: '#bbb',
                marginBottom: 14,
              }}
            >
              {data.verses.join(' / ')}
            </div>
          )}

          <button
            onClick={() => setExpanded(true)}
            style={{
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}33`,
              borderRadius: 10,
              padding: '8px 18px',
              color: accentColor,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = `${accentColor}28`;
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = `${accentColor}18`;
            }}
          >
            Go Deeper
          </button>
        </>
      ) : null}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

/* ─── Full Identity Builder ─────────────────────────────────────────────────── */

export default function IdentityBuilder({ accentColor, selectedBook, highlighted, notes }: Props) {
  const { data, loading, streaming } = useIdentity(selectedBook, notes, highlighted);
  const [savedList, setSavedList] = useState<SavedIdentity[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setSavedList(getSavedIdentities());
  }, []);

  const handleSave = useCallback(() => {
    if (!data) return;
    const updated = saveIdentity(data);
    setSavedList(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [data]);

  const handleRemove = useCallback((identity: string) => {
    const updated = removeIdentity(identity);
    setSavedList(updated);
  }, []);

  const alreadySaved = data ? savedList.some(s => s.identity === data.identity) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accentColor}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Identity Builder</div>
          <div style={{ fontSize: 12, color: '#888' }}>Who Scripture says you are</div>
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: T.cardBg,
          border: `1px solid ${accentColor}22`,
          borderRadius: 16,
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`,
            borderRadius: '16px 16px 0 0',
          }}
        />

        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: accentColor, marginBottom: 16, fontWeight: 600 }}>
          Today&apos;s Identity Declaration
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 0' }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: `2px solid ${accentColor}44`,
                borderTop: `2px solid ${accentColor}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ color: '#aaa', fontSize: 13 }}>
              {streaming ? 'Discovering your identity in Christ...' : 'Preparing your declaration...'}
            </span>
            {streaming && (
              <div style={{ color: '#777', fontSize: 12, maxHeight: 60, overflow: 'hidden', textAlign: 'center', padding: '0 20px' }}>
                {streaming.slice(0, 120)}...
              </div>
            )}
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity Statement */}
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.35,
                padding: '8px 0',
              }}
            >
              {data.identity}
            </div>

            {/* Supporting Verses */}
            {data.verses.length > 0 && (
              <div
                style={{
                  background: `${accentColor}08`,
                  border: `1px solid ${accentColor}18`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: accentColor, marginBottom: 10, fontWeight: 600 }}>
                  Supporting Verses
                </div>
                {data.verses.map((verse, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "'Georgia', serif",
                      fontStyle: 'italic',
                      fontSize: 14,
                      color: '#ccc',
                      lineHeight: 1.6,
                      marginBottom: i < data.verses.length - 1 ? 8 : 0,
                      paddingLeft: 12,
                      borderLeft: `2px solid ${accentColor}33`,
                    }}
                  >
                    {verse}
                  </div>
                ))}
              </div>
            )}

            {/* Explanation */}
            {data.explanation && (
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: accentColor, marginBottom: 8, fontWeight: 600 }}>
                  What This Means
                </div>
                <div style={{ fontSize: 14, color: '#bbb', lineHeight: 1.65 }}>
                  {data.explanation}
                </div>
              </div>
            )}

            {/* Reflection */}
            {data.reflection && (
              <div
                style={{
                  background: `${accentColor}08`,
                  border: `1px solid ${accentColor}18`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: accentColor, marginBottom: 8, fontWeight: 600 }}>
                  Reflect
                </div>
                <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {data.reflection}
                </div>
              </div>
            )}

            {/* Prayer */}
            {data.prayer && (
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: accentColor, marginBottom: 8, fontWeight: 600 }}>
                  Guided Prayer
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#bbb',
                    lineHeight: 1.65,
                    paddingLeft: 14,
                    borderLeft: `2px solid ${accentColor}33`,
                  }}
                >
                  {data.prayer}
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={alreadySaved}
              style={{
                background: alreadySaved
                  ? `${accentColor}11`
                  : justSaved
                    ? '#16a34a22'
                    : `${accentColor}18`,
                border: `1px solid ${alreadySaved ? accentColor + '22' : justSaved ? '#16a34a44' : accentColor + '33'}`,
                borderRadius: 12,
                padding: '12px 20px',
                color: alreadySaved ? '#888' : justSaved ? '#4ade80' : accentColor,
                fontSize: 14,
                fontWeight: 600,
                cursor: alreadySaved ? 'default' : 'pointer',
                transition: 'all 0.2s',
                width: '100%',
              }}
              onMouseEnter={e => {
                if (!alreadySaved) (e.target as HTMLElement).style.background = `${accentColor}28`;
              }}
              onMouseLeave={e => {
                if (!alreadySaved) (e.target as HTMLElement).style.background = `${accentColor}18`;
              }}
            >
              {alreadySaved ? 'Saved to My Truths' : justSaved ? 'Saved!' : 'Save to My Truths'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Saved Identities */}
      {savedList.length > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 10, fontWeight: 600 }}>
            My Truths ({savedList.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {savedList.map((item, i) => (
              <div
                key={i}
                style={{
                  background: T.cardBg,
                  border: `1px solid ${accentColor}18`,
                  borderRadius: 10,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: '100%',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: accentColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.identity}
                </div>
                <button
                  onClick={() => handleRemove(item.identity)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 2px',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f87171'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = '#555'; }}
                  title="Remove"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
