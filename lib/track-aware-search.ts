/**
 * Track-Aware Search Functions
 * Enhanced vector search with track validation and boosting
 */

import { searchSimilarSessions, hybridSearch, generateEmbedding, getOrCreateIndex, VECTOR_CONFIG } from './vector-db';
import { validateTrackQuery, findRelevantTrack, getRelatedTracks } from './track-embeddings';
import { VALID_CONFERENCE_TRACKS } from './conference-tracks';

export interface TrackAwareSearchOptions {
  query: string;
  track?: string;
  includeRelatedTracks?: boolean;
  userInterests?: string[];
  topK?: number;
  validateTracks?: boolean;
}

export interface TrackSearchResult {
  sessions: any[];
  trackValidation?: {
    isValid: boolean;
    mentionedTrack?: string;
    suggestedTrack?: string;
    error?: string;
  };
  searchMetadata: {
    method: 'vector' | 'hybrid' | 'track-filtered';
    tracksSearched: string[];
    totalResults: number;
    confidence?: number;
  };
}

/**
 * Track-aware search with validation and enhancement
 */
export async function trackAwareSearch(options: TrackAwareSearchOptions): Promise<TrackSearchResult> {
  const {
    query,
    track,
    includeRelatedTracks = false,
    userInterests = [],
    topK = 20,
    validateTracks = true
  } = options;

  const result: TrackSearchResult = {
    sessions: [],
    searchMetadata: {
      method: 'vector',
      tracksSearched: [],
      totalResults: 0
    }
  };

  // Step 1: Validate track mentions in query if enabled
  if (validateTracks) {
    const validation = await validateTrackQuery(query);
    result.trackValidation = validation;

    if (!validation.isValid) {
      // Query mentions invalid track, return error with suggestion
      return {
        ...result,
        searchMetadata: {
          ...result.searchMetadata,
          method: 'track-filtered',
          tracksSearched: [],
          totalResults: 0
        }
      };
    }
  }

  // Step 2: Determine which tracks to search
  const tracksToSearch: string[] = [];

  if (track && VALID_CONFERENCE_TRACKS.includes(track as any)) {
    tracksToSearch.push(track);

    // Include related tracks if requested
    if (includeRelatedTracks) {
      // This would use the similarity matrix (to be implemented)
      // For now, manually add closely related tracks
      const relatedTracks = getManuallyRelatedTracks(track);
      tracksToSearch.push(...relatedTracks);
    }
  } else if (query) {
    // Find relevant track based on query
    const relevantTrack = await findRelevantTrack(query);
    if (relevantTrack && relevantTrack.confidence > 0.7) {
      tracksToSearch.push(relevantTrack.track);
      result.searchMetadata.confidence = relevantTrack.confidence;
    }
  }

  // Step 3: Build search filter for tracks
  let trackFilter = undefined;
  if (tracksToSearch.length > 0) {
    trackFilter = {
      track: { $in: tracksToSearch }
    };
    result.searchMetadata.method = 'track-filtered';
  } else {
    result.searchMetadata.method = 'hybrid';
  }

  // Step 4: Perform search
  try {
    if (trackFilter) {
      // Use vector search with track filter
      const sessions = await searchSimilarSessions(query, trackFilter, topK);
      result.sessions = sessions;
    } else {
      // Use hybrid search for general queries
      const sessions = await hybridSearch(query, [], userInterests, topK);
      result.sessions = sessions;
    }

    result.searchMetadata.tracksSearched = tracksToSearch;
    result.searchMetadata.totalResults = result.sessions.length;
  } catch (error) {
    console.error('Error in track-aware search:', error);
  }

  return result;
}

/**
 * Search sessions specifically within a track
 */
export async function searchByTrack(
  track: string,
  query?: string,
  topK: number = 20
): Promise<any[]> {
  if (!VALID_CONFERENCE_TRACKS.includes(track as any)) {
    console.warn(`Invalid track: ${track}`);
    return [];
  }

  try {
    const index = await getOrCreateIndex();
    const namespace = index.namespace(VECTOR_CONFIG.namespace);

    if (query) {
      // Search with query within track
      const queryEmbedding = await generateEmbedding(query);
      const results = await namespace.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: { track: track }
      });
      return results.matches || [];
    } else {
      // Fetch all sessions from track
      // This would require a different approach in production
      // For now, return empty as Pinecone doesn't support non-vector queries
      console.warn('Fetching all sessions from a track requires a database query, not vector search');
      return [];
    }
  } catch (error) {
    console.error(`Error searching track ${track}:`, error);
    return [];
  }
}

/**
 * Get sessions from multiple related tracks
 */
export async function searchRelatedTracks(
  primaryTrack: string,
  query: string,
  similarityThreshold: number = 0.7,
  topK: number = 30
): Promise<any[]> {
  const relatedTracks = getManuallyRelatedTracks(primaryTrack);
  relatedTracks.unshift(primaryTrack); // Include primary track

  const allSessions: any[] = [];
  const sessionIds = new Set<string>();

  for (const track of relatedTracks) {
    const sessions = await searchByTrack(track, query, Math.floor(topK / relatedTracks.length));

    for (const session of sessions) {
      if (!sessionIds.has(session.id)) {
        sessionIds.add(session.id);
        allSessions.push(session);
      }
    }
  }

  // Sort by relevance score
  allSessions.sort((a, b) => (b.score || 0) - (a.score || 0));

  return allSessions.slice(0, topK);
}

/**
 * Manually defined related tracks until similarity matrix is implemented
 */
function getManuallyRelatedTracks(track: string): string[] {
  const relationships: Record<string, string[]> = {
    "AI Track": ["General", "Masterclass"],
    "Agents": ["Brokers", "General"],
    "Brokers": ["Agents", "General"],
    "Summit": ["Keynote", "Masterclass"],
    "WIISE": ["Networking", "General"],
    "LATAM": ["General", "Summit"],
    "Masterclass": ["AI Track", "General"],
    "Keynote": ["Summit", "General"],
    "Expo": ["Networking", "General"]
  };

  return relationships[track] || [];
}

/**
 * Boost sessions from specific tracks in search results
 */
export function boostTrackSessions(
  sessions: any[],
  preferredTracks: string[],
  boostFactor: number = 1.5
): any[] {
  return sessions.map(session => {
    const metadata = session.metadata || {};
    const sessionTrack = metadata.track;

    if (sessionTrack && preferredTracks.includes(sessionTrack)) {
      return {
        ...session,
        score: (session.score || 0) * boostFactor,
        boosted: true
      };
    }

    return session;
  }).sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Pre-validate a query for track hallucinations before processing
 */
export async function preValidateQuery(query: string): Promise<{
  isValid: boolean;
  cleanedQuery?: string;
  warning?: string;
}> {
  const validation = await validateTrackQuery(query);

  if (!validation.isValid && validation.mentionedTrack) {
    // Remove the invalid track from query
    const cleanedQuery = query.replace(validation.mentionedTrack, validation.suggestedTrack || '');

    return {
      isValid: false,
      cleanedQuery: cleanedQuery.trim(),
      warning: validation.error
    };
  }

  return { isValid: true };
}

/**
 * Get track statistics for search results
 */
export function getTrackDistribution(sessions: any[]): Map<string, number> {
  const distribution = new Map<string, number>();

  for (const session of sessions) {
    const track = session.metadata?.track || 'Unknown';
    distribution.set(track, (distribution.get(track) || 0) + 1);
  }

  return distribution;
}