import 'server-only';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a knowledgeable, warm Bible study companion. You have deep expertise in:
- Biblical history, archaeology, and cultural context
- Hebrew and Greek original languages
- Theology across major Christian traditions
- How different passages connect across the Old and New Testaments

Your tone is like a wise pastor who loves helping people understand Scripture — accessible, never condescending, substantive but not overwhelming. You use Scripture references to back up your points. When there are different scholarly or denominational perspectives on a topic, you mention them fairly.

Keep responses focused and conversational. Use brief formatting (short paragraphs, occasional bold for key terms) but don't over-format.`;

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();

  const contextNote = context
    ? `\n\n[The user is currently reading ${context.book} ${context.chapter} in the ${context.translation}.]`
    : '';

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYSTEM + contextNote,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
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
