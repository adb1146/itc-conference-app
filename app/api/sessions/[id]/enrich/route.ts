import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hybridSearch } from '@/lib/vector-db';
import { searchLocalSessions } from '@/lib/local-vector-db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get the session with speakers
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if we have external APIs available
    const hasExternalAPIs = process.env.PINECONE_API_KEY &&
                           process.env.OPENAI_API_KEY &&
                           !process.env.OPENAI_API_KEY.includes('<your');

    // Build comprehensive search queries
    const speakerNames = session.speakers.map(s => s.speaker.name).join(', ');
    const speakerCompanies = session.speakers.map(s => s.speaker.company).filter(c => c).join(', ');

    const searchQueries = {
      sessionContext: `${session.title} ${session.description} ${session.track || ''} insurtech conference`,
      industryTrends: `${session.tags.join(' ')} insurance technology trends 2025 innovation`,
      speakerExpertise: speakerNames ? `${speakerNames} ${speakerCompanies} insurtech expertise` : null
    };

    // Parallel searches for efficiency
    const searchPromises = [];

    // 1. Vector search for related sessions
    const vectorSearchPromise = (async () => {
      try {
        if (hasExternalAPIs) {
          return await hybridSearch(
            session.title + ' ' + session.description,
            session.tags,
            undefined,
            5 // Get top 5 related sessions
          );
        } else {
          return await searchLocalSessions(
            session.title + ' ' + session.description,
            session.tags,
            5
          );
        }
      } catch (error) {
        console.error('Vector search failed:', error);
        return [];
      }
    })();
    searchPromises.push(vectorSearchPromise);

    // Skip web search for now - it's causing connection issues
    // We'll rely on vector search and session metadata for enrichment
    const sessionContextPromise = Promise.resolve(null);
    const industryTrendsPromise = Promise.resolve(null);
    const speakerPromise = searchQueries.speakerExpertise ? Promise.resolve(null) : null;

    searchPromises.push(sessionContextPromise);
    searchPromises.push(industryTrendsPromise);
    if (speakerPromise) {
      searchPromises.push(speakerPromise);
    }

    // Wait for all searches to complete
    const [relatedSessions, sessionContext, industryTrends, speakerInfo] = await Promise.all(searchPromises);

    // Process related sessions
    const relatedSessionIds = (relatedSessions || [])
      .filter((r: any) => r.id !== sessionId) // Exclude current session
      .slice(0, 3) // Top 3 related
      .map((r: any) => r.id);

    const relatedSessionData = relatedSessionIds.length > 0 ?
      await prisma.session.findMany({
        where: { id: { in: relatedSessionIds } },
        select: { title: true, track: true }
      }) : [];

    // Generate enriched summary combining all sources
    const enrichedSummary = generateEnrichedSummary({
      session,
      sessionContext: undefined,
      industryTrends: undefined,
      speakerInfo: undefined,
      relatedSessions: relatedSessionData
    });

    // Extract key takeaways (will generate defaults if no web content)
    const keyTakeaways = extractKeyTakeaways({
      description: session.description,
      contextContent: undefined,
      tags: session.tags
    });

    // Extract industry context (may be null if web search failed)
    const industryContext = formatIndustryContext(undefined);

    // Extract related topics (will use tags even if web search failed)
    const relatedTopics = extractRelatedTopics({
      tags: session.tags,
      relatedSessions: relatedSessionData,
      industryContent: undefined
    });

    // Update session with enriched data - with proper validation
    try {
      // Ensure all data fits within database constraints
      const safeEnrichedSummary = enrichedSummary ? enrichedSummary.substring(0, 1900) : session.description;
      const safeKeyTakeaways = keyTakeaways ? keyTakeaways.slice(0, 5).map(t => t.substring(0, 200)) : [];
      const safeIndustryContext = industryContext ? industryContext.substring(0, 1900) : null;
      const safeRelatedTopics = relatedTopics ? relatedTopics.slice(0, 8).map(t => t.substring(0, 50)) : [];

      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          enrichedSummary: safeEnrichedSummary,
          keyTakeaways: safeKeyTakeaways,
          industryContext: safeIndustryContext,
          relatedTopics: safeRelatedTopics,
          lastEnrichmentSync: new Date()
        },
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        session: updatedSession
      });
    } catch (updateError) {
      console.error('Error updating session with enrichment:', updateError);

      // Return the original session with generated enrichment even if save fails
      return NextResponse.json({
        success: true,
        session: {
          ...session,
          enrichedSummary: enrichedSummary || session.description,
          keyTakeaways: keyTakeaways || [],
          industryContext: industryContext,
          relatedTopics: relatedTopics || [],
          lastEnrichmentSync: new Date()
        }
      });
    }

  } catch (error) {
    console.error('Error enriching session:', error);
    return NextResponse.json(
      { error: 'Failed to enrich session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateEnrichedSummary(data: {
  session: any;
  sessionContext?: string;
  industryTrends?: string;
  speakerInfo?: string;
  relatedSessions: any[];
}): string {
  const { session, sessionContext, industryTrends, speakerInfo, relatedSessions } = data;

  // Start with the original description
  let summary = `${session.description}\n\n`;

  // Add enrichment based on session metadata even without web search
  if (!sessionContext && !industryTrends && !speakerInfo) {
    // Generate insights from session data alone
    if (session.track) {
      summary += `**Track Focus:** This session is part of the ${session.track}, bringing together industry leaders to explore cutting-edge solutions and best practices.\n\n`;
    }

    if (session.tags && session.tags.length > 0) {
      const tagInsights = session.tags.slice(0, 3).join(', ');
      summary += `**Key Topics:** Dive deep into ${tagInsights} with practical insights and real-world applications.\n\n`;
    }

    if (session.speakers && session.speakers.length > 0) {
      const speakerCount = session.speakers.length;
      const companies = session.speakers.map((s: any) => s.speaker.company).filter(Boolean).slice(0, 3).join(', ');
      summary += `**Expert Panel:** Learn from ${speakerCount} industry ${speakerCount === 1 ? 'expert' : 'experts'}${companies ? ` representing ${companies}` : ''}.\n\n`;
    }

    summary += `**What to Expect:** Interactive discussion, actionable insights, and networking opportunities with peers facing similar challenges.\n\n`;

    // Ensure summary doesn't exceed database limits (keep under 2000 chars for safety)
  const finalSummary = summary.trim();
  if (finalSummary.length > 2000) {
    // Find a good break point
    const truncated = finalSummary.substring(0, 1950);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);

    return breakPoint > 0 ? truncated.substring(0, breakPoint + 1).trim() : truncated.trim() + '...';
  }

  return finalSummary;
  }

  if (sessionContext) {
    // Add context insights
    const contextInsights = sessionContext
      .replace(/\[.*?\]/g, '') // Remove citations
      .split('.')
      .filter(s => s.trim().length > 20) // Filter meaningful sentences
      .slice(0, 3) // Top 3 insights
      .join('. ');

    if (contextInsights) {
      summary += `**Why This Matters:** ${contextInsights}.\n\n`;
    }
  }

  if (speakerInfo && session.speakers.length > 0) {
    summary += `**Expert Perspectives:** This session features industry leaders who bring deep expertise in ${session.track || 'insurance technology'}. `;
    summary += `Our speakers will share practical insights from their experience implementing these solutions at scale.\n\n`;
  }

  if (industryTrends) {
    const trendSnippet = industryTrends
      .replace(/\[.*?\]/g, '')
      .split('.')
      .find(s => s.toLowerCase().includes('trend') || s.toLowerCase().includes('growth') || s.toLowerCase().includes('market'));

    if (trendSnippet) {
      summary += `**Industry Context:** ${trendSnippet.trim()}.\n\n`;
    }
  }

  if (relatedSessions.length > 0) {
    summary += `**Build Your Knowledge:** This session connects well with other conference topics including ${relatedSessions.map(s => s.title).join(', ')}.`;
  }

  // Ensure summary doesn't exceed database limits (keep under 2000 chars for safety)
  const finalSummary = summary.trim();
  if (finalSummary.length > 2000) {
    // Find a good break point
    const truncated = finalSummary.substring(0, 1950);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);

    return breakPoint > 0 ? truncated.substring(0, breakPoint + 1).trim() : truncated.trim() + '...';
  }

  return finalSummary;
}

function extractKeyTakeaways(data: {
  description: string;
  contextContent?: string;
  tags: string[];
}): string[] {
  const takeaways: string[] = [];

  // Extract from description
  const descriptionPoints = data.description
    .split(/[.!?]/)
    .filter(s => s.trim().length > 30)
    .slice(0, 2)
    .map(s => s.trim());

  takeaways.push(...descriptionPoints);

  // Add tag-based takeaways
  if (data.tags.includes('AI') || data.tags.includes('artificial intelligence')) {
    takeaways.push('Learn how AI is transforming insurance operations and customer experience');
  }
  if (data.tags.includes('claims')) {
    takeaways.push('Discover strategies for streamlining claims processing and improving accuracy');
  }
  if (data.tags.includes('underwriting')) {
    takeaways.push('Understand modern underwriting techniques and risk assessment tools');
  }
  if (data.tags.includes('cyber')) {
    takeaways.push('Explore cybersecurity challenges and solutions for the insurance industry');
  }

  // Add from context if available
  if (data.contextContent) {
    const contextPoints = data.contextContent
      .split(/[.!?]/)
      .filter(s =>
        s.toLowerCase().includes('learn') ||
        s.toLowerCase().includes('discover') ||
        s.toLowerCase().includes('understand') ||
        s.toLowerCase().includes('explore')
      )
      .slice(0, 1)
      .map(s => s.trim().replace(/\[.*?\]/g, ''));

    takeaways.push(...contextPoints);
  }

  // Limit to 5 unique takeaways
  return [...new Set(takeaways)].slice(0, 5);
}

function formatIndustryContext(content?: string): string | null {
  if (!content) return null;

  // Clean and format the content
  const formatted = content
    .replace(/\[.*?\]/g, '') // Remove citations
    .split('.')
    .filter(s => {
      const lower = s.toLowerCase();
      return lower.includes('market') ||
             lower.includes('billion') ||
             lower.includes('growth') ||
             lower.includes('trend') ||
             lower.includes('adopt') ||
             lower.includes('transform') ||
             lower.includes('innovation');
    })
    .slice(0, 3)
    .join('. ');

  return formatted.trim() || null;
}

function extractRelatedTopics(data: {
  tags: string[];
  relatedSessions: any[];
  industryContent?: string;
}): string[] {
  const topics = new Set<string>();

  // Add from tags
  data.tags.forEach(tag => topics.add(tag));

  // Add from related sessions
  data.relatedSessions.forEach(session => {
    if (session.track) {
      topics.add(session.track);
    }
  });

  // Extract from industry content
  if (data.industryContent) {
    const techKeywords = [
      'blockchain', 'IoT', 'machine learning', 'automation',
      'API', 'cloud', 'digital transformation', 'analytics',
      'predictive modeling', 'customer experience', 'embedded insurance'
    ];

    const lowerContent = data.industryContent.toLowerCase();
    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        topics.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
  }

  return Array.from(topics).slice(0, 8); // Limit to 8 topics
}