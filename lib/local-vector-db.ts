/**
 * Local Vector Database Implementation
 * Uses in-memory storage with keyword-based similarity for development/testing
 */

interface VectorRecord {
  id: string;
  text: string;
  tokens: Set<string>;
  metadata: any;
}

class LocalVectorDB {
  private documents: Map<string, VectorRecord> = new Map();

  /**
   * Tokenize text into normalized words
   */
  private tokenize(text: string): Set<string> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    return new Set(words);
  }

  /**
   * Calculate Jaccard similarity between two token sets
   */
  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 && set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate keyword overlap score
   */
  private keywordOverlapScore(query: string, document: string): number {
    const queryTokens = this.tokenize(query);
    const docTokens = this.tokenize(document);

    // Count exact matches
    let exactMatches = 0;
    let partialMatches = 0;

    for (const queryToken of queryTokens) {
      if (docTokens.has(queryToken)) {
        exactMatches++;
      } else {
        // Check for partial matches (substring)
        for (const docToken of docTokens) {
          if (docToken.includes(queryToken) || queryToken.includes(docToken)) {
            partialMatches++;
            break;
          }
        }
      }
    }

    // Calculate score with higher weight for exact matches
    const totalQueryTokens = queryTokens.size || 1;
    const score = (exactMatches + (partialMatches * 0.5)) / totalQueryTokens;

    return Math.min(score, 1.0);
  }

  /**
   * Upsert documents to the local database
   */
  async upsert(records: Array<{ id: string; text: string; metadata: any }>) {
    for (const record of records) {
      this.documents.set(record.id, {
        id: record.id,
        text: record.text.toLowerCase(),
        tokens: this.tokenize(record.text),
        metadata: record.metadata
      });
    }
    return { upserted: records.length };
  }

  /**
   * Search for similar documents
   */
  async search(query: string, topK: number = 20): Promise<Array<{ id: string; score: number; metadata: any }>> {
    const queryTokens = this.tokenize(query);
    const results: Array<{ id: string; score: number; metadata: any }> = [];

    for (const doc of this.documents.values()) {
      // Combine multiple scoring methods
      const jaccardScore = this.jaccardSimilarity(queryTokens, doc.tokens);
      const overlapScore = this.keywordOverlapScore(query, doc.text);

      // Weight the scores
      const finalScore = (jaccardScore * 0.3) + (overlapScore * 0.7);

      if (finalScore > 0) {
        results.push({
          id: doc.id,
          score: finalScore,
          metadata: doc.metadata
        });
      }
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
          boostedScore += 0.15;
        }
      });

      // Check for exact title match
      if (result.metadata.title && query.toLowerCase().includes(result.metadata.title.toLowerCase())) {
        boostedScore += 0.5;
      }

      return { ...result, score: Math.min(boostedScore, 1.0) };
    });

    return boostedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Clear all documents
   */
  clear() {
    this.documents.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.size,
      memoryUsage: JSON.stringify(Array.from(this.documents.values())).length
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
        if (ss.speaker.company) parts.push(ss.speaker.company);
        if (ss.speaker.role) parts.push(ss.speaker.role);
        if (ss.speaker.bio) parts.push(ss.speaker.bio);
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