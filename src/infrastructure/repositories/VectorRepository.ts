/**
 * Vector Search Repository
 * Handles semantic search using Pinecone with local fallback
 */

import { IVectorRepository, VectorSearchResult } from '@/domain/interfaces/IRepository';
import { searchSimilarSessions } from '@/lib/vector-db';
import { searchLocalSessions } from '@/lib/local-vector-db';
import { Pinecone } from '@pinecone-database/pinecone';

export class VectorRepository implements IVectorRepository {
  private pinecone: Pinecone | null = null;
  private indexName: string;
  private useLocal: boolean = false;

  constructor(apiKey?: string, indexName: string = 'itc-sessions') {
    this.indexName = indexName;
    
    if (apiKey) {
      try {
        this.pinecone = new Pinecone({ apiKey });
      } catch (error) {
        console.warn('Failed to initialize Pinecone, using local fallback:', error);
        this.useLocal = true;
      }
    } else {
      this.useLocal = true;
    }
  }

  async search(query: string, topK: number = 20): Promise<VectorSearchResult[]> {
    try {
      if (this.useLocal) {
        // Use local vector search
        const results = await searchLocalSessions(query, topK);
        return results.map(r => ({
          id: r.sessionId,
          score: r.score,
          metadata: r.metadata
        }));
      }

      // Use Pinecone vector search
      const results = await searchSimilarSessions(query, {}, topK);
      return results.map(r => ({
        id: r.sessionId,
        score: r.score,
        metadata: r.metadata
      }));
    } catch (error) {
      console.error('Vector search failed:', error);
      
      // Fallback to local search on error
      if (!this.useLocal) {
        console.warn('Falling back to local vector search');
        const results = await searchLocalSessions(query, topK);
        return results.map(r => ({
          id: r.sessionId,
          score: r.score,
          metadata: r.metadata
        }));
      }
      
      throw error;
    }
  }

  async upsert(id: string, embedding: Float32Array, metadata?: any): Promise<void> {
    if (this.useLocal) {
      // Local implementation would go here
      console.log('Local upsert not implemented');
      return;
    }

    if (!this.pinecone) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.upsert([{
        id,
        values: Array.from(embedding),
        metadata
      }]);
    } catch (error) {
      console.error('Failed to upsert to Pinecone:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (this.useLocal) {
      // Local implementation would go here
      console.log('Local delete not implemented');
      return false;
    }

    if (!this.pinecone) {
      return false;
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(id);
      return true;
    } catch (error) {
      console.error('Failed to delete from Pinecone:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return !this.useLocal && this.pinecone !== null;
  }

  /**
   * Test connection to vector database
   */
  async testConnection(): Promise<boolean> {
    if (this.useLocal) {
      return true; // Local is always available
    }

    if (!this.pinecone) {
      return false;
    }

    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();
      console.log('Pinecone connection successful:', stats);
      return true;
    } catch (error) {
      console.error('Pinecone connection failed:', error);
      this.useLocal = true; // Switch to local on failure
      return false;
    }
  }
}