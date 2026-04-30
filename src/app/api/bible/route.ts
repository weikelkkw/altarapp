import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.BIBLE_API_KEY!;
const BASE = 'https://rest.api.bible/v1';

// SSRF guard: only forward paths that match scripture.api.bible's documented
// endpoint shape. Anything with absolute URLs, traversal, or odd characters
// is rejected outright so a user can't pivot the proxy elsewhere.
const ALLOWED_PATH_RE = /^bibles(?:\/[A-Za-z0-9._-]+(?:\/(?:books|chapters|verses|passages|search|sections)(?:\/[A-Za-z0-9._:-]+)?)?)?$/;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  // Reject absolute URLs, traversal, schemes, and anything not matching the allowlist.
  if (path.includes('..') || path.includes('//') || /^[a-z]+:/i.test(path) || !ALLOWED_PATH_RE.test(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  // Only forward known-safe query params used by scripture.api.bible.
  const ALLOWED_PARAMS = new Set([
    'content-type', 'include-notes', 'include-titles', 'include-chapter-numbers',
    'include-verse-numbers', 'include-verse-spans', 'parallels', 'use-org-id',
    'limit', 'offset', 'sort', 'range', 'fums-version', 'query',
  ]);
  const forward = new URLSearchParams();
  searchParams.forEach((val, key) => {
    if (key === 'path') return;
    if (!ALLOWED_PARAMS.has(key)) return;
    if (val.length > 200) return;
    forward.set(key, val);
  });

  const url = `${BASE}/${path}${forward.size ? '?' + forward.toString() : ''}`;

  const res = await fetch(url, {
    headers: { 'api-key': API_KEY },
    next: { revalidate: 3600 },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
