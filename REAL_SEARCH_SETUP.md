# Setting Up Real Web Search

The Research Agent now uses **real web search** instead of mock data. Here's how it works and how to configure it.

## How It Works

The system tries multiple search methods in order:

1. **Existing Web Search API** - Uses `/api/web-search` endpoint if available
2. **DuckDuckGo API** - Free, no API key required (limited results)
3. **Google Custom Search** - If API key is configured
4. **Mock Data** - Only as absolute last resort in development

## Search Hierarchy

```
1. Try existing web-search endpoint
   ↓ (if fails)
2. Try DuckDuckGo (free, always available)
   ↓ (if insufficient)
3. Try Google if API key exists
   ↓ (if all fail)
4. Mock data (dev only, last resort)
```

## No Configuration Required!

**The system works out of the box** using:
- The existing web-search API endpoint
- DuckDuckGo's free API (no key needed)

You'll get real search results immediately without any API keys.

## Optional: Enhanced Search with API Keys

For better search results, you can add API keys:

### Option 1: Google Custom Search (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Custom Search API"
4. Create credentials (API Key)
5. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
6. Create a search engine
7. Get your Search Engine ID

Add to `.env.local`:
```env
GOOGLE_SEARCH_API_KEY=your-api-key
GOOGLE_SEARCH_ENGINE_ID=your-engine-id
```

**Free Tier:** 100 searches/day

### Option 2: Serper API

1. Sign up at [serper.dev](https://serper.dev)
2. Get your API key

Add to `.env.local`:
```env
SERPER_API_KEY=your-serper-api-key
```

**Free Tier:** 50 searches/month

### Option 3: Bing Search API

1. Sign up for [Azure Cognitive Services](https://azure.microsoft.com/en-us/services/cognitive-services/bing-web-search-api/)
2. Create a Bing Search resource
3. Get your API key

Add to `.env.local`:
```env
BING_SEARCH_API_KEY=your-bing-api-key
```

## Testing Real Search

1. **Check what's being used:**
   ```bash
   # Run the app
   npm run dev

   # Test a search
   curl -X POST http://localhost:3011/api/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"message":"Build me a personalized agenda","sessionId":"test","userPreferences":{}}'
   ```

2. **Check the console logs:**
   ```
   [WebResearcher] Performing real web search for: ...
   [WebResearcher] Found X results after filtering
   [WebSearchClient] Using DuckDuckGo search
   ```

## How Research Works

When a user says "Build me a personalized agenda":

1. **Information Collection**
   - Name: "John Smith"
   - Company: "Acme Insurance"
   - Role: "VP of Innovation"

2. **Real Web Searches Performed:**
   ```
   - "John Smith" "Acme Insurance" LinkedIn
   - "Acme Insurance" insurance technology
   - "Acme Insurance" digital transformation
   - "VP of Innovation" insurance trends
   ```

3. **Results Used For:**
   - Professional background
   - Company initiatives
   - Industry context
   - Interest inference

## Debugging

### See what searches are happening:
Look for console logs:
```
[WebResearcher] Searching LinkedIn for: John Smith at Acme Insurance
[WebResearcher] Searching company info for: Acme Insurance
[WebResearcher] Found 5 results after filtering
```

### Test search directly:
```javascript
// In browser console or Node
const response = await fetch('http://localhost:3011/api/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Acme Insurance digital transformation',
    maxResults: 5
  })
});
const results = await response.json();
console.log(results);
```

## Privacy & Security

- Searches are performed server-side only
- No personal data is stored from searches
- Results are used only for the current session
- Search queries are not logged permanently

## Cost Considerations

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| DuckDuckGo | Unlimited | N/A |
| Google Custom Search | 100/day | $5 per 1000 |
| Serper | 50/month | $50/month |
| Bing | 1000/month | Variable |

## Fallback Behavior

If all search methods fail:
1. System logs warning
2. Returns empty results or mock data
3. User still gets agenda (using less personalized approach)

## Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Then add any API keys you want to use.

## Summary

**You don't need any API keys** - the system uses free search methods by default. API keys just enhance the quality of results.