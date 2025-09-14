import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { userProfile } = await request.json();

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

    // Generate personalized reasons using AI
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const speakerNames = session.speakers.map(s => s.speaker.name).join(', ');
    const speakerCompanies = session.speakers.map(s => s.speaker.company).filter(c => c).join(', ');

    const prompt = `Generate 3-5 personalized reasons why someone should attend this conference session.

    Session Details:
    - Title: ${session.title}
    - Description: ${session.description}
    - Track: ${session.track || 'General'}
    - Tags: ${session.tags.join(', ')}
    - Speakers: ${speakerNames} ${speakerCompanies ? `from ${speakerCompanies}` : ''}
    ${session.keyTakeaways?.length ? `- Key Takeaways: ${session.keyTakeaways.join(', ')}` : ''}

    ${userProfile ? `User Profile:
    - Interests: ${userProfile.interests || 'Insurance technology'}
    - Role: ${userProfile.role || 'Professional'}
    - Company Type: ${userProfile.companyType || 'Insurance'}
    - Goals: ${userProfile.goals || 'Learn about industry trends'}` : 'User Profile: General insurance professional interested in technology and innovation'}

    Instructions:
    - Make each reason specific and actionable
    - Connect to the user's interests and goals where possible
    - Focus on practical benefits and outcomes
    - Keep each reason to 1-2 sentences
    - Start each reason with an action verb
    - Format as a simple array of strings

    Return ONLY a JSON array of strings, no other text.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });

      let reasons: string[] = [];

      if (response.content[0].type === 'text') {
        const content = response.content[0].text.trim();

        // Try to parse as JSON first
        try {
          reasons = JSON.parse(content);
        } catch {
          // Fallback: split by newlines and clean up
          reasons = content
            .split('\n')
            .map(line => line.replace(/^[\d\-\*\•]\s*/, '').trim())
            .filter(line => line.length > 10 && !line.startsWith('[') && !line.startsWith('{'));
        }
      }

      // Ensure we have valid reasons
      if (!Array.isArray(reasons) || reasons.length === 0) {
        // Generate default reasons based on session data
        reasons = generateDefaultReasons(session, userProfile);
      }

      // Limit to 5 reasons and ensure they're strings
      reasons = reasons
        .filter(r => typeof r === 'string' && r.length > 0)
        .slice(0, 5);

      return NextResponse.json({
        success: true,
        reasons,
        personalized: !!userProfile
      });

    } catch (aiError) {
      console.error('AI generation error:', aiError);

      // Fallback to default reasons
      const reasons = generateDefaultReasons(session, userProfile);

      return NextResponse.json({
        success: true,
        reasons,
        personalized: false
      });
    }

  } catch (error) {
    console.error('Error generating personalized reasons:', error);
    return NextResponse.json(
      { error: 'Failed to generate personalized reasons' },
      { status: 500 }
    );
  }
}

function generateDefaultReasons(session: any, userProfile?: any): string[] {
  const reasons: string[] = [];

  // Generic but relevant reasons based on session data
  if (session.speakers?.length > 0) {
    const speakerCount = session.speakers.length;
    const companies = session.speakers.map((s: any) => s.speaker.company).filter(Boolean).slice(0, 2).join(' and ');
    reasons.push(`Learn directly from ${speakerCount} industry ${speakerCount === 1 ? 'expert' : 'experts'}${companies ? ` from ${companies}` : ''} sharing real-world experiences`);
  }

  if (session.tags?.includes('AI') || session.tags?.includes('artificial intelligence')) {
    reasons.push('Discover practical AI applications that are transforming insurance operations today');
  }

  if (session.track?.toLowerCase().includes('claims')) {
    reasons.push('Gain insights into streamlining claims processes and improving customer satisfaction');
  }

  if (session.track?.toLowerCase().includes('underwriting')) {
    reasons.push('Explore modern underwriting techniques that balance efficiency with risk management');
  }

  if (session.tags?.includes('innovation') || session.tags?.includes('digital transformation')) {
    reasons.push('Understand how to drive digital transformation in your organization');
  }

  // Add networking opportunity
  reasons.push('Connect with peers facing similar challenges and build valuable industry relationships');

  // Add practical takeaway
  if (session.keyTakeaways?.length > 0) {
    reasons.push(`Walk away with actionable strategies you can implement immediately`);
  } else {
    reasons.push('Get practical insights and strategies you can apply to your current projects');
  }

  // Personalize if we have user profile
  if (userProfile?.interests) {
    const interests = userProfile.interests.toLowerCase();
    if (interests.includes('innovation') || interests.includes('technology')) {
      reasons.unshift('Align with your interest in insurance technology innovation and transformation');
    }
  }

  return reasons.slice(0, 5);
}