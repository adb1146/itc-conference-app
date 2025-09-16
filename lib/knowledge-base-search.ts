import prisma from './db';

export interface KnowledgeBaseResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  category?: string | null;
  source: string;
  keywords: string[];
  metadata?: any;
  score?: number;
}

/**
 * Search the KnowledgeBase table for relevant content
 */
export async function searchKnowledgeBase(
  query: string,
  keywords: string[] = [],
  source?: string,
  limit: number = 5
): Promise<KnowledgeBaseResult[]> {
  try {
    const lowerQuery = query.toLowerCase();
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    // Build search conditions
    const searchConditions: any[] = [];

    // Text search in title and content
    if (query) {
      searchConditions.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      });
    }

    // Keyword matching
    if (lowerKeywords.length > 0) {
      searchConditions.push({
        keywords: {
          hasSome: lowerKeywords
        }
      });
    }

    // Source filter
    if (source) {
      searchConditions.push({
        source: source
      });
    }

    // Always filter for active content
    searchConditions.push({
      isActive: true
    });

    const results = await prisma.knowledgeBase.findMany({
      where: searchConditions.length > 0 ? { AND: searchConditions } : { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: limit
    });

    // Calculate relevance scores
    return results.map(result => {
      let score = result.priority || 0;

      // Boost score for title matches
      if (result.title.toLowerCase().includes(lowerQuery)) {
        score += 50;
      }

      // Boost score for keyword matches
      const matchedKeywords = result.keywords.filter(k =>
        lowerKeywords.includes(k.toLowerCase()) ||
        lowerQuery.includes(k.toLowerCase())
      );
      score += matchedKeywords.length * 10;

      // Boost score for content matches
      const contentMatches = (result.content.toLowerCase().match(new RegExp(lowerQuery, 'g')) || []).length;
      score += Math.min(contentMatches * 5, 30); // Cap at 30 points for content matches

      return {
        ...result,
        metadata: result.metadata as any,
        score
      };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));

  } catch (error) {
    console.error('Error searching KnowledgeBase:', error);
    return [];
  }
}

/**
 * Get PS Advisory specific content from KnowledgeBase
 */
export async function getPSAdvisoryKnowledge(topic?: string): Promise<KnowledgeBaseResult[]> {
  try {
    const conditions: any = {
      source: 'ps_advisory',
      isActive: true
    };

    if (topic) {
      conditions.OR = [
        { title: { contains: topic, mode: 'insensitive' } },
        { content: { contains: topic, mode: 'insensitive' } },
        { keywords: { hasSome: [topic.toLowerCase()] } }
      ];
    }

    const results = await prisma.knowledgeBase.findMany({
      where: conditions,
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return results.map(r => ({
      ...r,
      metadata: r.metadata as any,
      score: r.priority
    }));
  } catch (error) {
    console.error('Error fetching PS Advisory knowledge:', error);
    return [];
  }
}

/**
 * Check if a query is asking about PS Advisory
 */
export function isAskingAboutPSAdvisory(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const psAdvisoryKeywords = [
    'ps advisory',
    'psadvisory',
    'andrew bartels',
    'nancy paul',
    'tom king',
    'hitesh malhotra',
    'who built',
    'who made',
    'who created',
    'about the company',
    'four quadrant',
    'friction gap'
  ];

  return psAdvisoryKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Format PS Advisory knowledge for inclusion in chat context
 */
export function formatKnowledgeForContext(knowledge: KnowledgeBaseResult[]): string {
  if (knowledge.length === 0) return '';

  const sections = knowledge.map(item => {
    return `### ${item.title}
${item.content}

Keywords: ${item.keywords.join(', ')}`;
  });

  return `## Relevant Information

${sections.join('\n\n')}`;
}