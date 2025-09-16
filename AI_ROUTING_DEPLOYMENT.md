# AI Routing Deployment Guide

## Summary
The AI routing system has been successfully implemented and tested. It correctly classifies user intent using either OpenAI's GPT-4 or a robust fallback system, eliminating the keyword-matching problems that caused "Show me the keynote speakers" to return entertainment venues.

## Test Results ✅
All 7 test cases passing:
- "Show me the keynote speakers" → `information_seeking` (NOT local recommendations)
- "Where can I get lunch?" → `local_recommendations`
- "Help me build my conference agenda" → `agenda_building`
- "What sessions cover AI and machine learning?" → `information_seeking`
- "Show me entertainment options" → `local_recommendations`
- "Tell me about the opening keynote" → `information_seeking`
- "I'm hungry, where should I eat?" → `local_recommendations`

## Implementation Steps

### Step 1: Update Route Handler
In `/app/api/chat/stream/route.ts`, replace the import:

```typescript
// OLD - Remove this:
import { routeMessage } from '@/lib/agents/agent-router';

// NEW - Add this:
import { smartRouteMessage as routeMessage } from '@/lib/agents/smart-router-wrapper';
```

### Step 2: Configure Environment Variables

#### For Development Testing
Add to `.env.local`:
```bash
# Enable AI routing (required)
ENABLE_AI_ROUTING=true

# Optional: Add OpenAI key for full AI classification
OPENAI_API_KEY=sk-your-actual-key-here
```

#### For Production Gradual Rollout
Start with a small percentage:
```bash
# Start with 10% of users
AI_ROUTING_PERCENTAGE=10

# Monitor for 24 hours, then increase:
# AI_ROUTING_PERCENTAGE=25  # Day 2
# AI_ROUTING_PERCENTAGE=50  # Day 3
# AI_ROUTING_PERCENTAGE=100 # Day 4
```

#### For Full Production Deployment
Once stable:
```bash
ENABLE_AI_ROUTING=true
OPENAI_API_KEY=sk-your-production-key
```

### Step 3: Monitor Deployment

Watch for these log patterns:
```
[Smart Router] Using AI-powered routing     # AI is active
[Smart Router] Using keyword-based routing  # Fallback active
[Routing Analytics] { method: 'ai', ... }   # Track success
[Routing Error] Keynote query routed...     # Critical errors
```

### Step 4: Verify Success

Run test queries in production:
1. "Show me the keynote speakers" → Should return speaker info
2. "Where can I get lunch?" → Should return restaurants
3. "Help me with my agenda" → Should trigger agenda builder

## Rollback Plan

If issues occur:
```bash
# Immediate rollback
ENABLE_AI_ROUTING=false

# Or reduce percentage
AI_ROUTING_PERCENTAGE=0
```

The system automatically falls back to keyword routing when:
- AI routing is disabled
- OpenAI API fails
- Any errors occur during classification

## Architecture Overview

```
User Query
    ↓
smartRouteMessage (wrapper)
    ↓
Check Feature Flags
    ↓
┌─────────────────┬────────────────┐
│  AI Enabled?    │   AI Disabled? │
└─────────────────┴────────────────┘
        ↓                  ↓
  aiRouteMessage    keywordRouteMessage
        ↓                  ↓
  classifyIntent     Keyword Matching
        ↓                  ↓
   Route to Agent    Route to Agent
```

## Key Benefits

1. **Accurate Intent Understanding**: No more "keynote" → "entertainment" errors
2. **Graceful Fallback**: System never breaks, always has backup
3. **Gradual Rollout**: Test with real users safely
4. **Performance**: Fallback classification handles common cases without API calls
5. **Monitoring**: Full visibility into routing decisions

## Files Modified

- `/lib/agents/ai-agent-router.ts` - New AI-powered routing
- `/lib/agents/smart-router-wrapper.ts` - Feature flag wrapper
- `/lib/ai-intent-classifier.ts` - Improved fallback classification
- `/scripts/test-ai-routing.ts` - Test suite

## Next Steps

1. Deploy to staging with `ENABLE_AI_ROUTING=true`
2. Test with real queries
3. Begin gradual production rollout at 10%
4. Monitor logs and increase percentage daily
5. Full rollout after stable at 100%