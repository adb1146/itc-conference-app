/**
 * Generic Agent interface for pluggable agents
 */
export interface Agent<Input, Output, Context = unknown> {
  /**
   * Human-readable description for debugging/telemetry
   */
  describe(): string;

  /**
   * Execute the agent with input and optional context
   */
  invoke(input: Input, context?: Context): Promise<Output>;
}

/**
 * Standardized agent result envelope for streaming-friendly UIs
 */
export interface AgentResult<Data = unknown, Meta = unknown> {
  message: string;
  data?: Data;
  metadata?: Meta;
}

