/**
 * Track Embedding System
 * Generates and manages embeddings for conference tracks to improve search and prevent hallucinations
 */

import { VALID_CONFERENCE_TRACKS, TRACK_DESCRIPTIONS } from './conference-tracks';
import { generateEmbedding, getOrCreateIndex, VECTOR_CONFIG } from './vector-db';

/**
 * Track embedding metadata structure
 */
export interface TrackEmbedding {
  id: string;
  name: string;
  description: string;
  relatedTopics: string[];
  typicalKeywords: string[];
  embedding?: number[];
}

/**
 * Enhanced track descriptions with semantic context
 */
export const TRACK_SEMANTIC_CONTEXT: Record<string, TrackEmbedding> = {
  "Innovation Track": {
    id: "track-innovation",
    name: "Innovation Track",
    description: TRACK_DESCRIPTIONS["Innovation Track"] || "",
    relatedTopics: ["AI", "Machine Learning", "Emerging Tech", "InsurTech", "Digital Transformation", "Future of Insurance"],
    typicalKeywords: ["innovation", "disruption", "technology", "artificial intelligence", "ML", "automation", "digital"]
  },
  "Technology Track": {
    id: "track-technology",
    name: "Technology Track",
    description: TRACK_DESCRIPTIONS["Technology Track"] || "",
    relatedTopics: ["Software", "Platforms", "APIs", "Cloud", "Data", "Architecture", "Development"],
    typicalKeywords: ["tech", "software", "platform", "system", "API", "cloud", "infrastructure", "digital"]
  },
  "Claims Track": {
    id: "track-claims",
    name: "Claims Track",
    description: TRACK_DESCRIPTIONS["Claims Track"] || "",
    relatedTopics: ["Claims Processing", "Automation", "Customer Service", "Fraud Detection", "Settlement"],
    typicalKeywords: ["claims", "processing", "settlement", "adjudication", "automation", "customer", "fraud"]
  },
  "Cyber Track": {
    id: "track-cyber",
    name: "Cyber Track",
    description: TRACK_DESCRIPTIONS["Cyber Track"] || "",
    relatedTopics: ["Cybersecurity", "Cyber Insurance", "Risk Management", "Data Protection", "Breach Response"],
    typicalKeywords: ["cyber", "security", "breach", "risk", "protection", "threat", "vulnerability", "incident"]
  },
  "Strategy Track": {
    id: "track-strategy",
    name: "Strategy Track",
    description: TRACK_DESCRIPTIONS["Strategy Track"] || "",
    relatedTopics: ["Business Strategy", "Market Analysis", "Growth", "Competition", "Leadership"],
    typicalKeywords: ["strategy", "business", "growth", "market", "competitive", "planning", "executive", "leadership"]
  },
  "Startup Track": {
    id: "track-startup",
    name: "Startup Track",
    description: TRACK_DESCRIPTIONS["Startup Track"] || "",
    relatedTopics: ["InsurTech Startups", "Venture Capital", "Innovation", "Entrepreneurship", "Funding"],
    typicalKeywords: ["startup", "insurtech", "venture", "funding", "entrepreneur", "innovation", "disrupt"]
  },
  "Health Track": {
    id: "track-health",
    name: "Health Track",
    description: TRACK_DESCRIPTIONS["Health Track"] || "",
    relatedTopics: ["Health Insurance", "Healthcare", "Medical", "Wellness", "Benefits"],
    typicalKeywords: ["health", "medical", "healthcare", "wellness", "benefits", "coverage", "patient"]
  },
  "Property Track": {
    id: "track-property",
    name: "Property Track",
    description: TRACK_DESCRIPTIONS["Property Track"] || "",
    relatedTopics: ["Property Insurance", "Homeowners", "Catastrophe", "Risk Assessment", "Underwriting"],
    typicalKeywords: ["property", "home", "catastrophe", "risk", "damage", "coverage", "assessment"]
  },
  "Commercial Track": {
    id: "track-commercial",
    name: "Commercial Track",
    description: TRACK_DESCRIPTIONS["Commercial Track"] || "",
    relatedTopics: ["Commercial Lines", "Business Insurance", "Liability", "Workers Comp", "Enterprise"],
    typicalKeywords: ["commercial", "business", "liability", "enterprise", "corporate", "workers", "compensation"]
  },
  "Distribution Track": {
    id: "track-distribution",
    name: "Distribution Track",
    description: TRACK_DESCRIPTIONS["Distribution Track"] || "",
    relatedTopics: ["Distribution Channels", "Agents", "Brokers", "Direct", "Partnerships"],
    typicalKeywords: ["distribution", "channel", "agent", "broker", "partner", "direct", "sales"]
  }
};

/**
 * Generate embedding text for a track
 */
export function createTrackEmbeddingText(track: TrackEmbedding): string {
  const parts = [
    track.name,
    track.description,
    `Topics: ${track.relatedTopics.join(', ')}`,
    `Keywords: ${track.typicalKeywords.join(', ')}`
  ];

  return parts.filter(Boolean).join(' ');
}

/**
 * Generate embeddings for all valid tracks
 */
export async function generateTrackEmbeddings(): Promise<Map<string, TrackEmbedding>> {
  const trackEmbeddings = new Map<string, TrackEmbedding>();

  for (const trackName of VALID_CONFERENCE_TRACKS) {
    try {
      // Get track context or create basic one
      const trackContext = TRACK_SEMANTIC_CONTEXT[trackName] || {
        id: `track-${trackName.toLowerCase().replace(/\s+/g, '-')}`,
        name: trackName,
        description: TRACK_DESCRIPTIONS[trackName] || trackName,
        relatedTopics: [],
        typicalKeywords: trackName.toLowerCase().split(' ')
      };

      // Generate embedding
      const embeddingText = createTrackEmbeddingText(trackContext);
      const embedding = await generateEmbedding(embeddingText);

      trackContext.embedding = embedding;
      trackEmbeddings.set(trackName, trackContext);

      console.log(`Generated embedding for ${trackName}`);
    } catch (error) {
      console.error(`Error generating embedding for ${trackName}:`, error);
    }
  }

  return trackEmbeddings;
}

/**
 * Store track embeddings in Pinecone
 */
export async function upsertTrackEmbeddings(trackEmbeddings: Map<string, TrackEmbedding>) {
  try {
    const index = await getOrCreateIndex();
    const namespace = index.namespace('tracks'); // Separate namespace for tracks

    const vectors = [];

    for (const [trackName, trackData] of trackEmbeddings) {
      if (trackData.embedding) {
        vectors.push({
          id: trackData.id,
          values: trackData.embedding,
          metadata: {
            name: trackData.name,
            description: trackData.description,
            relatedTopics: trackData.relatedTopics,
            typicalKeywords: trackData.typicalKeywords,
            isValidTrack: true // Flag to identify valid tracks
          }
        });
      }
    }

    if (vectors.length > 0) {
      await namespace.upsert(vectors);
      console.log(`Upserted ${vectors.length} track embeddings to Pinecone`);
    }

    return true;
  } catch (error) {
    console.error('Error upserting track embeddings:', error);
    return false;
  }
}

/**
 * Find the most relevant track for a query
 */
export async function findRelevantTrack(query: string): Promise<{
  track: string;
  confidence: number;
} | null> {
  try {
    const index = await getOrCreateIndex();
    const namespace = index.namespace('tracks');

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar tracks
    const results = await namespace.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
      filter: { isValidTrack: true }
    });

    if (results.matches && results.matches.length > 0) {
      const topMatch = results.matches[0];
      return {
        track: topMatch.metadata?.name as string,
        confidence: topMatch.score || 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding relevant track:', error);
    return null;
  }
}

/**
 * Validate if a mentioned track exists and suggest corrections
 */
export async function validateTrackQuery(query: string): Promise<{
  isValid: boolean;
  mentionedTrack?: string;
  suggestedTrack?: string;
  confidence?: number;
  error?: string;
}> {
  // Check for explicit track mentions
  const trackPattern = /(\w+(?:\s+\w+)*)\s+[Tt]rack/g;
  const matches = query.matchAll(trackPattern);

  for (const match of matches) {
    const mentionedTrack = match[1] + ' Track';

    // Check if it's a valid track
    const isValid = VALID_CONFERENCE_TRACKS.includes(mentionedTrack as any);

    if (!isValid) {
      // Find the closest valid track
      const relevant = await findRelevantTrack(query);

      // Special case for common hallucinations
      if (mentionedTrack === 'AI & Innovation Track') {
        return {
          isValid: false,
          mentionedTrack,
          suggestedTrack: 'Innovation Track',
          confidence: 1.0,
          error: `"${mentionedTrack}" does not exist. Did you mean "Innovation Track" or "Technology Track"?`
        };
      }

      if (mentionedTrack === 'Data & Analytics Track') {
        return {
          isValid: false,
          mentionedTrack,
          suggestedTrack: 'Technology Track',
          confidence: 0.9,
          error: `"${mentionedTrack}" does not exist. The "Technology Track" covers data and analytics topics.`
        };
      }

      return {
        isValid: false,
        mentionedTrack,
        suggestedTrack: relevant?.track,
        confidence: relevant?.confidence,
        error: `"${mentionedTrack}" is not a valid track.${relevant ? ` Did you mean "${relevant.track}"?` : ''}`
      };
    }

    return {
      isValid: true,
      mentionedTrack
    };
  }

  // No explicit track mentioned
  return { isValid: true };
}

/**
 * Calculate similarity between two tracks based on their embeddings
 */
export async function calculateTrackSimilarity(
  track1: string,
  track2: string,
  trackEmbeddings: Map<string, TrackEmbedding>
): Promise<number> {
  const embedding1 = trackEmbeddings.get(track1)?.embedding;
  const embedding2 = trackEmbeddings.get(track2)?.embedding;

  if (!embedding1 || !embedding2) {
    return 0;
  }

  // Cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * Build a similarity matrix for all tracks
 */
export async function buildTrackSimilarityMatrix(
  trackEmbeddings: Map<string, TrackEmbedding>
): Promise<Map<string, Map<string, number>>> {
  const matrix = new Map<string, Map<string, number>>();

  const tracks = Array.from(trackEmbeddings.keys());

  for (const track1 of tracks) {
    const similarities = new Map<string, number>();

    for (const track2 of tracks) {
      if (track1 === track2) {
        similarities.set(track2, 1.0);
      } else {
        const similarity = await calculateTrackSimilarity(track1, track2, trackEmbeddings);
        similarities.set(track2, similarity);
      }
    }

    matrix.set(track1, similarities);
  }

  return matrix;
}

/**
 * Get related tracks based on similarity
 */
export function getRelatedTracks(
  track: string,
  similarityMatrix: Map<string, Map<string, number>>,
  threshold: number = 0.7
): string[] {
  const similarities = similarityMatrix.get(track);

  if (!similarities) {
    return [];
  }

  const related: { track: string; score: number }[] = [];

  for (const [otherTrack, score] of similarities) {
    if (otherTrack !== track && score >= threshold) {
      related.push({ track: otherTrack, score });
    }
  }

  // Sort by similarity score
  related.sort((a, b) => b.score - a.score);

  return related.map(r => r.track);
}