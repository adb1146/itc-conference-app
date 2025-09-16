/**
 * Cache Repository
 * In-memory caching with TTL support
 */

import { ICacheRepository } from '@/domain/interfaces/IRepository';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheRepository implements ICacheRepository {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Run cleanup every minute by default
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000); // ttl in seconds
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async invalidate(pattern: string): Promise<number> {
    let count = 0;
    const regex = this.patternToRegex(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Convert a pattern with wildcards to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Destroy the cache and clear cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}