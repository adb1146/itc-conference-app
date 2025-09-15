/**
 * Web Search Client
 * Provides real web search capabilities using available APIs
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface SearchOptions {
  maxResults?: number;
  type?: 'web' | 'news' | 'images';
  dateRange?: 'day' | 'week' | 'month' | 'year';
  domain?: string;
}

/**
 * Perform web search using available search endpoints
 */
export async function performRealWebSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const maxResults = options.maxResults || 5;

  try {
    // Try using the existing web-search API endpoint first
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011';
    const response = await fetch(`${baseUrl}/api/web-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        maxResults,
        context: 'Professional research and company information'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return parseSearchResponse(data);
    }
  } catch (error) {
    console.error('[WebSearchClient] API search failed:', error);
  }

  // Fallback: Use DuckDuckGo Instant Answer API (free, no API key needed)
  try {
    const ddgResults = await searchWithDuckDuckGo(query);
    if (ddgResults.length > 0) {
      return ddgResults.slice(0, maxResults);
    }
  } catch (error) {
    console.error('[WebSearchClient] DuckDuckGo search failed:', error);
  }

  // Last resort: Use Google Programmable Search if API key is available
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    try {
      return await searchWithGoogle(query, maxResults);
    } catch (error) {
      console.error('[WebSearchClient] Google search failed:', error);
    }
  }

  // If all else fails, return empty results
  console.warn('[WebSearchClient] All search methods failed, returning empty results');
  return [];
}

/**
 * Search using DuckDuckGo Instant Answer API (free, no key required)
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // DuckDuckGo Instant Answer API
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;

  try {
    const response = await fetch(ddgUrl);
    const data = await response.json();

    // Extract main result
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
        content: data.Abstract
      });
    }

    // Extract related topics
    if (data.RelatedTopics) {
      data.RelatedTopics.forEach((topic: any) => {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL || '',
            snippet: topic.Text
          });
        }
      });
    }

    // Extract answer (for factual queries)
    if (data.Answer) {
      results.push({
        title: 'Direct Answer',
        url: data.AnswerType,
        snippet: data.Answer
      });
    }
  } catch (error) {
    console.error('[DuckDuckGo] Search error:', error);
  }

  return results;
}

/**
 * Search using Google Programmable Search Engine
 */
async function searchWithGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    return [];
  }

  const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;

  try {
    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.items) {
      return data.items.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        content: item.htmlSnippet
      }));
    }
  } catch (error) {
    console.error('[Google] Search error:', error);
  }

  return [];
}

/**
 * Parse search response from various formats
 */
function parseSearchResponse(data: any): SearchResult[] {
  if (!data) return [];

  // Handle Anthropic web search API response format
  if (data.content && typeof data.content === 'string' && data.content.length > 0) {
    // Create a single comprehensive result from the AI-generated content
    return [{
      title: `Research Results: ${data.query || 'Web Search'}`,
      url: data.sources?.[0] || 'https://api.anthropic.com',
      snippet: data.content.substring(0, 500),
      content: data.content
    }];
  }

  // Handle array of results
  if (Array.isArray(data)) {
    return data.map(item => ({
      title: item.title || '',
      url: item.url || item.link || '',
      snippet: item.snippet || item.description || '',
      content: item.content
    }));
  }

  // Handle object with results property
  if (data.results) {
    return parseSearchResponse(data.results);
  }

  // Handle object with items property (Google format)
  if (data.items) {
    return parseSearchResponse(data.items);
  }

  // Handle single result
  if (data.title || data.snippet) {
    return [{
      title: data.title || '',
      url: data.url || '',
      snippet: data.snippet || '',
      content: data.content
    }];
  }

  return [];
}

/**
 * Search for LinkedIn profiles (using web search as LinkedIn API is restricted)
 */
export async function searchLinkedInProfile(
  name: string,
  company: string,
  title?: string
): Promise<SearchResult | null> {
  const query = `site:linkedin.com/in "${name}" "${company}" ${title || ''}`.trim();
  const results = await performRealWebSearch(query, { maxResults: 3 });

  // Return the most relevant result
  return results.find(r =>
    r.url.includes('linkedin.com/in/') &&
    r.snippet.toLowerCase().includes(name.toLowerCase())
  ) || results[0] || null;
}

/**
 * Search for company information
 */
export async function searchCompanyInfo(
  company: string,
  topics: string[] = []
): Promise<SearchResult[]> {
  const queries = [
    `"${company}" insurance technology digital transformation`,
    `"${company}" news announcement latest`,
    ...topics.map(topic => `"${company}" ${topic}`)
  ];

  const allResults: SearchResult[] = [];

  // Search for each query
  for (const query of queries.slice(0, 3)) {
    const results = await performRealWebSearch(query, { maxResults: 2 });
    allResults.push(...results);
  }

  // Remove duplicates based on URL
  const uniqueResults = allResults.filter((result, index, self) =>
    index === self.findIndex(r => r.url === result.url)
  );

  return uniqueResults;
}

/**
 * Search for recent news
 */
export async function searchRecentNews(
  subject: string,
  days: number = 30
): Promise<SearchResult[]> {
  const query = `"${subject}" insurance news after:${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;

  return performRealWebSearch(query, {
    maxResults: 5,
    type: 'news'
  });
}

/**
 * General topic search
 */
export async function searchTopic(
  topic: string,
  context: string = ''
): Promise<SearchResult[]> {
  const query = context ? `${topic} ${context}` : topic;
  return performRealWebSearch(query, { maxResults: 5 });
}