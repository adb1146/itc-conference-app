# Vector Database Setup for Intelligent AI Search

## Overview
We've implemented a vector database architecture using Pinecone and OpenAI embeddings to enable truly intelligent semantic search. This replaces rigid keyword matching with AI-powered understanding of meaning and context.

## Architecture Benefits

### Previous Approach (Code-based Filtering)
- Rigid keyword matching
- Pre-coded relevance scoring
- Limited to exact matches
- AI constrained by our logic

### New Approach (Vector Database + RAG)
- Semantic understanding of queries
- AI finds conceptually related sessions
- Works even without exact keywords
- AI reasons about the data itself

## Setup Instructions

### 1. Get API Keys

#### Pinecone (Vector Database)
1. Sign up at https://www.pinecone.io (free tier available)
2. Create a new project
3. Copy your API key from the dashboard

#### OpenAI (Embeddings)
1. Sign up at https://platform.openai.com
2. Create an API key
3. Add some credits ($5-10 is enough for testing)

### 2. Configure Environment Variables

Add to your `.env.local` file:
```env
# Vector Database
PINECONE_API_KEY=your_pinecone_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Generate Embeddings

Run the embedding generation script:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_dev" node scripts/generate-embeddings.js
```

This will:
- Create a Pinecone index called "itc-sessions"
- Generate embeddings for all sessions
- Store them in the vector database
- Takes about 5-10 minutes for ~300 sessions

## How It Works

### 1. Embedding Generation
- Each session is converted to searchable text (title + description + speakers + tags)
- OpenAI's `text-embedding-3-small` model creates a 1536-dimensional vector
- Vectors capture semantic meaning, not just keywords

### 2. Semantic Search
When a user asks "What AI sessions match my interests?":
1. Query is converted to a vector
2. Pinecone finds sessions with similar vectors (cosine similarity)
3. Results include conceptually related sessions, even without "AI" in the title
4. Hybrid scoring boosts exact keyword matches

### 3. AI Reasoning
The AI receives:
- Semantically relevant sessions (not all sessions)
- Relevance scores showing strength of match
- Context about why sessions were selected
- Freedom to reason about connections

## API Endpoints

### Vector-Powered Chat: `/api/chat/vector`
- Uses semantic search
- Returns truly relevant sessions
- AI explains conceptual connections
- Much more intelligent responses

### Original Chat: `/api/chat/intelligent`
- Uses keyword filtering
- Returns many sessions
- Limited by pre-coded logic

## Example Queries That Show the Difference

### "How can I improve customer experience?"
- **Old System**: Only finds sessions with "customer" or "experience" keywords
- **Vector System**: Finds sessions about personalization, journey mapping, digital engagement, even if they don't mention "customer experience"

### "Sessions about the future of insurance"
- **Old System**: Needs "future" in title/description
- **Vector System**: Understands conceptual meaning, finds innovation, transformation, emerging tech sessions

### "What should a claims manager attend?"
- **Old System**: Only "claims" keyword matches
- **Vector System**: Finds fraud detection, automation, customer communication, regulatory sessions relevant to claims managers

## Testing the System

1. **Without Vector DB** (current):
   - Go to http://localhost:3011/chat/intelligent
   - Ask "What AI sessions match my interests?"
   - Notice it returns many sessions (100+)

2. **With Vector DB** (after setup):
   - Use the `/api/chat/vector` endpoint
   - Same query returns 10-30 highly relevant sessions
   - AI explains semantic connections

## Cost Estimates
- **Pinecone**: Free tier includes 100K vectors (more than enough)
- **OpenAI Embeddings**: ~$0.02 per 1000 sessions
- **Ongoing**: ~$0.001 per query

## Architecture Diagram

```
User Query → OpenAI Embedding → Vector (1536 dimensions)
                                       ↓
                              Pinecone Vector Search
                                       ↓
                          Top K Similar Session Vectors
                                       ↓
                              Fetch Full Session Data
                                       ↓
                         AI Reasons About Relevant Sessions
                                       ↓
                            Intelligent Response
```

## Next Steps

1. **Set up API keys** (5 minutes)
2. **Run embedding generation** (10 minutes)
3. **Test the difference** in response quality
4. **Consider adding**:
   - User preference vectors
   - Session attendance history
   - Real-time embedding updates
   - Feedback loop for improving relevance

## Troubleshooting

### "Missing API keys" error
- Ensure both `PINECONE_API_KEY` and `OPENAI_API_KEY` are in `.env.local`
- Restart the dev server after adding keys

### Embedding generation fails
- Check API key validity
- Ensure PostgreSQL is running
- Check for rate limits (wait and retry)

### Search returns no results
- Verify embeddings were generated successfully
- Check Pinecone dashboard for index status
- Ensure namespace is correct ("conference-2025")

## Summary

This vector database implementation transforms the AI from a keyword matcher to a true reasoning system that understands meaning and context. The AI can now find conceptually related sessions, explain non-obvious connections, and provide genuinely intelligent recommendations based on semantic understanding rather than rigid code logic.