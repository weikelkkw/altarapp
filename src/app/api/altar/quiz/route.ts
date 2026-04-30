import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth, rateLimit, rateLimitKeyFor, readJsonBody } from '@/lib/api/security';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'altar:quiz', caller),
    max: 15,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody<{ book?: string; chapter?: number; verseTexts?: { verse: number; text: string }[]; translation?: string }>(req, 64 * 1024);
  if (body instanceof NextResponse) return body;
  const { book, chapter, verseTexts, translation } = body;
  if (!book || !chapter || !Array.isArray(verseTexts) || verseTexts.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const passage = verseTexts.map((v: { verse: number; text: string }) =>
    `${v.verse}. ${v.text}`
  ).join('\n');

  const prompt = `Based on this Bible chapter:

${book} ${chapter} (${translation}):
${passage}

Generate 5 engaging quiz questions that test understanding of this chapter. Mix question types:
- 2 factual recall (who, what, where)
- 2 comprehension (why, meaning)
- 1 application/reflection

Return as JSON array:
[{
  "question": "the question",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "explanation": "Brief explanation of why this is correct, with verse reference"
}]

Make it feel like a thoughtful Bible study, not a dry test. Only return the JSON array.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  let questions: unknown[] = [];
  if (jsonMatch) {
    try { questions = JSON.parse(jsonMatch[0]); } catch { questions = []; }
  }

  return Response.json(questions);
}
