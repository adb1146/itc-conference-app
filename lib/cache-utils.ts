/**
 * Cache Management Utilities
 * Provides smart cache invalidation and refresh strategies
 */

import { useRouter } from 'next/navigation';

// Cache version - increment to bust all caches
const CACHE_VERSION = 'v1';

// Cache keys for different data types
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  SMART_AGENDA: 'smart_agenda',
  FAVORITES: 'favorites',
  SESSIONS: 'sessions',
  SEARCH_RESULTS: 'search_results',
} as const;

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  SHORT: 10 * 1000,      // 10 seconds - for frequently changing data
  MEDIUM: 60 * 1000,     // 1 minute - for moderately changing data
  LONG: 5 * 60 * 1000,   // 5 minutes - for relatively stable data
  VERY_LONG: 30 * 60 * 1000, // 30 minutes - for static data
} as const;

/**
 * Get versioned cache key
 */
export function getCacheKey(key: string, userId?: string): string {
  const baseKey = userId ? `${key}_${userId}` : key;
  return `${CACHE_VERSION}_${baseKey}`;
}

/**
 * Set item in cache with expiration
 */
export function setCache<T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATIONS.MEDIUM,
  userId?: string
): void {
  if (typeof window === 'undefined') return;

  const cacheKey = getCacheKey(key, userId);
  const cacheData = {
    data,
    timestamp: Date.now(),
    expires: Date.now() + duration,
    version: CACHE_VERSION,
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to set cache:', error);
    // If storage is full, clear old items
    clearExpiredCache();
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (retryError) {
      console.error('Failed to set cache after cleanup:', retryError);
    }
  }
}

/**
 * Get item from cache if not expired
 */
export function getCache<T>(
  key: string,
  userId?: string
): T | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = getCacheKey(key, userId);

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // Check version
    if (cacheData.version !== CACHE_VERSION) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    // Check expiration
    if (Date.now() > cacheData.expires) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData.data as T;
  } catch (error) {
    console.warn('Failed to get cache:', error);
    return null;
  }
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: string, userId?: string): void {
  if (typeof window === 'undefined') return;

  const cacheKey = getCacheKey(key, userId);
  sessionStorage.removeItem(cacheKey);
}

/**
 * Invalidate multiple cache keys
 */
export function invalidateCaches(keys: string[], userId?: string): void {
  keys.forEach(key => invalidateCache(key, userId));
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;

    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) continue;

      const cacheData = JSON.parse(cached);

      // Remove if expired or wrong version
      if (!cacheData.version ||
          cacheData.version !== CACHE_VERSION ||
          Date.now() > cacheData.expires) {
        keysToRemove.push(key);
      }
    } catch (error) {
      // Remove invalid entries
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Clear all cache for a specific user
 */
export function clearUserCache(userId: string): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;

    if (key.includes(userId)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.clear();
}

/**
 * Hook for smart data fetching with cache
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    duration?: number;
    userId?: string;
    dependencies?: any[];
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  } = {}
) {
  const {
    duration = CACHE_DURATIONS.MEDIUM,
    userId,
    dependencies = [],
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      // Check cache first
      const cached = getCache<T>(key, userId);
      if (cached && mounted) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      setLoading(true);
      setError(null);

      try {
        const freshData = await fetcher();

        if (mounted) {
          setData(freshData);
          setCache(key, freshData, duration, userId);
          onSuccess?.(freshData);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          onError?.(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [...dependencies, key, userId]);

  return { data, loading, error, refetch: () => invalidateCache(key, userId) };
}

/**
 * Router with cache management
 */
export function useSmartRouter() {
  const router = useRouter();

  return {
    ...router,

    // Navigate with cache invalidation
    pushWithRefresh: (url: string, cacheKeys?: string[]) => {
      if (cacheKeys) {
        invalidateCaches(cacheKeys);
      }
      router.push(url);
      router.refresh();
    },

    // Replace with cache invalidation
    replaceWithRefresh: (url: string, cacheKeys?: string[]) => {
      if (cacheKeys) {
        invalidateCaches(cacheKeys);
      }
      router.replace(url);
      router.refresh();
    },

    // Soft refresh - just invalidate cache and refresh
    softRefresh: (cacheKeys?: string[]) => {
      if (cacheKeys) {
        invalidateCaches(cacheKeys);
      }
      router.refresh();
    },

    // Hard refresh - clear all cache and refresh
    hardRefresh: () => {
      clearAllCache();
      router.refresh();
    },
  };
}

/**
 * Prefetch data into cache
 */
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>,
  duration: number = CACHE_DURATIONS.LONG,
  userId?: string
): Promise<void> {
  try {
    const data = await fetcher();
    setCache(key, data, duration, userId);
  } catch (error) {
    console.warn('Failed to prefetch data:', error);
  }
}

// Auto-cleanup expired cache on load
if (typeof window !== 'undefined') {
  clearExpiredCache();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    clearExpiredCache();
  }, 5 * 60 * 1000);
}

// React import for hooks
import { useState, useEffect } from 'react';