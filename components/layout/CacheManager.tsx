'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Version to force cache invalidation
const CACHE_VERSION = 'v3-2025-01-18-no-cache';

export default function CacheManager() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check cache version
    const storedVersion = localStorage.getItem('app_cache_version');

    if (storedVersion !== CACHE_VERSION) {
      console.log('Cache version changed, clearing all caches...');

      // Clear all localStorage
      const keysToKeep = ['app_cache_version'];
      const allKeys = Object.keys(localStorage);

      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      // Update version
      localStorage.setItem('app_cache_version', CACHE_VERSION);

      // Force refresh
      router.refresh();
    }
  }, [router]);

  // Force refresh on critical pages if they seem stale
  useEffect(() => {
    if (pathname === '/smart-agenda') {
      // Always refresh the smart agenda page
      router.refresh();
    }
  }, [pathname, router]);

  return null;
}