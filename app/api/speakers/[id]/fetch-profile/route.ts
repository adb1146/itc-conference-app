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
      company: speaker.company ?
        `"${speaker.company}" company overview insurance technology insurtech fintech startup services products` :
        null
    };
    
    console.log('Fetch Profile API - Environment check:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      speakerName: speaker.name,
      company: speaker.company
    });

    // Call Anthropic API directly for web search
    const performWebSearch = async (query: string, context: string, options?: any) => {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      if (!anthropicApiKey) {
        console.warn('ANTHROPIC_API_KEY not configured, returning mock data');
        return {
          query,
          content: `Mock profile data for: ${query}`,
          sources: [],
          timestamp: new Date().toISOString()
        };
      }

      const webSearchTool = {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
        ...(options?.allowedDomains && { allowed_domains: options.allowedDomains }),
        ...(options?.blockedDomains && { blocked_domains: options.blockedDomains })
      };

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: `Please search the web for the following information and provide a comprehensive summary:

Query: ${query}
Context: ${context}

Instructions:
- Provide ONLY the factual information found, without any meta-commentary
- Do NOT include phrases like "I'll search for", "Based on the search results", "Let me find", etc.
- Start directly with the professional information
- Focus on professional/business information for people and company overviews for organizations
- Include key facts, achievements, and relevant details
- Format as clear, direct statements about the person or company`
              }
            ],
            tools: [webSearchTool],
            tool_choice: { type: 'auto' }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Anthropic API error:', errorData);
          return { query, content: `Error fetching data for: ${query}`, sources: [] };
        }

        const data = await response.json();
        let content = '';

        if (data.content && Array.isArray(data.content)) {
          for (const block of data.content) {
            if (block.type === 'text') {
              content += block.text;
            }
          }
        }

        return { query, content: content || 'No data found', sources: [] };
      } catch (error) {
        console.error('Web search error:', error);
        return { query, content: `Error: ${error}`, sources: [] };
      }
    };

    // Fetch speaker profile
    const speakerProfile = await performWebSearch(
      searchQueries.speaker,
      'Extract professional background, expertise, achievements, notable work, and current role. Look for LinkedIn profile information.',
      { allowedDomains: ['linkedin.com', 'insuretechconnect.com', 'insurancejournal.com'] }
    );

    // Fetch company profile
    let companyProfile = { content: null };

    if (searchQueries.company && speaker.company) {
      companyProfile = await performWebSearch(
        searchQueries.company,
        'Extract company overview, insurance technology services, products, market position, recent news, and innovations in insurtech.',
        { blockedDomains: ['wikipedia.org'] }
      );

      // Try broader search if limited data
      if (!companyProfile.content || companyProfile.content.length < 100) {
        console.log(`Limited data for ${speaker.company}, trying broader search...`);
        const broaderResults = await performWebSearch(
          `${speaker.name} ${speaker.company} company background mission`,
          `Find information about the company ${speaker.company} where ${speaker.name} works as ${speaker.role}.`
        );

        if (broaderResults.content && broaderResults.content.length > (companyProfile.content?.length || 0)) {
          companyProfile = broaderResults;
        }
      }
    }
    
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
        if (profileImageUrl &&
            (profileImageUrl.includes('licdn.com') ||
             profileImageUrl.match(/\.(jpg|jpeg|png|webp)/i))) {
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

      // First, remove AI meta-commentary and internal thought process
      let formatted = content
        // Remove AI's internal dialogue patterns
        .replace(/I'll search for information about[^.]+\./gi, '')
        .replace(/Let me search[^.]+\./gi, '')
        .replace(/Let me perform[^.]+search[^.]+\./gi, '')
        .replace(/Let me find[^.]+\./gi, '')
        .replace(/I'm searching[^.]+\./gi, '')
        .replace(/I can provide[^:]+:/gi, '')
        .replace(/Based on the search results,[^:]+:/gi, '')
        .replace(/Based on my search,[^:]+:/gi, '')
        .replace(/Based on the information[^:]+:/gi, '')
        .replace(/According to my search[^:]+:/gi, '')
        .replace(/From the search results[^:]+:/gi, '')
        .replace(/Here's what I found[^:]+:/gi, '')
        .replace(/Here is the information[^:]+:/gi, '')
        .replace(/I've found[^:]+:/gi, '')
        .replace(/I found[^:]+:/gi, '')
        .replace(/Let me look[^.]+\./gi, '')
        .replace(/I'll look[^.]+\./gi, '')
        .replace(/Searching for[^.]+\./gi, '')
        .replace(/Looking for[^.]+\./gi, '')
        .replace(/I need to[^.]+\./gi, '')
        .replace(/Let me get[^.]+\./gi, '')
        .replace(/^Current Role and Experience:\s*/gim, '')
        .replace(/^Professional Background:\s*/gim, '')
        .replace(/^Professional Summary:\s*/gim, '')
        .replace(/^Summary:\s*/gim, '')
        .replace(/^Overview:\s*/gim, '')
        .replace(/^Profile:\s*/gim, '')
        .replace(/^About.*?:\s*/gim, '')
        // Remove citation markers
        .replace(/\[.*?\]/g, '')
        // Normalize spaces
        .replace(/\s{2,}/g, ' ')
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

    // Handle company profile - provide context if no data found
    let cleanedCompanyProfile = formatProfileContent(companyProfile.content);

    // If still no company profile after all attempts, provide a contextual message
    if (!cleanedCompanyProfile && speaker.company) {
      cleanedCompanyProfile = `${speaker.company} is operating in the insurtech space. While detailed public information about the company is limited, they are represented at ITC Vegas 2025 by ${speaker.name}, who serves as ${speaker.role || 'a key member of the team'}.`;
    }

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