#!/bin/bash
# Start dev server with clean environment
# This ensures no shell variables override .env.local

echo "Starting dev server with clean environment..."
echo "This prevents shell OPENAI_API_KEY from overriding .env.local"
echo ""

# Run dev server without inherited OPENAI_API_KEY
env -u OPENAI_API_KEY npm run dev