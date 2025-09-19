'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConflictCheckResult } from '@/lib/services/conflict-detector';

export interface ConflictNotification {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  sessionId?: string;
  conflicts?: ConflictCheckResult;
  timestamp: Date;
  autoHide?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

interface ConflictNotificationContextType {
  notifications: ConflictNotification[];
  showConflictNotification: (notification: Omit<ConflictNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  checkForConflicts: (sessionId: string) => Promise<ConflictCheckResult | null>;
}

const ConflictNotificationContext = createContext<ConflictNotificationContextType | undefined>(undefined);

export function ConflictNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);

  const showConflictNotification = useCallback((notification: Omit<ConflictNotification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: ConflictNotification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-hide after 10 seconds if specified
    if (notification.autoHide) {
      setTimeout(() => {
        dismissNotification(id);
      }, 10000);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const checkForConflicts = useCallback(async (sessionId: string): Promise<ConflictCheckResult | null> => {
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

      if (!data.hasAgenda) {
        return null;
      }

      if (data.hasConflicts) {
        showConflictNotification({
          type: 'warning',
          title: 'Schedule Conflict Detected',
          message: `This session conflicts with ${data.totalConflicts} session(s) in your Smart Agenda`,
          sessionId,
          conflicts: data,
          autoHide: false,
          actions: [
            {
              label: 'View Conflicts',
              onClick: () => {
                // Navigate to smart agenda with conflict highlight
                window.location.href = `/smart-agenda?highlight=${sessionId}`;
              }
            },
            {
              label: 'Dismiss',
              onClick: () => {
                // Will be handled by the notification component
              }
            }
          ]
        });
      }

      return data;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return null;
    }
  }, [showConflictNotification]);

  return (
    <ConflictNotificationContext.Provider
      value={{
        notifications,
        showConflictNotification,
        dismissNotification,
        clearAllNotifications,
        checkForConflicts
      }}
    >
      {children}
    </ConflictNotificationContext.Provider>
  );
}

export function useConflictNotifications() {
  const context = useContext(ConflictNotificationContext);
  if (!context) {
    throw new Error('useConflictNotifications must be used within ConflictNotificationProvider');
  }
  return context;
}