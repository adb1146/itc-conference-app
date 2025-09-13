/**
 * Local Vector Database Implementation
 * Uses in-memory storage for development/testing without external dependencies
 */

import crypto from 'crypto';

interface VectorRecord {
  id: string;
  vector: number[];
  metadata: any;
}

class LocalVectorDB {
  private vectors: Map<string, VectorRecord> = new Map();

  /**
   * Simple text-to-vector using hash-based approach
   * This is a simplified version for testing without OpenAI
   */
  private textToVector(text: string, dimension: number = 1536): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = [];
    
    // Generate deterministic pseudo-random numbers from hash
    for (let i = 0; i < dimension; i++) {
      const byte1 = hash[i % hash.length];
      const byte2 = hash[(i + 1) % hash.length];
      const value = ((byte1 << 8) | byte2) / 65535.0 - 0.5;
      vector.push(value);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct;
  }

  /**
   * Upsert vectors to the local database
   */
  async upsert(records: Array<{ id: string; text: string; metadata: any }>) {
    for (const record of records) {
      const vector = this.textToVector(record.text);
      this.vectors.set(record.id, {
        id: record.id,
        vector,
        metadata: record.metadata
      });
    }
    return { upserted: records.length };
  }

  /**
   * Search for similar vectors
   */
  async search(query: string, topK: number = 20): Promise<Array<{ id: string; score: number; metadata: any }>> {
    const queryVector = this.textToVector(query);
    const results: Array<{ id: string; score: number; metadata: any }> = [];

    for (const record of this.vectors.values()) {
      const score = this.cosineSimilarity(queryVector, record.vector);
      results.push({
        id: record.id,
        score,
        metadata: record.metadata
      });
    }

    // Sort by score descending and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Enhanced search with keyword boosting
   */
  async hybridSearch(
    query: string,
    keywords: string[] = [],
    topK: number = 20
  ): Promise<Array<{ id: string; score: number; metadata: any }>> {
    const baseResults = await this.search(query, topK * 2);
    
    // Boost scores for keyword matches
    const boostedResults = baseResults.map(result => {
      let boostedScore = result.score;
      const textToSearch = `${result.metadata.title} ${result.metadata.description} ${(result.metadata.tags || []).join(' ')}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (textToSearch.includes(keyword.toLowerCase())) {
          boostedScore += 0.1;
        }
      });
      
      return { ...result, score: boostedScore };
    });
    
    return boostedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Clear all vectors
   */
  clear() {
    this.vectors.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalVectors: this.vectors.size,
      memoryUsage: JSON.stringify(Array.from(this.vectors.values())).length
    };
  }
}

// Export singleton instance
export const localVectorDB = new LocalVectorDB();

/**
 * Helper function to create searchable text from session
 */
export function createSessionSearchText(session: any): string {
  const parts = [
    session.title,
    session.description,
    session.track || '',
    session.level || '',
    ...(session.tags || []),
  ];
  
  if (session.speakers && session.speakers.length > 0) {
    session.speakers.forEach((ss: any) => {
      if (ss.speaker) {
        parts.push(ss.speaker.name);
        parts.push(ss.speaker.company || '');
        parts.push(ss.speaker.role || '');
        parts.push(ss.speaker.bio || '');
      }
    });
  }
  
  return parts.filter(Boolean).join(' ');
}

/**
 * Upsert sessions to local vector database
 */
export async function upsertSessionsToLocalDB(sessions: any[]) {
  const records = sessions.map(session => ({
    id: session.id,
    text: createSessionSearchText(session),
    metadata: {
      title: session.title,
      description: session.description?.substring(0, 500),
      track: session.track,
      location: session.location,
      startTime: session.startTime?.toISOString(),
      endTime: session.endTime?.toISOString(),
      tags: session.tags || [],
      speakerNames: session.speakers?.map((ss: any) => ss.speaker?.name).filter(Boolean) || [],
      speakerCompanies: session.speakers?.map((ss: any) => ss.speaker?.company).filter(Boolean) || [],
    }
  }));

  return await localVectorDB.upsert(records);
}

/**
 * Search sessions in local vector database
 */
export async function searchLocalSessions(
  query: string,
  keywords: string[] = [],
  topK: number = 20
) {
  return await localVectorDB.hybridSearch(query, keywords, topK);
}