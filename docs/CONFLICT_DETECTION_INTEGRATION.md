# Real-Time Conflict Detection System - Integration Guide

## Overview
The real-time conflict detection system automatically identifies scheduling conflicts between user favorites and their Smart Agenda. It provides immediate feedback when adding new sessions that conflict with existing scheduled items.

## Components Created

### 1. Core Service
**File:** `/lib/services/conflict-detector.ts`
- `detectConflictsWithAgenda()` - Main conflict detection logic
- `checkSessionConflicts()` - Check specific session against agenda
- `calculateOverlapMinutes()` - Calculate overlap duration
- `suggestAlternatives()` - Find non-conflicting alternatives

### 2. API Endpoints

#### Enhanced Favorites API
**File:** `/app/api/favorites/route.ts`
- Now automatically checks for conflicts when adding session favorites
- Returns conflict information in response if detected

#### Dedicated Conflict Check API
**File:** `/app/api/conflicts/check/route.ts`
- **POST** - Check single or multiple sessions for conflicts
- **GET** - Check if user has active Smart Agenda

### 3. UI Components

#### Notification Context
**File:** `/contexts/ConflictNotificationContext.tsx`
- Global state management for conflict notifications
- Provides methods to show/dismiss notifications

#### Notification Display
**File:** `/components/ConflictNotificationDisplay.tsx`
- Visual notification component
- Shows conflict details with severity levels
- Provides action buttons for conflict resolution

#### Conflict Indicator
**File:** `/components/ConflictIndicator.tsx`
- Badge component showing conflict status on session cards
- Auto-checks for conflicts when rendered
- Shows conflict count and severity

### 4. Custom Hook
**File:** `/hooks/useConflictDetection.ts`
- Reusable hook for conflict checking
- Manages loading states and caching
- Can auto-check on mount

## Integration Instructions

### Step 1: Add Providers to Layout
```tsx
// app/layout.tsx
import { ConflictNotificationProvider } from '@/contexts/ConflictNotificationContext';
import ConflictNotificationDisplay from '@/components/ConflictNotificationDisplay';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConflictNotificationProvider>
          {/* Existing providers */}
          <ConflictNotificationDisplay />
          {children}
        </ConflictNotificationProvider>
      </body>
    </html>
  );
}
```

### Step 2: Add Conflict Indicators to Session Cards
```tsx
// components/SessionCard.tsx
import ConflictIndicator from '@/components/ConflictIndicator';

function SessionCard({ session }) {
  return (
    <div className="session-card">
      {/* Existing card content */}
      <ConflictIndicator
        sessionId={session.id}
        autoCheck={true}
        showDetails={true}
      />
    </div>
  );
}
```

### Step 3: Use Conflict Detection in Favorite Buttons
```tsx
// components/FavoriteButton.tsx
import { useConflictNotifications } from '@/contexts/ConflictNotificationContext';

function FavoriteButton({ sessionId }) {
  const { checkForConflicts } = useConflictNotifications();

  const handleAddFavorite = async () => {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ sessionId, type: 'session' })
    });

    const data = await response.json();

    // Response includes conflict info if detected
    if (data.conflicts && data.conflicts.hasConflicts) {
      // Notification is shown automatically
      console.log('Conflict detected:', data.conflicts);
    }
  };
}
```

### Step 4: Manual Conflict Checking
```tsx
// Any component
import { useConflictDetection } from '@/hooks/useConflictDetection';

function MyComponent({ sessionId }) {
  const {
    hasConflicts,
    conflictCount,
    checkConflicts
  } = useConflictDetection(sessionId);

  // Manual check
  const handleCheck = async () => {
    const result = await checkConflicts();
    if (result?.hasConflicts) {
      // Handle conflicts
    }
  };
}
```

## Features

### Conflict Severity Levels
- **High**: Complete overlap (60+ minutes)
- **Medium**: Significant overlap (30-59 minutes)
- **Low**: Minor overlap (<30 minutes)

### Auto-Detection Triggers
1. When adding a new favorite session
2. When viewing session cards (optional)
3. When explicitly checking via API

### User Notifications
- Toast-style notifications appear top-right
- Shows conflict count and affected sessions
- Provides quick actions to resolve conflicts
- Auto-dismisses after 10 seconds (configurable)

## API Usage Examples

### Check Single Session
```javascript
const response = await fetch('/api/conflicts/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session-123',
    includeAlternatives: true
  })
});
```

### Check Multiple Sessions
```javascript
const response = await fetch('/api/conflicts/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionIds: ['session-123', 'session-456']
  })
});
```

### Check Agenda Status
```javascript
const response = await fetch('/api/conflicts/check');
const data = await response.json();
// { hasAgenda: true, agendaId: '...', stats: {...} }
```

## Performance Considerations

1. **Caching**: Conflict checks are cached per session
2. **Lazy Loading**: Indicators only check when visible
3. **Batch Checking**: Multiple sessions can be checked in one request
4. **Optimized Queries**: Database queries are optimized with proper indexing

## Next Steps

To complete the integration:

1. Add the providers to your root layout
2. Import ConflictIndicator in existing session components
3. Test with a user that has both a Smart Agenda and favorites
4. Customize notification styles to match your theme
5. Consider adding conflict resolution workflows

## Troubleshooting

If conflicts aren't being detected:
1. Ensure user has an active Smart Agenda
2. Check that sessions have valid startTime/endTime
3. Verify the API endpoints are accessible
4. Check browser console for errors

The system gracefully handles cases where:
- User has no Smart Agenda (no checks performed)
- Sessions lack time information (skipped)
- API is unavailable (fails silently)