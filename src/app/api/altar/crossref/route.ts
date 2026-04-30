import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth, rateLimit, rateLimitKeyFor, readJsonBody } from '@/lib/api/security';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const caller = await verifyAuth(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimit({
    key: rateLimitKeyFor(req, 'altar:crossref', caller),
    max: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: string; verseText?: string; translation?: string }>(req, 16 * 1024);
  if (body instanceof NextResponse) return body;
  const { reference, verseText, translation } = body;
  if (!reference || !verseText || !translation) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const prompt = `Given this Bible verse:

${reference} (${translation}): "${verseText}"

Provide 4-6 cross-references — other Bible verses that directly relate to this passage. For each one:
1. The reference (e.g. "Romans 8:28")
2. A brief quote or paraphrase of the key phrase
3. One sentence explaining how it connects

Return as JSON array:
[{"ref": "Book Ch:V", "quote": "brief text", "connection": "how it relates"}]

Only return the JSON array, no other text.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  let refs: unknown[] = [];
  if (jsonMatch) {
    try { refs = JSON.parse(jsonMatch[0]); } catch { refs = []; }
  }

  return Response.json(refs);
}
