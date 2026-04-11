'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiBible, Passage, BookDef, T, BOOKS, stripHtml, parseVerseText, cleanMarkdown } from '../types';
import VoiceInput from './VoiceInput';

interface Props {
  selectedBible: ApiBible | null;
  fetchPassage: (bibleId: string, passageId: string, label: string) => Promise<Passage | null>;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  accentColor: string;
  onOpenInReader: (book: BookDef, chapter: number, verse?: number) => void;
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
}

interface AiVerse {
  reference: string;
  text: string;
  why: string;
}

interface AiStory {
  name: string;
  location: string;
  book: string;
  chapter: number;
  verse?: number;
  summary: string;
  keyVerseRef: string;
  keyVerseText: string;
  themes: string;
}

const STORY_CATEGORIES = [
  {
    label: 'Prayers & Teachings',
    stories: [
      { label: "Lord's Prayer", query: "the Lord's Prayer — teach me about it and study it", icon: '🙏' },
      { label: 'Beatitudes', query: 'the Beatitudes from the Sermon on the Mount', icon: '⛰️' },
      { label: 'Armor of God', query: 'the Armor of God in Ephesians 6', icon: '🛡️' },
      { label: 'Love Chapter', query: '1 Corinthians 13 the love chapter', icon: '❤️' },
      { label: 'Psalm 23', query: 'the 23rd Psalm the Lord is my shepherd', icon: '🐑' },
      { label: 'Fruits of Spirit', query: 'the Fruits of the Spirit in Galatians', icon: '🍇' },
      { label: 'Great Commission', query: 'the Great Commission Matthew 28', icon: '🌍' },
      { label: 'Faith Chapter', query: 'Hebrews 11 the hall of faith chapter', icon: '✝️' },
    ],
  },
  {
    label: 'Old Testament Stories',
    stories: [
      { label: 'Creation', query: 'story of creation in Genesis', icon: '🌍' },
      { label: "Noah's Ark", query: "story of Noah's ark and the flood", icon: '🌊' },
      { label: 'Abraham & Isaac', query: 'story of Abraham and Isaac on the mountain', icon: '⛰️' },
      { label: 'Moses & Exodus', query: 'story of Moses parting the Red Sea and the Exodus', icon: '🔥' },
      { label: 'David & Goliath', query: 'story of David and Goliath', icon: '🗡️' },
      { label: 'Jonah', query: 'story of Jonah and the whale', icon: '🐋' },
      { label: 'Daniel', query: 'story of Daniel in the lion\'s den', icon: '🦁' },
      { label: 'Esther', query: 'story of Esther who saved her people', icon: '👑' },
    ],
  },
  {
    label: 'Jesus & New Testament',
    stories: [
      { label: 'Prodigal Son', query: 'parable of the Prodigal Son', icon: '🏃' },
      { label: 'Good Samaritan', query: 'parable of the Good Samaritan', icon: '❤️' },
      { label: 'Feeding 5000', query: 'story of Jesus feeding the 5000 with loaves and fish', icon: '🍞' },
      { label: 'Lazarus', query: 'story of Jesus raising Lazarus from the dead', icon: '☀️' },
      { label: 'Last Supper', query: 'story of the Last Supper', icon: '🍷' },
      { label: 'Crucifixion', query: 'story of the crucifixion of Jesus', icon: '✝️' },
      { label: 'Resurrection', query: 'story of the resurrection of Jesus', icon: '🌅' },
      { label: 'Road to Emmaus', query: 'story of the road to Emmaus after the resurrection', icon: '🛣️' },
    ],
  },
];

// Detect if a query is a direct question
function isQuestion(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.endsWith('?')) return true;
  const lower = trimmed.toLowerCase();
  return /^(what |why |how |who |when |where |is |are |does |did |can |should |would |explain |define |help me understand |what does |what is |what are |what was |what were |why did |why does |why is |how do |how does |how can |how should |who is |who was |when did |can you |do christians |do i need to |am i |will i |will god )/.test(lower);
}

const SAMPLE_QUESTIONS = [
  { q: 'Why did Jesus have to die?', icon: '✝️' },
  { q: 'What is grace?', icon: '🕊' },
  { q: 'How do I know God is real?', icon: '🔍' },
  { q: 'What happens when we die?', icon: '☀️' },
  { q: 'How should I pray?', icon: '🙏' },
  { q: 'What does it mean to be saved?', icon: '❤️' },
  { q: 'Is the Bible reliable?', icon: '📖' },
  { q: 'What is the Holy Spirit?', icon: '🔥' },
];

// Detect if a query is asking about a Bible story/passage rather than an emotion/topic
function isStoryQuery(q: string): boolean {
  const lower = q.toLowerCase();
  const storyWords = /\b(story|stories|parable|narrative|account|tell me about|what happened|who (was|were|is|are)|what is the|what was the|describe the|explain the|teach me about|study)\b/;
  const storyNames = /\b(creation|noah|abraham|isaac|jacob|joseph|moses|exodus|samson|delilah|david|goliath|solomon|elijah|elisha|jonah|daniel|shadrach|meshach|abednego|ezra|nehemiah|esther|job|prodigal|good samaritan|sermon on the mount|beatitudes|nativity|christmas story|baptism of jesus|temptation of jesus|transfiguration|feeding the|loaves and fish(es)?|lazarus|last supper|gethsemane|crucifixion|resurrection|road to emmaus|pentecost|paul|acts|lord'?s prayer|our father|armor of god|armour of god|fruits? of the spirit|great commission|ten commandments|23rd psalm|shepherd psalm|golden rule|shema|magnificat|benedictus|nunc dimittis|love chapter|faith chapter|hall of faith|new commandment|vine and branches|bread of life|light of the world|good shepherd|gate|way truth life|i am|holy spirit|trinity|baptism|communion|lord'?s supper|eucharist|sanctification|justification|atonement|grace|mercy|salvation|redemption|covenant|kingdom of (god|heaven)|holy of holies|ark of the covenant|tabernacle|temple)\b/;
  return storyWords.test(lower) || storyNames.test(lower);
}

function parseStoryResponse(text: string): AiStory | null {
  const get = (key: string) => {
    const m = text.match(new RegExp(`${key}:\\s*([\\s\\S]+?)(?=\\n[A-Z_]+:|$)`));
    return m ? m[1].trim() : '';
  };
  const name = get('STORY');
  if (!name) return null;
  const chStr = get('CHAPTER');
  const chNum = parseInt(chStr) || 1;
  const vStr = get('VERSE');
  const vNum = vStr ? parseInt(vStr) : undefined;
  return {
    name,
    location: get('LOCATION'),
    book: get('BOOK'),
    chapter: chNum,
    verse: vNum,
    summary: get('SUMMARY'),
    keyVerseRef: get('KEY_VERSE'),
    keyVerseText: get('KEY_TEXT'),
    themes: get('THEMES'),
  };
}

const TOPIC_CATEGORIES = [
  {
    label: 'Emotions',
    topics: [
      { label: 'Anxiety & Worry', query: "I'm feeling anxious and worried", icon: '😰' },
      { label: 'Grief & Loss', query: "I'm grieving and need comfort", icon: '🤍' },
      { label: 'Loneliness', query: "I'm feeling alone and isolated", icon: '💙' },
      { label: 'Anger', query: "I'm struggling with anger", icon: '🔥' },
      { label: 'Fear', query: "I'm afraid of what's coming", icon: '🛡' },
    ],
  },
  {
    label: 'Spiritual Life',
    topics: [
      { label: 'Faith', query: 'My faith feels weak right now', icon: '✝' },
      { label: 'Gratitude', query: 'I want to be more grateful', icon: '🙏' },
      { label: 'Forgiveness', query: 'I need help forgiving someone', icon: '🕊' },
      { label: 'Strength', query: 'I need strength to get through a hard time', icon: '💪' },
    ],
  },
  {
    label: 'Life & Purpose',
    topics: [
      { label: 'Direction', query: "I don't know what to do with my life", icon: '🧭' },
      { label: 'Purpose', query: "I feel like I don't have a purpose", icon: '⭐' },
      { label: 'Relationships', query: 'I need wisdom for my relationships', icon: '❤️' },
    ],
  },
];

// Reusable bold section header (same pattern as HomeTab)
function SectionLabel({ text, accentColor, icon }: { text: string; accentColor: string; icon?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
      {icon && <span className="text-base">{icon}</span>}
      <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{text}</h2>
    </div>
  );
}

function parseSearchRef(input: string): string | null {
  const m = input.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return null;
  const [, bookPart, ch, v1, v2] = m;
  const book = BOOKS.find(b => b.name.toLowerCase().startsWith(bookPart.toLowerCase().trim()));
  if (!book) return null;
  if (v1) {
    const start = `${book.osis}.${ch}.${v1}`;
    return v2 ? `${start}-${book.osis}.${ch}.${v2}` : start;
  }
  return `${book.osis}.${ch}`;
}

export default function SearchTab({ selectedBible, fetchPassage, fontSize, accentColor, onOpenInReader, experienceLevel }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'idle' | 'reference' | 'ai' | 'story' | 'ask'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reference lookup
  const [refResult, setRefResult] = useState<Passage | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState('');

  // AI search
  const [aiResults, setAiResults] = useState<AiVerse[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // what was searched

  // Story search
  const [storyResult, setStoryResult] = useState<AiStory | null>(null);
  const [storyRaw, setStoryRaw] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);

  // Ask / Q&A
  const [askText, setAskText] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askKeyRefs, setAskKeyRefs] = useState<string[]>([]);

  // Deep study overlay
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyText, setStudyText] = useState('');
  const [studyLabel, setStudyLabel] = useState('');
  const [studyLoading, setStudyLoading] = useState(false);

  // Saved & recent
  const [savedVerses, setSavedVerses] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);

  const { cream } = T;
  const fsClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }[fontSize];

  // Load recent searches & saved verses from localStorage
  useEffect(() => {
    try {
      const recent = localStorage.getItem('trace-recent-searches');
      if (recent) setRecentSearches(JSON.parse(recent));
      const saved = localStorage.getItem('trace-saved-search-verses');
      if (saved) setSavedVerses(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const addRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(r => r !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('trace-recent-searches', JSON.stringify(updated));
  };

  const toggleSaveVerse = (ref: string) => {
    const next = new Set(savedVerses);
    if (next.has(ref)) next.delete(ref); else next.add(ref);
    setSavedVerses(next);
    localStorage.setItem('trace-saved-search-verses', JSON.stringify(Array.from(next)));
  };

  const handleSearch = async (input?: string) => {
    const q = (input || query).trim();
    if (!q || !selectedBible) return;
    addRecentSearch(q);
    setSearchQuery(q);

    // Check if it's a verse reference
    const passageId = parseSearchRef(q);
    if (passageId) {
      setMode('reference');
      setRefLoading(true); setRefError(''); setRefResult(null);
      setAiResults([]);
      try {
        const p = await fetchPassage(selectedBible.id, passageId, selectedBible.abbreviationLocal);
        if (p) setRefResult(p); else setRefError('Passage not found.');
      } catch { setRefError('Could not load. Check your connection.'); }
      finally { setRefLoading(false); }
      return;
    }

    // Check if it's a direct question
    if (isQuestion(q)) {
      setMode('ask');
      setAskLoading(true);
      setAskText('');
      setAskKeyRefs([]);
      setRefResult(null);
      setAiResults([]);
      setStoryResult(null);

      try {
        const res = await fetch('/api/altar/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: 'Question',
            verseText: q,
            translation: selectedBible.abbreviationLocal,
            question: `A Christian wants to understand: "${q}"

Answer this from a confident, orthodox Christian perspective — the Bible is God's inspired Word, Jesus is Lord, and Christianity is true. Be warm, pastoral, and clear. Do not hedge or present multiple religions as equally valid.

Write 2-3 paragraphs of flowing prose. Quote scripture naturally within the answer (include the reference in parentheses). Be substantive but not overwhelming.

After the prose, on a new line write:
KEY_REFS: [list 2-4 most relevant verse references, comma separated, e.g. "John 3:16, Romans 5:8, Ephesians 2:8-9"]

Do not use markdown, bullet points, bold, or headers. Plain flowing text only.`,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          // Strip KEY_REFS line from visible text
          const [prose] = full.split(/\nKEY_REFS:/);
          setAskText(prose);
          // Parse refs if present
          const refsMatch = full.match(/KEY_REFS:\s*(.+)/);
          if (refsMatch) {
            setAskKeyRefs(refsMatch[1].split(',').map(r => r.trim()).filter(Boolean));
          }
        }
      } catch {
        setAskText('Could not answer that right now. Check your connection.');
      } finally {
        setAskLoading(false);
      }
      return;
    }

    // Check if it's a story/narrative query
    if (isStoryQuery(q)) {
      setMode('story');
      setStoryLoading(true);
      setStoryResult(null);
      setStoryRaw('');
      setRefResult(null);
      setAiResults([]);

      try {
        const res = await fetch('/api/altar/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: 'Story Search',
            verseText: q,
            translation: selectedBible.abbreviationLocal,
            question: `A Bible reader wants to find and learn about this: "${q}"

Identify the Bible story or passage they are asking about and provide the following information in this exact format:

STORY: [Full name of the story/event, e.g. "David and Goliath"]
LOCATION: [Where to find it, e.g. "1 Samuel 17:1-58"]
BOOK: [Just the book name, e.g. "1 Samuel"]
CHAPTER: [Starting chapter number, e.g. "17"]
VERSE: [Starting verse if applicable, e.g. "1"]
SUMMARY: [2-3 warm, engaging sentences summarizing what happens in this story and why it matters]
KEY_VERSE: [The single most important verse reference, e.g. "1 Samuel 17:45"]
KEY_TEXT: [The actual text of that key verse, quoted accurately from the Bible]
THEMES: [3-4 key themes or lessons, comma separated, e.g. "Faith, Courage, God's power through weakness"]

Do not use any markdown, asterisks, or extra formatting. Use the exact keys above.`,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStoryRaw(fullText);
          const parsed = parseStoryResponse(fullText);
          if (parsed?.name) setStoryResult(parsed);
        }
      } catch {
        setStoryRaw('Could not find that story. Check your connection.');
      } finally {
        setStoryLoading(false);
      }
      return;
    }

    // Otherwise, AI verse search
    setMode('ai');
    setAiLoading(true);
    setAiResults([]);
    setAiContext('');
    setRefResult(null);

    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: 'Search',
          verseText: q,
          translation: selectedBible.abbreviationLocal,
          question: `A person says: "${q}"

Find 5-6 Bible verses that speak directly to this. For each verse, provide:
1. The full reference (e.g. "Philippians 4:6-7")
2. The actual verse text (quote it accurately from ${selectedBible.abbreviationLocal})
3. A brief, warm explanation of why this verse is relevant (1-2 sentences)

Format each verse exactly like this (use this exact format, one per block):

VERSE: [Reference]
TEXT: [The actual verse text]
WHY: [Brief explanation]

Do not use any markdown formatting, asterisks, or headers. Just plain text.`,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setAiContext(fullText);

        const blocks = fullText.split(/VERSE:\s*/);
        const parsed: AiVerse[] = [];
        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];
          const refMatch = block.match(/^(.+?)(?:\n|TEXT:)/);
          const textMatch = block.match(new RegExp('TEXT:\\s*([\\s\\S]+?)(?:\\nWHY:|$)'));
          const whyMatch = block.match(new RegExp('WHY:\\s*([\\s\\S]+?)(?:\\n\\n|VERSE:|$)'));
          if (refMatch && textMatch) {
            parsed.push({
              reference: cleanMarkdown(refMatch[1].trim()),
              text: cleanMarkdown(textMatch[1].trim()),
              why: whyMatch ? cleanMarkdown(whyMatch[1].trim()) : '',
            });
          }
        }
        if (parsed.length > 0) setAiResults(parsed);
      }
    } catch {
      setAiContext('Could not search. Check your connection.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetSearch = () => {
    setMode('idle');
    setQuery('');
    setAiResults([]);
    setAiContext('');
    setRefResult(null);
    setRefError('');
    setSearchQuery('');
    setExpandedVerse(null);
    setStoryResult(null);
    setStoryRaw('');
    setAskText('');
    setAskKeyRefs([]);
  };

  const doStudy = async (label: string, content: string) => {
    setStudyOpen(true);
    setStudyLabel(label);
    setStudyText('');
    setStudyLoading(true);
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: label,
          verseText: content,
          translation: selectedBible?.abbreviationLocal || 'NIV',
          mode: 'chapter',
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStudyText(full);
      }
    } catch {
      setStudyText('Could not load study. Check your connection.');
    } finally {
      setStudyLoading(false);
    }
  };

  return (
    <>
      {/* ── Deep Study Overlay ── */}
      {studyOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(4,18,10,0.98)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${accentColor}15` }}>
            <button onClick={() => setStudyOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,240,236,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}66` }}>Deep Study</p>
              <p className="text-sm font-black truncate" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{studyLabel}</p>
            </div>
            {studyLoading && (
              <div className="w-5 h-5 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            )}
          </div>

          {/* Loading state */}
          {studyLoading && !studyText && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                <div className="absolute inset-0 flex items-center justify-center"><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /></div>
              </div>
              <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>Preparing study…</p>
            </div>
          )}

          {/* Study content */}
          {studyText && (
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="max-w-prose mx-auto">
                <p className="text-sm leading-loose whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.82)', fontFamily: 'Georgia, serif', lineHeight: '1.9' }}>
                  {studyText}
                  {studyLoading && <span className="inline-block w-0.5 h-4 ml-1 animate-pulse rounded-sm" style={{ background: accentColor, verticalAlign: 'middle' }} />}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search Header ── */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(145deg, ${accentColor}12, rgba(0,0,0,0.2))`, border: `1px solid ${accentColor}20` }}>
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: accentColor }} />
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accentColor}20` }}>
              <span className="text-sm">🔍</span>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>Search Scripture</h2>
              <p className="text-[9px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Ask a question, find stories, search verses, or look up a reference</p>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <VoiceInput accentColor={accentColor} onResult={(text) => { setQuery(text); handleSearch(text); }} />
            <div className="flex-1 relative">
              <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true}
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask anything, search a story, or type a verse…"
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none pr-10"
                style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${accentColor}25`, color: '#f0f8f4' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <span className="text-[10px]" style={{ color: 'rgba(232,240,236,0.5)' }}>✕</span>
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={aiLoading || refLoading || !query.trim()}
              className="px-5 py-3.5 rounded-xl text-sm font-bold disabled:opacity-30 shrink-0 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff', boxShadow: `0 4px 15px ${accentColor}30` }}
            >
              {aiLoading || refLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                </span>
              ) : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Idle State ── */}
      {mode === 'idle' && (
        <>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}44` }}>Recent Searches</p>
                <button onClick={() => { setRecentSearches([]); localStorage.removeItem('trace-recent-searches'); }} className="text-[9px]" style={{ color: 'rgba(232,240,236,0.25)' }}>Clear</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((r, i) => (
                  <button key={i} onClick={() => { setQuery(r); handleSearch(r); }}
                    className="px-3 py-1.5 rounded-full text-[11px] transition-all active:scale-95"
                    style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}18`, color: 'rgba(232,240,236,0.55)' }}>
                    {r.length > 30 ? r.slice(0, 30) + '…' : r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ask a Question */}
          <div>
            <SectionLabel text="Ask Anything" accentColor={accentColor} icon="💬" />
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map(sq => (
                <button key={sq.q}
                  onClick={() => { setQuery(sq.q); handleSearch(sq.q); }}
                  className="text-left rounded-xl p-3 transition-all active:scale-[0.97] group relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
                  <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: `${accentColor}08` }} />
                  <div className="relative flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0">{sq.icon}</span>
                    <span className="text-[11px] font-semibold leading-snug" style={{ color: 'rgba(232,240,236,0.75)' }}>{sq.q}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Story Categories */}
          {STORY_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <SectionLabel text={cat.label} accentColor={accentColor} icon="📖" />
              <div className="grid grid-cols-4 gap-1.5">
                {cat.stories.map(story => (
                  <button key={story.label}
                    onClick={() => { setQuery(story.query); handleSearch(story.query); }}
                    className="text-left rounded-xl p-2.5 transition-all active:scale-[0.97] group relative overflow-hidden flex flex-col items-center text-center gap-1"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: `${accentColor}08` }} />
                    <span className="text-xl relative">{story.icon}</span>
                    <span className="text-[9px] font-semibold leading-tight relative" style={{ color: 'rgba(232,240,236,0.7)' }}>{story.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Topic Categories */}
          {TOPIC_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <SectionLabel text={cat.label} accentColor={accentColor} />
              <div className="grid grid-cols-2 gap-2">
                {cat.topics.map(topic => (
                  <button key={topic.label}
                    onClick={() => { setQuery(topic.query); handleSearch(topic.query); }}
                    className="text-left rounded-xl p-3.5 transition-all active:scale-[0.97] group relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: `${accentColor}08` }} />
                    <div className="relative flex items-center gap-2.5">
                      <span className="text-lg">{topic.icon}</span>
                      <div>
                        <span className="text-xs font-semibold block" style={{ color: 'rgba(232,240,236,0.75)' }}>{topic.label}</span>
                        <span className="text-[9px] block mt-0.5" style={{ color: 'rgba(232,240,236,0.25)' }}>
                          {topic.query.length > 28 ? topic.query.slice(0, 28) + '…' : topic.query}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Inspirational footer */}
          <div className="text-center py-4">
            <p className="text-xs italic" style={{ color: 'rgba(232,240,236,0.2)', fontFamily: 'Georgia, serif' }}>
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;
            </p>
            <p className="text-[10px] font-bold mt-1" style={{ color: 'rgba(232,240,236,0.2)' }}>Psalm 119:105</p>
          </div>
        </>
      )}

      {/* ── Ask / Q&A Result ── */}
      {mode === 'ask' && (
        <>
          {/* Loading */}
          {askLoading && !askText && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                <div className="absolute inset-0 flex items-center justify-center text-sm">💬</div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'rgba(232,240,236,0.5)' }}>Finding an answer…</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.2)' }}>Searching Scripture and Christian teaching</p>
              </div>
            </div>
          )}

          {/* Answer card */}
          {askText && (
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${accentColor}0a, rgba(0,0,0,0.2))`, border: `1px solid ${accentColor}20` }}>
              {/* Question header */}
              <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}10` }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}25` }}>
                    <span className="text-sm">💬</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}66` }}>Your Question</p>
                    <p className="text-sm font-semibold leading-snug" style={{ color: '#f0f8f4', fontFamily: 'Georgia, serif' }}>{searchQuery}</p>
                  </div>
                  {askLoading && (
                    <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
                  )}
                </div>
              </div>

              {/* Answer text */}
              <div className="px-5 py-5">
                <p className="text-sm leading-loose whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.82)', fontFamily: 'Georgia, serif', lineHeight: '1.85' }}>
                  {askText}
                  {askLoading && <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: accentColor, verticalAlign: 'middle' }} />}
                </p>
              </div>

              {/* Key verses */}
              {askKeyRefs.length > 0 && (
                <div className="px-5 pb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: `${accentColor}55` }}>Key Verses</p>
                  <div className="flex flex-wrap gap-2">
                    {askKeyRefs.map((ref, i) => {
                      const book = BOOKS.find(b => ref.startsWith(b.name));
                      return (
                        <button key={i}
                          onClick={() => {
                            if (book) {
                              const chMatch = ref.match(/(\d+):(\d+)/);
                              const ch = chMatch ? parseInt(chMatch[1]) : 1;
                              const v = chMatch ? parseInt(chMatch[2]) : undefined;
                              onOpenInReader(book, ch, v);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}28` }}>
                          {ref} →
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deep study CTA */}
              {!askLoading && (
                <div className="px-5 pb-5 pt-1" style={{ borderTop: `1px solid ${accentColor}08` }}>
                  <button
                    onClick={() => doStudy(searchQuery, `Question: "${searchQuery}"\n\nAnswer context:\n${askText}`)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                    style={{ background: `${accentColor}10`, color: accentColor, border: `1px solid ${accentColor}20` }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /> Go Deeper on This Topic</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!askLoading && (
            <button onClick={resetSearch}
              className="flex items-center gap-2 text-xs font-semibold transition-all active:scale-95" style={{ color: `${accentColor}66` }}>
              <span style={{ fontSize: '14px' }}>←</span> New Search
            </button>
          )}
        </>
      )}

      {/* ── Reference Result ── */}
      {mode === 'reference' && (
        <>
          {refLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
              <p className="text-[11px]" style={{ color: 'rgba(232,240,236,0.3)' }}>Looking up passage…</p>
            </div>
          )}
          {refError && (
            <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-sm" style={{ color: '#ef4444' }}>{refError}</p>
            </div>
          )}
          {refResult && (
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${accentColor}08, rgba(0,0,0,0.15))`, border: `1px solid ${accentColor}18` }}>
              <div className="px-6 pt-5 pb-3 flex items-end justify-between" style={{ borderBottom: `1px solid ${accentColor}0d` }}>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: accentColor, fontFamily: 'Georgia, serif' }}>{refResult.reference}</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}55` }}>{refResult.translationName}</p>
                </div>
                <button onClick={() => {
                  const book = BOOKS.find(b => refResult.reference.startsWith(b.name));
                  if (book) {
                    const chMatch = refResult.reference.match(/(\d+):(\d+)/);
                    const ch = chMatch ? parseInt(chMatch[1]) : 1;
                    const v = chMatch ? parseInt(chMatch[2]) : undefined;
                    onOpenInReader(book, ch, v);
                  }
                }} className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                  style={{ background: `${accentColor}18`, color: accentColor }}>
                  Open in Reader
                </button>
              </div>
              <div className="px-6 py-6">
                <div className={`${fsClass} leading-loose`} style={{ color: cream, fontFamily: 'Georgia, serif' }}>
                  {refResult.verses.map(v => (
                    <span key={v.verse}>
                      <sup className="font-bold mr-1" style={{ color: accentColor, fontSize: '0.6em', fontFamily: 'system-ui' }}>{v.verse}</sup>
                      {v.text}{' '}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-6 pb-5">
                <button
                  onClick={() => doStudy(
                    refResult.reference,
                    refResult.verses.map(v => `${v.verse}. ${v.text}`).join(' ')
                  )}
                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                  style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /> Deep Study This Passage</span>
                </button>
              </div>
            </div>
          )}

          {!refLoading && (
            <button onClick={resetSearch} className="flex items-center gap-2 text-xs font-semibold transition-all active:scale-95" style={{ color: `${accentColor}66` }}>
              <span style={{ fontSize: '14px' }}>←</span> New Search
            </button>
          )}
        </>
      )}

      {/* ── Story Result ── */}
      {mode === 'story' && (
        <>
          {storyLoading && !storyResult && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/read book.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'rgba(232,240,236,0.5)' }}>Finding that story…</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.2)' }}>Searching the scriptures</p>
              </div>
            </div>
          )}

          {storyResult && (
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${accentColor}0a, rgba(0,0,0,0.2))`, border: `1px solid ${accentColor}22` }}>
              {/* Story header */}
              <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}12` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}66` }}>Bible Story</p>
                    <h2 className="text-lg font-black leading-tight mb-1" style={{ color: '#fff', fontFamily: 'Georgia, serif' }}>{storyResult.name}</h2>
                    {storyResult.location && (
                      <p className="text-xs font-semibold" style={{ color: accentColor }}>{storyResult.location}</p>
                    )}
                    {storyLoading && (
                      <span className="inline-block w-1 h-3 ml-1 animate-pulse rounded-sm" style={{ background: accentColor }} />
                    )}
                  </div>
                  {storyResult.book && (
                    <button
                      onClick={() => {
                        const book = BOOKS.find(b =>
                          b.name.toLowerCase() === storyResult.book.toLowerCase() ||
                          storyResult.book.toLowerCase().includes(b.name.toLowerCase()) ||
                          b.name.toLowerCase().includes(storyResult.book.toLowerCase())
                        );
                        if (book) onOpenInReader(book, storyResult.chapter, storyResult.verse);
                      }}
                      className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0"
                      style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                      Read It →
                    </button>
                  )}
                </div>
              </div>

              {/* Summary */}
              {storyResult.summary && (
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${accentColor}08` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>The Story</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif' }}>{storyResult.summary}</p>
                </div>
              )}

              {/* Key verse */}
              {storyResult.keyVerseRef && storyResult.keyVerseText && (
                <div className="mx-5 my-4 rounded-xl p-4" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}66` }}>Key Verse</p>
                  <p className="text-xs font-bold mb-1.5" style={{ color: accentColor }}>{storyResult.keyVerseRef}</p>
                  <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(232,240,236,0.8)', fontFamily: 'Georgia, serif' }}>
                    &ldquo;{storyResult.keyVerseText}&rdquo;
                  </p>
                </div>
              )}

              {/* Themes */}
              {storyResult.themes && (
                <div className="px-5 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {storyResult.themes.split(',').map((theme, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                        style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}20` }}>
                        {theme.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deep Study CTA */}
              {!storyLoading && (
                <div className="px-5 pb-5">
                  <button
                    onClick={() => doStudy(
                      storyResult.name,
                      `${storyResult.name} (${storyResult.location})\n\n${storyResult.summary}\n\nKey verse: ${storyResult.keyVerseRef} — "${storyResult.keyVerseText}"\n\nPlease write a full deep study of this passage.`
                    )}
                    className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}0c)`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /> Deep Study This Passage</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!storyLoading && (
            <button onClick={resetSearch}
              className="flex items-center gap-2 text-xs font-semibold transition-all active:scale-95" style={{ color: `${accentColor}66` }}>
              <span style={{ fontSize: '14px' }}>←</span> New Search
            </button>
          )}
        </>
      )}

      {/* ── AI Search Results ── */}
      {mode === 'ai' && (
        <>
          {/* Loading state */}
          {aiLoading && aiResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}22`, borderTopColor: accentColor }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs">✦</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'rgba(232,240,236,0.5)' }}>Searching Scripture…</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(232,240,236,0.2)' }}>Finding verses that speak to your heart</p>
              </div>
            </div>
          )}

          {/* Search context header */}
          {aiResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: aiLoading ? accentColor : '#22c55e' }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accentColor}55` }}>
                    {aiResults.length} verse{aiResults.length !== 1 ? 's' : ''} for &ldquo;{searchQuery.length > 25 ? searchQuery.slice(0, 25) + '…' : searchQuery}&rdquo;
                    {aiLoading && <span className="inline-block w-1 h-3 ml-1.5 animate-pulse rounded-sm" style={{ background: accentColor }} />}
                  </p>
                </div>
              </div>

              {/* Study all together */}
              {!aiLoading && aiResults.length > 1 && (
                <button
                  onClick={() => doStudy(
                    `"${searchQuery}" — Thematic Study`,
                    `Study these ${aiResults.length} passages together on the theme of "${searchQuery}":\n\n` +
                    aiResults.map(v => `${v.reference}: "${v.text}"`).join('\n\n')
                  )}
                  className="w-full mb-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                  style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /> Study These {aiResults.length} Verses Together</span>
                </button>
              )}

              <div className="space-y-3">
                {aiResults.map((v, i) => {
                  const isExpanded = expandedVerse === i;
                  const isSaved = savedVerses.has(v.reference);
                  return (
                    <div key={i}
                      className="rounded-xl overflow-hidden transition-all"
                      style={{
                        background: isExpanded ? `linear-gradient(145deg, ${accentColor}0a, rgba(0,0,0,0.15))` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isExpanded ? accentColor + '25' : accentColor + '10'}`,
                      }}>
                      {/* Verse header */}
                      <button
                        className="w-full px-5 py-4 text-left"
                        onClick={() => setExpandedVerse(isExpanded ? null : i)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${accentColor}18`, color: accentColor }}>{i + 1}</span>
                              <p className="text-xs font-bold" style={{ color: accentColor }}>{v.reference}</p>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif' }}>
                              &ldquo;{v.text}&rdquo;
                            </p>
                          </div>
                          <span className="text-[10px] mt-1 shrink-0 transition-transform" style={{ color: `${accentColor}44`, transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${accentColor}10` }}>
                          {v.why && (
                            <div className="px-5 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: `${accentColor}44` }}>Why This Verse</p>
                              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.55)' }}>{v.why}</p>
                            </div>
                          )}
                          {/* Study this verse */}
                          <div className="px-5 pb-3" style={{ borderTop: `1px solid ${accentColor}08` }}>
                            <button
                              onClick={() => doStudy(v.reference, `${v.reference}: "${v.text}"\n\nContext: This verse came up in a search for "${searchQuery}".`)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] mt-3"
                              style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}22` }}>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} /> Deep Study This Verse</span>
                            </button>
                          </div>
                          <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: `1px solid ${accentColor}08` }}>
                            <button onClick={() => {
                              const book = BOOKS.find(b => v.reference.startsWith(b.name));
                              if (book) {
                                const chMatch = v.reference.match(/(\d+):(\d+)/);
                                const ch = chMatch ? parseInt(chMatch[1]) : 1;
                                const vNum = chMatch ? parseInt(chMatch[2]) : undefined;
                                onOpenInReader(book, ch, vNum);
                              }
                            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                              style={{ background: `${accentColor}15`, color: accentColor }}>
                              Open in Reader →
                            </button>
                            <button onClick={() => toggleSaveVerse(v.reference)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                              style={{ background: isSaved ? `${accentColor}22` : 'rgba(255,255,255,0.04)', color: isSaved ? accentColor : 'rgba(232,240,236,0.4)' }}>
                              {isSaved ? '♥ Saved' : '♡ Save'}
                            </button>
                            <button onClick={() => {
                              if (navigator.share) {
                                navigator.share({ text: `${v.reference}\n"${v.text}"` });
                              } else {
                                navigator.clipboard.writeText(`${v.reference}\n"${v.text}"`);
                              }
                            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,240,236,0.4)' }}>
                              Share
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back to search */}
          {!aiLoading && (
            <button onClick={resetSearch}
              className="flex items-center gap-2 text-xs font-semibold transition-all active:scale-95" style={{ color: `${accentColor}66` }}>
              <span style={{ fontSize: '14px' }}>←</span> New Search
            </button>
          )}
        </>
      )}
    </>
  );
}
