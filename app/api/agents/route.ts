/**
 * Agent API Route
 * Next.js route handler for the new agent system
 */

import { NextRequest } from 'next/server';
import { agentRoute } from '@/src/api/routes/agent.route';

export async function POST(req: NextRequest) {
  return agentRoute.POST(req);
}

export async function GET(req: NextRequest) {
  const stats = await agentRoute.getStats();
  return new Response(
    JSON.stringify(stats),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}