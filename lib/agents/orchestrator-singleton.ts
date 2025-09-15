/**
 * Singleton Orchestrator Manager
 * Maintains a single instance of the orchestrator across requests
 */

import { AgentOrchestrator } from './orchestrator';

let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get or create the singleton orchestrator instance
 */
export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    console.log('[OrchestratorSingleton] Creating new orchestrator instance');
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the orchestrator (useful for testing)
 */
export function resetOrchestrator(): void {
  console.log('[OrchestratorSingleton] Resetting orchestrator instance');
  orchestratorInstance = null;
}