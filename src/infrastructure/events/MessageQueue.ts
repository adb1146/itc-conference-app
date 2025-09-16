/**
 * Message Queue Implementation
 * In-memory queue with async processing capabilities
 */

export interface IMessageQueue {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): void;
  unsubscribe(topic: string, handler: MessageHandler): void;
  publishToDLQ(topic: string, message: any): Promise<void>;
  getStats(): QueueStats;
}

export type MessageHandler = (message: QueueMessage) => Promise<void>;

export interface QueueMessage {
  id: string;
  topic: string;
  data: any;
  timestamp: Date;
  attempts: number;
}

export interface QueueStats {
  topics: Array<{
    name: string;
    pending: number;
    processing: number;
    subscribers: number;
  }>;
  dlq: Array<{ topic: string; count: number }>;
  totalProcessed: number;
  totalFailed: number;
}

export class InMemoryMessageQueue implements IMessageQueue {
  private queues: Map<string, QueueMessage[]> = new Map();
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private processing: Map<string, Set<string>> = new Map();
  private dlq: Map<string, QueueMessage[]> = new Map();
  private stats = {
    totalProcessed: 0,
    totalFailed: 0
  };
  private isRunning = true;
  private processInterval: NodeJS.Timeout;

  constructor(private processingIntervalMs: number = 100) {
    // Start processing loop
    this.processInterval = setInterval(() => {
      this.processQueues();
    }, processingIntervalMs);
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, data: any): Promise<void> {
    const message: QueueMessage = {
      id: this.generateId(),
      topic,
      data,
      timestamp: new Date(),
      attempts: 0
    };

    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }

    this.queues.get(topic)!.push(message);
    
    console.log(`[MessageQueue] Published to '${topic}': ${message.id}`);
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
      this.queues.set(topic, []);
      this.processing.set(topic, new Set());
    }
    
    this.subscribers.get(topic)!.add(handler);
    console.log(`[MessageQueue] Subscribed to '${topic}'`);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, handler: MessageHandler): void {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    }
  }

  /**
   * Publish to Dead Letter Queue
   */
  async publishToDLQ(topic: string, message: any): Promise<void> {
    const dlqTopic = `dlq:${topic}`;
    
    if (!this.dlq.has(dlqTopic)) {
      this.dlq.set(dlqTopic, []);
    }
    
    const dlqMessage: QueueMessage = {
      id: this.generateId(),
      topic: dlqTopic,
      data: message,
      timestamp: new Date(),
      attempts: 0
    };
    
    this.dlq.get(dlqTopic)!.push(dlqMessage);
    this.stats.totalFailed++;
    
    console.error(`[MessageQueue] Message sent to DLQ '${dlqTopic}': ${dlqMessage.id}`);
  }

  /**
   * Process queues (runs periodically)
   */
  private async processQueues(): Promise<void> {
    if (!this.isRunning) return;

    for (const [topic, queue] of this.queues.entries()) {
      const handlers = this.subscribers.get(topic);
      const processingSet = this.processing.get(topic) || new Set();
      
      if (!handlers || handlers.size === 0 || queue.length === 0) {
        continue;
      }

      // Process messages in FIFO order
      while (queue.length > 0 && processingSet.size < 5) { // Max 5 concurrent per topic
        const message = queue.shift()!;
        
        if (processingSet.has(message.id)) {
          continue; // Already being processed
        }
        
        processingSet.add(message.id);
        
        // Process with all handlers in parallel
        this.processMessage(message, handlers, processingSet).catch(error => {
          console.error(`[MessageQueue] Processing failed for ${message.id}:`, error);
        });
      }
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(
    message: QueueMessage,
    handlers: Set<MessageHandler>,
    processingSet: Set<string>
  ): Promise<void> {
    try {
      message.attempts++;
      
      // Execute all handlers
      await Promise.all(
        Array.from(handlers).map(handler => 
          this.executeHandler(handler, message)
        )
      );
      
      this.stats.totalProcessed++;
      console.log(`[MessageQueue] Processed message ${message.id}`);
      
    } catch (error) {
      console.error(`[MessageQueue] Failed to process ${message.id}:`, error);
      
      // Retry logic
      if (message.attempts < 3) {
        // Re-queue for retry
        this.queues.get(message.topic)!.push(message);
        console.log(`[MessageQueue] Re-queued ${message.id} (attempt ${message.attempts}/3)`);
      } else {
        // Send to DLQ
        await this.publishToDLQ(message.topic, {
          originalMessage: message,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      processingSet.delete(message.id);
    }
  }

  /**
   * Execute a single handler
   */
  private async executeHandler(handler: MessageHandler, message: QueueMessage): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      console.error(`[MessageQueue] Handler error for ${message.id}:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const topics = Array.from(this.queues.entries()).map(([name, queue]) => ({
      name,
      pending: queue.length,
      processing: this.processing.get(name)?.size || 0,
      subscribers: this.subscribers.get(name)?.size || 0
    }));

    const dlqStats = Array.from(this.dlq.entries()).map(([topic, messages]) => ({
      topic,
      count: messages.length
    }));

    return {
      topics,
      dlq: dlqStats,
      totalProcessed: this.stats.totalProcessed,
      totalFailed: this.stats.totalFailed
    };
  }

  /**
   * Process DLQ messages (manual intervention)
   */
  async processDLQ(topic: string): Promise<number> {
    const dlqTopic = `dlq:${topic}`;
    const messages = this.dlq.get(dlqTopic) || [];
    
    if (messages.length === 0) {
      return 0;
    }

    console.log(`[MessageQueue] Processing ${messages.length} DLQ messages for '${topic}'`);
    
    // Move messages back to main queue
    const queue = this.queues.get(topic) || [];
    for (const message of messages) {
      // Reset attempts
      message.attempts = 0;
      message.topic = topic; // Remove dlq: prefix
      queue.push(message);
    }
    
    // Clear DLQ
    this.dlq.delete(dlqTopic);
    
    return messages.length;
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.clear();
    this.dlq.clear();
    this.processing.clear();
  }

  /**
   * Shutdown the queue
   */
  shutdown(): void {
    this.isRunning = false;
    clearInterval(this.processInterval);
    console.log('[MessageQueue] Shutdown complete');
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const messageQueue = new InMemoryMessageQueue();