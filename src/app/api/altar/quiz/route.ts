import 'server-only';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { book, chapter, verseTexts, translation } = await req.json();

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
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return Response.json(questions);
}
