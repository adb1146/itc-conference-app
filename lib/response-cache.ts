/**
 * Simple in-memory cache for AI responses
 * Provides fast caching without external dependencies
 */

interface CacheEntry {
  response: string;
  sources?: any[];
  sessions?: any[];
  timestamp: number;
  hits: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100; // Maximum cache entries
  private ttl: number = 30 * 60 * 1000; // 30 minutes TTL

  /**
   * Generate cache key from query and user preferences
   * SECURITY: Include userId to prevent cache sharing between users
   */
  generateKey(query: string, userPreferences?: any, userId?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const interests = userPreferences?.interests?.sort().join(',') || '';
    const userKey = userId || 'anonymous';
    // Include userId in key to ensure user isolation
    return `user:${userKey}:${normalizedQuery}:${interests}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry;
  }

  /**
   * Set cache entry, evicting old entries if needed
   */
  set(key: string, response: string, sources?: any[], sessions?: any[]): void {
    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      response,
      sources,
      sessions,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    topQueries: Array<{ query: string; hits: number }>;
  } {
    let totalHits = 0;
    const queries: Array<{ query: string; hits: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      totalHits += entry.hits;
      queries.push({ query: key.split(':')[0], hits: entry.hits });
    }

    // Sort by hits and get top 5
    queries.sort((a, b) => b.hits - a.hits);

    return {
      size: this.cache.size,
      hits: totalHits,
      topQueries: queries.slice(0, 5)
    };
  }

  /**
   * Check if a response should be cached
   * Don't cache error responses or very short responses
   */
  shouldCache(response: string): boolean {
    return response.length > 100 &&
           !response.includes('error') &&
           !response.includes('apologize');
  }
}

// Create singleton instance
export const responseCache = new ResponseCache();

// Export for monitoring
export const getCacheStats = () => responseCache.getStats();