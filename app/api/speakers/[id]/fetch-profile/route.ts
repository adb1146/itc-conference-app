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
    
    // Construct the full URL for internal API calls (matching the running port)
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

    // Extract profile image URL from web search results
    // Look for common LinkedIn CDN patterns or image URLs
    let profileImageUrl: string | null = null;

    console.log('Attempting to extract LinkedIn profile image...');
    console.log('LinkedIn URL found:', linkedinUrl);

    // Try to extract LinkedIn profile image URL patterns
    const imagePatterns = [
      /https:\/\/media[.-]licdn[.-]com\/dms\/image\/[A-Za-z0-9\/\-_]+/gi,
      /https:\/\/media\.licdn\.com\/[^"\s<>]+/gi,
      /https:\/\/[^\/]*\.licdn\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi,
      /"profilePicture[^}]*"displayImage":"([^"]+)"/gi,
      /"image":\s*"([^"]+)"/gi,
      /"photo":\s*"([^"]+)"/gi
    ];

    // Debug: log part of the content to see what we're working with
    if (speakerProfile.content) {
      const contentSnippet = speakerProfile.content.substring(0, 500);
      console.log('Content snippet:', contentSnippet);
    }

    for (const pattern of imagePatterns) {
      const matches = speakerProfile.content?.match(pattern);
      if (matches) {
        console.log(`Pattern matched: ${pattern}`, matches[0]);

        // Clean up the URL
        profileImageUrl = matches[0]
          .replace(/["'<>\\]/g, '')
          .replace(/\\u[\dA-F]{4}/gi, '') // Remove Unicode escapes
          .replace(/&amp;/g, '&')
          .trim();

        // Validate it's a valid image URL
        if (profileImageUrl.includes('licdn.com') ||
            profileImageUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
          console.log('Valid LinkedIn image found:', profileImageUrl);
          break;
        }
      }
    }

    if (!profileImageUrl) {
      console.log('No LinkedIn profile image found in web search results');
    }

    // If we have a LinkedIn URL but no image, we could fetch the LinkedIn page directly
    // However, for now we'll rely on the web search results

    // Extract expertise and achievements
    const expertise = extractKeywords(speakerProfile.content, [
      'AI', 'Machine Learning', 'Insurtech', 'Digital Transformation',
      'Claims', 'Underwriting', 'Risk Management', 'Data Analytics',
      'Customer Experience', 'Innovation', 'Blockchain', 'IoT',
      'Cloud Computing', 'Cybersecurity', 'API', 'Platform',
      'Leadership', 'Strategy', 'Product Management', 'Sales',
      'Business Development', 'Partnerships', 'Automation'
    ]);

    // Process and format the profile summaries for better readability
    const formatProfileContent = (content: string | null): string | null => {
      if (!content) return null;

      // First, clean up the content
      let formatted = content
        .replace(/\[.*?\]/g, '') // Remove citation markers
        .replace(/\s{2,}/g, ' ') // Normalize spaces
        .trim();

      // Split into sentences for better processing
      const sentences = formatted.match(/[^.!?]+[.!?]+/g) || [formatted];

      // Process each sentence
      const processedSentences = sentences.map(sentence => {
        let s = sentence.trim();

        // Check if this looks like a list item
        if (s.match(/^\d+\./)) {
          // Convert numbered lists to bullets
          s = '• ' + s.replace(/^\d+\.\s*/, '');
        } else if (s.match(/^[-•]/)) {
          // Ensure consistent bullet formatting
          s = '• ' + s.replace(/^[-•]\s*/, '');
        }

        return s;
      });

      // Group sentences into sections based on content patterns
      const sections: string[] = [];
      let currentSection: string[] = [];

      processedSentences.forEach((sentence, index) => {
        // Check for section indicators
        const isNewSection =
          sentence.toLowerCase().includes('experience') ||
          sentence.toLowerCase().includes('expertise') ||
          sentence.toLowerCase().includes('background') ||
          sentence.toLowerCase().includes('currently') ||
          sentence.toLowerCase().includes('previously') ||
          sentence.toLowerCase().includes('specializes') ||
          sentence.toLowerCase().includes('focus') ||
          sentence.toLowerCase().includes('leads') ||
          sentence.toLowerCase().includes('responsible') ||
          sentence.toLowerCase().includes('company') ||
          sentence.toLowerCase().includes('founded') ||
          sentence.toLowerCase().includes('services') ||
          sentence.toLowerCase().includes('products') ||
          sentence.toLowerCase().includes('platform') ||
          sentence.toLowerCase().includes('solution');

        // Start a new section if we detect a topic change
        if (isNewSection && currentSection.length > 0 && !sentence.startsWith('•')) {
          sections.push(currentSection.join(' '));
          currentSection = [sentence];
        } else if (sentence.startsWith('•')) {
          // Keep bullets in their own lines
          if (currentSection.length > 0 && !currentSection[currentSection.length - 1].startsWith('•')) {
            sections.push(currentSection.join(' '));
            currentSection = [];
          }
          sections.push(sentence);
        } else {
          currentSection.push(sentence);
        }
      });

      // Add any remaining content
      if (currentSection.length > 0) {
        sections.push(currentSection.join(' '));
      }

      // Join sections with proper spacing
      return sections
        .filter(section => section.length > 0)
        .join('\n\n');
    };

    const cleanedSpeakerProfile = formatProfileContent(speakerProfile.content);
    const cleanedCompanyProfile = formatProfileContent(companyProfile.content);

    // Update speaker profile in database
    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: {
        profileSummary: cleanedSpeakerProfile,
        companyProfile: cleanedCompanyProfile,
        linkedinUrl: linkedinUrl || speaker.linkedinUrl,
        imageUrl: profileImageUrl || speaker.imageUrl, // Store the profile image URL
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