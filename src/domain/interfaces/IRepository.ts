/**
 * Base Repository Interfaces
 * Following the repository pattern for data abstraction
 */

export interface SearchCriteria {
  query?: string;
  keywords?: string[];
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Base repository interface for all entities
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(criteria?: SearchCriteria): Promise<SearchResult<T>>;
  save(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Session-specific repository interface
 */
export interface ISessionRepository extends IRepository<Session> {
  search(criteria: SearchCriteria): Promise<Session[]>;
  findBySpeaker(speakerId: string): Promise<Session[]>;
  findByTrack(track: string): Promise<Session[]>;
  findByTimeRange(start: Date, end: Date): Promise<Session[]>;
  bulkUpsert(sessions: Session[]): Promise<void>;
}

/**
 * Vector search repository interface
 */
export interface IVectorRepository {
  search(query: string, topK?: number): Promise<VectorSearchResult[]>;
  upsert(id: string, embedding: Float32Array, metadata?: any): Promise<void>;
  delete(id: string): Promise<boolean>;
  isAvailable(): boolean;
}

/**
 * Cache repository interface
 */
export interface ICacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  invalidate(pattern: string): Promise<number>;
  flush(): Promise<void>;
}

/**
 * Knowledge base repository interface
 */
export interface IKnowledgeBaseRepository extends IRepository<KnowledgeBase> {
  findBySource(source: string): Promise<KnowledgeBase[]>;
  findByCategory(category: string): Promise<KnowledgeBase[]>;
  searchByKeywords(keywords: string[]): Promise<KnowledgeBase[]>;
}

// Domain entities (simplified for now)
export interface Session {
  id: string;
  title: string;
  description: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  track?: string;
  tags?: string[];
  speakers?: Speaker[];
}

export interface Speaker {
  id: string;
  name: string;
  role?: string;
  company?: string;
  bio?: string;
  imageUrl?: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  contentType: string;
  category?: string;
  source: string;
  keywords: string[];
  metadata?: any;
  isActive: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: any;
}