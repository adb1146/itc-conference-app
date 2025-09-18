#!/bin/bash

echo "🔄 Refreshing Production Embeddings"
echo "=================================="
echo ""

# Pull latest environment variables from Vercel
echo "📥 Pulling latest environment variables from Vercel..."
vercel env pull .env.production.local

# Check if the file was created
if [ ! -f .env.production.local ]; then
  echo "❌ Failed to pull environment variables from Vercel"
  echo "Please make sure you're logged in to Vercel CLI"
  exit 1
fi

# Load the environment variables
set -a
source .env.production.local
set +a

# Check for required variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in environment"
  exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "❌ PINECONE_API_KEY not found in environment"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ OPENAI_API_KEY not found in environment"
  exit 1
fi

echo "✅ All required environment variables found"
echo ""

# Run the embedding generation
echo "🚀 Generating embeddings for production database..."
node scripts/generate-production-embeddings.js

echo ""
echo "✨ Done! Your production embeddings have been refreshed."
echo "The AI concierge should now be able to answer questions about sessions and speakers."