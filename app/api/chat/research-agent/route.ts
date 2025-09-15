/**
 * Research Agent Chat API
 * Streaming endpoint for the User Profile Research Agent
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentOrchestrator } from '@/lib/agents/orchestrator';
import { detectToolIntent } from '@/lib/chat-tool-detector';

// Create singleton orchestrator
const orchestrator = new AgentOrchestrator();

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, userPreferences } = await request.json();

    if (!message || !sessionId) {
      return new Response('Message and sessionId are required', { status: 400 });
    }

    // Get authenticated user if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email ?
      (await prisma?.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      }))?.id : undefined;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process in background
    (async () => {
      try {
        // Check if this is a research agent trigger
        const toolDetection = detectToolIntent(message);
        const isResearchRequest =
          message.toLowerCase().includes('research') ||
          message.toLowerCase().includes('tell me about myself') ||
          message.toLowerCase().includes('look me up') ||
          message.toLowerCase().includes('find information about me') ||
          message.toLowerCase().includes('personalized agenda with research') ||
          (toolDetection.shouldUseTool && toolDetection.toolType === 'profile_research');

        if (!isResearchRequest) {
          // Not a research request, redirect to normal chat
          await writer.write(encoder.encode(`data: {"type":"redirect","content":"normal_chat"}\n\n`));
          await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
          await writer.close();
          return;
        }

        // Send initial status
        await writer.write(encoder.encode(`data: {"type":"status","content":"Activating Research Agent..."}\n\n`));

        // Process message through orchestrator
        const response = await orchestrator.processMessage(sessionId, message, userId);

        // Stream the response based on action type
        switch (response.nextAction) {
          case 'collect_info':
            await writer.write(encoder.encode(`data: {"type":"interactive","content":{"type":"collect_info","message":"${response.message}"}}\n\n`));
            break;

          case 'research':
            await writer.write(encoder.encode(`data: {"type":"status","content":"Researching your professional background..."}\n\n`));

            // Simulate research progress
            await writer.write(encoder.encode(`data: {"type":"progress","content":{"step":"Searching professional profiles...","percent":20}}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 1000));

            await writer.write(encoder.encode(`data: {"type":"progress","content":{"step":"Analyzing company information...","percent":40}}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 1000));

            await writer.write(encoder.encode(`data: {"type":"progress","content":{"step":"Identifying interests and expertise...","percent":60}}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 1000));

            await writer.write(encoder.encode(`data: {"type":"progress","content":{"step":"Generating recommendations...","percent":80}}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Continue with next phase
            const researchResponse = await orchestrator.processMessage(sessionId, '', userId);
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(researchResponse.message)}}\n\n`));

            if (researchResponse.profile) {
              await writer.write(encoder.encode(`data: {"type":"profile","content":${JSON.stringify(researchResponse.profile)}}\n\n`));
            }
            break;

          case 'build_agenda':
            await writer.write(encoder.encode(`data: {"type":"status","content":"Building your personalized agenda..."}\n\n`));

            // Build agenda
            const agendaResponse = await orchestrator.processMessage(sessionId, '', userId);
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(agendaResponse.message)}}\n\n`));

            if (agendaResponse.agenda) {
              await writer.write(encoder.encode(`data: {"type":"agenda","content":${JSON.stringify(agendaResponse.agenda)}}\n\n`));
            }
            break;

          case 'complete':
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));
            break;

          default:
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));
        }

        // Send metadata if available
        if (response.metadata) {
          await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(response.metadata)}}\n\n`));
        }

        // Send completion
        await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
      } catch (error) {
        console.error('[ResearchAgent] Error:', error);
        await writer.write(encoder.encode(`data: {"type":"error","content":"An error occurred during research"}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    // Return streaming response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[ResearchAgent] Request error:', error);
    return new Response('Failed to process request', { status: 500 });
  }
}

// Support GET for checking agent status
export async function GET(request: NextRequest) {
  return new Response(JSON.stringify({
    status: 'active',
    agent: 'UserProfileResearchAgent',
    capabilities: [
      'profile_research',
      'company_analysis',
      'interest_inference',
      'agenda_personalization'
    ]
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}