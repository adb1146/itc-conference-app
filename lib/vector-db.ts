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

  if (!apiKey || apiKey.length < 10) {
    console.log('[Vector DB] OpenAI API key not configured');
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
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
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
  indexName: process.env.PINECONE_INDEX || 'itc-sessions',
  namespace: 'conference-2025',
  dimension: 1536, // Dimension for text-embedding-3-small
  metric: 'cosine',
  topK: 20, // Number of similar results to return
};

// Meal-specific vector configuration
export const MEAL_VECTOR_CONFIG = {
  indexName: process.env.PINECONE_INDEX || 'itc-sessions',
  namespace: 'conference-meals', // Dedicated namespace for meal content
  dimension: 1536,
  metric: 'cosine',
  topK: 10,
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
 * Create searchable text from session data with enhanced track context
 */
export function createSessionSearchText(session: any): string {
  const parts = [
    session.title,
    session.description,
  ];

  // Enhanced track context
  if (session.track) {
    parts.push(session.track);

    // Add track semantic context if available
    const { TRACK_SEMANTIC_CONTEXT } = require('./track-embeddings');
    const trackContext = TRACK_SEMANTIC_CONTEXT[session.track];
    if (trackContext) {
      parts.push(trackContext.description);
      parts.push(`Related topics: ${trackContext.relatedTopics.join(', ')}`);
    }
  }

  // Add other metadata
  parts.push(session.level || '');
  parts.push(...(session.tags || []));

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

  // Add meal-related keywords if title contains meal terms
  const titleLower = session.title?.toLowerCase() || '';
  if (titleLower.includes('breakfast') || titleLower.includes('lunch') || titleLower.includes('dinner')) {
    parts.push('conference meal', 'food provided', 'dining');
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Create enhanced meal-specific searchable text
 */
export function createMealSearchText(session: any): string {
  const titleLower = session.title?.toLowerCase() || '';
  const descLower = session.description?.toLowerCase() || '';

  // Determine meal type
  let mealType = '';
  let mealKeywords = [];

  if (titleLower.includes('breakfast') || descLower.includes('breakfast')) {
    mealType = 'breakfast';
    mealKeywords = ['morning meal', 'continental breakfast', 'coffee and pastries', 'early dining'];
  } else if (titleLower.includes('lunch') || descLower.includes('lunch')) {
    mealType = 'lunch';
    mealKeywords = ['midday meal', 'lunch break', 'networking lunch', 'buffet lunch', 'boxed lunch'];
  } else if (titleLower.includes('dinner') || descLower.includes('dinner')) {
    mealType = 'dinner';
    mealKeywords = ['evening meal', 'gala dinner', 'awards dinner', 'formal dining'];
  } else if (titleLower.includes('reception') || descLower.includes('reception')) {
    mealType = 'reception';
    mealKeywords = ['cocktails', 'hors d\'oeuvres', 'appetizers', 'networking reception'];
  }

  const parts = [
    session.title,
    session.description,
    mealType,
    'conference meal',
    'food provided',
    'dining included',
    'catered meal',
    'meal session',
    ...mealKeywords,
    session.location || '',
    // Add timing context
    session.startTime ? `meal at ${new Date(session.startTime).toLocaleTimeString()}` : '',
    // Add dietary options if mentioned
    descLower.includes('vegetarian') ? 'vegetarian options' : '',
    descLower.includes('vegan') ? 'vegan options' : '',
    descLower.includes('gluten') ? 'gluten free options' : '',
    // Add networking context
    descLower.includes('network') ? 'networking opportunity' : '',
    // Conference dining keywords
    'ITC Vegas dining',
    'conference catering',
    'included with registration'
  ];

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
 * Search specifically for meal sessions using enhanced meal embeddings
 */
export async function searchMealSessions(
  query: string,
  topK: number = MEAL_VECTOR_CONFIG.topK
): Promise<any[]> {
  try {
    const index = await getOrCreateIndex();
    const mealNamespace = index.namespace(MEAL_VECTOR_CONFIG.namespace);

    // Enhance query with meal-specific keywords
    const enhancedQuery = `${query} conference meal food dining catered breakfast lunch dinner networking included`;

    // Generate embedding for enhanced query
    const queryEmbedding = await generateEmbedding(enhancedQuery);

    // Search in meal namespace first
    const mealResults = await mealNamespace.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    // If not enough results, fall back to general namespace with meal filter
    if ((!mealResults.matches || mealResults.matches.length < 3)) {
      const generalNamespace = index.namespace(VECTOR_CONFIG.namespace);
      const generalResults = await generalNamespace.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: {
          $or: [
            { title: { $regex: '.*(?:lunch|breakfast|dinner|meal|reception).*' } },
            { description: { $regex: '.*(?:lunch|breakfast|dinner|meal|food|dining).*' } }
          ]
        }
      });

      return generalResults.matches || [];
    }

    return mealResults.matches || [];
  } catch (error) {
    console.error('Error searching meal sessions:', error);
    return [];
  }
}

/**
 * Upsert meal vectors to dedicated meal namespace
 */
export async function upsertMealVectors(sessions: any[]) {
  const index = await getOrCreateIndex();
  const mealNamespace = index.namespace(MEAL_VECTOR_CONFIG.namespace);

  // Filter for meal sessions
  const mealSessions = sessions.filter(session => {
    const text = (session.title + ' ' + session.description).toLowerCase();
    return text.includes('lunch') || text.includes('breakfast') ||
           text.includes('dinner') || text.includes('reception') ||
           text.includes('meal') || text.includes('food');
  });

  const batchSize = 5;

  for (let i = 0; i < mealSessions.length; i += batchSize) {
    const batch = mealSessions.slice(i, i + batchSize);
    const vectors = [];

    for (const session of batch) {
      try {
        const mealSearchText = createMealSearchText(session);
        const embedding = await generateEmbedding(mealSearchText);

        // Determine meal type for metadata
        const titleLower = session.title?.toLowerCase() || '';
        let mealType = 'other';
        if (titleLower.includes('breakfast')) mealType = 'breakfast';
        else if (titleLower.includes('lunch')) mealType = 'lunch';
        else if (titleLower.includes('dinner')) mealType = 'dinner';
        else if (titleLower.includes('reception')) mealType = 'reception';

        vectors.push({
          id: `meal-${session.id}`,
          values: embedding,
          metadata: {
            sessionId: session.id,
            title: session.title,
            description: session.description?.substring(0, 500),
            mealType,
            location: session.location,
            startTime: session.startTime?.toISOString(),
            endTime: session.endTime?.toISOString(),
            track: session.track,
            tags: session.tags || [],
            hasFood: true,
            searchText: mealSearchText.substring(0, 1000)
          },
        });
      } catch (error) {
        console.error(`Error processing meal session ${session.id}:`, error);
      }
    }

    if (vectors.length > 0) {
      await mealNamespace.upsert(vectors);
      console.log(`Upserted ${vectors.length} meal vectors (batch ${i / batchSize + 1})`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
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