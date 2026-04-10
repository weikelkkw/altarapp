'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookDef, BOOKS, T } from '../types';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ReadingDay {
  day: number;
  label: string;
  book: string;
  osis: string;
  chapter: number;
}

interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  icon: string;
  days: ReadingDay[];
  category: 'beginner' | 'intermediate' | 'deep';
  group: string;
}

interface PlanProgress {
  planId: string;
  startedAt: string;
  completedDays: number[]; // day numbers that are checked off
  lastReadAt: string | null;
}

interface Props {
  accentColor: string;
  onNavigateToRead: (book: BookDef, chapter: number) => void;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const STORAGE_KEY = 'trace-reading-plans';

function loadProgress(): PlanProgress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProgress(progress: PlanProgress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function seq(book: string, osis: string, from: number, to: number): ReadingDay[] {
  return Array.from({ length: to - from + 1 }, (_, i) => ({
    day: i + 1,
    label: `${book} ${from + i}`,
    book,
    osis,
    chapter: from + i,
  }));
}

function reindex(days: ReadingDay[]): ReadingDay[] {
  return days.map((d, i) => ({ ...d, day: i + 1 }));
}

/* ─── Plan Data ─────────────────────────────────────────────────────── */

const PLAN_GROUPS = [
  { id: 'emotions', name: 'What You\'re Feeling', icon: '💙', desc: 'Scripture for every season of the heart' },
  { id: 'gospels', name: 'The Gospels', icon: '✝', desc: 'Walk through the life, death, and resurrection of Jesus' },
  { id: 'wisdom', name: 'Wisdom & Psalms', icon: '📖', desc: 'Timeless wisdom and worship for daily living' },
  { id: 'foundations', name: 'Foundations', icon: '🏛', desc: 'Core books that build your biblical understanding' },
  { id: 'theology', name: 'Theology & Letters', icon: '✉', desc: 'Deep theological study through the epistles' },
  { id: 'custom', name: 'My Custom Plans', icon: '📝', desc: 'Plans you created yourself' },
];

const PLANS: ReadingPlan[] = [
  // ── Gospels group ──────────────────────────────────────────────────
  {
    id: 'gospel-of-matthew',
    name: 'Matthew in 28 Days',
    description: 'The Gospel written for the Jewish audience — Jesus as the promised Messiah and King.',
    icon: '📜',
    category: 'intermediate',
    group: 'gospels',
    days: seq('Matthew', 'MAT', 1, 28),
  },
  {
    id: 'gospel-of-mark',
    name: 'Mark in 16 Days',
    description: 'The shortest, most action-packed Gospel — Jesus the Servant who came to give His life.',
    icon: '⚡',
    category: 'beginner',
    group: 'gospels',
    days: seq('Mark', 'MRK', 1, 16),
  },
  {
    id: 'gospel-of-luke',
    name: 'Luke in 24 Days',
    description: 'The most detailed Gospel — written by a physician, emphasizing Jesus\' compassion for all people.',
    icon: '🕊',
    category: 'intermediate',
    group: 'gospels',
    days: seq('Luke', 'LUK', 1, 24),
  },
  {
    id: 'gospel-of-john',
    name: 'John in 21 Days',
    description: 'The beloved disciple\'s account — the most theological Gospel, revealing Jesus as the Son of God.',
    icon: '✨',
    category: 'beginner',
    group: 'gospels',
    days: seq('John', 'JHN', 1, 21),
  },
  {
    id: 'life-of-jesus',
    name: 'Life of Jesus (All 4 Gospels)',
    description: 'A 30-day chronological journey through all four Gospels — birth, ministry, death, and resurrection.',
    icon: '✝',
    category: 'intermediate',
    group: 'gospels',
    days: reindex([
      { day: 1, label: 'Luke 1 — Announcements', book: 'Luke', osis: 'LUK', chapter: 1 },
      { day: 2, label: 'Luke 2 — Birth of Jesus', book: 'Luke', osis: 'LUK', chapter: 2 },
      { day: 3, label: 'Matthew 2 — Wise Men & Flight', book: 'Matthew', osis: 'MAT', chapter: 2 },
      { day: 4, label: 'Mark 1 — Baptism & Early Ministry', book: 'Mark', osis: 'MRK', chapter: 1 },
      { day: 5, label: 'John 1 — The Word Became Flesh', book: 'John', osis: 'JHN', chapter: 1 },
      { day: 6, label: 'John 2 — Wedding at Cana', book: 'John', osis: 'JHN', chapter: 2 },
      { day: 7, label: 'John 3 — Nicodemus', book: 'John', osis: 'JHN', chapter: 3 },
      { day: 8, label: 'John 4 — Woman at the Well', book: 'John', osis: 'JHN', chapter: 4 },
      { day: 9, label: 'Luke 4 — Nazareth Rejection', book: 'Luke', osis: 'LUK', chapter: 4 },
      { day: 10, label: 'Matthew 5 — Sermon on the Mount I', book: 'Matthew', osis: 'MAT', chapter: 5 },
      { day: 11, label: 'Matthew 6 — Sermon on the Mount II', book: 'Matthew', osis: 'MAT', chapter: 6 },
      { day: 12, label: 'Matthew 7 — Sermon on the Mount III', book: 'Matthew', osis: 'MAT', chapter: 7 },
      { day: 13, label: 'Luke 7 — Faith of the Centurion', book: 'Luke', osis: 'LUK', chapter: 7 },
      { day: 14, label: 'Mark 4 — Parables', book: 'Mark', osis: 'MRK', chapter: 4 },
      { day: 15, label: 'Mark 5 — Miracles', book: 'Mark', osis: 'MRK', chapter: 5 },
      { day: 16, label: 'Matthew 14 — Feeding the 5,000', book: 'Matthew', osis: 'MAT', chapter: 14 },
      { day: 17, label: 'John 6 — Bread of Life', book: 'John', osis: 'JHN', chapter: 6 },
      { day: 18, label: 'Matthew 16 — Peter\'s Confession', book: 'Matthew', osis: 'MAT', chapter: 16 },
      { day: 19, label: 'Matthew 17 — Transfiguration', book: 'Matthew', osis: 'MAT', chapter: 17 },
      { day: 20, label: 'John 9 — Man Born Blind', book: 'John', osis: 'JHN', chapter: 9 },
      { day: 21, label: 'John 10 — Good Shepherd', book: 'John', osis: 'JHN', chapter: 10 },
      { day: 22, label: 'John 11 — Lazarus Raised', book: 'John', osis: 'JHN', chapter: 11 },
      { day: 23, label: 'Luke 15 — Lost Sheep, Prodigal Son', book: 'Luke', osis: 'LUK', chapter: 15 },
      { day: 24, label: 'Matthew 21 — Triumphal Entry', book: 'Matthew', osis: 'MAT', chapter: 21 },
      { day: 25, label: 'John 13 — Last Supper', book: 'John', osis: 'JHN', chapter: 13 },
      { day: 26, label: 'John 14 — The Way, Truth, Life', book: 'John', osis: 'JHN', chapter: 14 },
      { day: 27, label: 'John 17 — Jesus\' Prayer', book: 'John', osis: 'JHN', chapter: 17 },
      { day: 28, label: 'Matthew 26 — Gethsemane & Arrest', book: 'Matthew', osis: 'MAT', chapter: 26 },
      { day: 29, label: 'Matthew 27 — Crucifixion', book: 'Matthew', osis: 'MAT', chapter: 27 },
      { day: 30, label: 'John 20 — Resurrection', book: 'John', osis: 'JHN', chapter: 20 },
    ]),
  },
  {
    id: 'sermon-on-the-mount',
    name: 'The Sermon on the Mount',
    description: 'Seven days through Jesus\' most famous sermon — the Beatitudes, Lord\'s Prayer, and kingdom ethics.',
    icon: '⛰',
    category: 'beginner',
    group: 'gospels',
    days: [
      { day: 1, label: 'Matthew 5:1-16 — The Beatitudes', book: 'Matthew', osis: 'MAT', chapter: 5 },
      { day: 2, label: 'Matthew 5:17-48 — Fulfilling the Law', book: 'Matthew', osis: 'MAT', chapter: 5 },
      { day: 3, label: 'Matthew 6:1-18 — Prayer & Fasting', book: 'Matthew', osis: 'MAT', chapter: 6 },
      { day: 4, label: 'Matthew 6:19-34 — Treasure & Worry', book: 'Matthew', osis: 'MAT', chapter: 6 },
      { day: 5, label: 'Matthew 7:1-12 — Judging & the Golden Rule', book: 'Matthew', osis: 'MAT', chapter: 7 },
      { day: 6, label: 'Matthew 7:13-23 — Two Gates, False Prophets', book: 'Matthew', osis: 'MAT', chapter: 7 },
      { day: 7, label: 'Matthew 7:24-29 — The Wise Builder', book: 'Matthew', osis: 'MAT', chapter: 7 },
    ],
  },
  // ── Wisdom & Psalms group ──────────────────────────────────────────
  {
    id: 'psalms-of-comfort',
    name: 'Psalms of Comfort',
    description: 'Fourteen carefully chosen psalms to bring peace, hope, and encouragement in every season.',
    icon: '🙏',
    category: 'beginner',
    group: 'wisdom',
    days: [23, 27, 34, 37, 46, 51, 62, 63, 91, 103, 121, 139, 145, 150].map((ch, i) => ({
      day: i + 1,
      label: `Psalm ${ch}`,
      book: 'Psalms',
      osis: 'PSA',
      chapter: ch,
    })),
  },
  {
    id: 'proverbs-for-wisdom',
    name: 'Proverbs for Wisdom',
    description: 'A chapter of Proverbs for each day of the month — timeless wisdom for daily living.',
    icon: '📚',
    category: 'intermediate',
    group: 'wisdom',
    days: seq('Proverbs', 'PRO', 1, 31),
  },
  // ── Foundations group ───────────────────────────────────────────────
  {
    id: 'genesis-beginning',
    name: 'Genesis: The Beginning',
    description: 'Creation, the patriarchs, and the foundations of God\'s covenant — 30 chapters in 30 days.',
    icon: '🌍',
    category: 'intermediate',
    group: 'foundations',
    days: seq('Genesis', 'GEN', 1, 30),
  },
  {
    id: 'letters-of-paul',
    name: 'Letters of Paul',
    description: '21 days through the heart of Pauline theology — from Romans to Philemon.',
    icon: '✉',
    category: 'deep',
    group: 'theology',
    days: reindex([
      { day: 1, label: 'Romans 1', book: 'Romans', osis: 'ROM', chapter: 1 },
      { day: 2, label: 'Romans 3', book: 'Romans', osis: 'ROM', chapter: 3 },
      { day: 3, label: 'Romans 5', book: 'Romans', osis: 'ROM', chapter: 5 },
      { day: 4, label: 'Romans 8', book: 'Romans', osis: 'ROM', chapter: 8 },
      { day: 5, label: 'Romans 12', book: 'Romans', osis: 'ROM', chapter: 12 },
      { day: 6, label: '1 Corinthians 13 — Love', book: '1 Corinthians', osis: '1CO', chapter: 13 },
      { day: 7, label: '1 Corinthians 15 — Resurrection', book: '1 Corinthians', osis: '1CO', chapter: 15 },
      { day: 8, label: '2 Corinthians 4 — Treasure in Jars', book: '2 Corinthians', osis: '2CO', chapter: 4 },
      { day: 9, label: '2 Corinthians 12 — Thorn in the Flesh', book: '2 Corinthians', osis: '2CO', chapter: 12 },
      { day: 10, label: 'Galatians 2 — Justified by Faith', book: 'Galatians', osis: 'GAL', chapter: 2 },
      { day: 11, label: 'Galatians 5 — Fruit of the Spirit', book: 'Galatians', osis: 'GAL', chapter: 5 },
      { day: 12, label: 'Ephesians 1 — Spiritual Blessings', book: 'Ephesians', osis: 'EPH', chapter: 1 },
      { day: 13, label: 'Ephesians 2 — Grace through Faith', book: 'Ephesians', osis: 'EPH', chapter: 2 },
      { day: 14, label: 'Ephesians 6 — Armor of God', book: 'Ephesians', osis: 'EPH', chapter: 6 },
      { day: 15, label: 'Philippians 2 — Christ\'s Humility', book: 'Philippians', osis: 'PHP', chapter: 2 },
      { day: 16, label: 'Philippians 4 — Rejoice Always', book: 'Philippians', osis: 'PHP', chapter: 4 },
      { day: 17, label: 'Colossians 1 — Supremacy of Christ', book: 'Colossians', osis: 'COL', chapter: 1 },
      { day: 18, label: 'Colossians 3 — Set Your Minds Above', book: 'Colossians', osis: 'COL', chapter: 3 },
      { day: 19, label: '1 Thessalonians 4 — The Lord\'s Coming', book: '1 Thessalonians', osis: '1TH', chapter: 4 },
      { day: 20, label: '2 Timothy 2 — Approved Worker', book: '2 Timothy', osis: '2TI', chapter: 2 },
      { day: 21, label: 'Philemon 1 — Forgiveness & Restoration', book: 'Philemon', osis: 'PHM', chapter: 1 },
    ]),
  },
  {
    id: 'romans-deep-dive',
    name: 'Romans Deep Dive',
    description: 'Paul\'s masterpiece — justification, sanctification, and the sovereign plan of God. 16 chapters.',
    icon: '🔥',
    category: 'deep',
    group: 'theology',
    days: seq('Romans', 'ROM', 1, 16),
  },
  {
    id: 'acts-early-church',
    name: 'Acts: The Early Church',
    description: 'The birth of the church, the spread of the Gospel, and the journeys of Paul — 28 chapters.',
    icon: '🌊',
    category: 'intermediate',
    group: 'foundations',
    days: seq('Acts', 'ACT', 1, 28),
  },
  // ── Evangelism / Outreach group ─────────────────────────────────────
  {
    id: 'sharing-your-faith',
    name: 'Sharing Your Faith',
    description: 'A 21-day plan that walks you through the Life of Jesus while equipping you to bring others to Him. Each day pairs a Gospel reading with practical evangelism training.',
    icon: '🔥',
    category: 'intermediate',
    group: 'gospels',
    days: reindex([
      { day: 1, label: 'John 1 — Who is Jesus? Learn to share His identity', book: 'John', osis: 'JHN', chapter: 1 },
      { day: 2, label: 'John 3 — The Gospel in one conversation (Nicodemus)', book: 'John', osis: 'JHN', chapter: 3 },
      { day: 3, label: 'John 4 — How Jesus met people where they were (Samaritan woman)', book: 'John', osis: 'JHN', chapter: 4 },
      { day: 4, label: 'Matthew 4 — Jesus calls followers. How to invite someone', book: 'Matthew', osis: 'MAT', chapter: 4 },
      { day: 5, label: 'Matthew 5 — Salt and light. Your life is the message', book: 'Matthew', osis: 'MAT', chapter: 5 },
      { day: 6, label: 'Mark 2 — Jesus eats with sinners. Go where people are', book: 'Mark', osis: 'MRK', chapter: 2 },
      { day: 7, label: 'Luke 10 — Sending the 72. You are sent too', book: 'Luke', osis: 'LUK', chapter: 10 },
      { day: 8, label: 'John 9 — The blind man\'s testimony. Share what happened to you', book: 'John', osis: 'JHN', chapter: 9 },
      { day: 9, label: 'Luke 15 — Lost sheep, lost coin, lost son. God\'s heart for the lost', book: 'Luke', osis: 'LUK', chapter: 15 },
      { day: 10, label: 'Matthew 9 — The harvest is plentiful. Ask God for opportunities', book: 'Matthew', osis: 'MAT', chapter: 9 },
      { day: 11, label: 'John 6 — Bread of life. Sharing what only Jesus offers', book: 'John', osis: 'JHN', chapter: 6 },
      { day: 12, label: 'Mark 5 — The healed man tells his story. Your before and after', book: 'Mark', osis: 'MRK', chapter: 5 },
      { day: 13, label: 'Luke 19 — Zacchaeus. No one is too far gone', book: 'Luke', osis: 'LUK', chapter: 19 },
      { day: 14, label: 'John 10 — The Good Shepherd. Explain how Jesus pursues people', book: 'John', osis: 'JHN', chapter: 10 },
      { day: 15, label: 'Matthew 28 — The Great Commission. This is your calling', book: 'Matthew', osis: 'MAT', chapter: 28 },
      { day: 16, label: 'Acts 2 — Peter\'s first sermon. Boldness in sharing', book: 'Acts', osis: 'ACT', chapter: 2 },
      { day: 17, label: 'Acts 8 — Philip and the Ethiopian. Be ready for divine appointments', book: 'Acts', osis: 'ACT', chapter: 8 },
      { day: 18, label: 'Acts 17 — Paul in Athens. Meeting people in their worldview', book: 'Acts', osis: 'ACT', chapter: 17 },
      { day: 19, label: 'Romans 10 — How will they hear? The urgency of sharing', book: 'Romans', osis: 'ROM', chapter: 10 },
      { day: 20, label: '1 Peter 3 — Always be ready to give a reason for your hope', book: '1 Peter', osis: '1PE', chapter: 3 },
      { day: 21, label: 'John 20-21 — The risen Jesus sends you. Go and make disciples', book: 'John', osis: 'JHN', chapter: 20 },
    ]),
  },

  // ── Additional plans to balance grids ────────────────────────────────

  // Gospels +1 = 8 total
  {
    id: 'parables-of-jesus',
    name: 'Parables of Jesus',
    description: 'The stories Jesus told to reveal the Kingdom of God.',
    icon: '🌾',
    category: 'beginner' as const,
    group: 'gospels',
    days: reindex([
      { day: 1, label: 'Matthew 13 — The Sower. What kind of soil are you?', book: 'Matthew', osis: 'MAT', chapter: 13 },
      { day: 2, label: 'Luke 15 — The Prodigal Son. The Father runs to you', book: 'Luke', osis: 'LUK', chapter: 15 },
      { day: 3, label: 'Matthew 25 — The Talents. What will you do with what He gave you?', book: 'Matthew', osis: 'MAT', chapter: 25 },
      { day: 4, label: 'Luke 10 — The Good Samaritan. Who is your neighbor?', book: 'Luke', osis: 'LUK', chapter: 10 },
      { day: 5, label: 'Matthew 18 — The Unforgiving Servant. Forgive as you were forgiven', book: 'Matthew', osis: 'MAT', chapter: 18 },
      { day: 6, label: 'Matthew 20 — Workers in the Vineyard. Grace is not fair — it\'s better', book: 'Matthew', osis: 'MAT', chapter: 20 },
      { day: 7, label: 'Luke 16 — The Rich Man and Lazarus. Eternity is real', book: 'Luke', osis: 'LUK', chapter: 16 },
    ]),
  },

  // Wisdom +2 = 4 total
  {
    id: 'ecclesiastes',
    name: 'Ecclesiastes: Life\'s Meaning',
    description: 'The search for meaning under the sun — and what truly matters.',
    icon: '🌅',
    category: 'intermediate' as const,
    group: 'wisdom',
    days: seq('Ecclesiastes', 'ECC', 1, 12),
  },
  {
    id: 'job-suffering',
    name: 'Job: Why Do We Suffer?',
    description: 'The hardest question in life, explored through one man\'s story.',
    icon: '⚡',
    category: 'deep' as const,
    group: 'wisdom',
    days: reindex([
      { day: 1, label: 'Job 1 — A righteous man loses everything', book: 'Job', osis: 'JOB', chapter: 1 },
      { day: 2, label: 'Job 2 — The suffering deepens', book: 'Job', osis: 'JOB', chapter: 2 },
      { day: 3, label: 'Job 3 — Job\'s raw lament', book: 'Job', osis: 'JOB', chapter: 3 },
      { day: 4, label: 'Job 19 — I know that my Redeemer lives', book: 'Job', osis: 'JOB', chapter: 19 },
      { day: 5, label: 'Job 38 — God answers from the whirlwind', book: 'Job', osis: 'JOB', chapter: 38 },
      { day: 6, label: 'Job 40 — Who are you to question Me?', book: 'Job', osis: 'JOB', chapter: 40 },
      { day: 7, label: 'Job 42 — Restoration. God redeems everything', book: 'Job', osis: 'JOB', chapter: 42 },
    ]),
  },

  // Foundations +2 = 4 total
  {
    id: 'exodus-freedom',
    name: 'Exodus: The God Who Frees',
    description: 'From slavery to the promised land — God\'s rescue mission.',
    icon: '🔥',
    category: 'beginner' as const,
    group: 'foundations',
    days: reindex([
      { day: 1, label: 'Exodus 1 — Israel enslaved. Darkness before dawn', book: 'Exodus', osis: 'EXO', chapter: 1 },
      { day: 2, label: 'Exodus 3 — The burning bush. God calls Moses', book: 'Exodus', osis: 'EXO', chapter: 3 },
      { day: 3, label: 'Exodus 7 — Let my people go. The plagues begin', book: 'Exodus', osis: 'EXO', chapter: 7 },
      { day: 4, label: 'Exodus 12 — The Passover. A picture of Christ', book: 'Exodus', osis: 'EXO', chapter: 12 },
      { day: 5, label: 'Exodus 14 — The Red Sea parts. God makes a way', book: 'Exodus', osis: 'EXO', chapter: 14 },
      { day: 6, label: 'Exodus 19 — At Mount Sinai. Meeting God', book: 'Exodus', osis: 'EXO', chapter: 19 },
      { day: 7, label: 'Exodus 20 — The Ten Commandments', book: 'Exodus', osis: 'EXO', chapter: 20 },
    ]),
  },
  {
    id: 'daniel-faith',
    name: 'Daniel: Faith Under Fire',
    description: 'Standing firm when the world demands you bow.',
    icon: '🦁',
    category: 'intermediate' as const,
    group: 'foundations',
    days: reindex([
      { day: 1, label: 'Daniel 1 — Refusing to compromise. It starts with small choices', book: 'Daniel', osis: 'DAN', chapter: 1 },
      { day: 2, label: 'Daniel 2 — God reveals mysteries. He is sovereign over kings', book: 'Daniel', osis: 'DAN', chapter: 2 },
      { day: 3, label: 'Daniel 3 — The fiery furnace. He is with you in the fire', book: 'Daniel', osis: 'DAN', chapter: 3 },
      { day: 4, label: 'Daniel 5 — The writing on the wall. God holds rulers accountable', book: 'Daniel', osis: 'DAN', chapter: 5 },
      { day: 5, label: 'Daniel 6 — The lion\'s den. Faithfulness has a cost — and a reward', book: 'Daniel', osis: 'DAN', chapter: 6 },
      { day: 6, label: 'Daniel 7 — Visions of the future. The Son of Man receives the kingdom', book: 'Daniel', osis: 'DAN', chapter: 7 },
      { day: 7, label: 'Daniel 9 — Daniel\'s prayer. How to pray when everything is broken', book: 'Daniel', osis: 'DAN', chapter: 9 },
    ]),
  },

  // Theology +2 = 4 total
  {
    id: 'hebrews-better',
    name: 'Hebrews: Jesus Is Better',
    description: 'Why Jesus is greater than everything that came before.',
    icon: '👑',
    category: 'deep' as const,
    group: 'theology',
    days: seq('Hebrews', 'HEB', 1, 13),
  },
  {
    id: 'ephesians-identity',
    name: 'Ephesians: Who You Are',
    description: 'Your identity, your armor, your calling — all in 6 chapters.',
    icon: '🛡',
    category: 'intermediate' as const,
    group: 'theology',
    days: seq('Ephesians', 'EPH', 1, 6),
  },

  // ── Emotions group ──────────────────────────────────────────────────
  // Row 1: Hope · Joy · Peace
  {
    id: 'emotion-hope', name: 'When You Need Hope', icon: '🌅',
    description: 'When everything feels dark, these words bring light.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Romans 15 — The God of hope fill you with joy and peace', book: 'Romans', osis: 'ROM', chapter: 15 },
      { day: 2, label: 'Lamentations 3 — His mercies are new every morning', book: 'Lamentations', osis: 'LAM', chapter: 3 },
      { day: 3, label: 'Psalm 42 — Why are you downcast, O my soul?', book: 'Psalms', osis: 'PSA', chapter: 42 },
      { day: 4, label: 'Isaiah 40 — They who wait on the Lord shall renew their strength', book: 'Isaiah', osis: 'ISA', chapter: 40 },
      { day: 5, label: 'Hebrews 6 — Hope as an anchor for the soul', book: 'Hebrews', osis: 'HEB', chapter: 6 },
      { day: 6, label: 'Jeremiah 29 — Plans to give you a future and a hope', book: 'Jeremiah', osis: 'JER', chapter: 29 },
      { day: 7, label: 'Psalm 27 — Wait for the Lord; be strong', book: 'Psalms', osis: 'PSA', chapter: 27 },
    ]),
  },
  {
    id: 'emotion-joy', name: 'When You Want Joy', icon: '🌻',
    description: 'The joy of the Lord is your strength.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Nehemiah 8 — The joy of the Lord is your strength', book: 'Nehemiah', osis: 'NEH', chapter: 8 },
      { day: 2, label: 'Psalm 16 — In Your presence is fullness of joy', book: 'Psalms', osis: 'PSA', chapter: 16 },
      { day: 3, label: 'Philippians 4 — Rejoice in the Lord always', book: 'Philippians', osis: 'PHP', chapter: 4 },
      { day: 4, label: 'John 15 — That my joy may be in you and your joy may be full', book: 'John', osis: 'JHN', chapter: 15 },
      { day: 5, label: 'Psalm 126 — Those who sow in tears shall reap with joy', book: 'Psalms', osis: 'PSA', chapter: 126 },
      { day: 6, label: 'James 1 — Count it all joy when you face trials', book: 'James', osis: 'JAS', chapter: 1 },
      { day: 7, label: 'Habakkuk 3 — Yet I will rejoice in the Lord', book: 'Habakkuk', osis: 'HAB', chapter: 3 },
    ]),
  },
  {
    id: 'emotion-peace', name: 'When You Need Peace', icon: '🕊',
    description: 'The peace that surpasses all understanding.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'John 14 — Peace I leave with you', book: 'John', osis: 'JHN', chapter: 14 },
      { day: 2, label: 'Philippians 4 — The peace of God will guard your hearts', book: 'Philippians', osis: 'PHP', chapter: 4 },
      { day: 3, label: 'Isaiah 26 — Perfect peace for minds stayed on You', book: 'Isaiah', osis: 'ISA', chapter: 26 },
      { day: 4, label: 'Psalm 4 — In peace I will lie down and sleep', book: 'Psalms', osis: 'PSA', chapter: 4 },
      { day: 5, label: 'Colossians 3 — Let the peace of Christ rule in your hearts', book: 'Colossians', osis: 'COL', chapter: 3 },
      { day: 6, label: 'Numbers 6 — The Lord give you peace', book: 'Numbers', osis: 'NUM', chapter: 6 },
      { day: 7, label: 'Psalm 29 — The Lord blesses His people with peace', book: 'Psalms', osis: 'PSA', chapter: 29 },
    ]),
  },
  // Row 2: Love · Healing · Lonely
  {
    id: 'emotion-love', name: 'When You Need Love', icon: '❤️',
    description: 'Discover the depth of God\'s love for you — and how to love others.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: '1 Corinthians 13 — The love chapter', book: '1 Corinthians', osis: '1CO', chapter: 13 },
      { day: 2, label: '1 John 4 — God is love', book: '1 John', osis: '1JN', chapter: 4 },
      { day: 3, label: 'Romans 8 — Nothing separates us from His love', book: 'Romans', osis: 'ROM', chapter: 8 },
      { day: 4, label: 'John 15 — Abide in my love', book: 'John', osis: 'JHN', chapter: 15 },
      { day: 5, label: 'Song of Solomon 2 — Beloved and lover', book: 'Song of Solomon', osis: 'SNG', chapter: 2 },
      { day: 6, label: 'Ephesians 3 — To know the love that surpasses knowledge', book: 'Ephesians', osis: 'EPH', chapter: 3 },
      { day: 7, label: 'Psalm 136 — His love endures forever', book: 'Psalms', osis: 'PSA', chapter: 136 },
    ]),
  },
  {
    id: 'emotion-healing', name: 'When You Need Healing', icon: '🩹',
    description: 'Scripture for physical, emotional, and spiritual healing.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 147 — He heals the brokenhearted', book: 'Psalms', osis: 'PSA', chapter: 147 },
      { day: 2, label: 'Isaiah 53 — By His wounds we are healed', book: 'Isaiah', osis: 'ISA', chapter: 53 },
      { day: 3, label: 'James 5 — The prayer of faith will save the sick', book: 'James', osis: 'JAS', chapter: 5 },
      { day: 4, label: 'Psalm 30 — Weeping may last a night, but joy comes', book: 'Psalms', osis: 'PSA', chapter: 30 },
      { day: 5, label: 'Mark 5 — The woman who touched His garment', book: 'Mark', osis: 'MRK', chapter: 5 },
      { day: 6, label: 'Jeremiah 17 — Heal me, O Lord, and I shall be healed', book: 'Jeremiah', osis: 'JER', chapter: 17 },
      { day: 7, label: 'Revelation 21 — He will wipe every tear away', book: 'Revelation', osis: 'REV', chapter: 21 },
    ]),
  },
  {
    id: 'emotion-lonely', name: 'When You Feel Lonely', icon: '🤝',
    description: 'You are never truly alone — God is always near.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 68 — God sets the lonely in families', book: 'Psalms', osis: 'PSA', chapter: 68 },
      { day: 2, label: 'Hebrews 13 — I will never leave you nor forsake you', book: 'Hebrews', osis: 'HEB', chapter: 13 },
      { day: 3, label: 'Matthew 28 — I am with you always, to the end of the age', book: 'Matthew', osis: 'MAT', chapter: 28 },
      { day: 4, label: 'Psalm 139 — Where can I go from Your presence?', book: 'Psalms', osis: 'PSA', chapter: 139 },
      { day: 5, label: 'John 14 — I will not leave you as orphans', book: 'John', osis: 'JHN', chapter: 14 },
      { day: 6, label: 'Romans 8 — Nothing can separate us from the love of God', book: 'Romans', osis: 'ROM', chapter: 8 },
      { day: 7, label: 'Psalm 23 — Even through the darkest valley, He is there', book: 'Psalms', osis: 'PSA', chapter: 23 },
    ]),
  },
  // Row 3: Fear · Anxiety · Overwhelmed
  {
    id: 'emotion-fear', name: 'When You Feel Afraid', icon: '🛡',
    description: 'God has not given you a spirit of fear.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 91 — He who dwells in the shelter of the Most High', book: 'Psalms', osis: 'PSA', chapter: 91 },
      { day: 2, label: 'Isaiah 41 — Fear not, for I am with you', book: 'Isaiah', osis: 'ISA', chapter: 41 },
      { day: 3, label: '2 Timothy 1 — God gave us a spirit of power and love', book: '2 Timothy', osis: '2TI', chapter: 1 },
      { day: 4, label: 'Psalm 23 — I will fear no evil', book: 'Psalms', osis: 'PSA', chapter: 23 },
      { day: 5, label: 'Joshua 1 — Be strong and courageous', book: 'Joshua', osis: 'JOS', chapter: 1 },
      { day: 6, label: 'Psalm 46 — God is our refuge and strength', book: 'Psalms', osis: 'PSA', chapter: 46 },
      { day: 7, label: '1 John 4 — Perfect love casts out fear', book: '1 John', osis: '1JN', chapter: 4 },
    ]),
  },
  {
    id: 'emotion-anxiety', name: 'When You Feel Anxious', icon: '🌿',
    description: 'Cast your cares on Him, because He cares for you.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Philippians 4 — Do not be anxious about anything', book: 'Philippians', osis: 'PHP', chapter: 4 },
      { day: 2, label: 'Matthew 6 — Do not worry about tomorrow', book: 'Matthew', osis: 'MAT', chapter: 6 },
      { day: 3, label: '1 Peter 5 — Cast all your anxiety on Him', book: '1 Peter', osis: '1PE', chapter: 5 },
      { day: 4, label: 'Psalm 55 — Cast your burden on the Lord', book: 'Psalms', osis: 'PSA', chapter: 55 },
      { day: 5, label: 'Isaiah 26 — Perfect peace for the steadfast mind', book: 'Isaiah', osis: 'ISA', chapter: 26 },
      { day: 6, label: 'Psalm 94 — When anxious thoughts multiply, Your comfort delights', book: 'Psalms', osis: 'PSA', chapter: 94 },
      { day: 7, label: 'John 14 — Let not your heart be troubled', book: 'John', osis: 'JHN', chapter: 14 },
    ]),
  },
  // Row 3 continued: Overwhelmed (new)
  {
    id: 'emotion-overwhelmed', name: 'When You\'re Overwhelmed', icon: '🌊',
    description: 'He is your anchor when the waves crash in.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Matthew 11 — Come to me, all who are weary and burdened', book: 'Matthew', osis: 'MAT', chapter: 11 },
      { day: 2, label: 'Psalm 61 — When my heart is overwhelmed, lead me to the Rock', book: 'Psalms', osis: 'PSA', chapter: 61 },
      { day: 3, label: 'Isaiah 43 — When you pass through the waters, I will be with you', book: 'Isaiah', osis: 'ISA', chapter: 43 },
      { day: 4, label: '2 Corinthians 4 — Hard pressed but not crushed', book: '2 Corinthians', osis: '2CO', chapter: 4 },
      { day: 5, label: 'Psalm 46 — God is our refuge and strength, an ever-present help', book: 'Psalms', osis: 'PSA', chapter: 46 },
      { day: 6, label: 'Philippians 4 — I can do all things through Christ who strengthens me', book: 'Philippians', osis: 'PHP', chapter: 4 },
      { day: 7, label: 'Psalm 18 — He reached down and drew me out of deep waters', book: 'Psalms', osis: 'PSA', chapter: 18 },
    ]),
  },
  // Row 4: Depression · Stress · Grieving
  {
    id: 'emotion-depression', name: 'When You Feel Depressed', icon: '🕯',
    description: 'Even in the valley, He is with you.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 42 — Hope in God, for I shall again praise Him', book: 'Psalms', osis: 'PSA', chapter: 42 },
      { day: 2, label: 'Psalm 34 — The Lord is near to the brokenhearted', book: 'Psalms', osis: 'PSA', chapter: 34 },
      { day: 3, label: '1 Kings 19 — Elijah in the wilderness. God meets you there', book: '1 Kings', osis: '1KI', chapter: 19 },
      { day: 4, label: 'Psalm 139 — You are fearfully and wonderfully made', book: 'Psalms', osis: 'PSA', chapter: 139 },
      { day: 5, label: 'Isaiah 43 — I have called you by name, you are mine', book: 'Isaiah', osis: 'ISA', chapter: 43 },
      { day: 6, label: 'Psalm 40 — He lifted me out of the pit', book: 'Psalms', osis: 'PSA', chapter: 40 },
      { day: 7, label: 'Romans 8 — More than conquerors through Him who loved us', book: 'Romans', osis: 'ROM', chapter: 8 },
    ]),
  },
  {
    id: 'emotion-stress', name: 'When You\'re Stressed', icon: '😮‍💨',
    description: 'Come to Me, all who are weary.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Matthew 11 — Come to me, all who are weary', book: 'Matthew', osis: 'MAT', chapter: 11 },
      { day: 2, label: 'Psalm 55 — Cast your burden on the Lord', book: 'Psalms', osis: 'PSA', chapter: 55 },
      { day: 3, label: 'Exodus 33 — My presence will go with you, and I will give you rest', book: 'Exodus', osis: 'EXO', chapter: 33 },
      { day: 4, label: 'Psalm 62 — My soul finds rest in God alone', book: 'Psalms', osis: 'PSA', chapter: 62 },
      { day: 5, label: 'Mark 6 — Come away to a quiet place and rest', book: 'Mark', osis: 'MRK', chapter: 6 },
      { day: 6, label: 'Psalm 127 — He gives sleep to His beloved', book: 'Psalms', osis: 'PSA', chapter: 127 },
      { day: 7, label: 'Hebrews 4 — There remains a Sabbath rest for the people of God', book: 'Hebrews', osis: 'HEB', chapter: 4 },
    ]),
  },
  {
    id: 'emotion-loss', name: 'When You\'re Grieving', icon: '🤍',
    description: 'He is close to the brokenhearted.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 34 — The Lord is near to the brokenhearted', book: 'Psalms', osis: 'PSA', chapter: 34 },
      { day: 2, label: 'John 11 — Jesus wept. He grieves with you', book: 'John', osis: 'JHN', chapter: 11 },
      { day: 3, label: '2 Corinthians 1 — The God of all comfort', book: '2 Corinthians', osis: '2CO', chapter: 1 },
      { day: 4, label: 'Revelation 21 — No more death or mourning or pain', book: 'Revelation', osis: 'REV', chapter: 21 },
      { day: 5, label: 'Psalm 116 — Precious in the sight of the Lord is the death of His saints', book: 'Psalms', osis: 'PSA', chapter: 116 },
      { day: 6, label: '1 Thessalonians 4 — We do not grieve as those without hope', book: '1 Thessalonians', osis: '1TH', chapter: 4 },
      { day: 7, label: 'Psalm 23 — Even in the valley of the shadow of death', book: 'Psalms', osis: 'PSA', chapter: 23 },
    ]),
  },
  // Row 5: Anger · Jealousy · Pride
  {
    id: 'emotion-anger', name: 'When You Feel Angry', icon: '🔥',
    description: 'Be angry and do not sin. Let God transform it.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'James 1 — Be slow to anger', book: 'James', osis: 'JAS', chapter: 1 },
      { day: 2, label: 'Ephesians 4 — Be angry and do not sin', book: 'Ephesians', osis: 'EPH', chapter: 4 },
      { day: 3, label: 'Proverbs 15 — A soft answer turns away wrath', book: 'Proverbs', osis: 'PRO', chapter: 15 },
      { day: 4, label: 'Psalm 37 — Refrain from anger and forsake wrath', book: 'Psalms', osis: 'PSA', chapter: 37 },
      { day: 5, label: 'Colossians 3 — Put away anger, wrath, malice', book: 'Colossians', osis: 'COL', chapter: 3 },
      { day: 6, label: 'Proverbs 29 — A fool gives full vent to his spirit', book: 'Proverbs', osis: 'PRO', chapter: 29 },
      { day: 7, label: 'Romans 12 — Overcome evil with good', book: 'Romans', osis: 'ROM', chapter: 12 },
    ]),
  },
  {
    id: 'emotion-jealousy', name: 'When You Feel Jealous', icon: '👁',
    description: 'A heart at peace gives life to the body.',
    category: 'intermediate' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Proverbs 14 — A tranquil heart gives life; envy rots the bones', book: 'Proverbs', osis: 'PRO', chapter: 14 },
      { day: 2, label: 'James 3 — Where jealousy exists, there is disorder', book: 'James', osis: 'JAS', chapter: 3 },
      { day: 3, label: 'Galatians 5 — The fruit of the Spirit vs the works of the flesh', book: 'Galatians', osis: 'GAL', chapter: 5 },
      { day: 4, label: 'Psalm 37 — Do not fret because of evildoers', book: 'Psalms', osis: 'PSA', chapter: 37 },
      { day: 5, label: '1 Corinthians 13 — Love does not envy', book: '1 Corinthians', osis: '1CO', chapter: 13 },
      { day: 6, label: 'Genesis 37 — Joseph\'s brothers. What jealousy does', book: 'Genesis', osis: 'GEN', chapter: 37 },
      { day: 7, label: 'Philippians 4 — I have learned to be content in every situation', book: 'Philippians', osis: 'PHP', chapter: 4 },
    ]),
  },
  {
    id: 'emotion-pride', name: 'When You Struggle with Pride', icon: '🪞',
    description: 'God opposes the proud but gives grace to the humble.',
    category: 'intermediate' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'James 4 — God opposes the proud, gives grace to the humble', book: 'James', osis: 'JAS', chapter: 4 },
      { day: 2, label: 'Proverbs 16 — Pride goes before destruction', book: 'Proverbs', osis: 'PRO', chapter: 16 },
      { day: 3, label: 'Philippians 2 — Have this mind which was in Christ Jesus', book: 'Philippians', osis: 'PHP', chapter: 2 },
      { day: 4, label: 'Daniel 4 — Nebuchadnezzar humbled', book: 'Daniel', osis: 'DAN', chapter: 4 },
      { day: 5, label: 'Luke 18 — The Pharisee and the tax collector', book: 'Luke', osis: 'LUK', chapter: 18 },
      { day: 6, label: 'Micah 6 — Walk humbly with your God', book: 'Micah', osis: 'MIC', chapter: 6 },
      { day: 7, label: 'John 13 — Jesus washes feet. The King serves', book: 'John', osis: 'JHN', chapter: 13 },
    ]),
  },
  // Row 6: Doubt · Temptation · Patience
  {
    id: 'emotion-doubt', name: 'When You Have Doubts', icon: '❓',
    description: 'Lord, I believe — help my unbelief.',
    category: 'intermediate' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Mark 9 — I believe; help my unbelief', book: 'Mark', osis: 'MRK', chapter: 9 },
      { day: 2, label: 'John 20 — Thomas sees and believes', book: 'John', osis: 'JHN', chapter: 20 },
      { day: 3, label: 'Hebrews 11 — The hall of faith', book: 'Hebrews', osis: 'HEB', chapter: 11 },
      { day: 4, label: 'Psalm 73 — Nearly losing faith, then seeing clearly', book: 'Psalms', osis: 'PSA', chapter: 73 },
      { day: 5, label: 'Romans 8 — If God is for us, who can be against us?', book: 'Romans', osis: 'ROM', chapter: 8 },
      { day: 6, label: 'Jude 1 — Have mercy on those who doubt', book: 'Jude', osis: 'JUD', chapter: 1 },
      { day: 7, label: 'Matthew 14 — Peter walks on water, then sinks. Jesus catches him', book: 'Matthew', osis: 'MAT', chapter: 14 },
    ]),
  },
  {
    id: 'emotion-temptation', name: 'When You\'re Tempted', icon: '⚔️',
    description: 'No temptation has overtaken you that is not common to man.',
    category: 'intermediate' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: '1 Corinthians 10 — God provides a way of escape', book: '1 Corinthians', osis: '1CO', chapter: 10 },
      { day: 2, label: 'James 1 — Blessed is the man who endures temptation', book: 'James', osis: 'JAS', chapter: 1 },
      { day: 3, label: 'Matthew 4 — Jesus tempted in the wilderness', book: 'Matthew', osis: 'MAT', chapter: 4 },
      { day: 4, label: 'Hebrews 4 — A high priest who was tempted in every way', book: 'Hebrews', osis: 'HEB', chapter: 4 },
      { day: 5, label: 'Galatians 5 — Walk by the Spirit and you will not gratify the flesh', book: 'Galatians', osis: 'GAL', chapter: 5 },
      { day: 6, label: 'Romans 6 — Dead to sin, alive to God', book: 'Romans', osis: 'ROM', chapter: 6 },
      { day: 7, label: 'Ephesians 6 — Put on the full armor of God', book: 'Ephesians', osis: 'EPH', chapter: 6 },
    ]),
  },
  {
    id: 'emotion-patience', name: 'When You Need Patience', icon: '⏳',
    description: 'Wait on the Lord. He is never late.',
    category: 'beginner' as const, group: 'emotions',
    days: reindex([
      { day: 1, label: 'Psalm 27 — Wait for the Lord; be strong', book: 'Psalms', osis: 'PSA', chapter: 27 },
      { day: 2, label: 'James 5 — Be patient, the Lord\'s coming is near', book: 'James', osis: 'JAS', chapter: 5 },
      { day: 3, label: 'Isaiah 40 — They who wait on the Lord shall renew their strength', book: 'Isaiah', osis: 'ISA', chapter: 40 },
      { day: 4, label: 'Galatians 6 — Do not grow weary in doing good', book: 'Galatians', osis: 'GAL', chapter: 6 },
      { day: 5, label: 'Romans 5 — Suffering produces perseverance', book: 'Romans', osis: 'ROM', chapter: 5 },
      { day: 6, label: 'Hebrews 10 — You need endurance to receive the promise', book: 'Hebrews', osis: 'HEB', chapter: 10 },
      { day: 7, label: 'Psalm 37 — Be still before the Lord and wait patiently', book: 'Psalms', osis: 'PSA', chapter: 37 },
    ]),
  },
];

const CATEGORY_LABELS: Record<ReadingPlan['category'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  deep: 'Deep Dive',
};

const CATEGORY_COLORS: Record<ReadingPlan['category'], string> = {
  beginner: '#4ade80',
  intermediate: '#60a5fa',
  deep: '#c084fc',
};

/* ─── Component ─────────────────────────────────────────────────────── */

const CUSTOM_PLANS_KEY = 'trace-custom-plans';

function loadCustomPlans(): ReadingPlan[] {
  try { const r = localStorage.getItem(CUSTOM_PLANS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveCustomPlans(plans: ReadingPlan[]) {
  localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(plans));
}

/* ─── Feeling Flow Data ─────────────────────────────────────────────── */

const CORE_FEELINGS = [
  { id: 'down',        label: 'Down or sad',            icon: '🌧', color: '#94a3b8' },
  { id: 'anxious',     label: 'Anxious or worried',     icon: '🌿', color: '#a78bfa' },
  { id: 'afraid',      label: 'Afraid or uncertain',    icon: '🛡', color: '#60a5fa' },
  { id: 'angry',       label: 'Frustrated or angry',    icon: '🔥', color: '#f97316' },
  { id: 'lost',        label: 'Lost or doubtful',       icon: '❓', color: '#8b5cf6' },
  { id: 'lonely',      label: 'Alone or lonely',        icon: '🤝', color: '#818cf8' },
  { id: 'grateful',    label: 'Grateful or joyful',     icon: '🌻', color: '#facc15' },
  { id: 'overwhelmed', label: 'Overwhelmed or stressed', icon: '🌊', color: '#38bdf8' },
  { id: 'grieving',    label: 'Grieving or in pain',    icon: '🤍', color: '#e2e8f0' },
] as const;

type CoreFeelingId = typeof CORE_FEELINGS[number]['id'];

const FOLLOW_UPS: Record<CoreFeelingId, { question: string; options: { label: string; planId: string }[] }> = {
  down: {
    question: "What's weighing on you most right now?",
    options: [
      { label: "I've lost hope",        planId: 'emotion-hope' },
      { label: "I feel depressed",      planId: 'emotion-depression' },
      { label: "I'm grieving a loss",   planId: 'emotion-loss' },
      { label: "I'm just exhausted",    planId: 'emotion-stress' },
    ],
  },
  anxious: {
    question: "What's stirring the most anxiety?",
    options: [
      { label: "The future feels uncertain", planId: 'emotion-peace' },
      { label: "A relationship or person",   planId: 'emotion-love' },
      { label: "A big decision I face",      planId: 'emotion-patience' },
      { label: "Everything all at once",     planId: 'emotion-anxiety' },
    ],
  },
  afraid: {
    question: "What kind of fear is it?",
    options: [
      { label: "Something specific scares me", planId: 'emotion-fear' },
      { label: "I doubt and question a lot",   planId: 'emotion-doubt' },
      { label: "I'm afraid of being alone",    planId: 'emotion-lonely' },
      { label: "I'm afraid I'll fail",         planId: 'emotion-temptation' },
    ],
  },
  angry: {
    question: "What's underneath the anger?",
    options: [
      { label: "Life feels deeply unfair",   planId: 'emotion-patience' },
      { label: "Someone hurt me",            planId: 'emotion-healing' },
      { label: "I'm angry at myself",        planId: 'emotion-pride' },
      { label: "I feel like giving up",      planId: 'emotion-hope' },
    ],
  },
  lost: {
    question: "Where is the doubt hitting hardest?",
    options: [
      { label: "Questioning God or faith",    planId: 'emotion-doubt' },
      { label: "Questioning myself",          planId: 'emotion-depression' },
      { label: "Unsure about the future",     planId: 'emotion-patience' },
      { label: "Wrestling with temptation",   planId: 'emotion-temptation' },
    ],
  },
  lonely: {
    question: "What does the loneliness feel like?",
    options: [
      { label: "I feel unseen and invisible", planId: 'emotion-lonely' },
      { label: "I'm missing deep connection", planId: 'emotion-love' },
      { label: "I'm in a dark place alone",   planId: 'emotion-depression' },
      { label: "I'm questioning everything",  planId: 'emotion-doubt' },
    ],
  },
  grateful: {
    question: "Beautiful! What are you hungry for more of?",
    options: [
      { label: "Even more joy",              planId: 'emotion-joy' },
      { label: "To love deeper",            planId: 'emotion-love' },
      { label: "Stillness and peace",       planId: 'emotion-peace' },
      { label: "Strength to keep going",    planId: 'emotion-patience' },
    ],
  },
  overwhelmed: {
    question: "What's pressing in the most?",
    options: [
      { label: "Too much is happening at once", planId: 'emotion-overwhelmed' },
      { label: "I can't find rest or stillness", planId: 'emotion-stress' },
      { label: "Anxiety is taking over",         planId: 'emotion-anxiety' },
      { label: "Fear underneath it all",         planId: 'emotion-fear' },
    ],
  },
  grieving: {
    question: "What kind of pain are you carrying?",
    options: [
      { label: "I lost someone I love",    planId: 'emotion-loss' },
      { label: "Physical or chronic pain", planId: 'emotion-healing' },
      { label: "A deep heartbreak",        planId: 'emotion-depression' },
      { label: "Anger mixed with grief",   planId: 'emotion-anger' },
    ],
  },
};

export default function ReadingPlans({ accentColor, onNavigateToRead }: Props) {
  const [view, setView] = useState<'browse' | 'active' | 'create'>('browse');
  const [feelingStep, setFeelingStep] = useState<0 | 1 | 2 | 3>(0);
  const [feelingId, setFeelingId] = useState<CoreFeelingId | null>(null);
  const [feelingPlanId, setFeelingPlanId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['emotions']));
  const [progress, setProgress] = useState<PlanProgress[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [completedPlanId, setCompletedPlanId] = useState<string | null>(null);
  const [customPlans, setCustomPlans] = useState<ReadingPlan[]>([]);

  // Custom plan builder state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanDays, setNewPlanDays] = useState<ReadingDay[]>([]);
  const [addBook, setAddBook] = useState('');
  const [addChapter, setAddChapter] = useState(1);

  // Load from localStorage
  useEffect(() => {
    setProgress(loadProgress());
    setCustomPlans(loadCustomPlans());
  }, []);

  // Check if Life of Jesus is completed (unlocks custom plans)
  const lifeOfJesusCompleted = useMemo(() => {
    const loj = progress.find(p => p.planId === 'life-of-jesus');
    if (!loj) return false;
    const plan = PLANS.find(p => p.id === 'life-of-jesus');
    return plan ? loj.completedDays.length >= plan.days.length : false;
  }, [progress]);

  const allPlans = useMemo(() => [...PLANS, ...customPlans], [customPlans]);
  const activePlanIds = useMemo(() => new Set(progress.map(p => p.planId)), [progress]);

  const updateProgress = useCallback((next: PlanProgress[]) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  /* ── Actions ──────────────────────────────────────────────────────── */

  const startPlan = useCallback((planId: string) => {
    const entry: PlanProgress = {
      planId,
      startedAt: new Date().toISOString(),
      completedDays: [],
      lastReadAt: null,
    };
    const next = [...progress, entry];
    updateProgress(next);
    setView('active');
    setExpandedPlan(planId);
  }, [progress, updateProgress]);

  const removePlan = useCallback((planId: string) => {
    updateProgress(progress.filter(p => p.planId !== planId));
    if (expandedPlan === planId) setExpandedPlan(null);
  }, [progress, expandedPlan, updateProgress]);

  const toggleDay = useCallback((planId: string, day: number) => {
    const next = progress.map(p => {
      if (p.planId !== planId) return p;
      const completed = p.completedDays.includes(day)
        ? p.completedDays.filter(d => d !== day)
        : [...p.completedDays, day];
      return { ...p, completedDays: completed, lastReadAt: new Date().toISOString() };
    });
    updateProgress(next);

    // Check if plan just completed
    const plan = allPlans.find(pl => pl.id === planId);
    const updated = next.find(p => p.planId === planId);
    if (plan && updated && updated.completedDays.length === plan.days.length) {
      setCompletedPlanId(planId);
    }
  }, [progress, updateProgress]);

  const handleReadNow = useCallback((day: ReadingDay, planId: string) => {
    const bookDef = BOOKS.find(b => b.osis === day.osis);
    if (!bookDef) return;
    // Mark the day as complete
    const prog = progress.find(p => p.planId === planId);
    if (prog && !prog.completedDays.includes(day.day)) {
      toggleDay(planId, day.day);
    }
    onNavigateToRead(bookDef, day.chapter);
  }, [progress, toggleDay, onNavigateToRead]);

  /* ── Streak helper ───────────────────────────────────────────────── */

  const getStreak = useCallback((prog: PlanProgress, plan: ReadingPlan): number => {
    const sorted = [...prog.completedDays].sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    let streak = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      if (sorted[i] - sorted[i - 1] === 1) streak++;
      else break;
    }
    return streak;
  }, []);

  /* ── Suggest today's day ─────────────────────────────────────────── */

  const getTodayDay = useCallback((prog: PlanProgress, plan: ReadingPlan): number => {
    // First incomplete day
    for (let i = 0; i < plan.days.length; i++) {
      if (!prog.completedDays.includes(plan.days[i].day)) return plan.days[i].day;
    }
    return plan.days[plan.days.length - 1].day;
  }, []);

  /* ── Render ───────────────────────────────────────────────────────── */

  const accentRgb = accentColor; // Passed directly

  // Completion celebration overlay
  if (completedPlanId) {
    const plan = allPlans.find(p => p.id === completedPlanId);
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 400, textAlign: 'center', padding: 32,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{'\uD83C\uDF89'}</div>
        <h2 style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700,
          color: accentColor, marginBottom: 8,
        }}>
          Plan Complete!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 8, maxWidth: 320 }}>
          You finished <strong style={{ color: '#fff' }}>{plan?.name}</strong>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
          {plan?.days.length} days of faithful reading. Well done!
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => { setCompletedPlanId(null); setView('active'); }}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: accentColor, color: '#000', fontWeight: 600, fontSize: 14,
            }}
          >
            Back to Plans
          </button>
          <button
            onClick={() => {
              removePlan(completedPlanId);
              setCompletedPlanId(null);
              setView('browse');
            }}
            style={{
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: `1px solid rgba(255,255,255,0.15)`,
              color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: 14,
            }}
          >
            Remove Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px', paddingBottom: 100 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes planGlowSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
      `}} />
      {/* ── Toggle Browse / Active ────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden',
        border: `1px solid rgba(255,255,255,0.1)`,
      }}>
        {(['browse', 'active', 'create'] as const).map(v => (
          <button
            key={v}
            onClick={() => {
              if (v === 'create' && !lifeOfJesusCompleted) return;
              setView(v);
            }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: view === v ? accentColor : 'transparent',
              color: view === v ? '#000' : v === 'create' && !lifeOfJesusCompleted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
              fontWeight: 600, fontSize: 12, fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.2s',
            }}
          >
            {v === 'browse' ? 'Browse' : v === 'active' ? `My Plans (${progress.length})` : lifeOfJesusCompleted ? '+ Create' : '🔒 Create'}
          </button>
        ))}
      </div>

      {/* ── Browse View ──────────────────────────────────────────── */}
      {view === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PLAN_GROUPS.map((group, groupIdx) => {
            const groupPlans = allPlans.filter(p => p.group === group.id);
            if (groupPlans.length === 0) return null;
            return (
              <div key={group.id}>
                {/* Glowing divider between groups */}
                {groupIdx > 0 && (
                  <div style={{ position: 'relative', height: 3, margin: '8px 0 16px' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `linear-gradient(90deg, transparent 5%, ${accentColor}55 50%, transparent 95%)` }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '30%', background: `linear-gradient(90deg, transparent, ${accentColor}, ${accentColor}, transparent)`, animation: 'planGlowSweep 4s ease-in-out infinite', boxShadow: `0 0 10px ${accentColor}88, 0 0 20px ${accentColor}44` }} />
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', overflow: 'hidden', filter: 'blur(3px)' }}>
                      <div style={{ height: '100%', width: '30%', background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`, animation: 'planGlowSweep 4s ease-in-out infinite' }} />
                    </div>
                  </div>
                )}
                {/* Group header — collapsible */}
                <button
                  onClick={() => {
                    const next = new Set(expandedGroups);
                    if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                    setExpandedGroups(next);
                  }}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: expandedGroups.has(group.id) ? 12 : 0,
                  }}
                >
                  <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
                  <span style={{ fontSize: 24 }}>{group.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 900, color: accentColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{group.name}</h3>
                    <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.35)', margin: '2px 0 0 0' }}>{group.desc}</p>
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: expandedGroups.has(group.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s', marginRight: 4 }}>▾</span>
                </button>
                {/* Plans in group */}
                {expandedGroups.has(group.id) && group.id === 'emotions' ? (
                  /* ── Feeling Flow ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {feelingStep === 0 && (
                      <>
                        {/* Prompt card */}
                        <div style={{
                          borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden',
                          background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}06 100%)`,
                          border: `1px solid ${accentColor}28`,
                        }}>
                          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 52, opacity: 0.05, fontFamily: 'Georgia, serif', lineHeight: 1 }}>♡</div>
                          <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: `${accentColor}88`, marginBottom: 6 }}>Right now, in this moment</p>
                          <p style={{ fontSize: 22, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 6px' }}>
                            How are you feeling?
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(232,240,236,0.5)', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: 0 }}>
                            Tap what's on your heart and we'll guide you to the right scripture.
                          </p>
                        </div>
                        {/* 3-column feeling grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {CORE_FEELINGS.map(f => (
                            <button key={f.id}
                              onClick={() => { setFeelingId(f.id); setFeelingStep(1); }}
                              style={{
                                padding: '14px 8px', borderRadius: 16, border: `1.5px solid ${f.color}33`,
                                background: `${f.color}0e`, cursor: 'pointer', display: 'flex',
                                flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                              }}>
                              <span style={{ fontSize: 24 }}>{f.icon}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#e8f0ec', textAlign: 'center', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {feelingStep === 1 && feelingId && (() => {
                      const feeling = CORE_FEELINGS.find(f => f.id === feelingId)!;
                      const followUp = FOLLOW_UPS[feelingId];
                      return (
                        <>
                          {/* Back + feeling pill */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => { setFeelingStep(0); setFeelingId(null); }} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, padding: '6px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>← Back</button>
                            <span style={{ padding: '4px 12px', borderRadius: 99, background: `${feeling.color}22`, color: feeling.color, fontWeight: 700, fontSize: 11 }}>{feeling.icon} {feeling.label}</span>
                          </div>
                          {/* Question card */}
                          <div style={{ borderRadius: 18, padding: '18px 18px 14px', background: `linear-gradient(135deg, ${feeling.color}12 0%, ${feeling.color}06 100%)`, border: `1px solid ${feeling.color}25` }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Tell me more</p>
                            <p style={{ fontSize: 19, fontWeight: 900, color: '#f0f8f4', fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em', lineHeight: 1.25, margin: 0 }}>
                              {followUp.question}
                            </p>
                          </div>
                          {/* Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {followUp.options.map(opt => (
                              <button key={opt.planId}
                                onClick={() => { setFeelingPlanId(opt.planId); setFeelingStep(2); }}
                                style={{
                                  padding: '14px 18px', borderRadius: 14, border: `1px solid ${feeling.color}28`,
                                  background: `${feeling.color}0c`, cursor: 'pointer', textAlign: 'left',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                  transition: 'all 0.2s',
                                }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f0ec', letterSpacing: '-0.01em' }}>{opt.label}</span>
                                <span style={{ color: feeling.color, fontSize: 16, flexShrink: 0 }}>→</span>
                              </button>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {feelingStep === 2 && feelingId && feelingPlanId && (() => {
                      const feeling = CORE_FEELINGS.find(f => f.id === feelingId)!;
                      const plan = allPlans.find(p => p.id === feelingPlanId);
                      if (!plan) return null;
                      const isActive = activePlanIds.has(plan.id);
                      return (
                        <>
                          {/* Back */}
                          <button onClick={() => { setFeelingStep(1); setFeelingPlanId(null); }} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, padding: '6px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>← Back</button>
                          {/* Reveal card */}
                          <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${feeling.color}35`, background: `linear-gradient(160deg, ${feeling.color}18 0%, rgba(10,18,14,0.6) 100%)` }}>
                            <div style={{ padding: '20px 20px 14px' }}>
                              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: `${feeling.color}88`, margin: '0 0 8px' }}>We found something for you</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <span style={{ fontSize: 34 }}>{plan.icon}</span>
                                <div>
                                  <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 17, fontWeight: 900, color: '#f0f8f4', margin: 0, letterSpacing: '-0.02em' }}>{plan.name}</h3>
                                  <p style={{ fontSize: 10, color: `${feeling.color}`, margin: '3px 0 0', fontWeight: 700 }}>{plan.days.length}-day reading plan</p>
                                </div>
                              </div>
                              <p style={{ fontSize: 13, color: 'rgba(232,240,236,0.65)', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: '0 0 16px', lineHeight: 1.5 }}>{plan.description}</p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => { if (!isActive) startPlan(plan.id); else { setView('active'); setExpandedPlan(plan.id); } setFeelingStep(0); setFeelingId(null); setFeelingPlanId(null); }}
                                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: feeling.color, color: '#000', fontWeight: 800, fontSize: 14, fontFamily: 'Montserrat, sans-serif' }}>
                                  {isActive ? 'Continue Plan →' : 'Start This Plan →'}
                                </button>
                                <button
                                  onClick={() => { setFeelingStep(0); setFeelingId(null); setFeelingPlanId(null); }}
                                  style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                                  Start over
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : expandedGroups.has(group.id) ? (
                  /* Standard plan grid — 2 columns, equal height per row */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'stretch' }}>
                    {(() => {
                      const sorted = [...groupPlans].sort((a, b) => {
                        const order = { beginner: 0, intermediate: 1, deep: 2 };
                        return order[a.category] - order[b.category];
                      });
                      // Interleave: beginner on left (even index), intermediate/deep on right (odd index)
                      const beginners = sorted.filter(p => p.category === 'beginner');
                      const advanced = sorted.filter(p => p.category !== 'beginner');
                      const interleaved: typeof sorted = [];
                      const maxLen = Math.max(beginners.length, advanced.length);
                      for (let i = 0; i < maxLen; i++) {
                        if (i < beginners.length) interleaved.push(beginners[i]);
                        if (i < advanced.length) interleaved.push(advanced[i]);
                      }
                      return interleaved;
                    })().map(plan => {
                      const isActive = activePlanIds.has(plan.id);
                      const catColor = CATEGORY_COLORS[plan.category] || accentColor;
                      return (
                        <button key={plan.id} onClick={() => isActive ? setExpandedPlan(plan.id) : startPlan(plan.id)}
                          style={{
                            background: isActive ? `${catColor}0c` : `${catColor}06`,
                            border: `1.5px solid ${isActive ? catColor + '44' : catColor + '18'}`,
                            borderRadius: 14, padding: 14, textAlign: 'center', cursor: 'pointer',
                            transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                            boxShadow: isActive ? `0 0 12px ${catColor}15` : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                          }}>
                          {/* Ghost icon */}
                          <div style={{ position: 'absolute', top: -4, right: -4, fontSize: 40, opacity: 0.05, pointerEvents: 'none' }}>{plan.icon}</div>
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
                            <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>{plan.icon}</span>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 800, color: '#f0f8f4', margin: '0 0 4px', lineHeight: 1.2, textAlign: 'center' }}>{plan.name}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 0', lineHeight: 1.3, textAlign: 'center', flex: 1 }}>
                              {plan.description.length > 55 ? plan.description.slice(0, 55) + '…' : plan.description}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${catColor}22`, color: catColor }}>{plan.days.length} days</span>
                              {isActive ? (
                                <span style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>✓ Active</span>
                              ) : (
                                <span style={{ fontSize: 10, color: `${accentColor}66`, fontWeight: 600 }}>Start →</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active Plans View ────────────────────────────────────── */}
      {view === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {progress.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83D\uDCD6'}</div>
              <p style={{ fontSize: 15, marginBottom: 16 }}>No active plans yet.</p>
              <button
                onClick={() => setView('browse')}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: accentColor, color: '#000', fontWeight: 600, fontSize: 14,
                }}
              >
                Browse Plans
              </button>
            </div>
          )}

          {progress.map(prog => {
            const plan = allPlans.find(p => p.id === prog.planId);
            if (!plan) return null;

            const isExpanded = expandedPlan === prog.planId;
            const completedCount = prog.completedDays.length;
            const totalDays = plan.days.length;
            const pct = Math.round((completedCount / totalDays) * 100);
            const streak = getStreak(prog, plan);
            const todayDay = getTodayDay(prog, plan);
            const todayReading = plan.days.find(d => d.day === todayDay);

            return (
              <div
                key={prog.planId}
                style={{
                  background: T.cardBg, border: `1px solid ${T.cardBorder}`,
                  borderRadius: 14, overflow: 'hidden',
                }}
              >
                {/* Plan header — always visible */}
                <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    onClick={() => setExpandedPlan(isExpanded ? null : prog.planId)}
                    style={{ display: 'contents', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: 24, cursor: 'pointer' }} onClick={() => setExpandedPlan(isExpanded ? null : prog.planId)}>{plan.icon}</div>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedPlan(isExpanded ? null : prog.planId)}>
                    <h3 style={{
                      fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
                      color: '#fff', margin: 0,
                    }}>
                      {plan.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: accentColor, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {completedCount}/{totalDays}
                      </span>
                    </div>
                  </div>
                  {/* Remove button — always visible */}
                  <button
                    onClick={() => removePlan(prog.planId)}
                    title="Remove plan"
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)',
                      fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                    }}
                  >
                    ✕
                  </button>
                  <div
                    onClick={() => setExpandedPlan(isExpanded ? null : prog.planId)}
                    style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', cursor: 'pointer' }}
                  >
                    {'\u25BC'}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{
                    padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {/* Stats row */}
                    <div style={{
                      display: 'flex', gap: 16, padding: '12px 0', marginBottom: 8,
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: accentColor, fontSize: 20, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
                          {pct}%
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase' }}>
                          Complete
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: accentColor, fontSize: 20, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
                          {streak}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase' }}>
                          Streak
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: accentColor, fontSize: 20, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
                          {totalDays - completedCount}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase' }}>
                          Remaining
                        </div>
                      </div>
                    </div>

                    {/* Today's reading highlight */}
                    {todayReading && completedCount < totalDays && (
                      <div style={{
                        background: `${accentColor}15`, border: `1px solid ${accentColor}33`,
                        borderRadius: 10, padding: 12, marginBottom: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ color: accentColor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                            Today&apos;s Reading
                          </div>
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                            {todayReading.label}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReadNow(todayReading, prog.planId)}
                          style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: accentColor, color: '#000', fontWeight: 700, fontSize: 13,
                          }}
                        >
                          Read Now
                        </button>
                      </div>
                    )}

                    {/* Calendar grid of days */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
                      marginBottom: 12,
                    }}>
                      {plan.days.map(day => {
                        const done = prog.completedDays.includes(day.day);
                        const isToday = day.day === todayDay && !done;
                        return (
                          <button
                            key={day.day}
                            onClick={() => toggleDay(prog.planId, day.day)}
                            title={day.label}
                            style={{
                              width: '100%', aspectRatio: '1', borderRadius: 8,
                              border: isToday ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                              background: done ? accentColor : 'rgba(255,255,255,0.03)',
                              color: done ? '#000' : isToday ? accentColor : 'rgba(255,255,255,0.4)',
                              fontSize: 11, fontWeight: done ? 700 : 500,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            {done ? '\u2713' : day.day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day list */}
                    <div style={{
                      maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                      {plan.days.map(day => {
                        const done = prog.completedDays.includes(day.day);
                        const isToday = day.day === todayDay && !done;
                        return (
                          <div
                            key={day.day}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px',
                              borderRadius: 8,
                              background: isToday ? `${accentColor}10` : 'transparent',
                            }}
                          >
                            <button
                              onClick={() => toggleDay(prog.planId, day.day)}
                              style={{
                                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                border: done ? 'none' : '2px solid rgba(255,255,255,0.15)',
                                background: done ? accentColor : 'transparent',
                                color: done ? '#000' : 'transparent',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {done ? '\u2713' : ''}
                            </button>
                            <span style={{
                              flex: 1, fontSize: 13, color: done ? 'rgba(255,255,255,0.35)' : '#fff',
                              textDecoration: done ? 'line-through' : 'none',
                            }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 6, fontSize: 11 }}>
                                Day {day.day}
                              </span>
                              {day.label}
                            </span>
                            {!done && (
                              <button
                                onClick={() => handleReadNow(day, prog.planId)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                  background: 'rgba(255,255,255,0.06)', color: accentColor,
                                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                }}
                              >
                                Read
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Custom Plan View ───────────────────────────────── */}
      {view === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: `${accentColor}66`, marginBottom: 12 }}>
              Create Your Own Plan
            </p>

            {/* Plan name */}
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={newPlanName} onChange={e => setNewPlanName(e.target.value)}
              placeholder="Plan name (e.g., My Lenten Journey)"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, background: `${accentColor}0d`, color: '#f0f8f4', marginBottom: 8, boxSizing: 'border-box' as const }} />

            {/* Plan description */}
            <input autoCorrect="on" autoCapitalize="sentences" spellCheck={true} value={newPlanDesc} onChange={e => setNewPlanDesc(e.target.value)}
              placeholder="Short description (optional)"
              style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: 'none', outline: 'none', fontSize: 12, background: `${accentColor}0d`, color: '#f0f8f4', marginBottom: 12, boxSizing: 'border-box' as const }} />

            {/* Add readings */}
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: `${accentColor}44`, marginBottom: 8 }}>
              Add Readings ({newPlanDays.length} days)
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select value={addBook} onChange={e => { setAddBook(e.target.value); setAddChapter(1); }}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', outline: 'none', fontSize: 12, background: `${accentColor}0d`, color: '#f0f8f4' }}>
                <option value="" style={{ background: '#0a1410' }}>Select book…</option>
                {BOOKS.map(b => (
                  <option key={b.osis} value={b.osis} style={{ background: '#0a1410' }}>{b.name}</option>
                ))}
              </select>
              <select value={addChapter} onChange={e => setAddChapter(Number(e.target.value))}
                style={{ width: 70, padding: '8px 6px', borderRadius: 8, border: 'none', outline: 'none', fontSize: 12, background: `${accentColor}0d`, color: '#f0f8f4' }}>
                {Array.from({ length: (BOOKS.find(b => b.osis === addBook)?.chapters || 1) }, (_, i) => (
                  <option key={i + 1} value={i + 1} style={{ background: '#0a1410' }}>Ch {i + 1}</option>
                ))}
              </select>
              <button onClick={() => {
                if (!addBook) return;
                const book = BOOKS.find(b => b.osis === addBook);
                if (!book) return;
                setNewPlanDays(prev => [...prev, {
                  day: prev.length + 1,
                  label: `${book.name} ${addChapter}`,
                  book: book.name,
                  osis: book.osis,
                  chapter: addChapter,
                }]);
              }} disabled={!addBook}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: accentColor, color: '#000', fontWeight: 700, fontSize: 12, opacity: addBook ? 1 : 0.3 }}>
                Add
              </button>
            </div>

            {/* Added days list */}
            {newPlanDays.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto' as const, marginBottom: 12 }}>
                {newPlanDays.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: `${accentColor}88`, width: 20 }}>D{d.day}</span>
                      <span style={{ fontSize: 12, color: '#f0f8f4' }}>{d.label}</span>
                    </div>
                    <button onClick={() => setNewPlanDays(prev => reindex(prev.filter((_, idx) => idx !== i)))}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick add range */}
            {addBook && (
              <button onClick={() => {
                const book = BOOKS.find(b => b.osis === addBook);
                if (!book) return;
                const newDays = Array.from({ length: book.chapters }, (_, i) => ({
                  day: newPlanDays.length + i + 1,
                  label: `${book.name} ${i + 1}`,
                  book: book.name,
                  osis: book.osis,
                  chapter: i + 1,
                }));
                setNewPlanDays(prev => reindex([...prev, ...newDays]));
              }} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: `${accentColor}14`, color: accentColor, fontWeight: 600, fontSize: 11, marginBottom: 12 }}>
                + Add All {BOOKS.find(b => b.osis === addBook)?.chapters} Chapters of {BOOKS.find(b => b.osis === addBook)?.name}
              </button>
            )}

            {/* Save plan */}
            <button onClick={() => {
              if (!newPlanName.trim() || newPlanDays.length === 0) return;
              const id = `custom-${Date.now()}`;
              const plan: ReadingPlan = {
                id,
                name: newPlanName.trim(),
                description: newPlanDesc.trim() || `Custom ${newPlanDays.length}-day plan`,
                icon: '📝',
                category: 'intermediate',
                group: 'custom',
                days: newPlanDays,
              };
              const updated = [...customPlans, plan];
              setCustomPlans(updated);
              saveCustomPlans(updated);
              setNewPlanName('');
              setNewPlanDesc('');
              setNewPlanDays([]);
              setAddBook('');
              setView('browse');
            }} disabled={!newPlanName.trim() || newPlanDays.length === 0}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: accentColor, color: '#000', fontWeight: 700, fontSize: 14, opacity: newPlanName.trim() && newPlanDays.length > 0 ? 1 : 0.3 }}>
              Save Plan ({newPlanDays.length} days)
            </button>
          </div>

          {/* Existing custom plans */}
          {customPlans.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: `${accentColor}44`, marginBottom: 8 }}>
                Your Custom Plans
              </p>
              {customPlans.map(plan => (
                <div key={plan.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f8f4' }}>{plan.name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{plan.days.length} days</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!activePlanIds.has(plan.id) && (
                      <button onClick={() => startPlan(plan.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: accentColor, color: '#000', fontWeight: 700, fontSize: 11 }}>Start</button>
                    )}
                    <button onClick={() => { const u = customPlans.filter(p => p.id !== plan.id); setCustomPlans(u); saveCustomPlans(u); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
