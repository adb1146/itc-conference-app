# Lessons Learned: Building Conversational AI Systems

## Critical Implementation Guidelines

This document captures hard-won lessons from building and debugging the ITC Conference AI chat system. These patterns should be followed in all future development.

---

## 1. Environment Variables & Configuration

### ❌ NEVER DO THIS:
```env
# .env.local - WRONG
OPENAI_API_KEY="sk-proj-abc123..."
ANTHROPIC_API_KEY="sk-ant-api03-xyz..."
```

### ✅ ALWAYS DO THIS:
```env
# .env.local - CORRECT
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-api03-xyz...
```

### Key Rules:
- **No quotes around environment variables** in `.env` files
- Always check for shell overrides: `env | grep API_KEY`
- Use `unset VAR_NAME` before running dev commands when testing
- Verify variables are loaded: `console.log('API key check:', apiKey ? apiKey.substring(0, 15) + '...' : 'NO KEY')`

---

## 2. Context Retention Architecture

### The Problem:
Users lose context between messages. Example:
- User: "Where are the best happy hours?"
- Bot: [Lists happy hours]
- User: "ok on Day 1"
- Bot: ❌ [Gives general Day 1 info instead of Day 1 happy hours]

### The Solution:

#### A. Proper Message History Structure
```typescript
// ❌ WRONG - Concatenated single message
const messages = [{
  role: 'user',
  content: previousMessages.join('\n') + '\n' + currentMessage
}];

// ✅ CORRECT - Alternating message history
const messages = [
  { role: 'user', content: 'Where are happy hours?' },
  { role: 'assistant', content: 'Here are the happy hours...' },
  { role: 'user', content: 'ok on Day 1' }
];
```

#### B. Follow-up Detection Pattern
```typescript
// Detect follow-up messages that need context
const isFollowUp = conversation.messages.length > 0 && (
  message.toLowerCase().startsWith('ok') ||
  message.toLowerCase().includes('first') ||
  message.toLowerCase().includes('that') ||
  message.toLowerCase().includes('day 1') ||
  message.toLowerCase().includes('day 2') ||
  (message.length < 30 && !message.includes('?'))
);

// Bypass intent classification for follow-ups
if (isFollowUp) {
  intent = 'information_seeking';
  reasoning = 'Follow-up message in ongoing conversation - maintaining context';
}
```

#### C. Enhanced Prompt Engineering
```typescript
// Include conversation history explicitly
if (conversationHistory && conversationHistory.length > 0) {
  enhanced += `Previous conversation context:\n`;
  enhanced += `================================\n`;
  conversationHistory.forEach((msg: any) => {
    if (msg.role === 'user') {
      enhanced += `User: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      enhanced += `Assistant: ${msg.content.substring(0, 200)}...\n`;
    }
  });
  enhanced += `================================\n\n`;
  enhanced += `IMPORTANT: Maintain context from the previous conversation.`;
}
```

---

## 3. Intent Classification Best Practices

### Pattern Recognition Order:
1. **Check for follow-ups first** (bypass AI classification)
2. **Use rule-based detection** for obvious patterns
3. **Fall back to AI classification** for complex intents

### Common Misclassifications to Handle:
- "ok on [day/time]" → Not general acknowledgment, it's a filter
- "what about the first one" → Reference to previous list
- "and the second?" → Continuation of previous query
- Short responses after long queries → Usually follow-ups

---

## 4. Streaming API Response Patterns

### Critical Setup:
```typescript
// Always create the transform stream properly
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();
const encoder = new TextEncoder();

// Return the readable side immediately
return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Error Handling:
```typescript
try {
  // Main processing
} catch (error) {
  console.error('Streaming error:', error);
  try {
    // Try to send error if stream is still open
    await writer.write(encoder.encode(`data: {"type":"error","content":"..."}\n\n`));
  } catch (writeError) {
    // Stream already closed, log but don't throw
    console.error('Could not write to closed stream:', writeError);
  }
} finally {
  try {
    await writer.close();
  } catch {
    // Already closed
  }
}
```

---

## 5. State Management Patterns

### Conversation State Structure:
```typescript
interface ConversationContext {
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  state: {
    waitingForPreferences?: boolean;
    agendaBuilt?: boolean;
    userPreferences?: {
      interests?: string[];
      role?: string;
      days?: string[];
    };
    topics?: string[];  // Track discussed topics
    entities?: {        // Track mentioned entities
      sessions?: string[];
      speakers?: string[];
      tracks?: string[];
    };
  };
}
```

### Cache Management:
```typescript
// Use LRU cache to prevent memory bloat
const conversationCache = new LRUCache<string, ConversationContext>({
  max: 1000,              // Maximum conversations
  ttl: 1000 * 60 * 60,   // 1 hour TTL
  updateAgeOnGet: true,   // Refresh on access
});

// Keep only recent messages
if (conversation.messages.length > 20) {
  conversation.messages = conversation.messages.slice(-20);
}
```

---

## 6. Performance Optimization

### Parallel API Calls:
```typescript
// ✅ Execute independent operations in parallel
const [vectorResults, webResults, userProfile] = await Promise.all([
  searchSimilarSessions(query),
  searchWeb(query),
  getUserProfile(userId)
]);

// ❌ Don't await sequentially
const vectorResults = await searchSimilarSessions(query);
const webResults = await searchWeb(query);
const userProfile = await getUserProfile(userId);
```

### Response Caching:
```typescript
// Cache frequent queries
const cacheKey = generateKey(message, userPreferences);
const cached = responseCache.get(cacheKey);
if (cached && !isFollowUp) {
  return cached;
}
```

---

## 7. Testing Strategies

### Automated Context Tests:
```typescript
const scenarios = [
  {
    name: "Happy Hours Follow-up",
    messages: [
      { text: "Where are the best happy hours?", expect: "Lists events" },
      { text: "ok on Day 1", expect: "Filters to Day 1 happy hours" },
      { text: "what about the first one", expect: "Details on first Day 1 event" }
    ]
  }
];
```

### Debug Logging:
```typescript
console.log('[Stream API] Intent Classification:', {
  intent: aiIntent.intent,
  confidence: aiIntent.confidence,
  reasoning: aiIntent.reasoning,
  isFollowUp: isFollowUp
});
```

---

## 8. Common Pitfalls to Avoid

1. **Don't trust AI intent classification blindly** - Add fallbacks
2. **Don't concatenate conversation history** - Maintain structure
3. **Don't skip environment variable validation** - Check early
4. **Don't ignore stream state** - Handle closed streams gracefully
5. **Don't process follow-ups as new conversations** - Detect and maintain context
6. **Don't make sequential API calls when parallel is possible** - Optimize performance

---

## 9. Debugging Checklist

When context is lost:
- [ ] Check if follow-up detection is working
- [ ] Verify message history structure is correct
- [ ] Confirm conversation state is persisting
- [ ] Check intent classification logs
- [ ] Verify enhanced prompt includes history
- [ ] Test with simplified scenario

When APIs fail:
- [ ] Check environment variables (no quotes!)
- [ ] Verify no shell overrides (`env | grep`)
- [ ] Test API keys independently
- [ ] Check network/firewall issues
- [ ] Verify rate limits

---

## 10. Architecture Decisions

### Why These Patterns Matter:

1. **Explicit Context Management**: Context doesn't flow automatically through AI systems
2. **Hybrid Approaches**: Pure AI or pure rules both fail - combine them
3. **Defensive Programming**: Always assume streams can close, APIs can fail
4. **User Experience First**: 59-second responses are unacceptable - optimize aggressively
5. **Debugging Infrastructure**: You can't fix what you can't see - log strategically

---

## Implementation Checklist for New Features

- [ ] Add follow-up detection for the feature's domain
- [ ] Update conversation state structure if needed
- [ ] Include context in prompts explicitly
- [ ] Add parallel API calls where possible
- [ ] Implement proper error handling
- [ ] Create automated tests for conversation flows
- [ ] Add debug logging for intent decisions
- [ ] Document any new patterns discovered

---

*Last Updated: 2025-01-15*
*Updated By: Development Team*
*Version: 1.0*