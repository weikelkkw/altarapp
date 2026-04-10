export interface ApiBible {
  id: string;
  name: string;
  abbreviationLocal: string;
  group?: 'popular' | 'other';
  languageId?: string;
  languageName?: string;
}

export const SUPPORTED_LANGUAGES = [
  { id: 'eng', name: 'English',    flag: '🇺🇸' },
  { id: 'spa', name: 'Español',    flag: '🇪🇸' },
  { id: 'por', name: 'Português',  flag: '🇧🇷' },
  { id: 'fra', name: 'Français',   flag: '🇫🇷' },
  { id: 'deu', name: 'Deutsch',    flag: '🇩🇪' },
  { id: 'kor', name: '한국어',      flag: '🇰🇷' },
  { id: 'zho', name: '中文',        flag: '🇨🇳' },
  { id: 'arb', name: 'العربية',    flag: '🇸🇦' },
  { id: 'rus', name: 'Русский',    flag: '🇷🇺' },
  { id: 'hin', name: 'हिंदी',       flag: '🇮🇳' },
];

export interface ParsedVerse {
  verse: number;
  text: string;
}

export interface PassageSection {
  title: string | null;
  verses: ParsedVerse[];
}

export interface Passage {
  reference: string;
  translationName: string;
  verses: ParsedVerse[];
  sections?: PassageSection[];
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';

export interface UserIdentity {
  token: string;
  name: string;
  color: string;
  experienceLevel?: ExperienceLevel;
  bio?: string;
  profilePicture?: string;
  isPublic?: boolean;
  favoriteVerse?: string;
  testimony?: string;
  dateOfBirth?: string;
  location?: string;
  church?: string;
  savedDate?: string;
  baptismDate?: string;
  denomination?: string;
  // Fun / personal details
  favoriteBook?: string;
  spiritualGifts?: string[];
  prayerFor?: string; // what they want prayer for right now
  lifeVerse?: string; // the one verse that defines their walk
  mentor?: string;
  discipling?: string; // who they're mentoring
  ministryRole?: string;
  readingGoal?: number; // chapters per week goal
  favoriteHymn?: string;
  favoritePreacher?: string;
}

export interface AltarNote {
  id: string;
  user_token: string;
  user_name: string;
  avatar_color: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  created_at: string;
  reactions?: { emoji: string; user_token: string }[];
}

export interface BookDef {
  name: string;
  osis: string;
  chapters: number;
}

export const BOOKS: BookDef[] = [
  { name: 'Genesis',         osis: 'GEN', chapters: 50 },
  { name: 'Exodus',          osis: 'EXO', chapters: 40 },
  { name: 'Leviticus',       osis: 'LEV', chapters: 27 },
  { name: 'Numbers',         osis: 'NUM', chapters: 36 },
  { name: 'Deuteronomy',     osis: 'DEU', chapters: 34 },
  { name: 'Joshua',          osis: 'JOS', chapters: 24 },
  { name: 'Judges',          osis: 'JDG', chapters: 21 },
  { name: 'Ruth',            osis: 'RUT', chapters: 4  },
  { name: '1 Samuel',        osis: '1SA', chapters: 31 },
  { name: '2 Samuel',        osis: '2SA', chapters: 24 },
  { name: '1 Kings',         osis: '1KI', chapters: 22 },
  { name: '2 Kings',         osis: '2KI', chapters: 25 },
  { name: '1 Chronicles',    osis: '1CH', chapters: 29 },
  { name: '2 Chronicles',    osis: '2CH', chapters: 36 },
  { name: 'Ezra',            osis: 'EZR', chapters: 10 },
  { name: 'Nehemiah',        osis: 'NEH', chapters: 13 },
  { name: 'Esther',          osis: 'EST', chapters: 10 },
  { name: 'Job',             osis: 'JOB', chapters: 42 },
  { name: 'Psalms',          osis: 'PSA', chapters: 150},
  { name: 'Proverbs',        osis: 'PRO', chapters: 31 },
  { name: 'Ecclesiastes',    osis: 'ECC', chapters: 12 },
  { name: 'Song of Solomon', osis: 'SNG', chapters: 8  },
  { name: 'Isaiah',          osis: 'ISA', chapters: 66 },
  { name: 'Jeremiah',        osis: 'JER', chapters: 52 },
  { name: 'Lamentations',    osis: 'LAM', chapters: 5  },
  { name: 'Ezekiel',         osis: 'EZK', chapters: 48 },
  { name: 'Daniel',          osis: 'DAN', chapters: 12 },
  { name: 'Hosea',           osis: 'HOS', chapters: 14 },
  { name: 'Joel',            osis: 'JOL', chapters: 3  },
  { name: 'Amos',            osis: 'AMO', chapters: 9  },
  { name: 'Obadiah',         osis: 'OBA', chapters: 1  },
  { name: 'Jonah',           osis: 'JON', chapters: 4  },
  { name: 'Micah',           osis: 'MIC', chapters: 7  },
  { name: 'Nahum',           osis: 'NAM', chapters: 3  },
  { name: 'Habakkuk',        osis: 'HAB', chapters: 3  },
  { name: 'Zephaniah',       osis: 'ZEP', chapters: 3  },
  { name: 'Haggai',          osis: 'HAG', chapters: 2  },
  { name: 'Zechariah',       osis: 'ZEC', chapters: 14 },
  { name: 'Malachi',         osis: 'MAL', chapters: 4  },
  { name: 'Matthew',         osis: 'MAT', chapters: 28 },
  { name: 'Mark',            osis: 'MRK', chapters: 16 },
  { name: 'Luke',            osis: 'LUK', chapters: 24 },
  { name: 'John',            osis: 'JHN', chapters: 21 },
  { name: 'Acts',            osis: 'ACT', chapters: 28 },
  { name: 'Romans',          osis: 'ROM', chapters: 16 },
  { name: '1 Corinthians',   osis: '1CO', chapters: 16 },
  { name: '2 Corinthians',   osis: '2CO', chapters: 13 },
  { name: 'Galatians',       osis: 'GAL', chapters: 6  },
  { name: 'Ephesians',       osis: 'EPH', chapters: 6  },
  { name: 'Philippians',     osis: 'PHP', chapters: 4  },
  { name: 'Colossians',      osis: 'COL', chapters: 4  },
  { name: '1 Thessalonians', osis: '1TH', chapters: 5  },
  { name: '2 Thessalonians', osis: '2TH', chapters: 3  },
  { name: '1 Timothy',       osis: '1TI', chapters: 6  },
  { name: '2 Timothy',       osis: '2TI', chapters: 4  },
  { name: 'Titus',           osis: 'TIT', chapters: 3  },
  { name: 'Philemon',        osis: 'PHM', chapters: 1  },
  { name: 'Hebrews',         osis: 'HEB', chapters: 13 },
  { name: 'James',           osis: 'JAS', chapters: 5  },
  { name: '1 Peter',         osis: '1PE', chapters: 5  },
  { name: '2 Peter',         osis: '2PE', chapters: 3  },
  { name: '1 John',          osis: '1JN', chapters: 5  },
  { name: '2 John',          osis: '2JN', chapters: 1  },
  { name: '3 John',          osis: '3JN', chapters: 1  },
  { name: 'Jude',            osis: 'JUD', chapters: 1  },
  { name: 'Revelation',      osis: 'REV', chapters: 22 },
];

export const AVATAR_COLORS = [
  '#d4a853','#c084fc','#38bdf8','#4ade80','#f472b6',
  '#fb923c','#a78bfa','#34d399','#60a5fa','#f87171',
];

// Ordered by actual popularity — ESV/CSB/NASB not on api.bible (licensing)
export const POPULAR_ABBRS = ['NIV','KJV','NKJV','NLT','ASV','LSV','WEB','FBV','DRA','GNV'];

export const DAILY_VERSE_REFS = [
  'JHN.3.16','PSA.23.1','PHP.4.13','JER.29.11',
  'ROM.8.28','PRO.3.5','ISA.40.31',
];

/**
 * Strip markdown formatting (bold, italic, headers) from Claude's responses
 * and return clean text, or optionally convert to simple HTML.
 */
/**
 * Auto-complete a daily checklist item from anywhere in the app.
 * Call this when the user performs an action that maps to a checklist item.
 */
export function completeDailyCheck(itemId: string) {
  try {
    const key = `trace-daily-checks-${new Date().toDateString()}`;
    const stored = localStorage.getItem(key);
    const checks = stored ? JSON.parse(stored) : {};
    if (!checks[itemId]) {
      checks[itemId] = true;
      localStorage.setItem(key, JSON.stringify(checks));
      // Dispatch custom event so HomeTab can react
      window.dispatchEvent(new CustomEvent('trace-check-complete', { detail: { itemId } }));
    }
  } catch {}
}

export function cleanMarkdown(text: string): string {
  return text
    // Remove bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Remove italic: *text* or _text_
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1')
    // Remove headers: ### text
    .replace(/^#{1,4}\s+/gm, '')
    // Remove bullet points markers but keep the text
    .replace(/^[-*]\s+/gm, '• ')
    // Clean up any remaining stray asterisks
    .replace(/\*{1,3}/g, '')
    .trim();
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function parseVerseText(content: string): ParsedVerse[] {
  const parts = content.split(/\[(\d+)\]/);
  const verses: ParsedVerse[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] || '').replace(/\n+/g, ' ').trim();
    if (text) verses.push({ verse: parseInt(parts[i]), text });
  }
  return verses;
}

/**
 * Parse HTML content from api.bible (with include-titles=true) into sections.
 *
 * Actual API format:
 * - Section headings: <p class="s1">Title</p>  (or s2, s3, etc.)
 * - Verse numbers: <span data-number="N" data-sid="BOOK CH:V" class="v">N</span>
 * - Poetry lines split across <p class="q1"> / <p class="q2"> with data-vid attrs
 * - Continuation paragraphs: <p data-vid="BOOK CH:V" class="...">
 */
export function parseSectionedHtml(html: string): PassageSection[] {
  const sections: PassageSection[] = [];
  let currentSection: PassageSection = { title: null, verses: [] };

  // Split HTML into tokens: section headings and everything else
  // Section headings are <p class="s1">...</p> (or s2, s3, etc.)
  const tokens = html.split(/(<p[^>]*class="s\d+"[^>]*>[\s\S]*?<\/p>)/gi);

  for (const token of tokens) {
    // Check if this token is a section heading
    const sectionMatch = token.match(/<p[^>]*class="s\d+"[^>]*>([\s\S]*?)<\/p>/i);
    if (sectionMatch) {
      const title = sectionMatch[1].replace(/<[^>]*>/g, '').trim();
      if (title) {
        // Save previous section if it has verses
        if (currentSection.verses.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { title, verses: [] };
        continue;
      }
    }

    // Extract verses from this chunk using data-number attribute
    // Each verse starts with <span data-number="N" ...>
    const verseStarts = new RegExp(
      '<span[^>]*data-number="(\\d+)"[^>]*class="v"[^>]*>',
      'g'
    );

    // Find all verse start positions
    const versePositions: { num: number; startIdx: number }[] = [];
    let m;
    while ((m = verseStarts.exec(token)) !== null) {
      versePositions.push({ num: parseInt(m[1]), startIdx: m.index });
    }

    // For each verse, extract text from its start to the next verse start
    for (let i = 0; i < versePositions.length; i++) {
      const start = versePositions[i].startIdx;
      const end = i + 1 < versePositions.length ? versePositions[i + 1].startIdx : token.length;
      const chunk = token.slice(start, end);

      // Strip all HTML tags and clean up whitespace
      const text = chunk
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        // The verse number itself appears as text — remove the leading number
        .replace(/^\d+\s*/, '');

      const verseNum = versePositions[i].num;
      if (text && verseNum) {
        // If this verse already exists (poetry continuation), append text
        const existing = currentSection.verses.find(v => v.verse === verseNum);
        if (existing) {
          existing.text = (existing.text + ' ' + text).trim();
        } else {
          currentSection.verses.push({ verse: verseNum, text });
        }
      }
    }

    // Note: continuation <p data-vid="..."> elements (poetry q2 lines, etc.)
    // are already captured in the verse chunks above since they fall between
    // verse start markers, so no separate pass is needed.
  }

  // Push final section
  if (currentSection.verses.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

export function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Theme constants — Trace Church branding
export const T = {
  gold: '#00d084',           // Trace green (primary)
  goldFaint: 'rgba(0,208,132,0.08)',
  goldBorder: 'rgba(0,208,132,0.18)',
  cream: '#e8f0ec',
  dark: '#0a1410',
  bg: 'linear-gradient(160deg,#080f0c 0%,#0f1f18 50%,#080f0c 100%)',
  cardBg: 'rgba(255,255,255,0.025)',
  cardBorder: 'rgba(0,208,132,0.1)',
} as const;
