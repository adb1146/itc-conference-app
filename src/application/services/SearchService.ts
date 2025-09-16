/**
 * Search Service
 * Centralizes all search operations with intelligent strategy selection
 */

import {
  ISessionRepository,
  IVectorRepository,
  ICacheRepository,
  SearchCriteria,
  Session,
  VectorSearchResult
} from '@/domain/interfaces/IRepository';

export interface SearchQuery {
  query: string;
  type?: 'semantic' | 'keyword' | 'hybrid';
  keywords?: string[];
  filters?: Record<string, any>;
  userInterests?: string[];
  limit?: number;
}

export interface SearchResponse {
  sessions: Session[];
  totalResults: number;
  searchType: string;
  executionTime: number;
  cached: boolean;
}

export class SearchService {
  constructor(
    private sessionRepo: ISessionRepository,
    private vectorRepo: IVectorRepository,
    private cacheRepo: ICacheRepository
  ) {}

  /**
   * Main search method with intelligent strategy selection
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);

    // 1. Check cache first
    const cached = await this.cacheRepo.get<SearchResponse>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Determine search strategy
    const searchStrategy = this.selectStrategy(query);

    // 3. Execute search with selected strategy
    const sessions = await searchStrategy.execute(query);

    // 4. Build response
    const response: SearchResponse = {
      sessions,
      totalResults: sessions.length,
      searchType: searchStrategy.name,
      executionTime: Date.now() - startTime,
      cached: false
    };

    // 5. Cache results for future queries
    await this.cacheRepo.set(cacheKey, response, 300); // 5 minute TTL

    return response;
  }

  /**
   * Select appropriate search strategy based on query and system state
   */
  private selectStrategy(query: SearchQuery): ISearchStrategy {
    // If semantic search is explicitly requested and vector DB is available
    if (query.type === 'semantic' && this.vectorRepo.isAvailable()) {
      return new SemanticSearchStrategy(this.vectorRepo, this.sessionRepo);
    }

    // If hybrid search is requested or default with vector DB available
    if ((query.type === 'hybrid' || !query.type) && this.vectorRepo.isAvailable()) {
      return new HybridSearchStrategy(this.vectorRepo, this.sessionRepo);
    }

    // Fallback to keyword search
    return new KeywordSearchStrategy(this.sessionRepo);
  }

  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(query: SearchQuery): string {
    const parts = [
      query.query,
      query.type || 'default',
      JSON.stringify(query.keywords || []),
      JSON.stringify(query.filters || {}),
      query.limit || 20
    ];
    return `search:${parts.join(':')}`;
  }

  /**
   * Search for sessions by speaker
   */
  async searchBySpeaker(speakerId: string): Promise<Session[]> {
    const cacheKey = `speaker:${speakerId}`;

    const cached = await this.cacheRepo.get<Session[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const sessions = await this.sessionRepo.findBySpeaker(speakerId);
    await this.cacheRepo.set(cacheKey, sessions, 600); // 10 minute TTL

    return sessions;
  }

  /**
   * Search for sessions by track
   */
  async searchByTrack(track: string): Promise<Session[]> {
    const cacheKey = `track:${track}`;

    const cached = await this.cacheRepo.get<Session[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const sessions = await this.sessionRepo.findByTrack(track);
    await this.cacheRepo.set(cacheKey, sessions, 600);

    return sessions;
  }

  /**
   * Invalidate search caches when data changes
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cacheRepo.invalidate(pattern);
    } else {
      await this.cacheRepo.invalidate('search:*');
      await this.cacheRepo.invalidate('speaker:*');
      await this.cacheRepo.invalidate('track:*');
    }
  }
}

/**
 * Search Strategy Interface
 */
interface ISearchStrategy {
  name: string;
  execute(query: SearchQuery): Promise<Session[]>;
}

/**
 * Semantic search using vector embeddings
 */
class SemanticSearchStrategy implements ISearchStrategy {
  name = 'semantic';

  constructor(
    private vectorRepo: IVectorRepository,
    private sessionRepo: ISessionRepository
  ) {}

  async execute(query: SearchQuery): Promise<Session[]> {
    // 1. Get vector search results
    const vectorResults = await this.vectorRepo.search(
      query.query,
      query.limit || 20
    );

    // 2. Get full session details from database
    const sessionIds = vectorResults.map(r => r.id);
    const sessions = await this.sessionRepo.findAll({
      filters: { id: { in: sessionIds } }
    });

    // 3. Sort by vector score
    const sessionMap = new Map(sessions.items.map(s => [s.id, s]));
    return vectorResults
      .map(r => sessionMap.get(r.id))
      .filter((s): s is Session => s !== undefined);
  }
}

/**
 * Keyword-based search
 */
class KeywordSearchStrategy implements ISearchStrategy {
  name = 'keyword';

  constructor(private sessionRepo: ISessionRepository) {}

  async execute(query: SearchQuery): Promise<Session[]> {
    const criteria: SearchCriteria = {
      query: query.query,
      keywords: query.keywords,
      filters: query.filters,
      limit: query.limit || 20
    };

    const result = await this.sessionRepo.search(criteria);
    return result;
  }
}

/**
 * Hybrid search combining vector and keyword
 */
class HybridSearchStrategy implements ISearchStrategy {
  name = 'hybrid';

  constructor(
    private vectorRepo: IVectorRepository,
    private sessionRepo: ISessionRepository
  ) {}

  async execute(query: SearchQuery): Promise<Session[]> {
    // Run both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorRepo.search(query.query, query.limit ? query.limit * 2 : 40),
      this.sessionRepo.search({
        query: query.query,
        keywords: query.keywords,
        limit: query.limit ? query.limit * 2 : 40
      })
    ]);

    // Merge and score results
    const merged = this.mergeResults(vectorResults, keywordResults, query);

    // Return top results
    return merged.slice(0, query.limit || 20);
  }

  private mergeResults(
    vectorResults: VectorSearchResult[],
    keywordResults: Session[],
    query: SearchQuery
  ): Session[] {
    const sessionScores = new Map<string, { session: Session; score: number }>();

    // Add vector results with their scores
    vectorResults.forEach(vr => {
      sessionScores.set(vr.id, {
        session: vr.metadata as Session,
        score: vr.score
      });
    });

    // Boost scores for keyword matches
    keywordResults.forEach(session => {
      const existing = sessionScores.get(session.id);
      if (existing) {
        existing.score *= 1.2; // Boost if in both results
      } else {
        sessionScores.set(session.id, {
          session,
          score: 0.5 // Lower score for keyword-only matches
        });
      }
    });

    // Apply user interest boosting if available
    if (query.userInterests) {
      sessionScores.forEach((value, key) => {
        const session = value.session;
        const relevantInterests = query.userInterests!.filter(interest =>
          session.title.toLowerCase().includes(interest.toLowerCase()) ||
          session.description?.toLowerCase().includes(interest.toLowerCase())
        );
        if (relevantInterests.length > 0) {
          value.score *= (1 + relevantInterests.length * 0.1);
        }
      });
    }

    // Sort by score and return sessions
    return Array.from(sessionScores.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.session);
  }
}