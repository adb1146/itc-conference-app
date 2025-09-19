'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { clearAllCache } from '@/lib/cache-utils';

export default function RefreshIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showStaleWarning, setShowStaleWarning] = useState(false);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Check for stale content (page hasn't been refreshed in 5 minutes)
  useEffect(() => {
    const checkStale = () => {
      if (lastRefresh) {
        const timeSinceRefresh = Date.now() - lastRefresh.getTime();
        if (timeSinceRefresh > 5 * 60 * 1000) {
          setShowStaleWarning(true);
        }
      }
    };

    const interval = setInterval(checkStale, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [lastRefresh]);

  // Track page changes
  useEffect(() => {
    setLastRefresh(new Date());
    setShowStaleWarning(false);
  }, [pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShowStaleWarning(false);

    // Clear all caches
    clearAllCache();

    // Force refresh the page
    router.refresh();

    // Simulate refresh time
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsRefreshing(false);
    setLastRefresh(new Date());
  };

  // Don't show on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg shadow-lg animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}

      {/* Stale content warning */}
      {showStaleWarning && isOnline && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg shadow-lg">
          <div>
            <p className="text-sm font-medium">Content may be outdated</p>
            <p className="text-xs">Last refreshed: {lastRefresh?.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors"
            title="Refresh page"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

    </>
  );
}