'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  ApiBible, Passage, BookDef, ParsedVerse, T, BOOKS, POPULAR_ABBRS,
  stripHtml, parseVerseText, cleanMarkdown,
} from '../types';
import TopicalGuides from './TopicalGuides';
import GospelHarmony from './GospelHarmony';
import NamesOfGod from './NamesOfGod';
import ReadingPlans from './ReadingPlans';
import TermsReference from './TermsReference';
import BibleMaps from './BibleMaps';
import ProphecyTimeline from './ProphecyTimeline';

// ── Apocryphal / Deuterocanonical books ──────────────────────────────────────
const BRENTON_ID = '65bfdebd704a8324-01';

const APOCRYPHA = [
  { name: 'Tobit',               osis: 'TOB', chapters: 14, desc: 'A righteous Israelite blinded and healed through the angel Raphael. Story of faithfulness in exile.' },
  { name: 'Judith',              osis: 'JDT', chapters: 16, desc: 'A courageous widow who saves Israel by beheading the Assyrian general Holofernes.' },
  { name: 'Wisdom of Solomon',   osis: 'WIS', chapters: 19, desc: 'Hellenistic Jewish wisdom poetry — reflects on justice, immortality, and the nature of divine wisdom.' },
  { name: 'Sirach',              osis: 'SIR', chapters: 51, desc: 'Also called Ecclesiasticus. Practical wisdom from a Jerusalem scribe, ~180 BC.' },
  { name: 'Baruch',              osis: 'BAR', chapters: 5,  desc: "Attributed to Baruch, Jeremiah's scribe. Confession, wisdom hymn, and words of comfort." },
  { name: 'Epistle of Jeremy',   osis: 'LJE', chapters: 1,  desc: 'A letter warning exiled Jews against worshiping Babylonian idols. Sometimes counted as Baruch ch. 6.' },
  { name: '1 Esdras',            osis: '1ES', chapters: 9,  desc: 'Greek version of Ezra with an added contest of the three guardsmen before Darius.' },
  { name: 'Prayer of Manasses',  osis: 'MAN', chapters: 1,  desc: "A penitential prayer attributed to King Manasseh of Judah — referenced in 2 Chronicles 33:18." },
  { name: 'Susanna',             osis: 'SUS', chapters: 1,  desc: 'An addition to Daniel. A falsely accused woman is vindicated by the young Daniel.' },
  { name: 'Bel and the Dragon',  osis: 'BEL', chapters: 1,  desc: 'Another Daniel addition. Daniel exposes the fraud of Babylonian idol worship.' },
  { name: '1 Maccabees',         osis: '1MA', chapters: 16, desc: 'Historical account of the Maccabean revolt (167–134 BC) against Hellenistic oppression.' },
  { name: '2 Maccabees',         osis: '2MA', chapters: 15, desc: 'Theological retelling of the same revolt, emphasizing resurrection and martyrdom.' },
  { name: '3 Maccabees',         osis: '3MA', chapters: 7,  desc: 'Persecution of Egyptian Jews under Ptolemy IV Philopator. Their miraculous deliverance.' },
  { name: '4 Maccabees',         osis: '4MA', chapters: 18, desc: 'Philosophical treatise on whether devout reason is supreme over the passions. Uses Maccabean martyrs as examples.' },
];

// Ethiopian / Ancient books — fetched live from sacred-texts.com via /api/ancient
const ETHIOPIAN_BOOKS = [
  { id: 'enoch',    name: '1 Enoch (Book of Enoch)', chapters: 108, badge: 'Ethiopian Orthodox Canon', badgeColor: '#c084fc', icon: '📜', desc: 'Quoted in Jude 1:14-15. Contains the Watchers narrative, Similitudes, astronomical treatises. R.H. Charles 1917 translation.' },
  { id: 'jubilees', name: 'Book of Jubilees',        chapters: 50,  badge: 'Ethiopian Orthodox Canon', badgeColor: '#c084fc', icon: '📅', desc: 'Also called "Little Genesis." Retelling of Genesis/Exodus in jubilee periods. Found among Dead Sea Scrolls.' },
  { id: 'thomas',   name: 'Gospel of Thomas',        chapters: 1,   badge: 'Nag Hammadi · c. 50-140 AD', badgeColor: '#38bdf8', icon: '🕊', desc: '114 sayings attributed to Jesus. Discovered in Egypt 1945. About half overlap with the canonical Gospels.' },
  { id: 'hermas',   name: 'Shepherd of Hermas',      chapters: 25,  badge: 'Early Christian · c. 100-140 AD', badgeColor: '#f472b6', icon: '🐑', desc: 'One of the most popular texts in the early church. Included in Codex Sinaiticus. Visions, mandates, and parables.' },
];

const ANCIENT_INFO = [
  {
    name: '1 Enoch (Book of Enoch)',
    badge: 'Ethiopian Orthodox Canon',
    badgeColor: '#c084fc',
    chapters: '108 chapters',
    icon: '📜',
    desc: 'One of the most significant non-canonical texts in existence. Quoted directly in Jude 1:14–15. Predates Christianity by centuries. Contains the Watchers narrative (fallen angels), the Similitudes of Enoch, astronomical treatises, the Dream Visions, and the Epistle of Enoch.',
    significance: 'Central to Ethiopian Orthodox theology. Part of the 81-book Ethiopian Orthodox Tewahedo Bible — the most complete biblical canon in the world.',
  },
  {
    name: 'Book of Jubilees',
    badge: 'Ethiopian Orthodox Canon',
    badgeColor: '#c084fc',
    chapters: '50 chapters',
    icon: '📅',
    desc: 'Sometimes called "Little Genesis." A retelling of Genesis and Exodus structured around 49-year jubilee periods. Found among the Dead Sea Scrolls. Provides detailed chronologies and expands on patriarchal narratives.',
    significance: 'Authoritative in Ethiopian and Eritrean Orthodox Christianity. Widely read in Second Temple Judaism.',
  },
  {
    name: 'Book of Jasher',
    badge: 'Referenced in the Hebrew Bible',
    badgeColor: '#fb923c',
    chapters: '91 chapters',
    icon: '⚔️',
    desc: 'Referenced twice in the canonical Bible — Joshua 10:13 and 2 Samuel 1:18. Covers the same period as Genesis through Judges with expanded narratives around Abraham, Moses, and the conquest of Canaan.',
    significance: 'Its authenticity is debated. The most circulated English version dates to 1840. The original is considered lost.',
  },
  {
    name: 'Dead Sea Scrolls',
    badge: 'Qumran Texts · c. 250 BC – 68 AD',
    badgeColor: '#94a3b8',
    chapters: '900+ manuscripts',
    icon: '🏺',
    desc: 'Discovered between 1947–1956 in 11 caves near Qumran. Includes the oldest known manuscripts of nearly every Hebrew Bible book, plus community texts unique to the Qumran sect: the Community Rule, the War Scroll, the Temple Scroll, Thanksgiving Hymns, and more.',
    significance: 'Revolutionized understanding of Second Temple Judaism and the textual history of the Bible. The Great Isaiah Scroll is 1,000 years older than any previously known Isaiah manuscript.',
  },
  {
    name: 'Ethiopian Orthodox Bible',
    badge: '81 Books · Tewahedo Canon',
    badgeColor: '#4ade80',
    chapters: '81 canonical books',
    icon: '✝',
    desc: 'The Ethiopian Orthodox Tewahedo Church uses the most expansive biblical canon — 81 books. Includes 1 Enoch, Jubilees, 1–3 Meqabyan (Ethiopian Maccabees), Sinodos, Book of the Covenant, Clement, and Didascalia.',
    significance: 'The oldest continuously practicing Christian church. Their canon preserves texts lost to Western Christianity for over a millennium.',
  },
  {
    name: 'Gospel of Thomas',
    badge: 'Nag Hammadi · c. 50–140 AD',
    badgeColor: '#38bdf8',
    chapters: '114 sayings',
    icon: '🕊',
    desc: 'A collection of 114 sayings attributed to Jesus, discovered in Egypt in 1945. Unlike canonical gospels, it contains no narrative — only logia (sayings). About half overlap with Matthew, Mark, and Luke.',
    significance: 'Excluded from the canon at the Council of Carthage (397 AD). Some scholars consider parts of it earlier than canonical gospels.',
  },
  {
    name: 'Shepherd of Hermas',
    badge: 'Early Christian · c. 100–140 AD',
    badgeColor: '#f472b6',
    chapters: '5 visions, 12 mandates, 10 parables',
    icon: '🐑',
    desc: 'Written in Rome in the early 2nd century. One of the most popular texts in the early church — included in Codex Sinaiticus alongside the New Testament. Contains apocalyptic visions, ethical mandates, and parables.',
    significance: 'Considered canonical by some early church fathers including Origen and Irenaeus. Excluded from the final Western canon.',
  },
];

// ── Library Shelf Components ──────────────────────────────────────────────────

const SHELF_COLORS = {
  apocrypha: '#c084fc',
  ethiopian: '#38bdf8',
  historical: '#fb923c',
};

const SPINE_PALETTES: string[][] = [
  ['#7c3aed', '#6d28d9'],
  ['#1d4ed8', '#1e40af'],
  ['#065f46', '#047857'],
  ['#92400e', '#78350f'],
  ['#7f1d1d', '#991b1b'],
  ['#1e3a5f', '#1e3a8a'],
  ['#4a1942', '#701a75'],
  ['#14532d', '#166534'],
  ['#3b0764', '#4c0f9e'],
  ['#44403c', '#57534e'],
  ['#134e4a', '#0f766e'],
  ['#1c1917', '#292524'],
  ['#422006', '#713f12'],
  ['#0c4a6e', '#075985'],
];

function BookSpine({ title, chapters, icon, badge, colorIdx, onClick }: {
  title: string; chapters?: number; icon?: string; badge?: string; colorIdx: number; onClick: () => void;
}) {
  const [top, bot] = SPINE_PALETTES[colorIdx % SPINE_PALETTES.length];
  // Derive a slightly lighter highlight and darker shadow from the base color
  const bindingW = 10;
  return (
    <button
      onClick={onClick}
      className="shrink-0 relative overflow-hidden transition-all"
      style={{
        width: 72,
        height: 130,
        borderRadius: '3px 6px 6px 3px',
        background: `linear-gradient(170deg, ${top}ee, ${bot})`,
        boxShadow: `2px 4px 16px rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)`,
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 0,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-6px) rotate(-1deg)';
        el.style.boxShadow = `4px 10px 28px rgba(0,0,0,0.7), -1px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = `2px 4px 16px rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)`;
      }}>

      {/* Left binding strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: bindingW,
        background: `linear-gradient(90deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15))`,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }} />

      {/* Right page-edge effect */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 5,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12))',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }} />

      {/* Page lines on right edge — simulates stacked pages */}
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{
          position: 'absolute', right: 0, width: 4,
          top: `${14 + i * 17}%`, height: 1,
          background: 'rgba(200,190,170,0.18)',
        }} />
      ))}

      {/* Top ornamental line */}
      <div style={{ marginLeft: bindingW + 4, marginRight: 6, marginTop: 8, height: 1, background: 'rgba(255,255,255,0.2)' }} />

      {/* Icon or decorative emblem */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, marginLeft: bindingW }}>
        {icon
          ? <span style={{ fontSize: 16, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}>{icon}</span>
          : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }} />
        }
      </div>

      {/* Title — centered vertically in remaining space */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: bindingW + 4, paddingRight: 6, paddingTop: 4, paddingBottom: 4 }}>
        <p style={{
          fontSize: 9,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          lineHeight: 1.4,
          wordBreak: 'break-word',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.01em',
        }}>{title}</p>
      </div>

      {/* Bottom ornamental line */}
      <div style={{ marginLeft: bindingW + 4, marginRight: 6, height: 1, background: 'rgba(255,255,255,0.15)' }} />

      {/* Chapter count / badge footer */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 7, paddingTop: 5, paddingLeft: bindingW }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', fontFamily: 'system-ui', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {chapters !== undefined ? `${chapters} ch` : badge ? badge.split('·')[0].trim().slice(0, 8) : ''}
        </p>
      </div>
    </button>
  );
}

function ShelfRow({ id, title, subtitle, color, children, expanded, onToggle }: {
  id: string; title: string; subtitle: string; color: string; children: ReactNode; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}20` }}>
      <button className="w-full flex items-center justify-between px-4 py-4" onClick={onToggle} style={{ background: `${color}08` }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 4, height: 32, borderRadius: 99, background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
          <div className="text-left">
            <p className="font-black uppercase tracking-[0.1em]" style={{ fontSize: 13, color, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{title}</p>
            <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.35)', marginTop: 2 }}>{subtitle}</p>
          </div>
        </div>
        <span style={{ color: `${color}88`, fontSize: 16, display: 'inline-block', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {expanded && (
        <div style={{ borderTop: `1px solid ${color}12`, background: 'linear-gradient(180deg, rgba(20,12,5,0.6), rgba(10,8,4,0.8))' }}>
          {/* Shelf surface — wood plank */}
          <div style={{
            height: 10,
            background: 'linear-gradient(90deg, rgba(101,63,30,0.5), rgba(139,90,43,0.35), rgba(80,50,22,0.5), rgba(139,90,43,0.3), rgba(101,63,30,0.5))',
            borderBottom: '2px solid rgba(60,35,10,0.6)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
          }} />
          {/* Books sitting on the shelf */}
          <div className="overflow-x-auto px-4 pt-1 pb-5" style={{ scrollbarWidth: 'none', background: 'linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(15,10,5,0.2) 100%)' }}>
            <div className="flex gap-2 items-end">{children}</div>
          </div>
          {/* Shelf bottom edge shadow */}
          <div style={{ height: 4, background: 'linear-gradient(180deg, rgba(60,35,10,0.4), transparent)' }} />
        </div>
      )}
    </div>
  );
}

function LibraryShelf({ onOpenApo, onOpenEth }: {
  accentColor: string;
  onOpenApo: (book: typeof APOCRYPHA[0]) => void;
  onOpenEth: (book: typeof ETHIOPIAN_BOOKS[0]) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ apocrypha: true, ethiopian: false, historical: false });
  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const [selectedHistorical, setSelectedHistorical] = useState<typeof ANCIENT_INFO[0] | null>(null);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-5 py-5" style={{ background: 'linear-gradient(135deg, rgba(92,60,20,0.25), rgba(139,90,43,0.12), rgba(20,10,5,0.3))', border: '1px solid rgba(139,90,43,0.25)' }}>
        <div className="flex items-center gap-3">
          <img src="/read book.png" alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <div>
            <h2 style={{ color: '#f0d9a0', fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 900 }}>Sacred Library</h2>
            <p style={{ color: 'rgba(240,217,160,0.4)', fontSize: 11, marginTop: 2 }}>Apocrypha · Ancient Canon · Historical Texts</p>
          </div>
        </div>
      </div>
      <ShelfRow id="apocrypha" title="Apocrypha · Deuterocanonical" subtitle="Brenton Septuagint — 14 books · Tap to read" color={SHELF_COLORS.apocrypha} expanded={expanded.apocrypha} onToggle={() => toggle('apocrypha')}>
        {APOCRYPHA.map((book, i) => <BookSpine key={book.osis} title={book.name} chapters={book.chapters} colorIdx={i} onClick={() => onOpenApo(book)} />)}
      </ShelfRow>
      <ShelfRow id="ethiopian" title="Ethiopian Orthodox Canon" subtitle="R.H. Charles translations · Tap to read" color={SHELF_COLORS.ethiopian} expanded={expanded.ethiopian} onToggle={() => toggle('ethiopian')}>
        {ETHIOPIAN_BOOKS.map((book, i) => <BookSpine key={book.id} title={book.name} chapters={book.chapters} icon={book.icon} badge={book.badge} colorIdx={i + 4} onClick={() => onOpenEth(book)} />)}
      </ShelfRow>
      <ShelfRow id="historical" title="Historical Texts" subtitle="Extra-biblical writings · Tap for details" color={SHELF_COLORS.historical} expanded={expanded.historical} onToggle={() => toggle('historical')}>
        {ANCIENT_INFO.map((item, i) => (
          <BookSpine
            key={item.name}
            title={item.name}
            icon={item.icon}
            badge={item.badge}
            colorIdx={i + 8}
            onClick={() => setSelectedHistorical(prev => prev?.name === item.name ? null : item)}
          />
        ))}
      </ShelfRow>

      {/* Historical text detail panel */}
      {selectedHistorical && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <div className="flex items-start gap-3">
            <span style={{ fontSize: 28 }}>{selectedHistorical.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0f8f4', fontFamily: 'Georgia, serif' }}>{selectedHistorical.name}</h3>
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: `${selectedHistorical.badgeColor}18`, color: selectedHistorical.badgeColor, border: `1px solid ${selectedHistorical.badgeColor}30`, fontWeight: 700 }}>{selectedHistorical.badge}</span>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(232,240,236,0.4)' }}>{selectedHistorical.chapters}</p>
            </div>
            <button onClick={() => setSelectedHistorical(null)} style={{ color: 'rgba(251,146,60,0.5)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif' }}>{selectedHistorical.desc}</p>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${selectedHistorical.badgeColor}60` }}>
            <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.5)', fontStyle: 'italic', lineHeight: 1.6 }}>{selectedHistorical.significance}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  bibles: ApiBible[];
  biblesLoading: boolean;
  defaultBible: ApiBible | null;
  fetchPassage: (bibleId: string, passageId: string, label: string) => Promise<Passage | null>;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  accentColor: string;
  onNavigateToRead: (book: BookDef, chapter: number) => void;
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
}

export default function StudyTab({
  bibles, biblesLoading, defaultBible, fetchPassage, fontSize, accentColor, onNavigateToRead, experienceLevel = 'beginner',
}: Props) {
  const [mode, setMode] = useState<'ai' | 'quiz' | 'topics' | 'harmony' | 'terms' | 'religions' | 'maps' | 'prophecy' | 'plans' | 'ancient' | 'sermons' | 'worship'>('ai');
  // studyTab state removed — replaced with direct section tabs

  // Independent navigator
  const [studyBook, setStudyBook] = useState(BOOKS[39]); // Matthew
  const [studyChapter, setStudyChapter] = useState(1);
  const [studyBible, setStudyBible] = useState<ApiBible | null>(null);
  const [showBookList, setShowBookList] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  // Passage loaded independently
  const [passage, setPassage] = useState<Passage | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);

  // AI Explain
  const [selectedVerse, setSelectedVerse] = useState<ParsedVerse | null>(null);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [question, setQuestion] = useState('');

  // Explain depth mode
  const [studyDepth, setStudyDepth] = useState<'simple' | 'deep'>('simple');

  // Quiz
  const [quizQuestions, setQuizQuestions] = useState<{ question: string; options: string[]; correct: number; explanation: string }[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizCurrent, setQuizCurrent] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Set<number>>(new Set());

  // Ancient texts (Brenton Septuagint via api.bible)
  const [apoBook, setApoBook] = useState<typeof APOCRYPHA[0] | null>(null);
  const [apoChapter, setApoChapter] = useState(1);
  const [apoPassage, setApoPassage] = useState<Passage | null>(null);
  const [apoLoading, setApoLoading] = useState(false);
  const [apoError, setApoError] = useState('');

  // Ethiopian books (via /api/ancient)
  const [ethBook, setEthBook] = useState<typeof ETHIOPIAN_BOOKS[0] | null>(null);
  const [ethChapter, setEthChapter] = useState(1);
  const [ethVerses, setEthVerses] = useState<ParsedVerse[]>([]);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethError, setEthError] = useState('');
  const [ethPage, setEthPage] = useState(0);
  const VERSES_PER_PAGE = 8;

  const { gold, goldFaint, goldBorder, cream, dark } = T;
  const fsClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }[fontSize];

  // Set default bible when bibles load
  useEffect(() => {
    if (!studyBible && defaultBible) setStudyBible(defaultBible);
  }, [defaultBible, studyBible]);

  // Load passage when navigator changes
  useEffect(() => {
    if (!studyBible) return;
    setPassageLoading(true);
    setSelectedVerse(null);
    setExplanation('');
    const passageId = `${studyBook.osis}.${studyChapter}`;
    fetchPassage(studyBible.id, passageId, studyBible.abbreviationLocal)
      .then(p => { if (p) setPassage(p); })
      .catch(() => null)
      .finally(() => setPassageLoading(false));
  }, [studyBible, studyBook, studyChapter, fetchPassage]);

  // Load apocryphal passage — fetch directly with HTML fallback since the
  // Brenton Septuagint may not return proper [N] markers for content-type=text
  useEffect(() => {
    if (!apoBook) return;
    let cancelled = false;
    setApoLoading(true);
    setApoError('');
    setApoPassage(null);

    const passageId = `${apoBook.osis}.${apoChapter}`;

    (async () => {
      try {
        // Try text format first (matches the parent fetchPassage approach)
        const textParams = new URLSearchParams({
          path: `bibles/${BRENTON_ID}/passages/${passageId}`,
          'content-type': 'text',
          'include-verse-numbers': 'true',
          'include-titles': 'false',
          'include-chapter-numbers': 'false',
        });
        const textRes = await fetch(`/api/bible?${textParams}`);
        if (!cancelled && textRes.ok) {
          const textData = await textRes.json();
          const d = textData.data;
          if (d) {
            const verses = parseVerseText(stripHtml(d.content || ''));
            if (verses.length > 0) {
              if (!cancelled) setApoPassage({ reference: d.reference, translationName: 'Brenton LXX', verses });
              return;
            }
          }
        }

        // Fallback: fetch as HTML and parse verse spans
        const htmlParams = new URLSearchParams({
          path: `bibles/${BRENTON_ID}/passages/${passageId}`,
          'content-type': 'html',
          'include-verse-numbers': 'true',
          'include-titles': 'false',
          'include-chapter-numbers': 'false',
        });
        const htmlRes = await fetch(`/api/bible?${htmlParams}`);
        if (cancelled) return;
        if (!htmlRes.ok) { setApoError('Could not load this passage.'); return; }
        const htmlData = await htmlRes.json();
        const hd = htmlData.data;
        if (!hd) { setApoError('Could not load this passage.'); return; }

        // Parse verses from HTML using data-number spans
        const htmlContent = hd.content || '';
        const verses: ParsedVerse[] = [];
        const verseRegex = /<span[^>]*data-number="(\d+)"[^>]*class="v"[^>]*>\d+<\/span>([\s\S]*?)(?=<span[^>]*data-number="\d+"[^>]*class="v"|$)/g;
        let match;
        while ((match = verseRegex.exec(htmlContent)) !== null) {
          const num = parseInt(match[1]);
          const text = match[2].replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
          if (text) verses.push({ verse: num, text });
        }

        // If regex didn't find verses, try stripping HTML and using parseVerseText
        if (verses.length === 0) {
          const stripped = stripHtml(htmlContent);
          const fallbackVerses = parseVerseText(stripped);
          if (fallbackVerses.length > 0) {
            if (!cancelled) setApoPassage({ reference: hd.reference, translationName: 'Brenton LXX', verses: fallbackVerses });
            return;
          }
        }

        if (!cancelled) {
          if (verses.length > 0) {
            setApoPassage({ reference: hd.reference, translationName: 'Brenton LXX', verses });
          } else {
            setApoError('Could not load this passage.');
          }
        }
      } catch {
        if (!cancelled) setApoError('Could not load passage.');
      } finally {
        if (!cancelled) setApoLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apoBook, apoChapter]);

  // Load Ethiopian book chapter from /api/ancient
  useEffect(() => {
    if (!ethBook) return;
    let cancelled = false;
    setEthLoading(true);
    setEthError('');
    setEthVerses([]);
    setEthPage(0);

    fetch(`/api/ancient?book=${ethBook.id}&chapter=${ethChapter}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setEthError(data.error); return; }
        if (data.verses && data.verses.length > 0) {
          setEthVerses(data.verses);
        } else {
          setEthError('No content found for this chapter.');
        }
      })
      .catch(() => { if (!cancelled) setEthError('Could not load. Check connection.'); })
      .finally(() => { if (!cancelled) setEthLoading(false); });

    return () => { cancelled = true; };
  }, [ethBook, ethChapter]);

  const explainVerse = useCallback(async (verse: ParsedVerse, q?: string) => {
    if (!studyBible) return;
    setSelectedVerse(verse);
    setExplanation('');
    setExplaining(true);
    const ref = `${studyBook.name} ${studyChapter}:${verse.verse}`;

    // Build prompt based on depth mode
    const simplePrompt = `Explain this verse in simple, clear language that anyone can understand:

${ref} (${studyBible.abbreviationLocal}): "${verse.text}"

Cover:
- What is happening here in plain language
- What does this mean for daily life
- One key takeaway

Write as a warm friend explaining Scripture. Keep it short and clear. Do not use any markdown formatting, asterisks, or headers. Plain text only.`;

    const deepPrompt = `Give a rich, in-depth study of this verse:

${ref} (${studyBible.abbreviationLocal}): "${verse.text}"

Cover these naturally as flowing commentary:
- Historical and cultural context of when this was written
- Key Hebrew or Greek word meanings and nuances
- Theological significance and how it connects to the broader narrative of Scripture
- Cross-references to related passages
- What the original audience understood vs how we read it today
- Practical application

Write as a knowledgeable but warm pastor. Be substantive. Do not use any markdown formatting, asterisks, or headers. Plain text only.`;

    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: ref,
          verseText: verse.text,
          translation: studyBible.abbreviationLocal,
          question: q || (studyDepth === 'deep' ? deepPrompt : simplePrompt),
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExplanation(text);
      }
    } catch {
      setExplanation('Could not load explanation. Check your connection.');
    } finally {
      setExplaining(false);
    }
  }, [studyBible, studyBook, studyChapter, studyDepth]);

  const generateQuiz = useCallback(async () => {
    if (!studyBible || !passage) return;
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizCurrent(0);
    setQuizAnswered({});
    setQuizRevealed(new Set());
    try {
      const res = await fetch('/api/altar/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book: studyBook.name,
          chapter: studyChapter,
          verseTexts: passage.verses.slice(0, 30),
          translation: studyBible.abbreviationLocal,
        }),
      });
      const data = await res.json();
      setQuizQuestions(data);
    } catch {
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  }, [studyBible, studyBook, studyChapter, passage]);

  const pillActive = { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff', boxShadow: `0 0 12px ${accentColor}44` };
  const pillInactive = { background: `${accentColor}0d`, color: `${accentColor}55`, border: `1px solid ${accentColor}18` };

  const popularBibles = bibles.filter(b => b.group === 'popular');

  // Experience level filter
  const xp = experienceLevel;
  type Item = { id: string; label: string; icon: string; desc: string; minLevel?: 'beginner' | 'intermediate' | 'expert' };
  const lvl = (item: Item) => {
    const min = item.minLevel || 'beginner';
    const order = { beginner: 0, intermediate: 1, expert: 2 };
    return order[xp] >= order[min];
  };

  // All study sections as scrollable top tabs — each maps directly to a mode
  const studySections = ([
    { id: 'ai' as const, label: 'Study', icon: '✦' },
    { id: 'plans' as const, label: 'Plans', icon: '📅' },
    { id: 'topics' as const, label: 'Topics', icon: '📚' },
    { id: 'terms' as const, label: 'Biblical Words', icon: '📖' },
    { id: 'sermons' as const, label: 'Media', icon: '🎬' },
    { id: 'maps' as const, label: 'Timeline', icon: '🕰' },
    { id: 'ancient' as const, label: 'Library', icon: '📜' },
    { id: 'religions' as const, label: 'Religions', icon: '🌍' },
  ] as (Item & { id: typeof mode })[]).filter(lvl);

  // Secondary items within certain sections
  const subItems: Record<string, { id: typeof mode; label: string; icon: string }[]> = {
    ai: [{ id: 'ai', label: 'AI Study', icon: '✦' }, { id: 'quiz', label: 'Quiz', icon: '🧠' }],
    sermons: [{ id: 'sermons', label: 'Sermons', icon: '🎤' }, { id: 'worship', label: 'Worship', icon: '🎵' }],
    maps: [{ id: 'maps', label: 'Maps', icon: '🗺' }, { id: 'prophecy', label: 'Prophecies', icon: '🔮' }],
  };

  // Find which top-level section is active based on current mode
  const activeSection = studySections.find(s => {
    if (s.id === mode) return true;
    const subs = subItems[s.id];
    return subs?.some(sub => sub.id === mode);
  })?.id || 'ai';

  return (
    <>
      {/* ── Section tile grid — 4 across, 2 rows ── */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {studySections.map(section => {
          const isActive = activeSection === section.id;
          return (
            <button key={section.id} onClick={() => setMode(section.id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-center transition-all active:scale-95"
              style={isActive
                ? {
                    background: `linear-gradient(135deg, ${accentColor}28, ${accentColor}10)`,
                    border: `1.5px solid ${accentColor}55`,
                    boxShadow: `0 0 14px ${accentColor}30, 0 0 0 1px ${accentColor}22 inset`,
                  }
                : { background: `${accentColor}06`, border: `1px solid ${accentColor}15` }
              }>
              <span className="text-xl leading-none">{section.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide leading-tight"
                style={{ color: isActive ? accentColor : `${accentColor}55` }}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sub-navigation (if section has sub-items) ── */}
      {subItems[activeSection] && subItems[activeSection].length > 1 && (
        <div>
          <div style={{ height: 1, background: `${accentColor}12`, marginBottom: 8 }} />
          <div className="flex gap-2">
            {subItems[activeSection].map(sub => (
              <button key={sub.id} onClick={() => setMode(sub.id)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all text-center"
                style={mode === sub.id
                  ? { background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}40`, boxShadow: `0 0 8px ${accentColor}20` }
                  : { background: 'rgba(255,255,255,0.02)', color: 'rgba(232,240,236,0.4)', border: `1px solid ${accentColor}0a` }
                }>
                {sub.icon} {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <>
          {/* ── Independent Navigator ────────────────────────────────────────── */}
          {/* Depth toggle */}
          <div className="flex items-center gap-2 rounded-xl p-1" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18` }}>
            <button onClick={() => setStudyDepth('simple')}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
              style={studyDepth === 'simple' ? pillActive : { color: `${accentColor}66` }}>
              Simple
            </button>
            <button onClick={() => setStudyDepth('deep')}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
              style={studyDepth === 'deep' ? pillActive : { color: `${accentColor}66` }}>
              Deep Study
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${accentColor}18` }}>
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${accentColor}12` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}88` }}>
                Choose a passage to study {studyDepth === 'deep' ? '(Deep Mode)' : '(Simple Mode)'}
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Translation pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {biblesLoading ? (
                  <p className="text-xs" style={{ color: `${accentColor}55` }}>Loading…</p>
                ) : (
                  popularBibles.slice(0, 6).map(b => (
                    <button key={b.id} onClick={() => setStudyBible(b)} title={b.name}
                      className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide transition-all"
                      style={studyBible?.id === b.id ? pillActive : pillInactive}>
                      {b.abbreviationLocal}
                    </button>
                  ))
                )}
              </div>

              {/* Book + Chapter row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <button onClick={() => setShowBookList(!showBookList)}
                    className="w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4' }}>
                    <span>{studyBook.name}</span>
                    <span style={{ color: accentColor }}>▾</span>
                  </button>
                  {showBookList && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl max-h-64 flex flex-col overflow-hidden"
                      style={{ background: '#0a1410', border: `1px solid ${accentColor}18`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                      <div className="p-2 shrink-0" style={{ borderBottom: `1px solid ${accentColor}12` }}>
                        <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} autoFocus value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books…"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4' }} />
                      </div>
                      <div className="overflow-y-auto">
                        {BOOKS.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase())).map(book => (
                          <button key={book.osis}
                            onClick={() => { setStudyBook(book); setStudyChapter(1); setShowBookList(false); setBookSearch(''); }}
                            className="w-full text-left px-4 py-2 text-sm transition-colors"
                            style={book.osis === studyBook.osis ? { color: accentColor, background: `${accentColor}0d`, fontWeight: 600 } : { color: 'rgba(232,240,236,0.65)' }}>
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <select value={studyChapter} onChange={e => setStudyChapter(Number(e.target.value))}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4', minWidth: '80px' }}>
                  {Array.from({ length: studyBook.chapters }, (_, i) => i + 1).map(ch => (
                    <option key={ch} value={ch} style={{ background: '#0a1410' }}>Ch. {ch}</option>
                  ))}
                </select>
              </div>

              {/* Verse grid */}
              {passageLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: gold }} />
                </div>
              ) : passage ? (
                <div>
                  <p className="text-xs mb-2" style={{ color: `${accentColor}66` }}>
                    Tap a verse to study — {studyBook.name} {studyChapter}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {passage.verses.map(v => (
                      <button key={v.verse} onClick={() => explainVerse(v)}
                        className="w-10 h-10 rounded-lg text-sm font-bold transition-all"
                        style={selectedVerse?.verse === v.verse
                          ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#0a1410', boxShadow: `0 0 12px ${accentColor}66` }
                          : { background: `${accentColor}0d`, color: `${accentColor}99`, border: `1px solid ${accentColor}18` }}>
                        {v.verse}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Selected verse + explanation */}
          {selectedVerse && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${accentColor}25` }}>
              {/* The verse */}
              <div className="px-6 py-5" style={{ background: `${accentColor}08`, borderBottom: `1px solid ${accentColor}18` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: accentColor }}>
                  {studyBook.name} {studyChapter}:{selectedVerse.verse}
                </p>
                <p className="text-lg italic leading-loose" style={{ color: gold, fontFamily: 'Georgia, serif', textShadow: `0 0 20px ${accentColor}22` }}>
                  &ldquo;{selectedVerse.text}&rdquo;
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-3" style={{ color: `${accentColor}66` }}>{studyBible?.abbreviationLocal}</p>
              </div>

              {/* Explanation */}
              <div className="px-6 py-5">
                {explaining && !explanation && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: gold }} />
                    <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>Studying this verse…</p>
                  </div>
                )}
                {explanation && (
                  <div className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.75)', fontFamily: 'Georgia, serif', lineHeight: 1.9 }}>
                    {cleanMarkdown(explanation)}
                    {explaining && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: gold, borderRadius: 1 }} />}
                  </div>
                )}
              </div>

              {/* Ask a follow-up */}
              <div className="px-5 py-4" style={{ borderTop: `1px solid ${accentColor}12` }}>
                <div className="flex gap-2">
                  <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={question} onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && question.trim()) { explainVerse(selectedVerse, question); setQuestion(''); } }}
                    placeholder="Ask a question about this verse…"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4' }} />
                  <button onClick={() => { if (question.trim()) { explainVerse(selectedVerse, question); setQuestion(''); } }}
                    disabled={explaining || !question.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#0a1410' }}>
                    Ask
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedVerse && !passageLoading && passage && (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
              <p className="text-3xl mb-3">✦</p>
              <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(232,240,236,0.6)' }}>AI-Powered Study</p>
              <p className="text-xs" style={{ color: 'rgba(232,240,236,0.3)' }}>
                Select a verse number above to get a deep breakdown — historical context, original language insights, and practical application.
              </p>
            </div>
          )}
        </>
      )}

      {mode === 'quiz' && (
        <>
          {/* Same navigator as AI study — reuse book/chapter picker */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${accentColor}18` }}>
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${accentColor}12` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${accentColor}88` }}>
                Test your knowledge
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <button onClick={() => setShowBookList(!showBookList)}
                    className="w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between"
                    style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4' }}>
                    <span>{studyBook.name} {studyChapter}</span>
                    <span style={{ color: accentColor }}>▾</span>
                  </button>
                  {showBookList && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl max-h-64 flex flex-col overflow-hidden"
                      style={{ background: '#0a1410', border: `1px solid ${accentColor}18`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                      <div className="p-2 shrink-0" style={{ borderBottom: `1px solid ${accentColor}12` }}>
                        <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} autoFocus value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books…"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4' }} />
                      </div>
                      <div className="overflow-y-auto">
                        {BOOKS.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase())).map(book => (
                          <button key={book.osis}
                            onClick={() => { setStudyBook(book); setStudyChapter(1); setShowBookList(false); setBookSearch(''); }}
                            className="w-full text-left px-4 py-2 text-sm transition-colors"
                            style={book.osis === studyBook.osis ? { color: accentColor, background: `${accentColor}0d`, fontWeight: 600 } : { color: 'rgba(232,240,236,0.65)' }}>
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <select value={studyChapter} onChange={e => setStudyChapter(Number(e.target.value))}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}18`, color: '#f0f8f4', minWidth: '80px' }}>
                  {Array.from({ length: studyBook.chapters }, (_, i) => i + 1).map(ch => (
                    <option key={ch} value={ch} style={{ background: '#0a1410' }}>Ch. {ch}</option>
                  ))}
                </select>
              </div>

              <button onClick={generateQuiz} disabled={quizLoading || !passage}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#0a1410', boxShadow: `0 2px 12px ${accentColor}55` }}>
                {quizLoading ? 'Generating quiz…' : `Generate Quiz — ${studyBook.name} ${studyChapter}`}
              </button>
            </div>
          </div>

          {/* Quiz questions */}
          {quizLoading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: gold }} />
              <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>Creating your quiz…</p>
            </div>
          )}

          {quizQuestions.length > 0 && (() => {
            const q = quizQuestions[quizCurrent];
            const answered = quizAnswered[quizCurrent] !== undefined;
            const revealed = quizRevealed.has(quizCurrent);
            const selected = quizAnswered[quizCurrent];
            const isCorrect = selected === q.correct;
            const isLastQuestion = quizCurrent === quizQuestions.length - 1;
            const allAnswered = Object.keys(quizAnswered).length === quizQuestions.length;

            // Score screen
            if (allAnswered && quizCurrent >= quizQuestions.length) {
              const score = Object.values(quizAnswered).filter((a, i) => a === quizQuestions[i].correct).length;
              const perfect = score === quizQuestions.length;
              return (
                <div className="rounded-2xl p-8 text-center" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}25` }}>
                  <p className="text-5xl mb-4">{perfect ? '🏆' : score >= quizQuestions.length / 2 ? '📖' : '💪'}</p>
                  <p className="text-2xl font-black mb-2" style={{ color: accentColor, fontFamily: 'Georgia, serif' }}>
                    {score} / {quizQuestions.length}
                  </p>
                  <p className="text-sm mb-6" style={{ color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif' }}>
                    {perfect ? 'Perfect score! You know this chapter well.' : score >= quizQuestions.length / 2 ? 'Great effort! Keep studying.' : 'Keep reading — you\'ll get it.'}
                  </p>
                  <button onClick={generateQuiz} className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#0a1410' }}>
                    Try Again
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: `${accentColor}18` }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{
                      width: `${((quizCurrent + (answered ? 1 : 0)) / quizQuestions.length) * 100}%`,
                      background: `linear-gradient(90deg, ${accentColor}, ${accentColor}bb)`,
                    }} />
                  </div>
                  <p className="text-xs font-bold shrink-0" style={{ color: `${accentColor}88` }}>
                    {quizCurrent + 1} of {quizQuestions.length}
                  </p>
                </div>

                {/* Question card */}
                <div className="rounded-2xl overflow-hidden" style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: `1px solid ${revealed ? (isCorrect ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)') : `${accentColor}18`}`,
                }}>
                  <div className="px-5 py-5" style={{ borderBottom: `1px solid ${accentColor}12` }}>
                    <p className="text-base font-semibold leading-relaxed" style={{ color: 'rgba(232,240,236,0.9)', fontFamily: 'Georgia, serif' }}>
                      {q.question}
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selected === oIdx;
                      const isRight = oIdx === q.correct;
                      let optStyle: React.CSSProperties = {
                        background: `${accentColor}0d`,
                        border: `1px solid ${accentColor}18`,
                        color: 'rgba(232,240,236,0.7)',
                      };
                      if (revealed && isRight) {
                        optStyle = { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' };
                      } else if (revealed && isSelected && !isRight) {
                        optStyle = { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' };
                      } else if (isSelected) {
                        optStyle = { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff', boxShadow: `0 0 12px ${accentColor}44` };
                      }
                      return (
                        <button key={oIdx}
                          onClick={() => {
                            if (answered) return;
                            setQuizAnswered(prev => ({ ...prev, [quizCurrent]: oIdx }));
                            setQuizRevealed(prev => new Set([...prev, quizCurrent]));
                          }}
                          disabled={answered}
                          className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-default"
                          style={optStyle}>
                          <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation — shown after answering */}
                  {revealed && (
                    <div className="px-5 py-4" style={{
                      background: isCorrect ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)',
                      borderTop: `1px solid rgba(255,255,255,0.05)`,
                    }}>
                      <p className="text-xs font-black mb-1.5" style={{ color: isCorrect ? '#4ade80' : '#f87171' }}>
                        {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.55)', fontFamily: 'Georgia, serif' }}>{q.explanation}</p>
                    </div>
                  )}
                </div>

                {/* Next / Finish button — only shows after answering */}
                {answered && (
                  <button
                    onClick={() => {
                      if (isLastQuestion) {
                        setQuizCurrent(quizQuestions.length); // go to score screen
                      } else {
                        setQuizCurrent(c => c + 1);
                      }
                    }}
                    className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#0a1410', boxShadow: `0 4px 16px ${accentColor}44` }}>
                    {isLastQuestion ? 'See My Score →' : 'Next Question →'}
                  </button>
                )}
              </div>
            );
          })()}

          {!quizLoading && quizQuestions.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}>
              <p className="text-3xl mb-3">🧠</p>
              <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(232,240,236,0.6)' }}>Scripture Quiz</p>
              <p className="text-xs" style={{ color: 'rgba(232,240,236,0.3)' }}>
                Select a chapter above and hit Generate to test your knowledge with AI-generated questions.
              </p>
            </div>
          )}
        </>
      )}

      {mode === 'topics' && (
        <TopicalGuides accentColor={accentColor} selectedBibleAbbr={studyBible?.abbreviationLocal || 'KJV'} />
      )}

      {mode === 'harmony' && (
        <GospelHarmony accentColor={accentColor} onNavigateToRead={onNavigateToRead} />
      )}

      {mode === 'terms' && (
        <TermsReference accentColor={accentColor} selectedBibleAbbr={studyBible?.abbreviationLocal || 'KJV'} hideReligions />
      )}

      {mode === 'religions' && (
        <TermsReference accentColor={accentColor} selectedBibleAbbr={studyBible?.abbreviationLocal || 'KJV'} religionsOnly />
      )}

      {mode === 'prophecy' && (
        <ProphecyTimeline accentColor={accentColor} onNavigateToRead={onNavigateToRead} />
      )}

      {mode === 'maps' && (
        <BibleMaps accentColor={accentColor} onNavigateToRead={onNavigateToRead} />
      )}

      {mode === 'sermons' && (
        <SermonsSection accentColor={accentColor} />
      )}

      {mode === 'worship' && (
        <WorshipSection accentColor={accentColor} />
      )}

      {mode === 'plans' && (
        <ReadingPlans accentColor={accentColor} onNavigateToRead={onNavigateToRead} />
      )}

      {mode === 'ancient' && (
        <>
          {/* Ethiopian book reader — paginated */}
          {ethBook ? (
            (() => {
              const totalPages = Math.ceil(ethVerses.length / VERSES_PER_PAGE);
              const pageVerses = ethVerses.slice(ethPage * VERSES_PER_PAGE, (ethPage + 1) * VERSES_PER_PAGE);
              const bc = ethBook.badgeColor;

              return (
                <div>
                  <button onClick={() => { setEthBook(null); setEthVerses([]); setEthChapter(1); setEthPage(0); }}
                    className="flex items-center gap-2 text-sm font-semibold mb-4 transition-all"
                    style={{ color: `${bc}88` }}>
                    ← Back to Ancient Texts
                  </button>
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${bc}33` }}>
                    {/* Header */}
                    <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${bc}18`, background: `${bc}06` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{ethBook.icon}</span>
                        <div>
                          <h2 className="font-black uppercase tracking-[0.08em]" style={{ fontSize: 20, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                            {ethBook.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${bc}18`, color: bc }}>{ethBook.badge}</span>
                            <span className="text-xs font-black" style={{ color: bc }}>Chapter {ethChapter}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chapter nav */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${bc}10` }}>
                      <button onClick={() => { if (ethChapter > 1) { setEthChapter(c => c - 1); setEthPage(0); } }}
                        disabled={ethChapter <= 1}
                        className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-30 transition-all"
                        style={{ color: bc, background: `${bc}0d`, border: `1px solid ${bc}22` }}>
                        ←
                      </button>
                      <select value={ethChapter} onChange={e => { setEthChapter(Number(e.target.value)); setEthPage(0); }}
                        className="rounded-lg px-4 py-2 text-sm font-bold outline-none"
                        style={{ background: `${bc}0d`, border: `1px solid ${bc}22`, color: '#f0f8f4' }}>
                        {Array.from({ length: ethBook.chapters }, (_, i) => i + 1).map(ch => (
                          <option key={ch} value={ch} style={{ background: '#0a1410' }}>Chapter {ch}</option>
                        ))}
                      </select>
                      <button onClick={() => { if (ethChapter < ethBook.chapters) { setEthChapter(c => c + 1); setEthPage(0); } }}
                        disabled={ethChapter >= ethBook.chapters}
                        className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-30 transition-all"
                        style={{ color: bc, background: `${bc}0d`, border: `1px solid ${bc}22` }}>
                        →
                      </button>
                    </div>

                    {/* Content */}
                    <div className="px-5 py-5 min-h-48">
                      {ethLoading && (
                        <div className="flex justify-center items-center h-40">
                          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `${bc}33`, borderTopColor: bc }} />
                        </div>
                      )}
                      {ethError && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{ethError}</p>}
                      {!ethLoading && !ethError && pageVerses.length > 0 && (
                        <div className={`${fsClass} leading-loose`} style={{ color: "rgba(232,240,236,0.85)", fontFamily: 'Georgia, serif' }}>
                          {pageVerses.map(v => (
                            <span key={v.verse}>
                              <sup className="font-bold mr-1" style={{ color: bc, fontSize: '0.6em', fontFamily: 'system-ui' }}>{v.verse}</sup>
                              {v.text}{' '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Page navigation */}
                    {!ethLoading && ethVerses.length > VERSES_PER_PAGE && (
                      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${bc}10` }}>
                        <button onClick={() => setEthPage(p => Math.max(0, p - 1))}
                          disabled={ethPage === 0}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30"
                          style={{ color: bc, background: `${bc}0d` }}>
                          ← Prev
                        </button>

                        {/* Page dots */}
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setEthPage(i)}
                              className="transition-all"
                              style={{
                                width: ethPage === i ? 20 : 6,
                                height: 6,
                                borderRadius: 3,
                                background: ethPage === i ? bc : `${bc}33`,
                              }} />
                          ))}
                        </div>

                        <button onClick={() => setEthPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={ethPage >= totalPages - 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30"
                          style={{ color: bc, background: `${bc}0d` }}>
                          Next →
                        </button>
                      </div>
                    )}

                    {/* Page indicator text */}
                    {!ethLoading && ethVerses.length > 0 && (
                      <div className="px-5 pb-3">
                        <p className="text-[10px] text-center" style={{ color: `${bc}44` }}>
                          Verses {ethPage * VERSES_PER_PAGE + 1}–{Math.min((ethPage + 1) * VERSES_PER_PAGE, ethVerses.length)} of {ethVerses.length}
                          {totalPages > 1 && ` · Page ${ethPage + 1} of ${totalPages}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : apoBook ? (
            <div>
              <button onClick={() => { setApoBook(null); setApoPassage(null); setApoChapter(1); }}
                className="flex items-center gap-2 text-sm font-semibold mb-4 transition-all"
                style={{ color: `${accentColor}99` }}>
                ← Back to Ancient Texts
              </button>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(192,132,252,0.2)` }}>
                <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid rgba(192,132,252,0.1)`, background: 'rgba(192,132,252,0.04)' }}>
                  <h2 className="font-black uppercase tracking-[0.08em]" style={{ fontSize: 20, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                    {apoBook.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(192,132,252,0.15)', color: '#c084fc' }}>Brenton Septuagint</span>
                    <span className="text-xs font-black" style={{ color: '#c084fc' }}>Chapter {apoChapter}</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid rgba(192,132,252,0.08)` }}>
                  <button onClick={() => { if (apoChapter > 1) setApoChapter(c => c - 1); }}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ color: '#c084fc', background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)' }}>
                    ←
                  </button>
                  <select value={apoChapter} onChange={e => setApoChapter(Number(e.target.value))}
                    className="rounded-lg px-4 py-2 text-sm font-bold outline-none"
                    style={{ background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)', color: '#f0f8f4' }}>
                    {Array.from({ length: apoBook.chapters }, (_, i) => i + 1).map(ch => (
                      <option key={ch} value={ch} style={{ background: '#0a1410' }}>Chapter {ch}</option>
                    ))}
                  </select>
                  <button onClick={() => { if (apoChapter < apoBook.chapters) setApoChapter(c => c + 1); }}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ color: '#c084fc', background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)' }}>
                    →
                  </button>
                </div>
                <div className="px-6 py-6 min-h-48">
                  {apoLoading && <div className="flex justify-center items-center h-40"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(192,132,252,0.2)', borderTopColor: '#c084fc' }} /></div>}
                  {apoError && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{apoError}</p>}
                  {!apoLoading && !apoError && apoPassage && (
                    <div className={`${fsClass} leading-loose`} style={{ color: "rgba(232,240,236,0.85)", fontFamily: 'Georgia, serif' }}>
                      {apoPassage.verses.map(v => (
                        <span key={v.verse}>
                          <sup className="font-bold mr-1" style={{ color: '#c084fc', fontSize: '0.6em', fontFamily: 'system-ui' }}>{v.verse}</sup>
                          {v.text}{' '}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <LibraryShelf
              accentColor={accentColor}
              onOpenApo={(book) => { setApoBook(book); setApoChapter(1); }}
              onOpenEth={(book) => { setEthBook(book); setEthChapter(1); }}
            />
          )}
        </>
      )}
    </>
  );
}

// ── Sermons Section ──────────────────────────────────────────────────────────

const SERMON_TOPICS = [
  { id: 'deep-study', label: 'Deep Study', icon: '📖', desc: 'Verse-by-verse, theological teaching', searchSuffix: 'bible study deep dive verse by verse' },
  { id: 'encouragement', label: 'Encouragement', icon: '☀️', desc: 'Uplifting, hope-filled messages', searchSuffix: 'encouragement hope sermon' },
  { id: 'spiritual-formation', label: 'Spiritual Formation', icon: '🕊', desc: 'Disciplines, prayer, abiding in Christ', searchSuffix: 'spiritual formation disciplines prayer' },
  { id: 'leadership', label: 'Leadership', icon: '🏛', desc: 'Leading with integrity and purpose', searchSuffix: 'christian leadership sermon' },
  { id: 'conviction', label: 'Conviction', icon: '🔥', desc: 'Bold, uncompromising truth', searchSuffix: 'repentance conviction truth sermon' },
  { id: 'apologetics', label: 'Apologetics', icon: '🛡', desc: 'Defending the faith, tough questions', searchSuffix: 'apologetics defending faith evidence' },
];

const ALL_PREACHERS = [
  { name: 'Aaron Pennington', ministry: 'Trace Church', desc: 'Bold, Spirit-led preaching from Trace Church. Passionate about discipleship and the presence of God.', searchName: 'Aaron Pennington Trace Church', channelId: 'UCTraceChurchChannel', featured: true },
  { name: 'Craig Groeschel', ministry: 'Life.Church', desc: 'Practical leadership and faith for everyday Christ-followers.', searchName: 'Craig Groeschel' },
  { name: 'John Piper', ministry: 'Desiring God', desc: 'Deep dives into God\'s sovereignty and Christian hedonism.', searchName: 'John Piper' },
  { name: 'Tony Evans', ministry: 'The Urban Alternative', desc: 'Kingdom-minded preaching with biblical authority.', searchName: 'Tony Evans' },
  { name: 'Francis Chan', ministry: 'Crazy Love Ministries', desc: 'Radical obedience and intimate pursuit of Jesus.', searchName: 'Francis Chan' },
  { name: 'Matt Chandler', ministry: 'The Village Church', desc: 'Gospel-centered preaching with prophetic urgency.', searchName: 'Matt Chandler' },
  { name: 'Alistair Begg', ministry: 'Truth For Life', desc: 'Clear, verse-by-verse expository preaching.', searchName: 'Alistair Begg' },
  { name: 'Tim Keller', ministry: 'Gospel in Life', desc: 'Intellectual, gospel-rich, culture-engaging teaching.', searchName: 'Tim Keller' },
  { name: 'John Mark Comer', ministry: 'Practicing the Way', desc: 'Spiritual disciplines, unhurried living, and formation.', searchName: 'John Mark Comer' },
  { name: 'Jackie Hill Perry', ministry: 'Author & Poet', desc: 'Raw, poetic theology for a new generation.', searchName: 'Jackie Hill Perry' },
  { name: 'Voddie Baucham', ministry: 'Grace Family Baptist', desc: 'Bold, uncompromising biblical worldview teaching.', searchName: 'Voddie Baucham' },
  { name: 'David Platt', ministry: 'Radical Inc.', desc: 'Urgent call to sacrificial living and global missions.', searchName: 'David Platt' },
  { name: 'Paul Washer', ministry: 'HeartCry Missionary', desc: 'Piercing evangelistic preaching. Calls the church to examine itself.', searchName: 'Paul Washer' },
  { name: 'R.C. Sproul', ministry: 'Ligonier Ministries', desc: 'Foundational Reformed theology. Master teacher of holiness.', searchName: 'RC Sproul' },
  { name: 'Louie Giglio', ministry: 'Passion City Church', desc: 'Worship-centered messages on God\'s greatness.', searchName: 'Louie Giglio' },
  { name: 'Derwin Gray', ministry: 'Transformation Church', desc: 'Multiethnic unity and gospel transformation.', searchName: 'Derwin Gray' },
];

function SermonsSection({ accentColor }: { accentColor: string }) {
  const [selectedTopic, setSelectedTopic] = useState<typeof SERMON_TOPICS[0] | null>(null);
  const [selectedPreacher, setSelectedPreacher] = useState<typeof ALL_PREACHERS[0] | null>(null);
  const [playerMode, setPlayerMode] = useState<'embed' | 'search'>('embed');

  // Step 3: In-app video player
  if (selectedTopic && selectedPreacher) {
    const query = encodeURIComponent(`${selectedPreacher.searchName} ${selectedTopic.searchSuffix}`);
    const embedQuery = encodeURIComponent(`${selectedPreacher.searchName} ${selectedTopic.searchSuffix}`);
    // YouTube search embed via the /embed endpoint (experimental, may require user interaction on some devices)
    const embedSrc = `https://www.youtube-nocookie.com/embed?listType=search&list=${embedQuery}`;
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPreacher(null)}
          className="text-xs font-semibold" style={{ color: `${accentColor}88` }}>
          ← Choose a different voice
        </button>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
          <div className="px-5 pt-5 pb-3" style={{ background: `${accentColor}06`, borderBottom: `1px solid ${accentColor}12` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{selectedTopic.icon}</span>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${accentColor}66` }}>{selectedTopic.label}</p>
            </div>
            <h2 className="font-black uppercase tracking-[0.06em]" style={{ fontSize: 20, color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
              {selectedPreacher.name}
            </h2>
            <p className="text-xs mt-1" style={{ color: `${accentColor}55` }}>{selectedPreacher.ministry}</p>
          </div>

          {/* Toggle: In-App vs YouTube */}
          <div className="flex px-5 pt-4 pb-2 gap-2">
            <button
              onClick={() => setPlayerMode('embed')}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
              style={playerMode === 'embed'
                ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: '#fff' }
                : { background: `${accentColor}0d`, color: `${accentColor}55`, border: `1px solid ${accentColor}18` }}>
              ▶ Watch In-App
            </button>
            <button
              onClick={() => setPlayerMode('search')}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
              style={playerMode === 'search'
                ? { background: `linear-gradient(135deg, #ff0000cc, #cc0000)`, color: '#fff' }
                : { background: 'rgba(255,0,0,0.06)', color: 'rgba(255,80,80,0.55)', border: '1px solid rgba(255,0,0,0.12)' }}>
              🔴 YouTube
            </button>
          </div>

          {playerMode === 'embed' ? (
            <div className="mx-5 mb-5 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#000' }}>
              <iframe
                key={embedSrc}
                src={embedSrc}
                title={`${selectedPreacher.name} — ${selectedTopic.label}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <div className="px-5 pb-6 flex flex-col items-center gap-4">
              <p className="text-[11px] text-center mt-2" style={{ color: 'rgba(232,240,236,0.4)', fontFamily: 'Georgia, serif' }}>
                Opens YouTube search for {selectedPreacher.name}
              </p>
              <a
                href={`https://www.youtube.com/results?search_query=${query}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all"
                style={{ background: `linear-gradient(135deg, #ff0000cc, #cc0000)`, color: '#fff', boxShadow: '0 4px 14px rgba(204,0,0,0.4)', textDecoration: 'none' }}>
                Open in YouTube
              </a>
            </div>
          )}

          <div className="px-5 py-3 flex items-center justify-end" style={{ borderTop: `1px solid ${accentColor}0a` }}>
            <button onClick={() => { setSelectedPreacher(null); setSelectedTopic(null); setPlayerMode('embed'); }}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg"
              style={{ background: `${accentColor}0d`, color: `${accentColor}77` }}>
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Pick a preacher (after topic is selected)
  if (selectedTopic) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedTopic(null)}
          className="text-xs font-semibold" style={{ color: `${accentColor}88` }}>
          ← Change topic
        </button>
        <div className="text-center mb-2">
          <span className="text-3xl block mb-2">{selectedTopic.icon}</span>
          <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{selectedTopic.label}</h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(232,240,236,0.35)', fontFamily: 'Georgia, serif' }}>Who do you want to hear from?</p>
        </div>
        <div className="space-y-2">
          {ALL_PREACHERS.map(p => (
            <button key={p.name} onClick={() => setSelectedPreacher(p)}
              className="w-full text-left rounded-xl p-4 transition-all active:scale-[0.98]"
              style={(p as { featured?: boolean }).featured
                ? { background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}06)`, border: `1px solid ${accentColor}30` }
                : { background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}10` }}>
              <div className="flex items-center gap-3">
                {(p as { featured?: boolean }).featured && (
                  <span className="absolute right-4 top-3 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ background: `${accentColor}20`, color: accentColor }}>Home</span>
                )}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={(p as { featured?: boolean }).featured
                    ? { background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}10)`, border: `1px solid ${accentColor}35` }
                    : { background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                  <span style={{ fontSize: 16, color: accentColor }}>▶</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{p.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: `${accentColor}55` }}>{p.ministry}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 1: Pick a topic
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: accentColor }} />
          <h2 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Trusted Voices
          </h2>
        </div>
        <p className="text-[10px] ml-3" style={{ color: 'rgba(232,240,236,0.35)' }}>What are you looking for today?</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SERMON_TOPICS.map(topic => (
          <button key={topic.id} onClick={() => setSelectedTopic(topic)}
            className="text-left rounded-xl p-4 transition-all active:scale-[0.97] group relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: `${accentColor}08` }} />
            <div className="relative">
              <span className="text-2xl block mb-2">{topic.icon}</span>
              <p className="text-xs font-bold" style={{ color: 'rgba(232,240,236,0.75)' }}>{topic.label}</p>
              <p className="text-[9px] mt-1" style={{ color: 'rgba(232,240,236,0.25)' }}>{topic.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Worship Section ──────────────────────────────────────────────────────────

const WORSHIP_MOODS = [
  { category: 'Morning Worship',  icon: '🌅', desc: 'Start your day anchored in praise',            playlistId: '37i9dQZF1DXbJMiQ53rTyJ' },
  { category: 'Evening Prayer',   icon: '🌙', desc: 'Calm, reflective worship for winding down',    playlistId: '37i9dQZF1DWZqd5JAYS6iR' },
  { category: 'Study Music',      icon: '📚', desc: 'Instrumental and ambient worship for reading', playlistId: '37i9dQZF1DX9uKNf5jGX6m' },
  { category: 'Praise & Energy',  icon: '🔥', desc: 'Upbeat, powerful worship to lift your spirit', playlistId: '37i9dQZF1DXcb6CQIjdqKy' },
  { category: 'Hymns & Classics', icon: '🎹', desc: 'Timeless hymns and traditional worship',       playlistId: '37i9dQZF1DX4SBhb3fqCJd' },
];

function WorshipSection({ accentColor }: { accentColor: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: accentColor }} />
          <h2 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            Worship Music
          </h2>
        </div>
        <p className="text-[10px] ml-3" style={{ color: 'rgba(232,240,236,0.35)' }}>
          Curated playlists · Tap to expand and play
        </p>
      </div>

      {/* Playlist tiles — tap to expand the Spotify embed */}
      {WORSHIP_MOODS.map(mood => {
        const isOpen = expanded === mood.category;
        return (
          <div key={mood.category} className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: isOpen ? 'rgba(29,185,84,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isOpen ? 'rgba(29,185,84,0.25)' : `${accentColor}14`}`,
            }}>
            {/* Tile header — always visible, tap to open/close */}
            <button
              onClick={() => setExpanded(isOpen ? null : mood.category)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-4 transition-all active:scale-[0.99]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
                style={{ background: isOpen ? 'rgba(29,185,84,0.15)' : `${accentColor}0a` }}>
                {mood.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: isOpen ? '#1DB954' : '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {mood.category}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,240,236,0.35)' }}>{mood.desc}</p>
              </div>
              <span className="text-xs transition-transform shrink-0" style={{ color: isOpen ? '#1DB954' : `${accentColor}55`, transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                ▼
              </span>
            </button>

            {/* Spotify embed — only rendered when open */}
            {isOpen && (
              <div className="px-3 pb-3">
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${mood.playlistId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ borderRadius: 12 }}
                  title={`Spotify: ${mood.category}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
