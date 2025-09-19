import { useState, useEffect, useCallback } from 'react';
import { ConflictCheckResult } from '@/lib/services/conflict-detector';

interface UseConflictDetectionOptions {
  autoCheck?: boolean;
  onConflictDetected?: (conflicts: ConflictCheckResult) => void;
}

export function useConflictDetection(
  sessionId: string | undefined,
  options: UseConflictDetectionOptions = {}
) {
  const { autoCheck = false, onConflictDetected } = options;
  const [conflictData, setConflictData] = useState<ConflictCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const checkConflicts = useCallback(async () => {
    if (!sessionId) return null;

    setIsChecking(true);
    try {
      const response = await fetch('/api/conflicts/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        console.error('Failed to check conflicts');
        return null;
      }

      const data = await response.json();

      if (data.hasAgenda) {
        setConflictData(data);
        setHasChecked(true);

        if (data.hasConflicts && onConflictDetected) {
          onConflictDetected(data);
        }

        return data;
      }

      setHasChecked(true);
      return null;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [sessionId, onConflictDetected]);

  useEffect(() => {
    if (autoCheck && sessionId && !hasChecked) {
      checkConflicts();
    }
  }, [autoCheck, sessionId, hasChecked, checkConflicts]);

  return {
    conflictData,
    isChecking,
    hasChecked,
    checkConflicts,
    hasConflicts: conflictData?.hasConflicts || false,
    conflictCount: conflictData?.totalConflicts || 0
  };
}