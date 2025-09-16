/**
 * Vector Database Configuration
 * Uses Pinecone for vector storage and OpenAI for embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';

// Lazy initialization of Pinecone client
let pineconeClient: Pinecone | null = null;
export function getPineconeClient(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY.includes('<your')) {
    return null;
  }
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

// Lazy initialization of OpenAI for embeddings
let openaiClient: OpenAI | null = null;
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('[Vector DB] OpenAI API key check:', apiKey ? `${apiKey.substring(0, 15)}...` : 'NO KEY');

  if (!apiKey || apiKey.includes('<your')) {
    console.log('[Vector DB] Invalid OpenAI API key, returning null');
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

// Lazy initialization of OpenAI embeddings for LangChain
let embeddingsClient: OpenAIEmbeddings | null = null;
export function getEmbeddings(): OpenAIEmbeddings | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('<your')) {
    return null;
  }
  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // Newer, cheaper, better model
    });
  }
  return embeddingsClient;
}

// Vector database configuration
export const VECTOR_CONFIG = {
  indexName: 'itc-sessions',
  namespace: 'conference-2025',
  dimension: 1536, // Dimension for text-embedding-3-small
  metric: 'cosine',
  topK: 20, // Number of similar results to return
};

/**
 * Create or get Pinecone index
 */
export async function getOrCreateIndex() {
  try {
    const pinecone = getPineconeClient();
    if (!pinecone) {
      throw new Error('Pinecone client not initialized - API key missing or invalid');
    }

    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(
      index => index.name === VECTOR_CONFIG.indexName
    );

    if (!indexExists) {
      console.log('Creating new Pinecone index...');
      await pinecone.createIndex({
        name: VECTOR_CONFIG.indexName,
        dimension: VECTOR_CONFIG.dimension,
        metric: VECTOR_CONFIG.metric as any, // TypeScript strict mode fix
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 60000));
    }

    return pinecone.index(VECTOR_CONFIG.indexName);
  } catch (error) {
    console.error('Error with Pinecone index:', error);
    throw error;
  }
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key missing or invalid');
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Create searchable text from session data
 */
export function createSessionSearchText(session: any): string {
  const parts = [
    session.title,
    session.description,
    session.track || '',
    session.level || '',
    ...(session.tags || []),
  ];
  
  // Add speaker information if available
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
 * Upsert session vectors to Pinecone
 */
export async function upsertSessionVectors(sessions: any[]) {
  const index = await getOrCreateIndex();
  const namespace = index.namespace(VECTOR_CONFIG.namespace);
  
  const batchSize = 10;
  
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const vectors = [];
    
    for (const session of batch) {
      try {
        const searchText = createSessionSearchText(session);
        const embedding = await generateEmbedding(searchText);
        
        vectors.push({
          id: session.id,
          values: embedding,
          metadata: {
            title: session.title,
            description: session.description?.substring(0, 500), // Limit for metadata
            track: session.track,
            location: session.location,
            startTime: session.startTime?.toISOString(),
            endTime: session.endTime?.toISOString(),
            tags: session.tags || [],
            speakerNames: session.speakers?.map((ss: any) => ss.speaker?.name).filter(Boolean) || [],
            speakerCompanies: session.speakers?.map((ss: any) => ss.speaker?.company).filter(Boolean) || [],
          },
        });
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
      }
    }
    
    if (vectors.length > 0) {
      await namespace.upsert(vectors);
      console.log(`Upserted ${vectors.length} session vectors (batch ${i / batchSize + 1})`);
    }
    
    // Rate limiting to avoid API limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Search for similar sessions using vector similarity
 */
export async function searchSimilarSessions(
  query: string,
  filter?: any,
  topK: number = VECTOR_CONFIG.topK
): Promise<any[]> {
  try {
    const index = await getOrCreateIndex();
    const namespace = index.namespace(VECTOR_CONFIG.namespace);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search in Pinecone
    const results = await namespace.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });
    
    return results.matches || [];
  } catch (error) {
    console.error('Error searching sessions:', error);
    return [];
  }
}

/**
 * Hybrid search combining vector similarity and keyword matching
 */
export async function hybridSearch(
  query: string,
  keywords: string[] = [],
  userInterests?: string[],
  topK: number = VECTOR_CONFIG.topK
): Promise<any[]> {
  // Enhance query with user interests if available
  let enhancedQuery = query;
  if (userInterests && userInterests.length > 0) {
    enhancedQuery = `${query} related to ${userInterests.join(', ')}`;
  }
  
  // Get vector search results
  const vectorResults = await searchSimilarSessions(enhancedQuery, undefined, topK * 2);
  
  // Score and rank results
  const scoredResults = vectorResults.map(result => {
    let score = result.score || 0;
    
    // Boost score for keyword matches
    const metadata = result.metadata || {};
    const textToSearch = `${metadata.title} ${metadata.description} ${(metadata.tags || []).join(' ')}`.toLowerCase();
    
    keywords.forEach(keyword => {
      if (textToSearch.includes(keyword.toLowerCase())) {
        score += 0.1; // Boost for keyword match
      }
    });
    
    // Boost for matching user interests
    if (userInterests) {
      userInterests.forEach(interest => {
        if (textToSearch.includes(interest.toLowerCase())) {
          score += 0.05;
        }
      });
    }
    
    return {
      ...result,
      hybridScore: score,
    };
  });
  
  // Sort by hybrid score and return top K
  return scoredResults
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}