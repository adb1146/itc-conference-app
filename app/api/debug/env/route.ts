import { NextResponse } from 'next/server';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const enableAI = process.env.ENABLE_AI_ROUTING;

  return NextResponse.json({
    OPENAI_API_KEY: openaiKey ? {
      exists: true,
      startsWith: openaiKey.substring(0, 20),
      length: openaiKey.length,
      hasPlaceholder: openaiKey.includes('<') || openaiKey.includes('>')
    } : { exists: false },
    ENABLE_AI_ROUTING: enableAI,
    NODE_ENV: process.env.NODE_ENV
  });
}