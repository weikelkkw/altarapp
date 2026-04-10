import 'server-only';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { reference, verseText, translation } = await req.json();

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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const refs = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return Response.json(refs);
}
