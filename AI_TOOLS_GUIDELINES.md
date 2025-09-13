# AI Tools Development Guidelines

## Overview
This document provides guidelines for building tools for AI agents in the ITC Conference application, based on Anthropic's best practices for writing tools for agents.

## Core Principles

### 1. Build for Complete Workflows
**✅ DO:** Create tools that complete entire tasks
```typescript
// GOOD: One tool that handles the complete scheduling workflow
async function buildSchedule(params: ScheduleParams): Promise<CompleteSchedule>

// BAD: Multiple tools for each step
async function searchSessions()
async function filterSessions()
async function checkConflicts()
async function organizeSchedule()
```

### 2. Consolidate Functionality
**✅ DO:** Combine related operations into single, powerful tools
- One `schedule_manager` tool instead of separate add/remove/update tools
- One `email_composer` instead of separate subject/body/attachment tools

### 3. Return High-Signal Information
**✅ DO:** Return actionable, contextual responses
```typescript
// GOOD: Returns actionable data with context
return {
  schedule: formattedSchedule,
  conflicts: detectedConflicts,
  suggestions: alternativeSessions,
  actions: ['export_to_calendar', 'email_schedule', 'share_with_team']
}

// BAD: Returns raw data requiring interpretation
return sessionIds
```

### 4. Design for Agent Limitations
Remember that AI agents:
- Have limited context windows
- Cannot maintain complex state between calls
- Work better with clear, descriptive names
- Need explicit parameter descriptions

## Vector Database Integration

### Semantic Search Capabilities
The application now uses vector embeddings for semantic understanding:
- **Pinecone** for production vector storage (1536-dimensional embeddings)
- **OpenAI text-embedding-3-small** for generating embeddings
- **Local fallback** using in-memory vector DB when external APIs unavailable
- **Hybrid search** combining semantic similarity with keyword boosting

### Building Vector-Enabled Tools

#### Prefer Semantic Search Over Keywords
```typescript
// OLD: Brittle keyword matching
const sessions = await prisma.session.findMany({
  where: {
    OR: [
      { title: { contains: 'AI' } },
      { description: { contains: 'artificial intelligence' } }
    ]
  }
});

// NEW: Semantic understanding
import { hybridSearch } from '@/lib/vector-db';

const sessions = await hybridSearch(
  "artificial intelligence applications in insurance",
  ['AI', 'machine learning'],  // Keyword boosts
  userProfile.interests,        // Personalization
  20                            // Top K results
);
```

#### Leverage Embedding Similarity for Smarter Tools
```typescript
// Find conceptually related content
async function findRelatedSessions(sessionId: string) {
  const session = await getSession(sessionId);
  const embedding = await generateEmbedding(session.description);
  return await searchSimilarSessions(embedding, { excludeId: sessionId });
}

// Build learning paths through semantic progression
async function createLearningPath(
  startKnowledge: string,
  targetExpertise: string
) {
  const startEmbed = await generateEmbedding(startKnowledge);
  const targetEmbed = await generateEmbedding(targetExpertise);

  // Find intermediate sessions that bridge the gap
  return await findProgressiveSessions(startEmbed, targetEmbed);
}

// Discover cross-domain connections
async function discoverConnections(topic: string) {
  const results = await hybridSearch(topic);
  const clusters = await clusterByEmbeddingSimilarity(results);
  return identifyThemes(clusters);
}
```

#### Vector Tool Design Patterns

1. **Semantic Intent Understanding**
   - Use embeddings to understand what users really want
   - Go beyond literal keyword matching
   - Find conceptually related content

2. **Concept Clustering**
   - Group sessions by embedding similarity
   - Identify thematic relationships
   - Create coherent learning tracks

3. **Progressive Learning**
   - Map knowledge progression through embeddings
   - Find sessions that bridge skill gaps
   - Build personalized learning journeys

4. **Cross-Domain Discovery**
   - Connect seemingly unrelated topics
   - Find innovative intersections
   - Suggest unexpected but relevant content

5. **Personalization at Scale**
   - Match user interests semantically
   - Understand context beyond keywords
   - Provide nuanced recommendations

### Performance Considerations

#### Embedding Caching
```typescript
// Cache embeddings to avoid regeneration
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string): Promise<number[]> {
  const cached = embeddingCache.get(text);
  if (cached) return cached;

  const embedding = await generateEmbedding(text);
  embeddingCache.set(text, embedding);
  return embedding;
}
```

#### Batch Processing
```typescript
// Process multiple embeddings efficiently
async function batchEmbeddings(texts: string[]) {
  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    results.push(...embeddings);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
```

#### Hybrid Scoring Strategy
```typescript
interface HybridSearchOptions {
  semanticWeight: number;  // 0.7 default
  keywordWeight: number;   // 0.3 default
  personalizeWeight: number; // 0.2 bonus
}

// Combine multiple signals for best results
function calculateHybridScore(
  vectorScore: number,
  keywordMatches: number,
  userRelevance: number,
  options: HybridSearchOptions
): number {
  return (
    vectorScore * options.semanticWeight +
    keywordMatches * options.keywordWeight +
    userRelevance * options.personalizeWeight
  );
}
```

## Tool Design Patterns

### Naming Conventions
- Use clear, action-oriented names: `build_schedule`, `research_speaker`, `export_calendar`
- Avoid generic names: `process`, `handle`, `manage`
- Use underscores for multi-word names in tool IDs

### Parameter Design
```typescript
interface ToolParams {
  // Required parameters should be minimal
  userId: string;

  // Optional parameters with sensible defaults
  options?: {
    maxResults?: number;  // Default: 10
    format?: 'brief' | 'detailed';  // Default: 'brief'
    includeMetadata?: boolean;  // Default: false
  };
}
```

### Response Structure
```typescript
interface ToolResponse {
  // Primary result
  data: any;

  // Actionable next steps
  actions: Action[];

  // User-friendly summary
  summary: string;

  // Metadata for debugging
  metadata?: {
    executionTime: number;
    dataSource: string;
    confidence: number;
  };
}
```

## Tool Categories for ITC App

### 1. Schedule Management Tools
**Purpose:** Help users build, optimize, and manage conference schedules

**Key Tools:**
- `schedule_builder` - Create personalized schedules
- `schedule_exporter` - Export to various calendar formats
- `conflict_resolver` - Handle scheduling conflicts

### 2. Research & Discovery Tools
**Purpose:** Provide deeper insights about sessions, speakers, and topics

**Key Tools:**
- `session_researcher` - Deep dive into session topics
- `speaker_profiler` - Research speaker backgrounds
- `trend_analyzer` - Identify conference trends

### 3. Communication Tools
**Purpose:** Help users share and communicate conference information

**Key Tools:**
- `email_composer` - Create formatted emails with schedules
- `report_generator` - Generate conference reports
- `note_exporter` - Export conversation insights

### 4. Action Tools
**Purpose:** Execute specific user actions

**Key Tools:**
- `favorite_manager` - Save/manage favorite sessions
- `reminder_setter` - Set session reminders
- `feedback_collector` - Collect user feedback

## Implementation Guidelines

### 1. Tool Registry Pattern
```typescript
// lib/tools/core/tool-registry.ts
class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  async execute(toolId: string, params: any): Promise<ToolResponse> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);

    return await tool.execute(params);
  }
}
```

### 2. Tool Interface
```typescript
// lib/tools/core/tool-types.ts
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ParameterSchema;

  execute(params: any): Promise<ToolResponse>;
  validate(params: any): ValidationResult;
}
```

### 3. Error Handling
```typescript
class ToolExecutionError extends Error {
  constructor(
    message: string,
    public toolId: string,
    public params: any,
    public cause?: Error
  ) {
    super(message);
  }
}

// In tool implementation
try {
  const result = await performAction();
  return { success: true, data: result };
} catch (error) {
  // Return graceful fallback, don't throw
  return {
    success: false,
    error: 'Unable to complete action',
    fallback: alternativeAction
  };
}
```

## Testing Guidelines

### 1. Unit Testing
Each tool should have tests for:
- Parameter validation
- Core functionality
- Error handling
- Edge cases

### 2. Integration Testing
Test tools with:
- Real database data
- AI agent integration
- User workflows

### 3. Performance Testing
Monitor:
- Execution time
- Database query efficiency
- API call optimization

## Security Considerations

### 1. Input Validation
- Always validate and sanitize inputs
- Use TypeScript types for compile-time safety
- Implement runtime validation

### 2. Authorization
- Check user permissions before executing actions
- Implement rate limiting for expensive operations
- Log all tool executions for audit

### 3. Data Privacy
- Don't expose sensitive user data
- Implement proper data scoping
- Follow GDPR/privacy requirements

## Monitoring & Analytics

### Track Tool Usage
```typescript
interface ToolMetrics {
  toolId: string;
  userId: string;
  executionTime: number;
  success: boolean;
  timestamp: Date;
  context?: any;
}
```

### Key Metrics to Monitor
- Most used tools
- Tool success rates
- Average execution times
- User satisfaction scores

## Progressive Enhancement Strategy

### Phase 1: Foundation (Current)
- Build core tool infrastructure
- Implement 1-2 high-impact tools
- Gather user feedback

### Phase 2: Expansion
- Add more specialized tools
- Implement tool chaining
- Enhance AI decision-making

### Phase 3: Intelligence
- Predictive tool suggestions
- Automated workflow creation
- Learning from usage patterns

## Best Practices Checklist

Before deploying a tool, ensure:
- [ ] Tool completes an entire workflow
- [ ] Clear, actionable responses
- [ ] Proper error handling
- [ ] Performance optimized
- [ ] Security validated
- [ ] Tests written
- [ ] Documentation complete
- [ ] Metrics tracking enabled

## References
- [Anthropic: Writing Tools for Agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Tool Design Patterns](https://docs.anthropic.com/tools)
- [ITC Conference App Architecture](./README.md)