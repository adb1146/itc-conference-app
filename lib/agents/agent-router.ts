import { AgentResult } from './agent-types';
import { LocalRecommendationsAgent } from './local-recommendations-agent';
import { getOrchestrator } from './orchestrator-singleton';

export interface RouteContext {
  sessionId: string;
  userId?: string; // email for logged-in users
}

export type RouteOutput = AgentResult<{ agenda?: any }, { toolUsed?: string; phase?: string }>;

/**
 * Lightweight Agent Router
 * Decides which agent to invoke based on the message and context.
 * Non-invasive: usable from API without changing existing tool detection.
 */
export async function routeMessage(message: string, ctx: RouteContext): Promise<RouteOutput> {
  const lower = message.toLowerCase();

  // 1) Local recommendations (fast path)
  if (LocalRecommendationsAgent.isLocalQuery(message)) {
    const local = new LocalRecommendationsAgent();
    const content = await local.getRecommendations(message);
    return {
      message: content,
      metadata: { toolUsed: 'local_recommendations' }
    };
  }

  // 2) Profile research / agenda building intents
  const wantsAgenda =
    lower.includes('agenda') || lower.includes('schedule') || lower.includes('personalized') || lower.includes('build') ||
    (lower.includes('help') && (lower.includes('schedule') || lower.includes('agenda')));
  const wantsResearch = lower.includes('research') || lower.includes('look me up');

  if (wantsAgenda || wantsResearch) {
    const orchestrator = getOrchestrator();
    const response = await orchestrator.invoke({
      sessionId: ctx.sessionId,
      message,
      userId: ctx.userId
    });

    return {
      message: response.message,
      data: response.agenda ? { agenda: response.agenda } : undefined,
      metadata: { toolUsed: 'orchestrator', phase: response.metadata?.phase }
    };
  }

  // 3) Default: hand back a neutral prompt
  return {
    message: "How can I help? I can research your background and build a personalized agenda, or suggest local places to eat and relax at Mandalay Bay.",
    metadata: { toolUsed: 'none' }
  };
}
