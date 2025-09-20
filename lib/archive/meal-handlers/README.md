# Archived Meal Handlers

These files were archived on 2025-09-19 after refactoring the meal query handling system.

## Files
- `meal-info-handler.ts` - Previously handled meal queries with hardcoded responses
- `meal-session-detector.ts` - Detected meal-related queries

## Why Archived

The meal handling system was intercepting meal queries early and returning hardcoded meal information without session IDs, which prevented creating clickable links to session detail pages.

## Current Approach

Meal queries now go through the standard vector search pipeline, which:
1. Returns actual session objects with IDs
2. Allows proper link formatting
3. Provides consistent user experience with other session searches

## Changes Made

1. Disabled meal query interception in:
   - `/lib/agents/agent-router.ts`
   - `/lib/agents/ai-agent-router.ts`

2. Updated system prompt to explicitly handle meal formatting

3. Removed dependencies from:
   - `/lib/enhanced-session-search.ts`
   - `/lib/agents/local-recommendations-agent.ts`
   - `/app/api/chat/stream/route.ts`

## If Needed Again

These files are preserved here in case the hardcoded meal handling approach is needed in the future. However, the vector search approach is recommended for consistency and proper linking.