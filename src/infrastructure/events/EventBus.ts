/**
 * Event Bus Implementation
 * Provides publish-subscribe pattern for decoupled communication
 */

export interface IEventBus {
  on<T = any>(event: string, handler: EventHandler<T>): void;
  off(event: string, handler: EventHandler): void;
  emit<T = any>(event: string, data?: T): Promise<void>;
  once<T = any>(event: string, handler: EventHandler<T>): void;
}

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

export class EventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    console.log(`[EventBus] Handler registered for '${event}'`);
  }

  /**
   * Subscribe to an event only once
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = async (data: T) => {
      await handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<T = any>(event: string, data?: T): Promise<void> {
    // Record in history
    this.recordEvent(event, data);
    
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      console.log(`[EventBus] No handlers for event '${event}'`);
      return;
    }

    console.log(`[EventBus] Emitting '${event}' to ${handlers.size} handlers`);
    
    // Execute all handlers in parallel
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`[EventBus] Handler error for '${event}':`, error);
        // Don't let one handler failure affect others
      }
    });

    await Promise.all(promises);
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();
    this.eventHistory = [];
  }

  /**
   * Get event history for debugging
   */
  getHistory(): Array<{ event: string; data: any; timestamp: Date }> {
    return [...this.eventHistory];
  }

  /**
   * Record event in history
   */
  private recordEvent(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date()
    });

    // Keep history size limited
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Wait for an event to be emitted
   */
  async waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            this.off(event, handler);
            reject(new Error(`Timeout waiting for event '${event}'`));
          }, timeout)
        : null;

      const handler = (data: T) => {
        if (timer) clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);
    });
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Common event names
export const Events = {
  // Session events
  SESSION_CREATED: 'session.created',
  SESSION_UPDATED: 'session.updated',
  SESSION_DELETED: 'session.deleted',
  SESSION_ENRICHED: 'session.enriched',
  
  // Search events
  SEARCH_COMPLETED: 'search.completed',
  SEARCH_FAILED: 'search.failed',
  
  // Cache events
  CACHE_INVALIDATED: 'cache.invalidated',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  
  // Vector DB events
  VECTOR_INDEXED: 'vector.indexed',
  VECTOR_SYNC_REQUIRED: 'vector.sync.required',
  VECTOR_SYNC_COMPLETED: 'vector.sync.completed',
  
  // User events
  USER_REGISTERED: 'user.registered',
  USER_PREFERENCES_UPDATED: 'user.preferences.updated',
  
  // Agent events
  AGENT_INVOKED: 'agent.invoked',
  AGENT_COMPLETED: 'agent.completed',
  AGENT_FAILED: 'agent.failed'
} as const;