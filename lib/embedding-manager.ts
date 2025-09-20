/**
 * Embedding Management System
 * Ensures efficient and effective embedding generation, storage, and retrieval
 */

import prisma from '@/lib/db';
import {
  generateEmbedding,
  getPineconeClient,
  getOpenAIClient,
  getOrCreateIndex,
  VECTOR_CONFIG,
  MEAL_VECTOR_CONFIG,
  createSessionSearchText,
  createMealSearchText
} from '@/lib/vector-db';
import { Redis } from 'ioredis';
import crypto from 'crypto';

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,                    // Sessions per batch
  RATE_LIMIT_DELAY: 1000,            // ms between batches
  EMBEDDING_CACHE_TTL: 7 * 24 * 60 * 60, // 1 week in seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  QUALITY_THRESHOLD: 0.8,
  MIN_TEXT_LENGTH: 50,
  MAX_TEXT_LENGTH: 8000,
  PARALLEL_WORKERS: 3,
  UPDATE_CHECK_INTERVAL: 60 * 60 * 1000, // 1 hour
};

// Status tracking
export interface EmbeddingStatus {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  cached: number;
  quality: {
    high: number;
    medium: number;
    low: number;
  };
  performance: {
    avgProcessingTime: number;
    totalTime: number;
    cacheHitRate: number;
  };
}

// Embedding metadata
export interface EmbeddingMetadata {
  sessionId: string;
  version: string;
  quality: number;
  textLength: number;
  generatedAt: Date;
  model: string;
  dimensions: number;
  checksum: string;
}

// Initialize Redis for caching (optional - fallback to memory cache)
let redisClient: Redis | null = null;
const memoryCache = new Map<string, { embedding: number[], metadata: EmbeddingMetadata, timestamp: number }>();

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    console.log('[EmbeddingManager] Redis cache initialized');
  }
} catch (error) {
  console.log('[EmbeddingManager] Redis unavailable, using memory cache');
}

/**
 * Main class for managing embeddings
 */
export class EmbeddingManager {
  private static instance: EmbeddingManager;
  private processingQueue: Set<string> = new Set();
  private errorLog: Map<string, { count: number, lastError: string }> = new Map();
  private metrics: EmbeddingStatus = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    cached: 0,
    quality: { high: 0, medium: 0, low: 0 },
    performance: { avgProcessingTime: 0, totalTime: 0, cacheHitRate: 0 }
  };

  static getInstance(): EmbeddingManager {
    if (!EmbeddingManager.instance) {
      EmbeddingManager.instance = new EmbeddingManager();
    }
    return EmbeddingManager.instance;
  }

  /**
   * Process all sessions and ensure embeddings are up-to-date
   */
  async processAllSessions(options?: {
    forceRefresh?: boolean;
    batchSize?: number;
    includeQualityCheck?: boolean;
    namespace?: 'default' | 'meals' | 'both';
  }): Promise<EmbeddingStatus> {
    const startTime = Date.now();
    const opts = {
      forceRefresh: false,
      batchSize: CONFIG.BATCH_SIZE,
      includeQualityCheck: true,
      namespace: 'both' as const,
      ...options
    };

    console.log('[EmbeddingManager] Starting session processing...');

    try {
      // Get all sessions with their current state
      const sessions = await prisma.session.findMany({
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      this.metrics.total = sessions.length;
      console.log(`[EmbeddingManager] Found ${sessions.length} sessions to process`);

      // Check API availability
      if (!await this.checkAPIAvailability()) {
        throw new Error('Required APIs not available');
      }

      // Process in batches
      const batches = this.createBatches(sessions, opts.batchSize);

      for (let i = 0; i < batches.length; i++) {
        console.log(`[EmbeddingManager] Processing batch ${i + 1}/${batches.length}`);

        await this.processBatch(batches[i], {
          forceRefresh: opts.forceRefresh,
          includeQualityCheck: opts.includeQualityCheck,
          namespace: opts.namespace
        });

        // Rate limiting
        if (i < batches.length - 1) {
          await this.delay(CONFIG.RATE_LIMIT_DELAY);
        }
      }

      // Update metrics
      this.metrics.performance.totalTime = Date.now() - startTime;
      this.metrics.performance.avgProcessingTime =
        this.metrics.performance.totalTime / this.metrics.processed;
      this.metrics.performance.cacheHitRate =
        this.metrics.cached / this.metrics.total;

      console.log('[EmbeddingManager] Processing complete:', this.metrics);
      return this.metrics;

    } catch (error) {
      console.error('[EmbeddingManager] Processing failed:', error);
      throw error;
    }
  }

  /**
   * Process a single batch of sessions
   */
  private async processBatch(
    sessions: any[],
    options: any
  ): Promise<void> {
    const promises = sessions.map(session =>
      this.processSession(session, options)
        .catch(error => {
          console.error(`[EmbeddingManager] Failed to process session ${session.id}:`, error);
          this.logError(session.id, error);
        })
    );

    await Promise.all(promises);
  }

  /**
   * Process a single session
   */
  private async processSession(
    session: any,
    options: any
  ): Promise<void> {
    // Check if already processing
    if (this.processingQueue.has(session.id)) {
      this.metrics.skipped++;
      return;
    }

    this.processingQueue.add(session.id);

    try {
      // Check cache first
      if (!options.forceRefresh) {
        const cached = await this.getCachedEmbedding(session.id);
        if (cached && this.isEmbeddingValid(cached.metadata, session)) {
          this.metrics.cached++;
          return;
        }
      }

      // Generate search text
      const searchText = createSessionSearchText(session);

      // Validate text quality
      const quality = this.assessTextQuality(searchText);
      if (quality < 0.3) {
        console.warn(`[EmbeddingManager] Low quality text for session ${session.id}`);
        this.metrics.quality.low++;
        this.metrics.skipped++;
        return;
      }

      // Generate embedding
      const embedding = await this.generateEmbeddingWithRetry(searchText);

      // Validate embedding quality
      if (options.includeQualityCheck) {
        const embeddingQuality = this.assessEmbeddingQuality(embedding);
        if (embeddingQuality < CONFIG.QUALITY_THRESHOLD) {
          console.warn(`[EmbeddingManager] Low quality embedding for session ${session.id}`);
          this.metrics.quality.low++;
        } else if (embeddingQuality > 0.9) {
          this.metrics.quality.high++;
        } else {
          this.metrics.quality.medium++;
        }
      }

      // Store in vector databases
      if (options.namespace === 'default' || options.namespace === 'both') {
        await this.storeInVectorDB(session, embedding, VECTOR_CONFIG);
      }

      // Store meal sessions in dedicated namespace
      if ((options.namespace === 'meals' || options.namespace === 'both') &&
          this.isMealSession(session)) {
        const mealText = createMealSearchText(session);
        const mealEmbedding = await this.generateEmbeddingWithRetry(mealText);
        await this.storeInVectorDB(session, mealEmbedding, MEAL_VECTOR_CONFIG);
      }

      // Cache the embedding
      await this.cacheEmbedding(session.id, embedding, {
        sessionId: session.id,
        version: '1.0',
        quality,
        textLength: searchText.length,
        generatedAt: new Date(),
        model: 'text-embedding-3-small',
        dimensions: 1536,
        checksum: this.generateChecksum(searchText)
      });

      // Store in database for backup
      await this.storeEmbeddingInDB(session.id, embedding);

      this.metrics.processed++;

    } finally {
      this.processingQueue.delete(session.id);
    }
  }

  /**
   * Generate embedding with retry logic
   */
  private async generateEmbeddingWithRetry(
    text: string,
    retries: number = CONFIG.MAX_RETRIES
  ): Promise<number[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await generateEmbedding(text);
      } catch (error: any) {
        if (attempt === retries) throw error;

        // Handle rate limiting
        if (error.status === 429) {
          const delay = this.getRetryDelay(error, attempt);
          console.log(`[EmbeddingManager] Rate limited, waiting ${delay}ms`);
          await this.delay(delay);
        } else {
          await this.delay(CONFIG.RETRY_DELAY * attempt);
        }
      }
    }
    throw new Error('Failed to generate embedding after retries');
  }

  /**
   * Store embedding in vector database
   */
  private async storeInVectorDB(
    session: any,
    embedding: number[],
    config: typeof VECTOR_CONFIG
  ): Promise<void> {
    const index = await getOrCreateIndex();
    const namespace = index.namespace(config.namespace);

    await namespace.upsert([{
      id: session.id,
      values: embedding,
      metadata: {
        title: session.title,
        description: session.description?.substring(0, 500),
        track: session.track,
        location: session.location,
        startTime: session.startTime?.toISOString(),
        endTime: session.endTime?.toISOString(),
        tags: session.tags || [],
        speakerNames: session.speakers?.map((s: any) => s.speaker?.name).filter(Boolean) || [],
        lastUpdated: new Date().toISOString()
      }
    }]);
  }

  /**
   * Store embedding in database as backup
   */
  private async storeEmbeddingInDB(sessionId: string, embedding: number[]): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          embedding: embedding,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error(`[EmbeddingManager] Failed to store embedding in DB for ${sessionId}:`, error);
    }
  }

  /**
   * Assess text quality
   */
  private assessTextQuality(text: string): number {
    let score = 0.5;

    // Length checks
    if (text.length < CONFIG.MIN_TEXT_LENGTH) score -= 0.3;
    if (text.length > CONFIG.MAX_TEXT_LENGTH) score -= 0.1;
    if (text.length > 200 && text.length < 2000) score += 0.2;

    // Content richness
    const words = text.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 20) score += 0.1;
    if (words.length > 50) score += 0.1;

    // Diversity of content
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const diversity = uniqueWords.size / words.length;
    if (diversity > 0.5) score += 0.1;

    // Has key information
    if (text.includes('track')) score += 0.05;
    if (text.includes('speaker')) score += 0.05;
    if (/\d{1,2}:\d{2}/.test(text)) score += 0.05; // Has time

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess embedding quality
   */
  private assessEmbeddingQuality(embedding: number[]): number {
    if (!embedding || embedding.length === 0) return 0;

    let score = 0.8; // Base score

    // Check for zero vectors (bad)
    const zeroCount = embedding.filter(v => v === 0).length;
    if (zeroCount / embedding.length > 0.5) score -= 0.5;

    // Check magnitude
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude < 0.1) score -= 0.3;
    if (magnitude > 10) score -= 0.1;

    // Check variance
    const mean = embedding.reduce((sum, v) => sum + v, 0) / embedding.length;
    const variance = embedding.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / embedding.length;
    if (variance < 0.001) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Cache embedding
   */
  private async cacheEmbedding(
    sessionId: string,
    embedding: number[],
    metadata: EmbeddingMetadata
  ): Promise<void> {
    const key = `embedding:${sessionId}`;
    const data = { embedding, metadata, timestamp: Date.now() };

    if (redisClient) {
      try {
        await redisClient.setex(
          key,
          CONFIG.EMBEDDING_CACHE_TTL,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error('[EmbeddingManager] Redis cache error:', error);
        memoryCache.set(key, data);
      }
    } else {
      memoryCache.set(key, data);
    }
  }

  /**
   * Get cached embedding
   */
  private async getCachedEmbedding(
    sessionId: string
  ): Promise<{ embedding: number[], metadata: EmbeddingMetadata } | null> {
    const key = `embedding:${sessionId}`;

    if (redisClient) {
      try {
        const cached = await redisClient.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('[EmbeddingManager] Redis get error:', error);
      }
    }

    const memoryCached = memoryCache.get(key);
    if (memoryCached && Date.now() - memoryCached.timestamp < CONFIG.EMBEDDING_CACHE_TTL * 1000) {
      return memoryCached;
    }

    return null;
  }

  /**
   * Check if embedding is still valid
   */
  private isEmbeddingValid(metadata: EmbeddingMetadata, session: any): boolean {
    // Check if session was updated after embedding generation
    if (session.lastUpdated && new Date(session.lastUpdated) > metadata.generatedAt) {
      return false;
    }

    // Check if text has changed
    const currentChecksum = this.generateChecksum(createSessionSearchText(session));
    if (currentChecksum !== metadata.checksum) {
      return false;
    }

    // Check age (refresh weekly)
    const age = Date.now() - new Date(metadata.generatedAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    return true;
  }

  /**
   * Check if session is meal-related
   */
  private isMealSession(session: any): boolean {
    const text = `${session.title} ${session.description}`.toLowerCase();
    return ['breakfast', 'lunch', 'dinner', 'meal', 'reception', 'coffee'].some(
      keyword => text.includes(keyword)
    );
  }

  /**
   * Check API availability
   */
  private async checkAPIAvailability(): Promise<boolean> {
    const openai = getOpenAIClient();
    const pinecone = getPineconeClient();

    if (!openai) {
      console.error('[EmbeddingManager] OpenAI client not available');
      return false;
    }

    if (!pinecone) {
      console.error('[EmbeddingManager] Pinecone client not available');
      return false;
    }

    return true;
  }

  /**
   * Create batches of sessions
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate checksum for text
   */
  private generateChecksum(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(error: any, attempt: number): number {
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after']) * 1000;
    }
    return Math.min(CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Log error for tracking
   */
  private logError(sessionId: string, error: any): void {
    const existing = this.errorLog.get(sessionId) || { count: 0, lastError: '' };
    this.errorLog.set(sessionId, {
      count: existing.count + 1,
      lastError: error.message || String(error)
    });
    this.metrics.failed++;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current metrics
   */
  getMetrics(): EmbeddingStatus {
    return { ...this.metrics };
  }

  /**
   * Get error log
   */
  getErrors(): Map<string, { count: number, lastError: string }> {
    return new Map(this.errorLog);
  }

  /**
   * Clear caches
   */
  async clearCaches(): Promise<void> {
    memoryCache.clear();
    if (redisClient) {
      const keys = await redisClient.keys('embedding:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
    console.log('[EmbeddingManager] Caches cleared');
  }

  /**
   * Validate all embeddings
   */
  async validateAllEmbeddings(): Promise<{
    valid: number;
    invalid: number;
    missing: number;
    issues: string[];
  }> {
    const results = {
      valid: 0,
      invalid: 0,
      missing: 0,
      issues: [] as string[]
    };

    const sessions = await prisma.session.findMany();

    for (const session of sessions) {
      const cached = await this.getCachedEmbedding(session.id);

      if (!cached) {
        results.missing++;
        results.issues.push(`Missing embedding for session ${session.id}`);
      } else if (!this.isEmbeddingValid(cached.metadata, session)) {
        results.invalid++;
        results.issues.push(`Invalid embedding for session ${session.id}`);
      } else {
        results.valid++;
      }
    }

    return results;
  }
}

/**
 * Auto-sync system for keeping embeddings up-to-date
 */
export class EmbeddingAutoSync {
  private static instance: EmbeddingAutoSync;
  private syncInterval: NodeJS.Timeout | null = null;
  private manager: EmbeddingManager;

  static getInstance(): EmbeddingAutoSync {
    if (!EmbeddingAutoSync.instance) {
      EmbeddingAutoSync.instance = new EmbeddingAutoSync();
    }
    return EmbeddingAutoSync.instance;
  }

  constructor() {
    this.manager = EmbeddingManager.getInstance();
  }

  /**
   * Start auto-sync process
   */
  start(intervalMs: number = CONFIG.UPDATE_CHECK_INTERVAL): void {
    if (this.syncInterval) {
      console.log('[EmbeddingAutoSync] Already running');
      return;
    }

    console.log(`[EmbeddingAutoSync] Starting auto-sync every ${intervalMs}ms`);

    // Initial sync
    this.sync();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  /**
   * Stop auto-sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[EmbeddingAutoSync] Stopped');
    }
  }

  /**
   * Run sync process
   */
  private async sync(): Promise<void> {
    console.log('[EmbeddingAutoSync] Running sync...');

    try {
      // Check for updated sessions
      const updatedSessions = await prisma.session.findMany({
        where: {
          lastUpdated: {
            gte: new Date(Date.now() - CONFIG.UPDATE_CHECK_INTERVAL)
          }
        }
      });

      if (updatedSessions.length > 0) {
        console.log(`[EmbeddingAutoSync] Found ${updatedSessions.length} updated sessions`);

        // Process only updated sessions
        for (const session of updatedSessions) {
          await this.manager.processAllSessions({
            forceRefresh: true,
            batchSize: 1
          });
        }
      }

      // Validate random sample
      const validation = await this.manager.validateAllEmbeddings();
      if (validation.invalid > 0 || validation.missing > 0) {
        console.log(`[EmbeddingAutoSync] Found issues - Invalid: ${validation.invalid}, Missing: ${validation.missing}`);

        // Trigger full refresh if too many issues
        if (validation.invalid + validation.missing > 10) {
          await this.manager.processAllSessions({
            forceRefresh: false,
            includeQualityCheck: true
          });
        }
      }

    } catch (error) {
      console.error('[EmbeddingAutoSync] Sync error:', error);
    }
  }
}

// Export singleton instances
export const embeddingManager = EmbeddingManager.getInstance();
export const embeddingAutoSync = EmbeddingAutoSync.getInstance();