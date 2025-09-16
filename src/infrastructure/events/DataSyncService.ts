/**
 * Data Synchronization Service
 * Keeps PostgreSQL, Vector DB, and Cache in sync using events
 */

import { IEventBus, Events } from './EventBus';
import { IMessageQueue } from './MessageQueue';
import { IVectorRepository, ICacheRepository, Session } from '@/domain/interfaces/IRepository';
import { generateEmbedding } from '@/lib/vector-db';

export interface SyncEvent {
  entityType: 'session' | 'speaker' | 'user';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: Date;
  priority?: 'low' | 'normal' | 'high';
}

export class DataSyncService {
  private syncInProgress = new Set<string>();
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  constructor(
    private eventBus: IEventBus,
    private queue: IMessageQueue,
    private vectorRepo: IVectorRepository,
    private cacheRepo: ICacheRepository
  ) {
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for data synchronization
   */
  private setupEventHandlers(): void {
    // Session events
    this.eventBus.on(Events.SESSION_CREATED, this.handleSessionCreated.bind(this));
    this.eventBus.on(Events.SESSION_UPDATED, this.handleSessionUpdated.bind(this));
    this.eventBus.on(Events.SESSION_DELETED, this.handleSessionDeleted.bind(this));
    
    // Queue subscribers for async processing
    this.queue.subscribe('sync.vector.embedding', this.processVectorEmbedding.bind(this));
    this.queue.subscribe('sync.cache.invalidate', this.processCacheInvalidation.bind(this));
    
    console.log('[DataSyncService] Event handlers initialized');
  }

  /**
   * Handle session creation
   */
  private async handleSessionCreated(event: { session: Session }): Promise<void> {
    const { session } = event;
    const syncKey = `session:${session.id}`;
    
    if (this.syncInProgress.has(syncKey)) {
      console.log(`[DataSyncService] Sync already in progress for ${syncKey}`);
      return;
    }
    
    this.syncInProgress.add(syncKey);
    
    try {
      // Queue vector embedding generation
      await this.queue.publish('sync.vector.embedding', {
        sessionId: session.id,
        content: this.buildEmbeddingContent(session),
        operation: 'create',
        priority: 'normal'
      });
      
      // Invalidate relevant caches
      await this.queue.publish('sync.cache.invalidate', {
        patterns: [
          `search:*`,
          `track:${session.track}`,
          `speaker:*`
        ],
        priority: 'low'
      });
      
      console.log(`[DataSyncService] Queued sync for new session: ${session.id}`);
      
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * Handle session update
   */
  private async handleSessionUpdated(event: { session: Session; changes: string[] }): Promise<void> {
    const { session, changes } = event;
    
    // Only sync to vector DB if content changed
    const contentChanged = changes.some(field => 
      ['title', 'description', 'enrichedSummary'].includes(field)
    );
    
    if (contentChanged) {
      await this.queue.publish('sync.vector.embedding', {
        sessionId: session.id,
        content: this.buildEmbeddingContent(session),
        operation: 'update',
        priority: 'normal'
      });
    }
    
    // Always invalidate cache on updates
    await this.cacheRepo.invalidate(`session:${session.id}`);
    await this.cacheRepo.invalidate(`search:*`);
    
    console.log(`[DataSyncService] Queued sync for updated session: ${session.id}`);
  }

  /**
   * Handle session deletion
   */
  private async handleSessionDeleted(event: { sessionId: string }): Promise<void> {
    const { sessionId } = event;
    
    try {
      // Remove from vector DB
      await this.vectorRepo.delete(sessionId);
      
      // Clear all related caches
      await this.cacheRepo.invalidate(`session:${sessionId}`);
      await this.cacheRepo.invalidate(`search:*`);
      
      console.log(`[DataSyncService] Removed session from all stores: ${sessionId}`);
      
    } catch (error) {
      console.error(`[DataSyncService] Failed to delete session ${sessionId}:`, error);
    }
  }

  /**
   * Process vector embedding generation (async from queue)
   */
  private async processVectorEmbedding(message: any): Promise<void> {
    const { sessionId, content, operation } = message.data;
    const retryKey = `vector:${sessionId}`;
    
    try {
      console.log(`[DataSyncService] Generating embedding for session ${sessionId}`);
      
      // Generate embedding
      const embedding = await generateEmbedding(content);
      
      // Store in vector DB
      await this.vectorRepo.upsert(sessionId, embedding, {
        content,
        operation,
        timestamp: new Date()
      });
      
      // Emit success event
      await this.eventBus.emit(Events.VECTOR_INDEXED, { sessionId, operation });
      
      // Clear retry counter on success
      this.retryAttempts.delete(retryKey);
      
      console.log(`[DataSyncService] Successfully indexed session ${sessionId}`);
      
    } catch (error) {
      console.error(`[DataSyncService] Failed to generate embedding for ${sessionId}:`, error);
      
      // Handle retries
      const attempts = (this.retryAttempts.get(retryKey) || 0) + 1;
      this.retryAttempts.set(retryKey, attempts);
      
      if (attempts < this.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
        console.log(`[DataSyncService] Retrying ${sessionId} in ${delay}ms (attempt ${attempts}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.queue.publish('sync.vector.embedding', message.data);
        }, delay);
      } else {
        // Move to dead letter queue
        await this.queue.publishToDLQ('sync.vector.embedding.failed', {
          ...message.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts
        });
        
        this.retryAttempts.delete(retryKey);
        console.error(`[DataSyncService] Failed to index ${sessionId} after ${attempts} attempts`);
      }
    }
  }

  /**
   * Process cache invalidation (async from queue)
   */
  private async processCacheInvalidation(message: any): Promise<void> {
    const { patterns } = message.data;
    
    try {
      for (const pattern of patterns) {
        const count = await this.cacheRepo.invalidate(pattern);
        console.log(`[DataSyncService] Invalidated ${count} cache entries matching '${pattern}'`);
      }
      
      await this.eventBus.emit(Events.CACHE_INVALIDATED, { patterns });
      
    } catch (error) {
      console.error('[DataSyncService] Cache invalidation failed:', error);
    }
  }

  /**
   * Build content for embedding generation
   */
  private buildEmbeddingContent(session: Session): string {
    const parts = [
      session.title,
      session.description,
      session.track ? `Track: ${session.track}` : '',
      session.speakers?.map(s => `Speaker: ${s.name} from ${s.company}`).join(', ') || '',
      session.tags?.join(', ') || ''
    ];
    
    return parts.filter(Boolean).join(' | ');
  }

  /**
   * Force sync all sessions (maintenance operation)
   */
  async syncAllSessions(sessions: Session[]): Promise<void> {
    console.log(`[DataSyncService] Starting full sync of ${sessions.length} sessions`);
    
    const batchSize = 10;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(session => 
          this.queue.publish('sync.vector.embedding', {
            sessionId: session.id,
            content: this.buildEmbeddingContent(session),
            operation: 'update',
            priority: 'low'
          })
        )
      );
      
      console.log(`[DataSyncService] Queued batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)}`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('[DataSyncService] Full sync queued successfully');
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    inProgress: string[];
    pendingRetries: Array<{ key: string; attempts: number }>;
  } {
    return {
      inProgress: Array.from(this.syncInProgress),
      pendingRetries: Array.from(this.retryAttempts.entries()).map(([key, attempts]) => ({
        key,
        attempts
      }))
    };
  }
}