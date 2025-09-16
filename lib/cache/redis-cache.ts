/**
 * Redis Cache Adapter for Production Environments
 * Provides distributed caching with proper user isolation
 */

import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';

// Use in-memory cache as fallback when Redis is not available
const fallbackCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 30, // 30 minutes
});

class RedisCache {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Only use Redis in production or when explicitly configured
    if (process.env.REDIS_URL) {
      try {
        this.client = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('[RedisCache] Max retries reached, falling back to memory cache');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        this.client.on('connect', () => {
          console.log('[RedisCache] Connected to Redis');
          this.isConnected = true;
        });

        this.client.on('error', (err) => {
          console.error('[RedisCache] Redis error:', err);
          this.isConnected = false;
        });
      } catch (error) {
        console.error('[RedisCache] Failed to initialize Redis:', error);
      }
    } else {
      console.log('[RedisCache] Redis URL not configured, using in-memory cache');
    }
  }

  /**
   * Get value from cache with user isolation
   * Key format: user:{userId}:{namespace}:{key}
   */
  async get<T>(userId: string, namespace: string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(userId, namespace, key);

    if (this.isConnected && this.client) {
      try {
        const value = await this.client.get(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('[RedisCache] Get error:', error);
      }
    }

    // Fallback to memory cache
    return fallbackCache.get(fullKey) || null;
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(
    userId: string,
    namespace: string,
    key: string,
    value: T,
    ttlSeconds: number = 1800 // 30 minutes default
  ): Promise<void> {
    const fullKey = this.buildKey(userId, namespace, key);
    const serialized = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        await this.client.setex(fullKey, ttlSeconds, serialized);
        return;
      } catch (error) {
        console.error('[RedisCache] Set error:', error);
      }
    }

    // Fallback to memory cache
    fallbackCache.set(fullKey, value, { ttl: ttlSeconds * 1000 });
  }

  /**
   * Delete value from cache
   */
  async delete(userId: string, namespace: string, key: string): Promise<void> {
    const fullKey = this.buildKey(userId, namespace, key);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(fullKey);
        return;
      } catch (error) {
        console.error('[RedisCache] Delete error:', error);
      }
    }

    // Fallback to memory cache
    fallbackCache.delete(fullKey);
  }

  /**
   * Clear all cache entries for a user
   */
  async clearUserCache(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;

    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return;
      } catch (error) {
        console.error('[RedisCache] Clear user cache error:', error);
      }
    }

    // Fallback: clear from memory cache
    for (const key of fallbackCache.keys()) {
      if (key.startsWith(`user:${userId}:`)) {
        fallbackCache.delete(key);
      }
    }
  }

  /**
   * Build a properly namespaced cache key
   */
  private buildKey(userId: string, namespace: string, key: string): string {
    // Ensure user isolation in key structure
    const safeUserId = userId || 'anonymous';
    return `user:${safeUserId}:${namespace}:${key}`;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    connected: boolean;
    size?: number;
  }> {
    if (this.isConnected && this.client) {
      try {
        const info = await this.client.info('memory');
        const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
        return {
          type: 'redis',
          connected: true,
          size: usedMemory ? parseInt(usedMemory) : undefined,
        };
      } catch (error) {
        console.error('[RedisCache] Stats error:', error);
      }
    }

    return {
      type: 'memory',
      connected: false,
      size: fallbackCache.size,
    };
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

// Export cache interface for easy swapping between implementations
export interface CacheAdapter {
  get<T>(userId: string, namespace: string, key: string): Promise<T | null>;
  set<T>(userId: string, namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(userId: string, namespace: string, key: string): Promise<void>;
  clearUserCache(userId: string): Promise<void>;
}

// Export the cache to use (Redis in production, memory in development)
export const cache: CacheAdapter = redisCache;