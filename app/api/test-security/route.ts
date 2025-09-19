import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// TEST FILE: This file intentionally contains security issues for testing Claude review

export async function POST(request: Request) {
  // Security Issue 1: No authentication check
  const body = await request.json();

  // Security Issue 2: SQL injection vulnerability (direct string concatenation)
  const userId = body.userId;
  const rawQuery = `SELECT * FROM users WHERE id = '${userId}'`;

  // Security Issue 3: Exposed sensitive data
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  // Security Issue 4: Returning password in response
  return NextResponse.json({
    user: user, // includes password field
    apiKey: process.env.OPENAI_API_KEY, // Security Issue 5: Exposing API key
    debugInfo: {
      query: rawQuery,
      databaseUrl: process.env.DATABASE_URL // Security Issue 6: Exposing database URL
    }
  });
}

export async function GET(request: Request) {
  // Security Issue 7: No rate limiting
  const { searchParams } = new URL(request.url);
  const userInput = searchParams.get('input');

  // Security Issue 8: XSS vulnerability - unescaped user input
  const html = `<div>${userInput}</div>`;

  // Security Issue 9: Path traversal vulnerability
  const fs = require('fs');
  const filename = searchParams.get('file');
  const fileContent = fs.readFileSync(`./data/${filename}`);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      // Security Issue 10: Missing security headers
    }
  });
}