'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { getTimeContext, formatVegasTime } from '@/lib/timezone-context';

export function VegasTimeDisplay() {
  const [timeContext, setTimeContext] = useState<ReturnType<typeof getTimeContext> | null>(null);

  useEffect(() => {
    // Update immediately
    setTimeContext(getTimeContext());

    // Update every minute
    const interval = setInterval(() => {
      setTimeContext(getTimeContext());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!timeContext) return null;

  // Determine what to display based on conference status
  let statusBadge;
  if (timeContext.conferenceStatus === 'before') {
    const daysUntil = Math.ceil((new Date('2025-10-14').getTime() - timeContext.currentTimeVegas.getTime()) / (1000 * 60 * 60 * 24));
    statusBadge = (
      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
        {daysUntil} days until conference
      </span>
    );
  } else if (timeContext.conferenceStatus === 'during') {
    statusBadge = (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full animate-pulse">
        Day {timeContext.conferenceDay} in progress
      </span>
    );
  } else {
    statusBadge = (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
        Conference ended
      </span>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 text-gray-500">
            <MapPin className="w-4 h-4" />
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-gray-900">Las Vegas, NV</p>
            {statusBadge}
          </div>
          <p className="text-xs text-gray-600">
            {formatVegasTime(timeContext.currentTimeVegas).replace(' Pacific Daylight Time', ' PDT').replace(' Pacific Standard Time', ' PST')}
          </p>
          {timeContext.conferenceStatus === 'during' && (
            <p className="text-xs text-gray-500 mt-1">
              Conference time: {timeContext.timeOfDay.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}