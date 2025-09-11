import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speakerId } = await params;
    
    // Get the speaker
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId }
    });
    
    if (!speaker) {
      return NextResponse.json(
        { error: 'Speaker not found' },
        { status: 404 }
      );
    }
    
    // Construct search queries - more specific for better results
    const searchQueries = {
      speaker: `${speaker.name} ${speaker.company} ${speaker.role} insurtech linkedin profile background`,
      company: `${speaker.company} insurance technology insurtech company services products`
    };
    
    // Construct the full URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011';
    
    // Fetch speaker profile from web with LinkedIn prioritization
    const speakerProfileResponse = await fetch(`${baseUrl}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQueries.speaker,
        context: 'Extract professional background, expertise, achievements, notable work, and current role. Look for LinkedIn profile information.',
        allowedDomains: ['linkedin.com', 'insuretechconnect.com', 'insurancejournal.com']
      })
    });
    
    // Fetch company profile from web
    const companyProfileResponse = await fetch(`${baseUrl}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQueries.company,
        context: 'Extract company overview, insurance technology services, products, market position, recent news, and innovations in insurtech.',
        blockedDomains: ['wikipedia.org'] // Avoid generic wiki content
      })
    });
    
    const speakerProfile = await speakerProfileResponse.json();
    const companyProfile = await companyProfileResponse.json();
    
    // Parse LinkedIn URL if found
    const linkedinPattern = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/;
    const linkedinMatch = speakerProfile.content?.match(linkedinPattern);
    const linkedinUrl = linkedinMatch ? `https://www.linkedin.com/in/${linkedinMatch[1]}` : null;
    
    // Extract expertise and achievements
    const expertise = extractKeywords(speakerProfile.content, [
      'AI', 'Machine Learning', 'Insurtech', 'Digital Transformation',
      'Claims', 'Underwriting', 'Risk Management', 'Data Analytics',
      'Customer Experience', 'Innovation', 'Blockchain', 'IoT'
    ]);
    
    // Update speaker profile in database
    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: {
        profileSummary: speakerProfile.content || null,
        companyProfile: companyProfile.content || null,
        linkedinUrl: linkedinUrl || speaker.linkedinUrl,
        expertise: expertise,
        lastProfileSync: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      speaker: updatedSpeaker
    });
    
  } catch (error) {
    console.error('Error fetching speaker profile:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && 'cause' in error) {
      console.error('Error cause:', error.cause);
    }
    return NextResponse.json(
      { error: 'Failed to fetch speaker profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractKeywords(text: string, keywords: string[]): string[] {
  if (!text) return [];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });
  
  return found;
}