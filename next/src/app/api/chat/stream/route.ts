// /app/api/chat/stream/route.ts
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/src/app/api/chat/stream/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function GET(req: NextRequest) {
  // 1) Build your prompt + messages for OpenAI
  const userMessage = req.nextUrl.searchParams.get("q") || "Say something";

  const messages = [
    { role: "system", content: "You are a helpful SSE streaming assistant" },
    { role: "user", content: userMessage },
  ];

  // 2) Set SSE headers
  const encoder = new TextEncoder();
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // 3) Create a ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 3a) Call OpenAI with streaming
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          stream: true,
          temperature: 0.7,
        });

        // 3b) for-await the streaming chunks
        for await (const chunk of response) {
          const delta = chunk.choices[0].delta?.content || "";
          // Each SSE event: "data: partial text\n\n"
          const ssePayload = `data: ${delta}\n\n`;
          controller.enqueue(encoder.encode(ssePayload));
        }

        // 3c) Done
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  // 4) Return the SSE stream response
  return new NextResponse(stream, { headers });
}