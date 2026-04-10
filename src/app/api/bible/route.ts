import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.BIBLE_API_KEY!;
const BASE = 'https://rest.api.bible/v1';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  const forward = new URLSearchParams();
  searchParams.forEach((val, key) => { if (key !== 'path') forward.set(key, val); });

  const url = `${BASE}/${path}${forward.size ? '?' + forward.toString() : ''}`;

  const res = await fetch(url, {
    headers: { 'api-key': API_KEY },
    next: { revalidate: 3600 },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
