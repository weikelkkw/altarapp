import 'server-only';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { reference, verseText, translation, question, mode } = await req.json();

  const prompt = question
    ? `A Bible student is reading ${reference} (${translation}) and has a question:\n\n"${verseText}"\n\nTheir question: ${question}\n\nAnswer thoughtfully and clearly, as a knowledgeable pastor or scholar would. Be warm, not academic.`
    : mode === 'chapter'
    ? `Please give a deep study of this entire chapter:\n\n${reference} (${translation})\n\n${verseText}\n\nWrite a flowing, insightful commentary on this chapter as a whole — like a pastor preparing to preach it. Cover:\n- The big idea or central theme of this chapter\n- The historical and cultural setting\n- The flow of the narrative or argument verse by verse\n- Key moments or turning points\n- Important word meanings if relevant\n- How this chapter connects to the broader arc of Scripture\n- What it means for a believer reading it today\n\nWrite warmly and accessibly — substantive but not overwhelming. Do not use rigid numbered headers; let it flow naturally as commentary.`
    : `Please give a rich study breakdown of this verse:\n\n${reference} (${translation}): "${verseText}"\n\nCover these naturally (not as rigid headers — write it as flowing, insightful commentary):\n- What it plainly means\n- The historical and cultural moment it was written in\n- Any important Hebrew or Greek word nuances\n- How it connects to the broader story of Scripture\n- What it means for someone reading it today\n\nWrite as a knowledgeable but warm pastor — accessible, not academic. Be substantive but not overwhelming.`;

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: mode === 'chapter' ? 2400 : 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
