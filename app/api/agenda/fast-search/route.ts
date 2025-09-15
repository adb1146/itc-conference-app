import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { searchSimilarSessions, hybridSearch } from '@/lib/vector-db';

// Cache sessions in memory for 5 minutes
let cachedSessions: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { query, day, userProfile } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ sessions: [] });
    }

    const startTime = Date.now();

    // Try vector search first (if available)
    let vectorResults: any[] = [];
    try {
      if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
        // Use hybrid search for better results
        vectorResults = await hybridSearch(query, [], userProfile?.interests || [], 50);
      }
    } catch (error) {
      console.error('Vector search failed, falling back to keyword search:', error);
    }

    // If vector search returned results, use them
    if (vectorResults.length > 0) {
      // Convert vector results to session format
      const sessionIds = vectorResults.map(r => r.id || r.metadata?.id).filter(Boolean);

      if (sessionIds.length > 0) {
        const sessions = await prisma.session.findMany({
          where: {
            id: { in: sessionIds }
          },
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          }
        });

        // Sort sessions by vector search relevance
        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        const sortedSessions = sessionIds
          .map(id => sessionMap.get(id))
          .filter(Boolean);

        console.log(`Fast vector search completed in ${Date.now() - startTime}ms`);

        return NextResponse.json({
          sessions: sortedSessions,
          searchTime: Date.now() - startTime,
          searchType: 'vector'
        });
      }
    }

    // Fallback: Use cached sessions for keyword search
    const now = Date.now();
    if (!cachedSessions || now - cacheTimestamp > CACHE_DURATION) {
      cachedSessions = await prisma.session.findMany({
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        },
        orderBy: [
          { startTime: 'asc' }
        ]
      });
      cacheTimestamp = now;
    }

    // Enhanced keyword search with scoring
    const searchLower = query.toLowerCase();
    const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 2);

    // Score each session based on relevance
    const scoredSessions = cachedSessions.map((session: any) => {
      let score = 0;
      const title = session.title?.toLowerCase() || '';
      const description = session.description?.toLowerCase() || '';
      const tags = session.tags?.join(' ').toLowerCase() || '';
      const track = session.track?.toLowerCase() || '';
      const speakers = session.speakers?.map((s: any) =>
        `${s.speaker.name} ${s.speaker.company} ${s.speaker.bio || ''}`.toLowerCase()
      ).join(' ') || '';

      const fullText = `${title} ${description} ${tags} ${track} ${speakers}`;

      // Check each search term
      searchTerms.forEach(term => {
        if (title.includes(term)) score += 10; // Title match is most important
        if (track.includes(term)) score += 8;  // Track match is very relevant
        if (tags.includes(term)) score += 6;   // Tag match is relevant
        if (description.includes(term)) score += 4; // Description match
        if (speakers.includes(term)) score += 3; // Speaker match
      });

      // Special handling for role-based searches
      if (searchLower.includes('cto') || searchLower.includes('chief technology')) {
        const techKeywords = ['technology', 'innovation', 'digital', 'transformation', 'architecture', 'cloud', 'data', 'ai', 'ml', 'security'];
        techKeywords.forEach(keyword => {
          if (fullText.includes(keyword)) score += 2;
        });
      }

      if (searchLower.includes('underwriter')) {
        const underwritingKeywords = ['underwriting', 'risk', 'assessment', 'pricing', 'actuarial', 'claims', 'loss', 'portfolio'];
        underwritingKeywords.forEach(keyword => {
          if (fullText.includes(keyword)) score += 2;
        });
      }

      if (searchLower.includes('executive') || searchLower.includes('ceo')) {
        const execKeywords = ['strategy', 'leadership', 'transformation', 'growth', 'innovation', 'trends', 'future'];
        execKeywords.forEach(keyword => {
          if (fullText.includes(keyword)) score += 2;
        });
      }

      // Time-based searches
      if (searchLower.includes('morning')) {
        const hour = new Date(session.startTime).getHours();
        if (hour < 12) score += 5;
      }

      if (searchLower.includes('afternoon')) {
        const hour = new Date(session.startTime).getHours();
        if (hour >= 12 && hour < 17) score += 5;
      }

      if (searchLower.includes('keynote')) {
        if (title.includes('keynote') || session.isKeynote) score += 10;
      }

      return { ...session, relevanceScore: score };
    });

    // Filter and sort by relevance
    const relevantSessions = scoredSessions
      .filter((s: any) => s.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 100); // Return top 100 matches

    console.log(`Fast keyword search completed in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      sessions: relevantSessions,
      searchTime: Date.now() - startTime,
      searchType: 'keyword'
    });

  } catch (error) {
    console.error('Fast search error:', error);
    return NextResponse.json({
      error: 'Search failed',
      sessions: []
    }, { status: 500 });
  }
}