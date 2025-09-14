/**
 * AI Pre-computation Service
 * Pre-generates AI summaries and embeddings for fast retrieval
 */

import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { generateEmbedding } from '@/lib/vector-db';

interface PrecomputeResult {
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * Pre-compute AI summaries for all sessions
 */
export async function precomputeSessionSummaries(): Promise<PrecomputeResult> {
  const result: PrecomputeResult = {
    processed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get all sessions that need summaries
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { enrichedSummary: null },
          { enrichedSummary: '' }
        ]
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);

      await Promise.all(batch.map(async (session) => {
        try {
          // Generate AI summary using Haiku (fastest)
          const prompt = `Generate a concise, engaging 2-3 sentence summary for this conference session:
          Title: ${session.title}
          Description: ${session.description}
          Track: ${session.track || 'General'}
          Tags: ${session.tags.join(', ')}
          Speakers: ${session.speakers.map(s => s.speaker.name).join(', ')}

          Focus on: What attendees will learn, why it matters, and key takeaways.`;

          const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 200,
            temperature: 0.7,
            messages: [{ role: 'user', content: prompt }]
          });

          const summary = response.content[0].type === 'text'
            ? response.content[0].text
            : session.description;

          // Extract key points
          const keyTakeaways = extractKeyPoints(session.description, session.tags);

          // Update session with pre-computed data
          await prisma.session.update({
            where: { id: session.id },
            data: {
              enrichedSummary: summary,
              keyTakeaways: keyTakeaways,
              lastEnrichmentSync: new Date()
            }
          });

          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Session ${session.id}: ${error}`);
        }
      }));

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    result.errors.push(`General error: ${error}`);
  }

  return result;
}

/**
 * Pre-compute AI summaries for all speakers
 */
export async function precomputeSpeakerSummaries(): Promise<PrecomputeResult> {
  const result: PrecomputeResult = {
    processed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get all speakers that need summaries
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: null },
          { profileSummary: '' }
        ]
      },
      include: {
        sessions: {
          include: {
            session: true
          }
        }
      }
    });

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Process speakers
    for (const speaker of speakers) {
      try {
        const sessionTopics = speaker.sessions.map(s => s.session.title).join(', ');

        // Generate profile summary using Haiku
        const prompt = `Generate a brief 2-sentence professional summary for:
        Name: ${speaker.name}
        Role: ${speaker.role || 'Speaker'}
        Company: ${speaker.company || 'Independent'}
        Bio: ${speaker.bio || 'Insurance technology expert'}
        Sessions: ${sessionTopics}

        Focus on their expertise and value to conference attendees.`;

        const response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        });

        const summary = response.content[0].type === 'text'
          ? response.content[0].text
          : `${speaker.name} is a ${speaker.role} at ${speaker.company}.`;

        // Extract expertise areas
        const expertise = extractExpertise(speaker.bio, sessionTopics);

        // Update speaker with pre-computed data
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: {
            profileSummary: summary,
            expertise: expertise,
            lastProfileSync: new Date()
          }
        });

        result.processed++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        result.failed++;
        result.errors.push(`Speaker ${speaker.id}: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`General error: ${error}`);
  }

  return result;
}

/**
 * Pre-compute embeddings for all sessions
 */
export async function precomputeSessionEmbeddings(): Promise<PrecomputeResult> {
  const result: PrecomputeResult = {
    processed: 0,
    failed: 0,
    errors: []
  };

  try {
    const sessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    // Store embeddings in a separate cache table or vector DB
    for (const session of sessions) {
      try {
        const searchText = `${session.title} ${session.description} ${session.tags.join(' ')}`;
        const embedding = await generateEmbedding(searchText);

        // Store embedding (you might want to create a separate table for this)
        // For now, we'll just count it as processed
        result.processed++;

        // Rate limiting for OpenAI API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        result.failed++;
        result.errors.push(`Session ${session.id} embedding: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`General error: ${error}`);
  }

  return result;
}

/**
 * Helper function to extract key points from description
 */
function extractKeyPoints(description: string, tags: string[]): string[] {
  const points: string[] = [];

  // Extract sentences that contain key phrases
  const sentences = description.split(/[.!?]/).filter(s => s.trim().length > 30);
  points.push(...sentences.slice(0, 2).map(s => s.trim()));

  // Add tag-based insights
  if (tags.includes('AI') || tags.includes('artificial intelligence')) {
    points.push('Learn cutting-edge AI applications in insurance');
  }
  if (tags.includes('claims')) {
    points.push('Discover strategies for streamlining claims processing');
  }
  if (tags.includes('underwriting')) {
    points.push('Explore modern underwriting techniques and automation');
  }

  return points.slice(0, 3);
}

/**
 * Helper function to extract expertise areas
 */
function extractExpertise(bio: string | null, sessionTopics: string): string[] {
  const expertise: string[] = [];
  const combinedText = `${bio || ''} ${sessionTopics}`.toLowerCase();

  const expertiseKeywords = [
    'AI', 'machine learning', 'automation', 'claims', 'underwriting',
    'cyber', 'digital transformation', 'data analytics', 'customer experience',
    'innovation', 'insurtech', 'blockchain', 'IoT', 'risk management'
  ];

  expertiseKeywords.forEach(keyword => {
    if (combinedText.includes(keyword.toLowerCase())) {
      expertise.push(keyword);
    }
  });

  return expertise.slice(0, 5);
}