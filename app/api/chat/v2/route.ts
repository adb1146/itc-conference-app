/**
 * New Chat API Route (v2)
 * Uses the new architecture with feature flags for gradual rollout
 */

import { NextRequest } from 'next/server';
import { chatRoute } from '@/src/api/routes/chat.route';

export async function POST(req: NextRequest) {
  return chatRoute.POST(req);
}

// Also export OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}