/**
 * Route AI Upgrade Patch
 * This shows how to modify the existing route.ts to use AI routing
 * 
 * TO APPLY THIS UPGRADE:
 * 1. Set environment variable: ENABLE_AI_ROUTING=true
 * 2. Or set gradual rollout: AI_ROUTING_PERCENTAGE=10 (starts with 10% of users)
 * 3. Replace the import in route.ts:
 *    OLD: import { routeMessage } from '@/lib/agents/agent-router';
 *    NEW: import { smartRouteMessage as routeMessage } from '@/lib/agents/smart-router-wrapper';
 */

// Example of the changes needed in route.ts:

// BEFORE (current problematic code):
/*
import { routeMessage } from '@/lib/agents/agent-router';

// Later in the code:
const routed = await routeMessage(message, { sessionId, userId });
*/

// AFTER (with AI routing):
/*
import { smartRouteMessage as routeMessage } from '@/lib/agents/smart-router-wrapper';
import { getConversation } from '@/lib/conversation-state';

// Later in the code:
const conversation = getConversation(sessionId);
const routed = await routeMessage(message, { 
  sessionId, 
  userId,
  conversationHistory: conversation.messages // Add context for better AI understanding
});
*/

// The smart router will:
// 1. Check if AI routing is enabled (via feature flag)
// 2. If yes, use AI to understand "Show me the keynote speakers" correctly
// 3. If no or if AI fails, fall back to keyword routing
// 4. Log all decisions for monitoring

export const UPGRADE_INSTRUCTIONS = `
## How to Roll Out AI Intent Classification

### Step 1: Test in Development
1. Add to .env.local:
   ENABLE_AI_ROUTING=true
   
2. Test these queries:
   - "Show me the keynote speakers" → Should NOT return entertainment
   - "Where can I eat lunch?" → Should return restaurants
   - "Help me build an agenda" → Should trigger agenda builder

### Step 2: Gradual Production Rollout
1. Start with 5% of users:
   AI_ROUTING_PERCENTAGE=5
   
2. Monitor logs for:
   - [Routing Analytics] entries
   - [Routing Error] warnings
   - Success rate of AI classifications
   
3. Gradually increase:
   - Day 1: 5%
   - Day 2: 10% (if no issues)
   - Day 3: 25%
   - Day 4: 50%
   - Day 5: 100%

### Step 3: Full Rollout
1. Once stable at 100%:
   ENABLE_AI_ROUTING=true
   
2. Remove keyword routing code after 1 week of stability

### Rollback Plan
If issues occur:
1. Immediately set: ENABLE_AI_ROUTING=false
2. Or reduce percentage: AI_ROUTING_PERCENTAGE=0
3. System automatically falls back to keyword routing

### Monitoring Dashboard
Track these metrics:
- AI routing success rate
- Fallback frequency
- Response time (AI vs keyword)
- User satisfaction (via feedback)
- Specific failure: "keynote" → "entertainment" errors
`;