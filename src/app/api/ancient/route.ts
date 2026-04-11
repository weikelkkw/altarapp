import { NextRequest, NextResponse } from 'next/server';

// Source URLs for each book on sacred-texts.com and wikisource
const SOURCES: Record<string, (chapter: number) => string> = {
  enoch: (ch) => `https://sacred-texts.com/bib/boe/boe${String(ch).padStart(3, '0')}.htm`,
  jubilees: (ch) => `https://sacred-texts.com/bib/jub/jub${String(ch).padStart(3, '0')}.htm`,
  thomas: (_ch) => `https://sacred-texts.com/chr/thomas.htm`,
  hermas: (ch) => `https://sacred-texts.com/chr/herm/herm${String(ch).padStart(2, '0')}.htm`,
};

function parseVerses(html: string): { verse: number; text: string }[] {
  // Remove script/style blocks
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s{2,}/g, ' ')
    .trim();

  const verses: { verse: number; text: string }[] = [];

  // Match patterns like "1. text" or "1:1 text" or verse numbers in text
  const patterns = [
    /\b(\d+)\.\s+([^0-9][^.]*?)(?=\s+\d+\.|$)/g,
    /\b(\d+)\s+([A-Z][^0-9]{20,}?)(?=\s+\d+\s+[A-Z]|$)/g,
  ];

  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    const found: { verse: number; text: string }[] = [];
    while ((match = pattern.exec(clean)) !== null) {
      const num = parseInt(match[1]);
      const text = match[2].trim();
      if (num > 0 && num < 300 && text.length > 10) {
        found.push({ verse: num, text });
      }
    }
    if (found.length >= 3) {
      return found.slice(0, 60);
    }
  }

  // Fallback: split into sentences and number them
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 30);
  return sentences.slice(0, 40).map((text, i) => ({ verse: i + 1, text: text.trim() }));
}

// Static fallback content for when fetching fails
const FALLBACKS: Record<string, Record<number, { verse: number; text: string }[]>> = {
  enoch: {
    1: [
      { verse: 1, text: 'The words of the blessing of Enoch, wherewith he blessed the elect and righteous, who will be living in the day of tribulation, when all the wicked and godless are to be removed.' },
      { verse: 2, text: 'And he took up his parable and said — Enoch a righteous man, whose eyes were opened by God, saw the vision of the Holy One in the heavens, which the angels showed me, and from them I heard everything, and from them I understood as I saw, but not for this generation, but for a remote one which is for to come.' },
      { verse: 3, text: 'Concerning the elect I said, and took up my parable concerning them: The Holy Great One will come forth from His dwelling.' },
      { verse: 4, text: 'And the eternal God will tread upon the earth, even on Mount Sinai, and appear from His camp, and appear in the strength of His might from the heaven of heavens.' },
      { verse: 5, text: 'And all shall be smitten with fear, and the Watchers shall quake, and great fear and trembling shall seize them unto the ends of the earth.' },
      { verse: 6, text: 'And the high mountains shall be shaken, and the high hills shall be made low, and shall melt like wax before the flame.' },
      { verse: 7, text: 'And the earth shall be wholly rent in sunder, and all that is upon the earth shall perish, and there shall be a judgement upon all men.' },
      { verse: 8, text: 'But with the righteous He will make peace, and will protect the elect, and mercy shall be upon them. And they shall all belong to God, and they shall be prospered, and they shall all be blessed.' },
      { verse: 9, text: 'And He will help them all, and light shall appear unto them, and He will make peace with them.' },
    ],
  },
  thomas: {
    1: [
      { verse: 1, text: 'These are the secret sayings which the living Jesus spoke and which Didymos Judas Thomas wrote down.' },
      { verse: 2, text: 'And He said, "Whoever finds the interpretation of these sayings will not experience death."' },
      { verse: 3, text: 'Jesus said, "Let him who seeks continue seeking until he finds. When he finds, he will become troubled. When he becomes troubled, he will be astonished, and he will rule over the All."' },
      { verse: 4, text: 'Jesus said, "The man old in days will not hesitate to ask a small child seven days old about the place of life, and he will live. For many who are first will become last, and they will become one and the same."' },
      { verse: 5, text: 'Jesus said, "Recognize what is in your sight, and that which is hidden from you will become plain to you. For there is nothing hidden which will not become manifest."' },
      { verse: 6, text: 'His disciples questioned Him and said to Him, "Do you want us to fast? How shall we pray? Shall we give alms? What diet shall we observe?" Jesus said, "Do not tell lies, and do not do what you hate, for all things are plain in the sight of Heaven."' },
      { verse: 7, text: 'Jesus said, "Blessed is the lion which becomes man when consumed by man; and cursed is the man whom the lion consumes, and the lion becomes man."' },
      { verse: 8, text: 'And He said, "The man is like a wise fisherman who cast his net into the sea and drew it up from the sea full of small fish. Among them the wise fisherman found a fine large fish. He threw all the small fish back into the sea and chose the large fish without difficulty."' },
    ],
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book') || 'enoch';
  const chapter = parseInt(searchParams.get('chapter') || '1');

  // Return static fallback if we have it
  if (FALLBACKS[book]?.[chapter]) {
    return NextResponse.json({ verses: FALLBACKS[book][chapter] });
  }

  const urlFn = SOURCES[book];
  if (!urlFn) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }

  try {
    const url = urlFn(chapter);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bible Study App)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Source returned ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const verses = parseVerses(html);

    if (verses.length === 0) {
      return NextResponse.json({ error: 'Could not parse content from source.' }, { status: 502 });
    }

    return NextResponse.json({ verses });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch from source.' }, { status: 502 });
  }
}
