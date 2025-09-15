/**
 * Web Research Module
 * Performs targeted web searches to gather information about users and companies
 */

import {
  performRealWebSearch,
  searchLinkedInProfile as searchLinkedIn,
  searchCompanyInfo as searchCompany,
  searchRecentNews as searchNews,
  SearchResult
} from './web-search-client';

// Simple in-memory cache for search results (expires after 5 minutes)
const searchCache = new Map<string, { results: WebSearchResult[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  source: string;
}

export interface WebSearchOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  searchType?: 'professional' | 'company' | 'news' | 'general';
}

/**
 * Perform web search using real search APIs
 */
export async function performWebSearch(
  query: string,
  maxResults: number = 5,
  options: WebSearchOptions = {}
): Promise<WebSearchResult[]> {
  // Check cache first
  const cacheKey = `${query}_${maxResults}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[WebResearcher] Using cached results for:', query);
    return cached.results;
  }

  console.log('[WebResearcher] Performing real web search for:', query);

  try {
    // Use real web search
    const searchResults = await performRealWebSearch(query, { maxResults });

    // Convert to WebSearchResult format
    const results: WebSearchResult[] = searchResults.map((result, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      relevance: 1 - (index * 0.1), // Descending relevance based on order
      source: extractDomain(result.url)
    }));

    // Filter by allowed/blocked domains if specified
    let filteredResults = results;

    if (options.allowedDomains && options.allowedDomains.length > 0) {
      filteredResults = filteredResults.filter(r =>
        options.allowedDomains!.some(domain => r.source.includes(domain))
      );
    }

    if (options.blockedDomains && options.blockedDomains.length > 0) {
      filteredResults = filteredResults.filter(r =>
        !options.blockedDomains!.some(domain => r.source.includes(domain))
      );
    }

    console.log(`[WebResearcher] Found ${filteredResults.length} results after filtering`);

    // Determine final results
    const finalResults = filteredResults.length > 0 ? filteredResults : results.slice(0, maxResults);

    // Cache the results
    searchCache.set(cacheKey, {
      results: finalResults,
      timestamp: Date.now()
    });

    // If no results after filtering, return unfiltered results
    return finalResults;

  } catch (error) {
    console.error('[WebResearcher] Search error:', error);

    // Only use mock as absolute last resort
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WebResearcher] Falling back to mock data due to search failure');
      return getMockSearchResults(query);
    }

    return [];
  }
}

/**
 * Parse search results from API response
 */
function parseSearchResults(data: any): WebSearchResult[] {
  if (!data || !data.results) return [];

  return data.results.map((result: any) => ({
    title: result.title || '',
    url: result.url || '',
    snippet: result.snippet || result.description || '',
    relevance: result.relevance || 0.5,
    source: extractDomain(result.url)
  }));
}

/**
 * Extract domain from URL for source identification
 */
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Mock search results for development/testing
 */
function getMockSearchResults(query: string): WebSearchResult[] {
  const mockResults: WebSearchResult[] = [];

  // Check query patterns and return appropriate mock data
  if (query.toLowerCase().includes('linkedin')) {
    mockResults.push({
      title: 'Professional Profile - Insurance Industry Leader',
      url: 'https://linkedin.com/in/mock-profile',
      snippet: 'Experienced insurance executive with 15+ years in digital transformation and innovation. Currently leading technology initiatives at a major carrier, focusing on AI and automation to improve customer experience and operational efficiency.',
      relevance: 0.9,
      source: 'linkedin.com'
    });
  }

  if (query.toLowerCase().includes('company')) {
    mockResults.push({
      title: 'Company Announces Digital Transformation Initiative',
      url: 'https://insurancejournal.com/news/national/2025/01/company-transformation.html',
      snippet: 'Leading insurance company launches comprehensive digital transformation program, investing $100M in AI, cloud infrastructure, and customer experience platforms. The initiative aims to modernize legacy systems and improve digital engagement.',
      relevance: 0.85,
      source: 'insurancejournal.com'
    });

    mockResults.push({
      title: 'Insurance Technology Innovation Report',
      url: 'https://reuters.com/business/insurance-tech-report',
      snippet: 'Company recognized as industry leader in insurtech adoption, implementing cutting-edge solutions for claims automation, underwriting AI, and predictive analytics. Recent partnerships with tech vendors accelerate digital capabilities.',
      relevance: 0.8,
      source: 'reuters.com'
    });
  }

  if (query.toLowerCase().includes('technology') || query.toLowerCase().includes('digital')) {
    mockResults.push({
      title: 'Digital Insurance Trends 2025',
      url: 'https://businesswire.com/insurance-trends',
      snippet: 'Key trends shaping the insurance industry include AI-powered underwriting, embedded insurance products, cybersecurity investments, and customer self-service platforms. Companies investing heavily in digital capabilities.',
      relevance: 0.75,
      source: 'businesswire.com'
    });
  }

  // Always add some general results
  mockResults.push({
    title: 'Insurance Industry Professional Network',
    url: 'https://industry-network.com/insurance',
    snippet: 'Connect with insurance professionals, share insights, and discover opportunities in the evolving insurance landscape. Focus areas include innovation, technology adoption, and digital transformation.',
    relevance: 0.6,
    source: 'industry-network.com'
  });

  return mockResults;
}

/**
 * Specialized search for LinkedIn profiles
 */
export async function searchLinkedInProfile(
  name: string,
  company: string,
  title?: string
): Promise<WebSearchResult | null> {
  console.log(`[WebResearcher] Searching LinkedIn for: ${name} at ${company}`);

  const result = await searchLinkedIn(name, company, title);

  if (result) {
    return {
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      relevance: 0.95,
      source: 'linkedin.com'
    };
  }

  // Fallback to general search
  const query = `"${name}" "${company}" ${title || ''} LinkedIn professional profile`;
  const results = await performWebSearch(query, 3, {
    searchType: 'professional'
  });

  return results.find(r => r.url.includes('linkedin')) || results[0] || null;
}

/**
 * Search for company information using real search
 */
export async function searchCompanyInfo(
  company: string,
  topics: string[] = []
): Promise<WebSearchResult[]> {
  console.log(`[WebResearcher] Searching company info for: ${company}`);

  const results = await searchCompany(company, topics);

  return results.map((result, index) => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    relevance: 1 - (index * 0.1),
    source: extractDomain(result.url)
  }));
}

/**
 * Search for recent news using real search
 */
export async function searchRecentNews(
  subject: string,
  days: number = 90
): Promise<WebSearchResult[]> {
  console.log(`[WebResearcher] Searching recent news for: ${subject}`);

  const results = await searchNews(subject, days);

  return results.map((result, index) => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    relevance: 1 - (index * 0.1),
    source: extractDomain(result.url)
  }));
}

/**
 * Search for technology stack using real search
 */
export async function searchTechnologyStack(
  company: string
): Promise<WebSearchResult[]> {
  console.log(`[WebResearcher] Searching tech stack for: ${company}`);

  const queries = [
    `"${company}" technology stack cloud AWS Azure`,
    `"${company}" digital transformation AI machine learning`,
    `"${company}" insurance platform technology`
  ];

  const allResults: WebSearchResult[] = [];

  for (const query of queries) {
    const results = await performRealWebSearch(query, { maxResults: 2 });

    results.forEach((result, index) => {
      allResults.push({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        relevance: 0.9 - (index * 0.1),
        source: extractDomain(result.url)
      });
    });
  }

  // Remove duplicates
  const uniqueResults = allResults.filter((result, index, self) =>
    index === self.findIndex(r => r.url === result.url)
  );

  return uniqueResults.sort((a, b) => b.relevance - a.relevance);
}