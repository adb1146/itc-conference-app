import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, context, allowedDomains, blockedDomains } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Check for Anthropic API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicApiKey) {
      console.warn('ANTHROPIC_API_KEY not configured, returning mock data');
      return NextResponse.json({
        query,
        content: `Mock profile data for: ${query}. Context: ${context || 'General search'}`,
        sources: [],
        timestamp: new Date().toISOString()
      });
    }
    
    // Prepare the message for Claude with web search
    const systemPrompt = context 
      ? `Search for information about: ${query}. Focus on: ${context}`
      : `Search for information about: ${query}`;
    
    // Configure web search tool with correct structure from documentation
    const webSearchTool = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 3,
      ...(allowedDomains && { allowed_domains: allowedDomains }),
      ...(blockedDomains && { blocked_domains: blockedDomains })
    };
    
    // Call Anthropic API with web search tool
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
${context ? `Context: ${context}` : ''}

Please provide:
1. A comprehensive summary of findings
2. Key facts and details
3. Relevant URLs if found
4. Focus on professional/business information for people and company overviews for organizations`
          }
        ],
        tools: [webSearchTool],
        tool_choice: { type: 'auto' }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      
      // Fall back to mock data if API fails
      return NextResponse.json({
        query,
        content: `Mock profile data for: ${query}. Context: ${context || 'General search'}`,
        sources: [],
        timestamp: new Date().toISOString()
      });
    }
    
    const data = await response.json();
    
    console.log('Anthropic API response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    
    // Extract content from Claude's response
    // The response may contain both tool_use blocks and text content
    let content = '';
    let sources: string[] = [];
    
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use' && block.name === 'web_search') {
          // Tool was invoked but we need to check for results
          console.log('Web search tool was invoked with input:', block.input);
        }
      }
    }
    
    // If no content was extracted, use a fallback
    if (!content) {
      content = `Search performed for: ${query}. The API is processing the request but web search may require additional configuration.`;
    }
    
    // Clean the content before returning
    const cleanedContent = cleanProfileContent(content);
    
    // Extract sources from the content if available
    sources = extractSources(content);
    
    return NextResponse.json({
      query,
      content: cleanedContent,
      sources,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
}

function extractSources(content: string): string[] {
  // Extract URLs from the content
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const matches = content.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

function cleanProfileContent(content: string): string {
  if (!content) return '';
  
  // If it's mock data, return empty string to trigger a real fetch
  if (content.includes('Mock profile') || 
      content.includes('mock data') ||
      content.includes('Context:') ||
      content.includes('Context: Extract')) {
    return '';
  }
  
  // Remove search process text and AI artifacts
  const searchPhrases = [
    /I'll search for.*?\./gi,
    /Let me search.*?\./gi,
    /Let me try.*?\./gi,
    /Let me provide.*?[\n\r]/gi,
    /Let me provide.*?\:/gi,
    /Based on the search results.*?:/gi,
    /Based on my search.*?:/gi,
    /I can provide.*?:/gi,
    /I'll provide.*?:/gi,
    /I'll compile.*?\./gi,
    /Let me gather.*?\./gi,
    /I couldn't find.*?\./gi,
    /Unfortunately.*?\./gi,
    /Search performed for:.*?\./gi,
    /Mock profile data.*?\./gi,
    /Here's what I found.*?:/gi,
    /Here is.*?:/gi
  ];
  
  let cleaned = content;
  searchPhrases.forEach(phrase => {
    cleaned = cleaned.replace(phrase, '');
  });
  
  // Extract only the meaningful content after common headers
  const contentStart = cleaned.search(/\b(Company Overview|Professional Background|Current Role|Key Facts|Services|Background|Overview):/i);
  if (contentStart > 0) {
    cleaned = cleaned.substring(contentStart);
  }
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // Final check for mock data patterns
  if (cleaned.length < 50 || cleaned.includes('Mock profile')) {
    return '';
  }
  
  return cleaned;
}