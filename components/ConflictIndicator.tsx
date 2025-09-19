'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useConflictDetection } from '@/hooks/useConflictDetection';
import { useConflictNotifications } from '@/contexts/ConflictNotificationContext';

interface ConflictIndicatorProps {
  sessionId: string;
  showDetails?: boolean;
  autoCheck?: boolean;
  onConflictClick?: () => void;
}

export default function ConflictIndicator({
  sessionId,
  showDetails = false,
  autoCheck = true,
  onConflictClick
}: ConflictIndicatorProps) {
  const { checkForConflicts } = useConflictNotifications();
  const {
    hasConflicts,
    conflictCount,
    conflictData,
    isChecking,
    checkConflicts: manualCheck
  } = useConflictDetection(sessionId, {
    autoCheck,
    onConflictDetected: (conflicts) => {
      // Optionally trigger notification on detection
      console.log('Conflict detected for session:', sessionId, conflicts);
    }
  });

  useEffect(() => {
    // Check for conflicts on mount if auto-check is enabled
    if (autoCheck && sessionId) {
      manualCheck();
    }
  }, [sessionId, autoCheck]);

  if (isChecking) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  if (!hasConflicts) {
    return null;
  }

  const handleClick = () => {
    if (onConflictClick) {
      onConflictClick();
    } else {
      // Show detailed conflict notification
      checkForConflicts(sessionId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded-full text-xs text-amber-800 transition-colors group"
      title={`Conflicts with ${conflictCount} session(s) in your Smart Agenda`}
    >
      <AlertTriangle className="w-3 h-3" />
      <span className="font-medium">
        {conflictCount === 1 ? '1 Conflict' : `${conflictCount} Conflicts`}
      </span>

      {showDetails && conflictData?.conflicts && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-amber-200 rounded-lg shadow-lg hidden group-hover:block z-10 min-w-[200px]">
          <div className="text-xs space-y-1">
            {conflictData.conflicts.slice(0, 3).map((conflict) => (
              <div key={conflict.sessionId} className="border-b border-gray-100 pb-1">
                <div className="font-semibold text-amber-900">
                  {conflict.severity === 'high' ? '⚠️ High' : conflict.severity === 'medium' ? '⚡ Medium' : '💡 Low'} Conflict
                </div>
                {conflict.conflictsWith.map((c, idx) => (
                  <div key={idx} className="text-gray-600 pl-2">
                    • {c.overlapMinutes} min overlap
                  </div>
                ))}
              </div>
            ))}
            {conflictData.conflicts.length > 3 && (
              <div className="text-gray-500 text-center">
                ...and {conflictData.conflicts.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );
}