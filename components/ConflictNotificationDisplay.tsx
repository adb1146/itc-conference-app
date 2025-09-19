'use client';

import React from 'react';
import { AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import { useConflictNotifications } from '@/contexts/ConflictNotificationContext';

export default function ConflictNotificationDisplay() {
  const { notifications, dismissNotification } = useConflictNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            relative p-4 rounded-lg shadow-lg border animate-slide-in
            ${notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{notification.title}</h3>
              <p className="text-xs mt-1 opacity-90">{notification.message}</p>

              {notification.conflicts && notification.conflicts.conflicts.length > 0 && (
                <div className="mt-2 p-2 bg-white/50 rounded text-xs space-y-1">
                  {notification.conflicts.conflicts.slice(0, 2).map((conflict) => (
                    <div key={conflict.sessionId}>
                      <span className="font-medium">Conflicts with:</span>
                      {conflict.conflictsWith.map((c, idx) => (
                        <div key={idx} className="pl-2">
                          • {c.sessionTitle} ({c.overlapMinutes} min overlap)
                        </div>
                      ))}
                    </div>
                  ))}
                  {notification.conflicts.conflicts.length > 2 && (
                    <div className="text-xs opacity-70">
                      ...and {notification.conflicts.conflicts.length - 2} more
                    </div>
                  )}
                </div>
              )}

              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        action.onClick();
                        if (action.label === 'Dismiss') {
                          dismissNotification(notification.id);
                        }
                      }}
                      className={`
                        px-3 py-1 text-xs font-medium rounded-md transition-colors
                        ${action.label === 'View Conflicts'
                          ? notification.type === 'warning'
                            ? 'bg-amber-200 hover:bg-amber-300'
                            : notification.type === 'error'
                            ? 'bg-red-200 hover:bg-red-300'
                            : 'bg-blue-200 hover:bg-blue-300'
                          : 'bg-white/70 hover:bg-white'
                        }
                      `}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}