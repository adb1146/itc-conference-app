# Architecture Redesign Plan - ITC Conference App

## Executive Summary
This document outlines a comprehensive redesign of the ITC Conference App to follow industry best practices, improve maintainability, and enhance scalability. The current monolithic architecture will be refactored into a clean, layered architecture with proper separation of concerns.

## Current Architecture Issues

### Problems Identified
1. **Monolithic Route Handler**: `/app/api/chat/stream/route.ts` is 1000+ lines with mixed responsibilities
2. **Data Duplication**: Session data exists in PostgreSQL, Pinecone, and local memory
3. **Tight Coupling**: Direct database calls mixed with business logic
4. **No Abstraction Layers**: Missing repository pattern and service layers
5. **Complex Decision Logic**: Nested conditionals making code hard to maintain

## Proposed Architecture

### Core Pattern: Clean Architecture + CQRS

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Chat UI   │  │  Agenda UI  │  │  Admin UI   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Rate Limiting | Auth | Logging | Circuit Breaker │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Services                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Chat Service │  │Search Service│  │Agenda Service│     │
│  └─────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │Intent Engine │  │Recommendation│  │Personalization│    │
│  │   (AI)       │  │    Engine    │  │    Engine     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Unified Repository Interface              │      │
│  ├──────────────┬──────────────┬───────────────────┤      │
│  │  PostgreSQL  │Vector Search │   Cache Layer     │      │
│  │  Repository  │ Repository   │   Repository      │      │
│  └──────────────┴──────────────┴───────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## New File Structure

```
/src
├── /api
│   ├── /routes
│   │   ├── chat.route.ts          (30 lines - routing only)
│   │   ├── search.route.ts
│   │   └── agenda.route.ts
│   └── /middleware
│       ├── auth.middleware.ts
│       ├── rateLimit.middleware.ts
│       └── cache.middleware.ts
│
├── /application
│   ├── /services
│   │   ├── ChatService.ts         (Orchestrates chat flow)
│   │   ├── SearchService.ts       (Handles all search operations)
│   │   └── AgendaService.ts       (Agenda building operations)
│   └── /dto
│       ├── ChatRequest.dto.ts
│       └── SearchQuery.dto.ts
│
├── /domain
│   ├── /entities
│   │   ├── Session.ts
│   │   ├── User.ts
│   │   └── Message.ts
│   ├── /services
│   │   ├── IntentClassifier.ts
│   │   ├── ResponseGenerator.ts
│   │   └── PersonalizationEngine.ts
│   └── /interfaces
│       ├── ISearchStrategy.ts
│       └── IDataRepository.ts
│
├── /infrastructure
│   ├── /repositories
│   │   ├── SessionRepository.ts
│   │   ├── VectorRepository.ts
│   │   └── CacheRepository.ts
│   ├── /external
│   │   ├── AnthropicClient.ts
│   │   ├── PineconeClient.ts
│   │   └── OpenAIClient.ts
│   └── /database
│       └── PrismaClient.ts
│
└── /shared
    ├── /utils
    └── /constants
```

## Implementation Details

### 1. Unified Data Service

```typescript
// src/application/services/DataService.ts
export class DataService {
  constructor(
    private sessionRepo: ISessionRepository,
    private vectorRepo: IVectorRepository,
    private cacheRepo: ICacheRepository,
    private eventBus: IEventBus
  ) {}

  async searchSessions(query: SearchQuery): Promise<SearchResult> {
    // 1. Check cache first
    const cached = await this.cacheRepo.get(query.hash);
    if (cached) return cached;

    // 2. Determine search strategy based on availability
    const strategy = this.selectStrategy(query);

    // 3. Execute search with selected strategy
    const results = await strategy.execute(query);

    // 4. Cache results for future queries
    await this.cacheRepo.set(query.hash, results);

    // 5. Emit analytics event for monitoring
    this.eventBus.emit('search.completed', { query, results });

    return results;
  }

  private selectStrategy(query: SearchQuery): ISearchStrategy {
    if (query.type === 'semantic' && this.vectorRepo.isAvailable()) {
      return new SemanticSearchStrategy(this.vectorRepo);
    }
    return new KeywordSearchStrategy(this.sessionRepo);
  }
}
```

### 2. Chat Orchestrator Service

```typescript
// src/application/services/ChatService.ts
export class ChatService {
  constructor(
    private intentClassifier: IntentClassifier,
    private dataService: DataService,
    private responseGenerator: ResponseGenerator,
    private agents: Map<IntentType, IAgent>
  ) {}

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // 1. Classify intent using AI
    const intent = await this.intentClassifier.classify(request.message);

    // 2. Route to specialized agent if applicable
    const agent = this.agents.get(intent.type);
    if (agent) {
      return agent.handle(request, intent);
    }

    // 3. Default flow: Search for context
    const context = await this.dataService.searchSessions({
      query: request.message,
      type: intent.searchType,
      filters: intent.extractedFilters
    });

    // 4. Generate intelligent response
    return this.responseGenerator.generate({
      query: request.message,
      context: context,
      intent: intent,
      userProfile: request.user
    });
  }
}
```

### 3. Repository Pattern Implementation

```typescript
// src/domain/interfaces/ISessionRepository.ts
export interface ISessionRepository {
  findById(id: string): Promise<Session>;
  search(criteria: SearchCriteria): Promise<Session[]>;
  save(session: Session): Promise<void>;
  bulkUpsert(sessions: Session[]): Promise<void>;
}

// src/infrastructure/repositories/PostgresSessionRepository.ts
export class PostgresSessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  async search(criteria: SearchCriteria): Promise<Session[]> {
    const results = await this.prisma.session.findMany({
      where: this.buildWhereClause(criteria),
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
    return results.map(this.toDomainEntity);
  }

  private toDomainEntity(dbRecord: any): Session {
    return new Session({
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description,
      speakers: dbRecord.speakers.map(s => s.speaker)
    });
  }
}

// src/infrastructure/repositories/VectorSearchRepository.ts
export class VectorSearchRepository implements ISessionRepository {
  constructor(
    private pinecone: PineconeClient,
    private fallback: LocalVectorDB
  ) {}

  async search(criteria: SearchCriteria): Promise<Session[]> {
    try {
      // Try Pinecone first
      return await this.pinecone.search(criteria);
    } catch (error) {
      // Graceful fallback to local
      console.warn('Pinecone unavailable, using local fallback');
      return await this.fallback.search(criteria);
    }
  }
}
```

### 4. Event-Driven Data Synchronization

```typescript
// src/infrastructure/events/DataSyncService.ts
export class DataSyncService {
  constructor(
    private eventBus: IEventBus,
    private queue: IMessageQueue,
    private vectorRepo: IVectorRepository,
    private cacheRepo: ICacheRepository
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // When session is created/updated in PostgreSQL
    this.eventBus.on('session.updated', async (event) => {
      // Queue vector embedding generation
      await this.queue.publish('generate.embedding', {
        sessionId: event.sessionId,
        content: event.content,
        priority: event.priority || 'normal'
      });
    });

    // Process embedding generation asynchronously
    this.queue.subscribe('generate.embedding', async (message) => {
      try {
        const embedding = await this.generateEmbedding(message.content);
        await this.vectorRepo.upsert(message.sessionId, embedding);
        await this.cacheRepo.invalidate(`session:${message.sessionId}`);
      } catch (error) {
        // Retry logic
        await this.queue.retry(message, error);
      }
    });
  }

  private async generateEmbedding(content: string): Promise<Float32Array> {
    // Call OpenAI or fallback to local embedding
    return this.embeddingService.generate(content);
  }
}
```

### 5. Simplified API Routes

```typescript
// src/api/routes/chat.route.ts
export class ChatRoute {
  constructor(
    private chatService: ChatService,
    private validator: RequestValidator
  ) {}

  async POST(req: Request): Promise<Response> {
    // 1. Validate request
    const dto = await this.validator.validate(ChatRequestDTO, req.body);

    // 2. Process through service layer
    const response = await this.chatService.processMessage(dto);

    // 3. Return streaming response
    return new Response(response.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Dependency injection setup
const chatRoute = new ChatRoute(
  container.get(ChatService),
  container.get(RequestValidator)
);
```

### 6. Configuration Management

```typescript
// src/config/AppConfig.ts
export class AppConfig {
  private static instance: AppConfig;

  private constructor() {
    this.validateEnvironment();
  }

  static getInstance(): AppConfig {
    if (!this.instance) {
      this.instance = new AppConfig();
    }
    return this.instance;
  }

  get database() {
    return {
      url: process.env.DATABASE_URL,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
      timeout: parseInt(process.env.DB_TIMEOUT || '5000')
    };
  }

  get vectorSearch() {
    return {
      provider: process.env.VECTOR_PROVIDER || 'local',
      apiKey: process.env.PINECONE_API_KEY,
      fallbackToLocal: process.env.VECTOR_FALLBACK === 'true',
      indexName: process.env.PINECONE_INDEX || 'itc-sessions'
    };
  }

  get ai() {
    return {
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.AI_MODEL || 'claude-3-5-sonnet',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000')
    };
  }
}
```

## Testing Strategy

### Unit Testing Example

```typescript
// src/__tests__/services/ChatService.test.ts
describe('ChatService', () => {
  let service: ChatService;
  let mockIntentClassifier: jest.Mocked<IntentClassifier>;
  let mockDataService: jest.Mocked<DataService>;

  beforeEach(() => {
    mockIntentClassifier = createMock<IntentClassifier>();
    mockDataService = createMock<DataService>();
    service = new ChatService(
      mockIntentClassifier,
      mockDataService,
      mockResponseGenerator,
      mockAgents
    );
  });

  it('should route agenda requests to AgendaAgent', async () => {
    // Arrange
    mockIntentClassifier.classify.mockResolvedValue({
      type: 'agenda_building',
      confidence: 0.9
    });

    // Act
    const response = await service.processMessage({
      message: 'Build my agenda',
      userId: 'test-user'
    });

    // Assert
    expect(response.agent).toBe('AgendaAgent');
    expect(mockAgents.get('agenda_building').handle).toHaveBeenCalled();
  });
});
```

### Integration Testing Example

```typescript
// src/__tests__/integration/SearchFlow.test.ts
describe('Search Flow Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should fallback to local search when Pinecone fails', async () => {
    // Simulate Pinecone failure
    nock('https://api.pinecone.io')
      .post('/query')
      .reply(500);

    const response = await request(app)
      .post('/api/search')
      .send({ query: 'AI sessions' });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('local');
    expect(response.body.sessions).toHaveLength(10);
  });
});
```

## Migration Plan

### Phase 1: Extract Services (Week 1-2)
- [ ] Create ChatService from chat route handler
- [ ] Create SearchService for all search operations
- [ ] Create AgendaService for agenda building
- [ ] Maintain backward compatibility

### Phase 2: Implement Repository Pattern (Week 3)
- [ ] Create ISessionRepository interface
- [ ] Implement PostgresSessionRepository
- [ ] Implement VectorSearchRepository with fallback
- [ ] Create CacheRepository

### Phase 3: Add Event-Driven Sync (Week 4)
- [ ] Implement EventBus
- [ ] Create DataSyncService
- [ ] Add queue for async operations
- [ ] Implement retry logic

### Phase 4: Refactor Agents (Week 5)
- [ ] Update agents to use new services
- [ ] Remove direct database calls
- [ ] Implement dependency injection
- [ ] Update tests

### Phase 5: Testing & Documentation (Week 6)
- [ ] Add comprehensive unit tests
- [ ] Add integration tests
- [ ] Update API documentation
- [ ] Performance testing

## Key Benefits

### 1. **Separation of Concerns**
- Each service has a single responsibility
- Business logic separated from infrastructure
- Easy to understand and modify

### 2. **Testability**
- All services can be unit tested in isolation
- Mock dependencies easily
- Fast test execution

### 3. **Scalability**
- Services can be deployed independently
- Easy to add caching layers
- Horizontal scaling possible

### 4. **Maintainability**
- Clear code organization
- Consistent patterns
- Easy onboarding for new developers

### 5. **Resilience**
- Graceful degradation with fallbacks
- Circuit breakers for external services
- Event-driven architecture prevents blocking

## Performance Improvements

### Current vs Proposed
| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| Route Handler Size | 1000+ lines | 30 lines | 97% reduction |
| Test Coverage | ~30% | ~90% | 3x increase |
| Response Time (P95) | 3s | 1.5s | 50% faster |
| Memory Usage | 500MB | 300MB | 40% reduction |
| Deployment Time | 10min | 3min | 70% faster |

## Risk Mitigation

### Risks & Solutions
1. **Risk**: Breaking existing functionality
   - **Solution**: Maintain backward compatibility, gradual migration

2. **Risk**: Performance regression
   - **Solution**: Performance tests before/after each phase

3. **Risk**: Team learning curve
   - **Solution**: Pair programming, documentation, training sessions

## Success Metrics

- [ ] All routes under 100 lines
- [ ] 90%+ test coverage
- [ ] Response time < 2s for 95% of requests
- [ ] Zero downtime migration
- [ ] All agents using dependency injection

## Conclusion

This redesign will transform the ITC Conference App from a monolithic, tightly-coupled system into a modern, scalable, and maintainable architecture. The investment in refactoring will pay dividends in reduced bugs, faster feature development, and improved developer experience.

## Next Steps

1. **Review**: Team review and feedback on this plan
2. **Approval**: Get stakeholder buy-in
3. **POC**: Build proof-of-concept for Phase 1
4. **Execute**: Begin phased migration
5. **Monitor**: Track metrics throughout migration

---

*Document Version: 1.0*
*Created: December 2024*
*Author: Architecture Team*
*Status: Draft - Pending Review*