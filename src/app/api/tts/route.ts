import { NextRequest } from 'next/server';

// User-selectable narrator voices — custom-built voices with global accents
export const NARRATOR_VOICES = {
  male: [
    { id: '88cgASIFJ5iO94COdgBO', name: 'Bryan',   style: 'American · Steady' },
    { id: '10xsyNwkKUXCUZPaoXgm', name: 'Marcus',  style: 'Soul · Rich' },
    { id: '6r6oh5UtSHSD2htZsxdz', name: 'Oliver',  style: 'British · Refined' },
    { id: '957hysTL5aGCO5cymg1G', name: 'Declan',  style: 'Irish · Lyrical' },
    { id: 'UoBLa8QEkrOO2RHnuag7', name: 'Caleb',   style: 'Jamaican · Warm' },
    { id: 'uOVt3U9VZ1ymfF4QwI65', name: 'Ezra',    style: 'Ethiopian · Ancient' },
  ],
  female: [
    { id: 'uTnyvloPM4RqXGSsx4Du', name: 'Ashley',    style: 'American · Bright' },
    { id: 'XXoNoVctCSPJPEz3bIKW', name: 'Grace',     style: 'Soul · Warm' },
    { id: 'b55ueajWHRh5UzJ6mLZ8', name: 'Charlotte', style: 'British · Calm' },
    { id: 'US3Nq8hRtUadsih8oFTK', name: 'Zoe',       style: 'Australian · Clear' },
    { id: 'z7U1SjrEq4fDDDriOQEN', name: 'Katherine', style: 'Powerful & Commanding' },
    { id: 'Nyip1VgoS6bg9Vl30y8v', name: 'Verity',    style: 'Calm & Meditative' },
  ],
} as const;

// Default narrator fallback
export const DEFAULT_NARRATOR_ID = NARRATOR_VOICES.male[0].id; // Declan

// Pool of cycling voices for unnamed/minor characters
export const VOICE_POOL = [
  // Male
  'wAGzRVkxKEs8La0lmdrE', // Sully — Mature, Deep, Intriguing
  // 'JBFqnCBsd6RMkjVDRZzb', // George — already in NARRATOR_VOICES, removed to avoid duplicate cycling weight
  'pqHfZKP75CvOlQylNhV4', // Bill — Wise, Mature, Balanced
  'onwK4e9ZLuTAKqWW03F9', // Daniel — Steady Broadcaster
  'CwhRBWXzGAHq8TQ4Fs17', // Roger — Laid-Back, Resonant
  'EiNlNiXeDU1pqqOPrYMO', // John Doe — Deep
  'PIGsltMj3gFMR34aFDI3', // Jonathan Livingston — Calming
  'J2FGlQG8Gd7x8uEDt2H8', // The Pharaoh 4 — Narration
  'IKne3meq5aSn9XLyUdCD', // Charlie — Deep, Confident
  'n32p8A7EZ9CiVeRYpBY9', // Rajesh — Calm, Controlled
  'EkK5I93UQWFDigLMpZcX', // James — Husky, Engaging, Bold
  'cjVigY5qzO86Huf0OWal', // Eric — Smooth, Trustworthy
  'a4CnuaYbALRvW39mDitg', // Dan — Captivating, Inviting
  'bIHbv24MWmeRgasZH58o', // Will — Relaxed Optimist
  'jvcMcno3QtjOzGtfpjoI', // David — Deep Documentary
  'JoYo65swyP8hH6fVMeTO', // Old Wizard — Deep Storyteller
  '2tTjAGX0n5ajDmazDcWk', // Ezekiel — Raspy Narrator
  'G7ILShrCNLfmS0A37SXS', // Sam — Neutral, Friendly
  'EOVAuWqgSZN2Oel78Psj', // Aidan — Social Influencer
  'HAvvFKatz0uu0Fv55Riy', // Matthew Schmitz — Ancient Sage
  'SOYHLrjzK2X1ezoPC6cr', // Harry — Fierce Warrior
  'pNInz6obpgDQGcFmaJgB', // Adam — Dominant, Firm
  // Female
  'bD9maNcCuQQS75DGuteM', // Sadie — Calm, Gritty, Expressive
  '2qfp6zPuviqeCOZIE9RZ', // Trinity — Calm Affirmation
  'Nyip1VgoS6bg9Vl30y8v', // Lunaria — Calm Meditations
  'S9EGwlCtMF7VXtENq79v', // Emma Taylor — Gentle Thoughtful
  'OYTbf65OHHFELVut7v2H', // Hope — Natural, Clear, Calm
  'w9rPM8AIZle60Nbpw7nl', // Kate
  'z7U1SjrEq4fDDDriOQEN', // Vivie — Powerful, Commanding
  'eaNNqnkhfRYVtX7U7VLj', // Clara — Emotional, Dramatic
  'y3UNfL9XC5Bb5htg8B0q', // Beth — Bold, Smooth
  'pFZP5JQG7iQjIQuC4Bku', // Lily — Velvety Actress
  'Xb7hH8MSUJpSbSDYk0k2', // Alice — Clear, Engaging
  'FUfBrNit0NNZAwb58KWH', // Angela — Warm, Friendly
  'W7iR5kTNHozpIl2Jqq15', // Sia — Sharp, Clear, Confident
  'VYkr1IQzbDVb2GJoYAIl', // Kirsty — Youthful, Clear
  'cgSgspJ2msm6clMCkdW9', // Jessica — Playful, Bright, Warm
  'FGY2WhTYpPnrIDTdsKH5', // Laura — Enthusiast, Quirky
];

// Named Bible character voices — custom-built on ElevenLabs, locked, not user-selectable
export const CHARACTER_VOICES: Record<string, { id: string; name: string }> = {
  // Core divine / NT
  god:          { id: 'hGcKYyq0Hka7pL6l36My', name: 'God' },
  jesus:        { id: 'g4GMq7xzvknrAbY3990D', name: 'Jesus' },
  satan:        { id: 'UePj1uyxM9VCGHulPaXd', name: 'Satan' },
  angel:        { id: 'nigzyAiRQ1R62meUMcEL',  name: 'Gabriel' },       // custom Gabriel
  // Genesis
  adam:         { id: 'eqy34GuW5IbW6Tra1QLQ',  name: 'Adam' },          // custom Adam
  eve:          { id: 'AogjBQgTogQ6f9stjB9y',  name: 'Eve' },           // custom Eve
  cain:         { id: 'o1tMOrOXcgcy7CgqoSPa',  name: 'Cain' },          // custom Cain
  abel:         { id: 'W6DJFL0o1p5XZ6dIh48q',  name: 'Abel' },          // custom Abel
  noah:         { id: 'c59U1DHkNtr3OeZHTaDV',  name: 'Noah' },          // custom Noah
  // Patriarchs & Law
  abraham:      { id: 'X817UPobDtP009fiwGUV',  name: 'Abraham' },
  moses:        { id: '2KdX0hc2wgdi90CwXwAf',  name: 'Moses' },
  // Kingdom era
  david:        { id: 'hmkGw0UdycTuxhnJhCfn',  name: 'David' },         // custom David
  solomon:      { id: 'JbowlNNBEPFlfcA5gWVo',  name: 'Solomon' },
  goliath:      { id: 'lSRtTBwbjZVqPe5ZPieh',  name: 'Goliath' },
  elijah:       { id: 'Qv7srFbXYJKy1yWfE92j',  name: 'Elijah' },
  // Prophets
  isaiah:       { id: 'azdbHXL9O1LPs8HA24LQ',  name: 'Isaiah' },        // custom Isaiah
  jeremiah:     { id: 'vjBB8wuK6nOIXslyXTFM',  name: 'Jeremiah' },      // custom Jeremiah
  // NT figures
  john_baptist: { id: 'pePKCedlmJndSaKbsHX8',  name: 'John the Baptist' },
  peter:        { id: 'bHnLA9pAEauvBMeYqzrB',  name: 'Peter' },
  paul:         { id: 'XgJQZL5xcaMTpofNgw1d',  name: 'Paul' },
  mary:         { id: 'ak7RAP2Dn1VTGTsoegEr',  name: 'Mary' },
  judas:        { id: 'PIwz7GNccx2uMlXpHtQn',  name: 'Judas' },
  pilate:       { id: 'vFQLpboq7x0QdjuUGQpM',  name: 'Pilate' },        // custom Pilate
  thomas:       { id: 'nRq3xdUh2LUIhiLZUqBo',  name: 'Thomas' },        // custom Thomas
  // OT women
  ruth:         { id: 'mrLb4ILeZxayeoTqeGW1',  name: 'Ruth' },          // custom Ruth
  esther:       { id: 'Q4D5cnOd1cfOXFdZpp3e',  name: 'Esther' },        // custom Esther
};

// Character detection — identify which Bible figure is speaking
// Shorthand verb group used in every pattern — covers KJV (saith/spake) and modern (said/spoke)
// "saith" = KJV present "he saith", "spake" = KJV past "he spake"
// "sayeth" = archaic variant, "sware" = KJV "swore"
const _SV  = String.raw`said|saith|spake|spoke|declared|replied|answered|told|cried|asked`;
const _SVG = String.raw`said|saith|spake|spoke|declared|called|commanded|answered|replied|told|cried|asked`;

const CHARACTER_PATTERNS: Array<{ key: keyof typeof CHARACTER_VOICES; patterns: RegExp[] }> = [
  {
    key: 'god',
    patterns: [
      // "the LORD said", "God saith", "Thus saith the LORD", "Thus says the Lord"
      new RegExp(String.raw`(?:god|the\s+lord|lord\s+god|yahweh|jehovah)\s+(?:${_SVG}|warned|proclaimed)`, 'i'),
      // "said the LORD", "saith the Lord God"
      new RegExp(String.raw`(?:said|saith|spake|spoke|declared|commanded)\s+(?:the\s+)?(?:lord|god|yahweh|jehovah)`, 'i'),
      // "Thus saith the LORD" / "Thus says the LORD" — verb before subject
      /thus\s+(?:saith|said|says)\s+(?:the\s+lord|the\s+lord\s+god|god|yahweh|jehovah)/i,
    ],
  },
  {
    key: 'jesus',
    patterns: [
      new RegExp(String.raw`(?:jesus|christ)\s+(?:${_SV}|wept|prayed|commanded|warned|taught|saith|cried)`, 'i'),
      new RegExp(String.raw`(?:said|saith|spake|replied|answered|declared|told)\s+(?:to\s+them\s+)?(?:jesus|christ)`, 'i'),
    ],
  },
  {
    key: 'satan',
    patterns: [
      new RegExp(String.raw`(?:satan|the\s+devil|lucifer|the\s+serpent|the\s+tempter|the\s+adversary)\s+(?:${_SV}|tempted)`, 'i'),
    ],
  },
  {
    key: 'moses',
    patterns: [
      new RegExp(String.raw`moses\s+(?:${_SVG}|prayed|proclaimed)`, 'i'),
      new RegExp(String.raw`(?:said|saith|spake|replied|answered|declared|told)\s+(?:to\s+them\s+)?moses`, 'i'),
    ],
  },
  {
    key: 'david',
    patterns: [
      new RegExp(String.raw`david\s+(?:${_SV}|sang|prayed|lamented)`, 'i'),
    ],
  },
  {
    key: 'solomon',
    patterns: [
      new RegExp(String.raw`solomon\s+(?:${_SV}|wrote|spake)`, 'i'),
    ],
  },
  {
    key: 'elijah',
    patterns: [
      new RegExp(String.raw`elijah\s+(?:${_SV}|prayed)`, 'i'),
    ],
  },
  {
    key: 'john_baptist',
    patterns: [
      // Require "the baptist" to avoid matching John the apostle / John Mark
      /john\s+the\s+baptist\s+(?:said|saith|spake|spoke|replied|answered|told|declared|cried|preached)/i,
      // "he answered … John the Baptist saying" — reversed attribution with "the baptist" required
      /(?:said|saith|spake|replied|answered|declared)\s+john\s+the\s+baptist/i,
      // Luke 3 / Matt 3: "he said unto them" with John explicitly named earlier in passage
      // handled by INTRO_SPEAKER_PATTERNS below
    ],
  },
  {
    key: 'peter',
    patterns: [
      new RegExp(String.raw`(?:peter|simon\s+peter)\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'paul',
    patterns: [
      new RegExp(String.raw`(?:paul|saul)\s+(?:${_SV}|wrote|preached|testified)`, 'i'),
    ],
  },
  {
    key: 'judas',
    patterns: [
      new RegExp(String.raw`judas\s+(?:${_SV}|betrayed)`, 'i'),
    ],
  },
  {
    key: 'pilate',
    patterns: [
      new RegExp(String.raw`pilate\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'mary',
    patterns: [
      new RegExp(String.raw`mary\s+(?:${_SV}|sang)`, 'i'),
    ],
  },
  {
    key: 'angel',
    patterns: [
      new RegExp(String.raw`(?:the\s+)?(?:angel|gabriel)\s+(?:${_SVG}|appeared)`, 'i'),
      new RegExp(String.raw`(?:the\s+)?angel\s+of\s+the\s+lord\s+(?:${_SVG})`, 'i'),
    ],
  },
  {
    key: 'abraham',
    patterns: [
      new RegExp(String.raw`(?:abraham|abram)\s+(?:${_SV}|prayed)`, 'i'),
    ],
  },
  {
    key: 'goliath',
    patterns: [
      new RegExp(String.raw`(?:goliath|the\s+philistine)\s+(?:${_SV}|shouted)`, 'i'),
    ],
  },
  {
    key: 'eve',
    patterns: [
      new RegExp(String.raw`(?:eve|the\s+woman)\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'adam',
    patterns: [
      new RegExp(String.raw`(?:adam|the\s+man)\s+(?:${_SV})`, 'i'),
      new RegExp(String.raw`(?:said|saith|spake|replied|answered|declared)\s+(?:to\s+them\s+)?adam`, 'i'),
    ],
  },
  {
    key: 'noah',
    patterns: [
      new RegExp(String.raw`noah\s+(?:${_SV}|prayed)`, 'i'),
      new RegExp(String.raw`(?:said|saith|spake|replied|answered|declared)\s+(?:to\s+them\s+)?noah`, 'i'),
    ],
  },
  {
    key: 'cain',
    patterns: [
      new RegExp(String.raw`cain\s+(?:${_SV})`, 'i'),
      /(?:said|saith|spake|replied|answered|declared)\s+(?:to\s+)?(?:the\s+lord\s+)?(?:by\s+)?cain/i,
    ],
  },
  {
    key: 'abel',
    patterns: [
      new RegExp(String.raw`abel\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'isaiah',
    patterns: [
      new RegExp(String.raw`isaiah\s+(?:${_SV}|wrote|prophesied)`, 'i'),
    ],
  },
  {
    key: 'jeremiah',
    patterns: [
      new RegExp(String.raw`jeremiah\s+(?:${_SV}|wrote|prophesied)`, 'i'),
    ],
  },
  {
    key: 'thomas',
    patterns: [
      new RegExp(String.raw`(?:thomas|doubting\s+thomas)\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'ruth',
    patterns: [
      new RegExp(String.raw`ruth\s+(?:${_SV})`, 'i'),
    ],
  },
  {
    key: 'esther',
    patterns: [
      new RegExp(String.raw`esther\s+(?:${_SV})`, 'i'),
    ],
  },
];

// Chapters where a character is the primary/sole speaker — used when the text uses
// "he/I/we" instead of the character's name, so regex patterns can't catch them.
// bookIndex is 0-based per the BOOKS array in types.ts.
//
// ── Checked character by character ────────────────────────────────────────────
// ✅ JESUS   — Sermon on the Mount, Parables discourses, Olivet, Upper Room, Rev letters
// ✅ MOSES   — Deuteronomy farewell speeches (chs 1-33, "I" / "he" throughout)
// ✅ PAUL    — All Pauline epistles (letters written as "I Paul" / first-person)
// ✅ PETER   — 1 & 2 Peter (letters written first-person)
// ✅ SOLOMON — Proverbs, Ecclesiastes, Song of Solomon
// ✅ DAVID   — Confirmed Davidic Psalms (heading "A Psalm of David")
// ✅ GOD     — Job 38-41 (God speaks from the whirlwind; "he" / indirect throughout)
// ✅ ELIJAH  — 1 Kings 19 (flees to Horeb; "he said" / "he arose" without name in many vv)
// ──────────────────────────────────────────────────────────────────────────────
const CHAPTER_SPEAKER_LOOKUP: Partial<Record<keyof typeof CHARACTER_VOICES, Record<number, number[]>>> = {

  // ── JESUS ─────────────────────────────────────────────────────────────────
  jesus: {
    39: [5, 6, 7, 10, 11, 13, 18, 23, 24, 25],          // Matthew: Sermon (5-7), Mission (10), John reply (11), Parables (13), Community (18), Woes+Olivet (23-25)
    40: [4, 7, 9, 10, 12, 13],                           // Mark: Parables (4), Pharisee debate (7), Transfig teaching (9), Divorce+children (10), Temple (12), Olivet (13)
    41: [4, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], // Luke: Synagogue (4), Sermon (6), Sending 70 (10), Teaching chs (11-17), Parables+prayer (18), Zacchaeus (19), Temple (20), Olivet (21)
    42: [3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17],  // John: Nicodemus (3), Samaritan (4), Discourses (5-10), Upper Room (13-17)
    65: [1, 2, 3, 21, 22],                               // Revelation: Letters to churches (1-3), New Creation declarations (21-22)
  },

  // ── MOSES ─────────────────────────────────────────────────────────────────
  moses: {
    // Deuteronomy 1-33: three long farewell speeches — "I" / "he said" throughout
    4: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33],
  },

  // ── PAUL ──────────────────────────────────────────────────────────────────
  paul: {
    44: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],        // Romans
    45: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],        // 1 Corinthians
    46: [1,2,3,4,5,6,7,8,9,10,11,12,13],                  // 2 Corinthians
    47: [1,2,3,4,5,6],                                    // Galatians
    48: [1,2,3,4,5,6],                                    // Ephesians
    49: [1,2,3,4],                                        // Philippians
    50: [1,2,3,4],                                        // Colossians
    51: [1,2,3,4,5],                                      // 1 Thessalonians
    52: [1,2,3],                                          // 2 Thessalonians
    53: [1,2,3,4,5,6],                                    // 1 Timothy
    54: [1,2,3,4],                                        // 2 Timothy
    55: [1,2,3],                                          // Titus
    56: [1],                                              // Philemon
  },

  // ── PETER ─────────────────────────────────────────────────────────────────
  peter: {
    59: [1,2,3,4,5],                                      // 1 Peter
    60: [1,2,3],                                          // 2 Peter
  },

  // ── SOLOMON ───────────────────────────────────────────────────────────────
  solomon: {
    19: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29], // Proverbs 1-29 (chs 30-31 are Agur & Lemuel)
    20: [1,2,3,4,5,6,7,8,9,10,11,12],                     // Ecclesiastes
    21: [1,2,3,4,5,6,7,8],                                // Song of Solomon
  },

  // ── DAVID ─────────────────────────────────────────────────────────────────
  david: {
    // Confirmed "A Psalm of David" headings (KJV/most translations)
    18: [
      3,4,5,6,7,8,9,
      11,12,13,14,15,16,17,18,19,20,21,22,23,24,
      25,26,27,28,29,30,31,32,
      34,35,36,37,38,39,40,41,
      51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,
      68,69,70,
      86,
      101,103,
      108,109,110,
      122,124,
      131,133,
      138,139,140,141,142,143,144,145,
    ],
  },

  // ── GOD ───────────────────────────────────────────────────────────────────
  god: {
    17: [38, 39, 40, 41],                                 // Job: God speaks from the whirlwind — "he said" / "who hath" throughout
  },

  // ── ELIJAH ────────────────────────────────────────────────────────────────
  elijah: {
    10: [19],                                             // 1 Kings 19: Horeb journey — "he arose / he said / he came" (name sparse in many vv)
  },

  // ── JOHN THE BAPTIST ──────────────────────────────────────────────────────
  // ✅ JOHN BAPTIST: Matt 3 + Luke 3 preach using "he said" without naming him per verse
  john_baptist: {
    39: [3],                                              // Matthew 3: wilderness preaching — "he said unto them" throughout
    41: [3],                                              // Luke 3: same — "he answered and said" (name only appears in v16 "John answered")
  },
};

// ── Crafted Experience — era-curated narrator voices per book ─────────────────
//
// Each book gets two voices that alternate by chapter (even chapters → voice A,
// odd chapters → voice B). This creates a curated "performed Bible" feel while
// guaranteeing no two consecutive chapters share the same voice.
//
// Voice sources: VOICE_POOL + CHARACTER_VOICES for epistles where the author's
// own voice fits (Paul's letters narrated by Paul, Peter's by Peter, etc.)
//
// Book indices match the BOOKS array in types.ts (0 = Genesis … 65 = Revelation).
//
export const CRAFTED_BOOK_VOICES: Record<number, [string, string]> = {
  //── Creation & Patriarchs ────────────────────────────────────────────────────
  0:  ['wAGzRVkxKEs8La0lmdrE', 'JoYo65swyP8hH6fVMeTO'], // Genesis: Sully (ancient/deep) + Old Wizard
  //── Law Era ──────────────────────────────────────────────────────────────────
  1:  ['pqHfZKP75CvOlQylNhV4', 'J2FGlQG8Gd7x8uEDt2H8'], // Exodus: Bill (wise) + The Pharaoh (narration)
  2:  ['PIGsltMj3gFMR34aFDI3', 'pqHfZKP75CvOlQylNhV4'], // Leviticus: Jonathan (calming) + Bill
  3:  ['onwK4e9ZLuTAKqWW03F9', 'J2FGlQG8Gd7x8uEDt2H8'], // Numbers: Daniel (broadcaster) + The Pharaoh
  4:  ['pqHfZKP75CvOlQylNhV4', 'HAvvFKatz0uu0Fv55Riy'], // Deuteronomy: Bill + Matthew Schmitz (ancient sage)
  //── Conquest & Early Settlement ──────────────────────────────────────────────
  5:  ['SOYHLrjzK2X1ezoPC6cr', 'CwhRBWXzGAHq8TQ4Fs17'], // Joshua: Harry (fierce warrior) + Roger (resonant)
  6:  ['SOYHLrjzK2X1ezoPC6cr', 'EiNlNiXeDU1pqqOPrYMO'], // Judges: Harry + John Doe (deep)
  7:  ['OYTbf65OHHFELVut7v2H', 'FUfBrNit0NNZAwb58KWH'], // Ruth: Hope (natural/calm) + Angela (warm) — feminine story
  //── United Kingdom ───────────────────────────────────────────────────────────
  8:  ['jvcMcno3QtjOzGtfpjoI', 'EiNlNiXeDU1pqqOPrYMO'], // 1 Samuel: David/documentary + John Doe
  9:  ['jvcMcno3QtjOzGtfpjoI', 'CwhRBWXzGAHq8TQ4Fs17'], // 2 Samuel: David/documentary + Roger
  //── Kingdom Era ──────────────────────────────────────────────────────────────
  10: ['J2FGlQG8Gd7x8uEDt2H8', 'onwK4e9ZLuTAKqWW03F9'], // 1 Kings: The Pharaoh + Daniel
  11: ['J2FGlQG8Gd7x8uEDt2H8', 'EiNlNiXeDU1pqqOPrYMO'], // 2 Kings: The Pharaoh + John Doe
  12: ['onwK4e9ZLuTAKqWW03F9', 'cjVigY5qzO86Huf0OWal'], // 1 Chronicles: Daniel + Eric (trustworthy)
  13: ['onwK4e9ZLuTAKqWW03F9', 'cjVigY5qzO86Huf0OWal'], // 2 Chronicles: Daniel + Eric
  //── Exile & Return ───────────────────────────────────────────────────────────
  14: ['cjVigY5qzO86Huf0OWal', 'n32p8A7EZ9CiVeRYpBY9'], // Ezra: Eric + Rajesh (calm/controlled)
  15: ['n32p8A7EZ9CiVeRYpBY9', 'cjVigY5qzO86Huf0OWal'], // Nehemiah: Rajesh + Eric
  16: ['S9EGwlCtMF7VXtENq79v', 'OYTbf65OHHFELVut7v2H'], // Esther: Emma Taylor (gentle) + Hope — feminine story
  //── Wisdom Literature ────────────────────────────────────────────────────────
  17: ['HAvvFKatz0uu0Fv55Riy', '2tTjAGX0n5ajDmazDcWk'], // Job: Matthew Schmitz (ancient sage) + Ezekiel (raspy — suffering)
  18: ['jvcMcno3QtjOzGtfpjoI', 'bIHbv24MWmeRgasZH58o'], // Psalms: David/documentary + Will (relaxed optimist)
  19: ['a4CnuaYbALRvW39mDitg', 'G7ILShrCNLfmS0A37SXS'], // Proverbs: Dan (captivating) + Sam (neutral/friendly)
  20: ['a4CnuaYbALRvW39mDitg', 'HAvvFKatz0uu0Fv55Riy'], // Ecclesiastes: Dan + Matthew Schmitz (philosophical)
  21: ['Nyip1VgoS6bg9Vl30y8v', 'pFZP5JQG7iQjIQuC4Bku'], // Song of Solomon: Lunaria (meditative) + Lily (velvety actress)
  //── Major Prophets ───────────────────────────────────────────────────────────
  22: ['IKne3meq5aSn9XLyUdCD', 'EkK5I93UQWFDigLMpZcX'], // Isaiah: Charlie (deep/confident) + James (bold)
  23: ['EkK5I93UQWFDigLMpZcX', 'IKne3meq5aSn9XLyUdCD'], // Jeremiah: James + Charlie
  24: ['2tTjAGX0n5ajDmazDcWk', 'eaNNqnkhfRYVtX7U7VLj'], // Lamentations: Ezekiel (raspy) + Clara (emotional/dramatic)
  25: ['IKne3meq5aSn9XLyUdCD', 'pNInz6obpgDQGcFmaJgB'], // Ezekiel: Charlie + Adam (dominant/firm)
  26: ['n32p8A7EZ9CiVeRYpBY9', 'J2FGlQG8Gd7x8uEDt2H8'], // Daniel: Rajesh + The Pharaoh (royal court feel)
  //── Minor Prophets ───────────────────────────────────────────────────────────
  27: ['PIGsltMj3gFMR34aFDI3', 'bD9maNcCuQQS75DGuteM'], // Hosea: Jonathan (calming) + Sadie (expressive — love/heartbreak)
  28: ['pNInz6obpgDQGcFmaJgB', 'PIGsltMj3gFMR34aFDI3'], // Joel: Adam (firm) + Jonathan
  29: ['EkK5I93UQWFDigLMpZcX', 'pNInz6obpgDQGcFmaJgB'], // Amos: James (bold) + Adam
  30: ['IKne3meq5aSn9XLyUdCD', 'EkK5I93UQWFDigLMpZcX'], // Obadiah: Charlie + James
  31: ['G7ILShrCNLfmS0A37SXS', 'bIHbv24MWmeRgasZH58o'], // Jonah: Sam (neutral) + Will (relaxed — ironic tone fits)
  32: ['PIGsltMj3gFMR34aFDI3', 'n32p8A7EZ9CiVeRYpBY9'], // Micah: Jonathan + Rajesh
  33: ['pNInz6obpgDQGcFmaJgB', 'IKne3meq5aSn9XLyUdCD'], // Nahum: Adam + Charlie (fierce judgment)
  34: ['HAvvFKatz0uu0Fv55Riy', '2tTjAGX0n5ajDmazDcWk'], // Habakkuk: Matthew Schmitz + Ezekiel (wrestling with God)
  35: ['pNInz6obpgDQGcFmaJgB', 'EkK5I93UQWFDigLMpZcX'], // Zephaniah: Adam + James
  36: ['cjVigY5qzO86Huf0OWal', 'G7ILShrCNLfmS0A37SXS'], // Haggai: Eric + Sam
  37: ['HAvvFKatz0uu0Fv55Riy', 'PIGsltMj3gFMR34aFDI3'], // Zechariah: Matthew Schmitz + Jonathan (visions/prophecy)
  38: ['IKne3meq5aSn9XLyUdCD', 'pNInz6obpgDQGcFmaJgB'], // Malachi: Charlie + Adam (final OT warning)
  //── Gospels ──────────────────────────────────────────────────────────────────
  39: ['EOVAuWqgSZN2Oel78Psj', 'bIHbv24MWmeRgasZH58o'], // Matthew: Aidan (narrative) + Will (warm)
  40: ['EOVAuWqgSZN2Oel78Psj', 'cjVigY5qzO86Huf0OWal'], // Mark: Aidan + Eric (fast-paced, urgent)
  41: ['G7ILShrCNLfmS0A37SXS', 'cjVigY5qzO86Huf0OWal'], // Luke: Sam + Eric (scholarly historian feel)
  42: ['a4CnuaYbALRvW39mDitg', 'PIGsltMj3gFMR34aFDI3'], // John: Dan (captivating) + Jonathan (mystical/meditative)
  //── Acts ─────────────────────────────────────────────────────────────────────
  43: ['EOVAuWqgSZN2Oel78Psj', 'onwK4e9ZLuTAKqWW03F9'], // Acts: Aidan + Daniel (documentary/broadcast)
  //── Pauline Epistles — Paul's own voice as primary narrator ──────────────────
  44: ['XgJQZL5xcaMTpofNgw1d', 'cjVigY5qzO86Huf0OWal'], // Romans: Paul + Eric
  45: ['XgJQZL5xcaMTpofNgw1d', 'EkK5I93UQWFDigLMpZcX'], // 1 Corinthians: Paul + James
  46: ['XgJQZL5xcaMTpofNgw1d', 'IKne3meq5aSn9XLyUdCD'], // 2 Corinthians: Paul + Charlie
  47: ['XgJQZL5xcaMTpofNgw1d', 'pNInz6obpgDQGcFmaJgB'], // Galatians: Paul + Adam
  48: ['XgJQZL5xcaMTpofNgw1d', 'PIGsltMj3gFMR34aFDI3'], // Ephesians: Paul + Jonathan
  49: ['XgJQZL5xcaMTpofNgw1d', 'bIHbv24MWmeRgasZH58o'], // Philippians: Paul + Will (joy-filled)
  50: ['XgJQZL5xcaMTpofNgw1d', 'cjVigY5qzO86Huf0OWal'], // Colossians: Paul + Eric
  51: ['XgJQZL5xcaMTpofNgw1d', 'G7ILShrCNLfmS0A37SXS'], // 1 Thessalonians: Paul + Sam
  52: ['XgJQZL5xcaMTpofNgw1d', 'pNInz6obpgDQGcFmaJgB'], // 2 Thessalonians: Paul + Adam
  53: ['XgJQZL5xcaMTpofNgw1d', 'cjVigY5qzO86Huf0OWal'], // 1 Timothy: Paul + Eric
  54: ['XgJQZL5xcaMTpofNgw1d', 'IKne3meq5aSn9XLyUdCD'], // 2 Timothy: Paul + Charlie
  55: ['XgJQZL5xcaMTpofNgw1d', 'n32p8A7EZ9CiVeRYpBY9'], // Titus: Paul + Rajesh
  56: ['XgJQZL5xcaMTpofNgw1d', 'G7ILShrCNLfmS0A37SXS'], // Philemon: Paul + Sam
  //── General Epistles ─────────────────────────────────────────────────────────
  57: ['HAvvFKatz0uu0Fv55Riy', 'IKne3meq5aSn9XLyUdCD'], // Hebrews: Matthew Schmitz + Charlie (theological depth)
  58: ['EkK5I93UQWFDigLMpZcX', 'cjVigY5qzO86Huf0OWal'], // James: James (bold/practical) + Eric
  59: ['bHnLA9pAEauvBMeYqzrB', 'cjVigY5qzO86Huf0OWal'], // 1 Peter: Peter's own voice + Eric
  60: ['bHnLA9pAEauvBMeYqzrB', 'IKne3meq5aSn9XLyUdCD'], // 2 Peter: Peter + Charlie
  61: ['PIGsltMj3gFMR34aFDI3', 'a4CnuaYbALRvW39mDitg'], // 1 John: Jonathan (loving/meditative) + Dan
  62: ['PIGsltMj3gFMR34aFDI3', 'G7ILShrCNLfmS0A37SXS'], // 2 John: Jonathan + Sam
  63: ['PIGsltMj3gFMR34aFDI3', 'G7ILShrCNLfmS0A37SXS'], // 3 John: Jonathan + Sam
  64: ['pNInz6obpgDQGcFmaJgB', 'IKne3meq5aSn9XLyUdCD'], // Jude: Adam (urgent/firm) + Charlie
  //── Revelation ───────────────────────────────────────────────────────────────
  65: ['JoYo65swyP8hH6fVMeTO', '2tTjAGX0n5ajDmazDcWk'], // Revelation: Old Wizard + Ezekiel (epic/raspy — apocalyptic)
};

// Return the crafted narrator voice for a given book + chapter.
// Even chapters → voices[0], odd chapters → voices[1].
// Falls back to DEFAULT_NARRATOR_ID if book not mapped.
export function getCraftedNarrator(bookIndex: number, chapter: number): string {
  const pair = CRAFTED_BOOK_VOICES[bookIndex];
  if (!pair) return DEFAULT_NARRATOR_ID;
  return chapter % 2 === 0 ? pair[0] : pair[1];
}

// When a verse introduces a character by name in narration and then has them speak
// via a pronoun ("he said / she said"), we can infer the speaker.
// Example: "Now the serpent was more subtil… And he said unto the woman, …" → Satan
// Only triggers when the name appears BEFORE the pronoun-speech pattern.
const INTRO_SPEAKER_PATTERNS: Array<{ key: keyof typeof CHARACTER_VOICES; nameRe: RegExp }> = [
  { key: 'satan',        nameRe: /\bthe\s+serpent\b/i },
  { key: 'god',          nameRe: /\bthe\s+lord\s+god\b|\blord\s+god\b|\bthe\s+lord\b|\bGod\b/i },
  { key: 'jesus',        nameRe: /\bjesus\b|\bchrist\b/i },
  { key: 'adam',         nameRe: /\badam\b|\bthe\s+man\b/i },
  { key: 'eve',          nameRe: /\bthe\s+woman\b|\beve\b/i },
  { key: 'cain',         nameRe: /\bcain\b/i },
  { key: 'abel',         nameRe: /\babel\b/i },
  { key: 'noah',         nameRe: /\bnoah\b/i },
  { key: 'abraham',      nameRe: /\babraham\b|\babram\b/i },
  { key: 'moses',        nameRe: /\bmoses\b/i },
  { key: 'david',        nameRe: /\bdavid\b/i },
  { key: 'peter',        nameRe: /\bpeter\b|\bsimon\s+peter\b/i },
  { key: 'paul',         nameRe: /\bpaul\b|\bsaul\b/i },
  { key: 'angel',        nameRe: /\bthe\s+angel\b|\bgabriel\b/i },
  { key: 'elijah',       nameRe: /\belijah\b/i },
  { key: 'john_baptist', nameRe: /\bjohn\s+the\s+baptist\b/i },
];
const PRONOUN_SPEECH_RE = /\b(?:he|she|it)\s+(?:said|saith|answered|replied|spoke|spake|declared|asked|cried|wept)\b/i;

// Detect which character is speaking in a verse.
//
// Pass 1 — checks the FIRST ~100 chars for direct attribution ("And the woman said …")
//   so that indirect speech mid-verse (e.g. Eve quoting "God hath said, …")
//   does NOT falsely trigger God's voice.
//
// Pass 2 — checks the FULL verse for intro-speaker pattern:
//   "[Character named in narration] … he/she said" → infer speaker from the named character.
//   e.g. "Now the serpent was more subtil … And he said" → Satan.
//
// Returns { key, voiceId } so carry-forward can track speaker identity, or null.
export function detectCharacterVoice(text: string): { key: string; voiceId: string } | null {
  // Pass 1: direct attribution in opening clause
  const check = text.slice(0, 100);
  for (const { key, patterns } of CHARACTER_PATTERNS) {
    if (patterns.some(p => p.test(check))) {
      const voice = CHARACTER_VOICES[key as keyof typeof CHARACTER_VOICES];
      if (voice) return { key: key as string, voiceId: voice.id };
    }
  }

  // Pass 2: intro-speaker — character named in narration before "he/she said"
  // e.g. "Now the serpent was more subtil … And he said" → Satan
  // Skip if the name is the OBJECT of a preposition ("To the woman he said" → not Eve)
  const pronounMatch = PRONOUN_SPEECH_RE.exec(text);
  if (pronounMatch) {
    for (const { key, nameRe } of INTRO_SPEAKER_PATTERNS) {
      const nameMatch = nameRe.exec(text);
      if (nameMatch && nameMatch.index < pronounMatch.index) {
        const preceding = text.slice(0, nameMatch.index).toLowerCase().trimEnd();
        if (/\b(?:to|for|with|from|about|against|before|after|of|by|unto|at|in|on)\s*$/.test(preceding)) {
          continue; // name is object of preposition, not the speaker
        }
        const voice = CHARACTER_VOICES[key as keyof typeof CHARACTER_VOICES];
        if (voice) return { key: key as string, voiceId: voice.id };
      }
    }
  }

  return null;
}

// Look up whether a whole chapter is dominated by one speaker (e.g. Moses in Deut,
// God in Job 38-41, David psalms).  Used as a fallback when per-verse detection
// finds no explicit attribution — handles long monologue chapters that would
// otherwise exhaust the carry-forward limit.
function getChapterSpeakerVoice(bookIndex: number, chapter: number): { key: string; voiceId: string } | null {
  for (const [charKey, chapterMap] of Object.entries(CHAPTER_SPEAKER_LOOKUP)) {
    const chapters = (chapterMap as Record<number, number[]>)[bookIndex];
    if (chapters && chapters.includes(chapter)) {
      const voice = CHARACTER_VOICES[charKey as keyof typeof CHARACTER_VOICES];
      if (voice) return { key: charKey, voiceId: voice.id };
    }
  }
  return null;
}

// Returns true if the verse looks like a continuation of speech (no new attribution,
// no clear narrator-action opening).  Used by the carry-forward logic.
//
// Returns FALSE (stops carry) when:
//   • Verse starts with action narration:  "And he went", "And they came", "And when …"
//   • Verse starts with unidentified speech: "And he said", "And she answered", etc.
//     (These signal a new speaker turn we can't identify → safer to use narrator voice)
//   • "So he/she/they …" / "Then he/she/they …" openings
//
// Returns TRUE (continue carry) for:
//   • Speech-opener words: "But …", "For …", "Verily …", "I …", "Ye …"
//   • Named-but-pronoun: "Unto the woman he said …" — "unto" doesn't hit the subject-verb pattern
function isSpeechContinuation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Stops carry-forward on:
  //   action narration  — "And he went/came/saw/took/…"
  //   unidentified speech — "And he said/answered/replied/…" (new speaker we can't name)
  //   transition phrases — "So he/she…", "Then they…", "Now the…"
  const STOP_RE = /^(?:when\s+(?:he|she|they|it|the\s+\w+)\s+|after\s+|and\s+when\b|and\s+(?:he|she|they|it|the\s+\w+|[a-z]+(?:\s+the\s+\w+)?)\s+(?:went|came|saw|took|gave|ate|drank|heard|walked|ran|arose|returned|opened|fell|built|made|died|lived|dwelt|sat|stood|lay|turned|departed|entered|passed|brought|sent|planted|found|put|set|placed|carried|led|drove|looked|watched|fled|moved|named|said|saith|spake|answered|replied|spoke|told|cried|wept|declared|shouted|asked)|so\s+(?:he|she|they|it|the\s+\w+)\s+|then\s+(?:he|she|they|it|the\s+\w+)\s+|(?:he|she|they|it)\s+(?:said|saith|answered|replied|spoke|spake|told|cried|wept|declared|shouted|asked)\b|now\s+the\s+|now\s+it\s+)/;
  return !STOP_RE.test(lower);
}

// Split a verse into narrator + character segments.
// Strategy 1: find quoted speech ("..." curly or straight, or '...' single)
// Strategy 2: if no quotes, split at the speech verb ("said,") — works for KJV
// Strategy 3 (isContinuation): no attribution in this verse — whole text is speech
// The attribution ("And God said,") always stays in the narrator voice.
export function segmentVerse(
  text: string,
  speakerVoiceId: string | null,
  narratorVoiceId: string,
  isContinuation: boolean = false
): { text: string; voiceId: string }[] {
  if (!speakerVoiceId) return [{ text, voiceId: narratorVoiceId }];

  // Continuation verse: no new attribution detected — carried speaker continues.
  // BUT still try to split off a leading attribution phrase ("To the woman he said, …")
  // so the attribution stays in narrator voice while the actual speech gets character voice.
  if (isContinuation) {
    const verbMatch = text.match(
      /^(.*?\b(?:said|saith|spake|spoke|declared|commanded|replied|answered|told|cried|asked|warned|called)\b(?:[^,]*)?[,:])\s*([\s\S]+)$/i
    );
    if (verbMatch && verbMatch[2] && verbMatch[2].trim().length > 3) {
      return [
        { text: verbMatch[1].trim(), voiceId: narratorVoiceId },
        { text: verbMatch[2].trim(), voiceId: speakerVoiceId },
      ];
    }
    return [{ text, voiceId: speakerVoiceId }];
  }

  const segments: { text: string; voiceId: string }[] = [];

  // Handle ALL common quote styles:
  // \u201C\u201D = curly double "..."  (ESV, NIV, NKJV)
  // \u2018\u2019 = curly single '...'
  // \"...\"      = straight double quotes
  // \'...\'      = straight single quotes (uncommon but possible)
  // Only match outer double-quote pairs (curly or straight).
  // Ignores inner single/curly-single quotes so NIV nested quotes like
  // "Did God really say, 'You must not eat…'?" are captured in full.
  const quoteRe = /[\u201C"]([^\u201D"]+)[\u201D"]/g;
  let lastIndex = 0;
  let foundQuote = false;
  let m: RegExpExecArray | null;

  while ((m = quoteRe.exec(text)) !== null) {
    const quoted = (m[1] || '').trim();
    if (!quoted || quoted.length < 3) continue; // skip tiny matches like apostrophes
    foundQuote = true;
    if (m.index > lastIndex) {
      const before = text.slice(lastIndex, m.index).trim();
      if (before) segments.push({ text: before, voiceId: narratorVoiceId });
    }
    segments.push({ text: quoted, voiceId: speakerVoiceId });
    lastIndex = m.index + m[0].length;
  }

  if (foundQuote) {
    if (lastIndex < text.length) {
      const after = text.slice(lastIndex).trim();
      if (after) segments.push({ text: after, voiceId: narratorVoiceId });
    }
    return segments.length > 0 ? segments : [{ text, voiceId: narratorVoiceId }];
  }

  // No quotes found — split at the speech verb as fallback
  // "And God said, Let there be light" → ["And God said,"] + ["Let there be light"]
  // Also handles NIV "Jesus said to them," and KJV "And he saith unto them,"
  const verbMatch = text.match(
    /^(.*?\b(?:said|saith|spake|spoke|declared|commanded|replied|answered|told|cried|asked|warned|called)\b(?:[^,]*)?[,:])\s*([\s\S]+)$/i
  );
  if (verbMatch && verbMatch[2] && verbMatch[2].trim().length > 3) {
    const attribution = verbMatch[1].trim();
    const speech = verbMatch[2].trim();
    return [
      { text: attribution, voiceId: narratorVoiceId },
      { text: speech,      voiceId: speakerVoiceId },
    ];
  }

  // Last resort — whole verse in narrator voice (don't risk wrong voice)
  return [{ text, voiceId: narratorVoiceId }];
}

async function callElevenLabs(apiKey: string, voiceId: string, text: string): Promise<ArrayBuffer | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[TTS route] ElevenLabs ${res.status} for voice ${voiceId}:`, errText);
    return null;
  }
  return res.arrayBuffer();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { voiceId, narratorVoiceId, bookIndex, chapter, mode } = body;
  const verses: { verse: number; text: string }[] | undefined = body.verses;
  const text: string | undefined = body.text;

  if (!verses?.length && !text) {
    return new Response(JSON.stringify({ error: 'Missing text or verses' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripPrefix = (id: string) => id?.replace(/^eleven:/, '') || '';

    // Determine narrator voice:
    // - 'crafted' mode → era-curated voice from CRAFTED_BOOK_VOICES (alternates by chapter)
    // - 'narrator' mode / default → user's chosen narrator voice
    // - fallback → cycle through full pool by book+chapter seed
    const resolveNarratorId = (): string => {
      if (mode === 'crafted' && bookIndex !== undefined && chapter !== undefined) {
        return getCraftedNarrator(bookIndex, chapter);
      }
      if (narratorVoiceId) return stripPrefix(narratorVoiceId);
      const allNarrators = [
        ...NARRATOR_VOICES.male.map(v => v.id),
        ...NARRATOR_VOICES.female.map(v => v.id),
        ...VOICE_POOL,
      ];
      const seed = ((bookIndex ?? 0) * 1000 + (chapter ?? 0)) % allNarrators.length;
      return allNarrators[seed];
    };

    const narratorId = resolveNarratorId();

    // ── Verse-by-verse mode (character voice switching) ───────────────────────
    if (verses?.length) {
      // In crafted mode, narrator alternates every verse using the book's voice pair.
      // This gives a dynamic performed-Bible feel with frequent tonal shifts.
      const getCraftedVerseNarrator = (verseIndex: number): string => {
        if (mode === 'crafted' && bookIndex !== undefined && chapter !== undefined) {
          const pair = CRAFTED_BOOK_VOICES[bookIndex];
          if (pair) return pair[verseIndex % 2];
        }
        return narratorId;
      };

      // Build segments: each verse may split into narrator + character segments.
      //
      // Carry-forward logic solves multi-verse speeches:
      //   Gen 3:2  "And the woman said …"  → Eve detected, prevCharKey = 'eve'
      //   Gen 3:3  "But of the fruit …"   → no new attribution, isSpeechContinuation=true
      //                                     → carry Eve forward (whole verse = her speech)
      //
      // False-positive prevention: detectCharacterVoice only checks the first 100 chars,
      // so "God hath said" appearing mid-verse inside Eve's speech doesn't trigger God.
      //
      // Carry-forward stops when:
      //   • A new character attribution is found in the current verse
      //   • The verse starts with a clear narrative-action phrase ("And they went …")
      //   • MAX_CARRY consecutive carry-forward verses have elapsed (safety cap)
      // MAX_CARRY: max consecutive verses to carry a speaker forward when no new
      // attribution is found.  Set high enough for God's curse speech (Gen 3:14-19 = 5
      // carries) and similar passages.  Long chapter-wide monologues (Moses in Deut,
      // God in Job 38-41) are handled separately by getChapterSpeakerVoice.
      const MAX_CARRY = 5;
      let prevCharKey: string | null = null;
      let prevCharVoiceId: string | null = null;
      let carryCount = 0;

      // Chapter-level default speaker (e.g. God for all of Job 38, Moses for Deut 1-33)
      const chapterDefault = (bookIndex !== undefined && chapter !== undefined)
        ? getChapterSpeakerVoice(bookIndex, chapter)
        : null;

      const verseVoices: { text: string; voiceId: string }[] = [];
      for (let i = 0; i < verses.length; i++) {
        const v = verses[i];
        const narratorVoice = getCraftedVerseNarrator(i);

        // A single verse may contain multiple speakers (e.g. Gen 3:13:
        // "And the LORD God said … And the woman said …").
        // Split the verse text on attribution boundaries so each sub-speech
        // gets the right voice.
        // Split on conjunction+name+speech-verb (e.g. "Then the LORD said", "And Eve said")
        // OR bare name+said for common sub-verse patterns (e.g. "The woman said" in Gen 3:13 NIV)
        const ATTR_SPLIT_RE = /(?=(?:(?:And|Then|So|But)\s+(?:the\s+lord\s+god|the\s+lord|lord\s+god|god|jesus|the\s+woman|eve|the\s+man|adam|cain|abel|noah|abraham|moses|david|solomon|elijah|isaiah|jeremiah|peter|paul|mary|judas|pilate|thomas|ruth|esther|the\s+serpent|satan|the\s+angel|gabriel|john\s+the\s+baptist)\s+(?:said|saith|answered|replied|spoke|spake|declared|called|commanded|cried|asked|told)|(?:the\s+woman|the\s+man|eve|adam)\s+(?:said|saith|answered|replied|spake)))/i;
        const subVerses = v.text.split(ATTR_SPLIT_RE).filter(s => s.trim().length > 0);

        for (const sub of subVerses) {
          const detected = detectCharacterVoice(sub);
          let charVoiceId: string | null = null;
          let isCarry = false;

          if (detected) {
            // Explicit attribution found in this sub-verse
            charVoiceId = detected.voiceId;
            prevCharKey = detected.key;
            prevCharVoiceId = detected.voiceId;
            carryCount = 0;
          } else if (prevCharKey && carryCount < MAX_CARRY && isSpeechContinuation(sub)) {
            // Previous speaker's multi-verse speech continues
            charVoiceId = prevCharVoiceId;
            isCarry = true;
            carryCount++;
          } else if (chapterDefault) {
            // Chapter-wide monologue speaker (Moses, God in Job, David psalms, etc.)
            charVoiceId = chapterDefault.voiceId;
            prevCharKey = chapterDefault.key;
            prevCharVoiceId = chapterDefault.voiceId;
            carryCount = 0;
          } else {
            // Narrator picks back up
            prevCharKey = null;
            prevCharVoiceId = null;
            carryCount = 0;
          }

          const segs = segmentVerse(sub, charVoiceId, narratorVoice, isCarry);
          verseVoices.push(...segs);
        }
      }

      // Group consecutive verses that share the same voice to minimize API calls
      const groups: { voiceId: string; texts: string[] }[] = [];
      for (const vv of verseVoices) {
        const last = groups[groups.length - 1];
        if (last && last.voiceId === vv.voiceId) {
          last.texts.push(vv.text);
        } else {
          groups.push({ voiceId: vv.voiceId, texts: [vv.text] });
        }
      }

      // Call ElevenLabs once per group, concatenate the MP3 buffers
      const buffers: ArrayBuffer[] = [];
      for (const group of groups) {
        const buf = await callElevenLabs(apiKey, group.voiceId, group.texts.join(' '));
        if (buf) buffers.push(buf);
      }

      if (buffers.length === 0) {
        return new Response(JSON.stringify({ error: 'All TTS segments failed' }), {
          status: 502, headers: { 'Content-Type': 'application/json' },
        });
      }

      const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      return new Response(combined.buffer, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    }

    // ── Single-text fallback (legacy / explicit voiceId) ──────────────────────
    const detectedCharacter = !voiceId ? detectCharacterVoice(text!) : null;
    const rawVoice = voiceId || detectedCharacter?.voiceId || narratorId;
    const voice = stripPrefix(rawVoice);

    const audioBuffer = await callElevenLabs(apiKey, voice, text!);
    if (!audioBuffer) {
      return new Response(JSON.stringify({ error: 'ElevenLabs request failed' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[TTS route] error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET endpoint — returns narrator voice options for the settings panel
export async function GET() {
  return Response.json({ voices: NARRATOR_VOICES });
}
