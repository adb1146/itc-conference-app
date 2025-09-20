#!/bin/bash

# Production Deployment Script for Embedding System
# Usage: ./scripts/deploy-to-production.sh

set -e

echo "🚀 Deploying Embedding System to Production"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if logged into Vercel
echo -e "\n${YELLOW}Step 1: Checking Vercel authentication...${NC}"
if ! npx vercel whoami &>/dev/null; then
    echo -e "${RED}Not logged into Vercel. Please run: npx vercel login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated with Vercel${NC}"

# Step 2: Check required environment variables
echo -e "\n${YELLOW}Step 2: Environment Variables Checklist${NC}"
echo "Please ensure these are set in Vercel Dashboard:"
echo "  [ ] OPENAI_API_KEY (valid production key)"
echo "  [ ] ANTHROPIC_API_KEY"
echo "  [ ] PINECONE_API_KEY"
echo "  [ ] PINECONE_INDEX (should be 'itc-sessions')"
echo "  [ ] DATABASE_URL (production database)"
echo "  [ ] NEXTAUTH_URL (production URL)"
echo "  [ ] NEXTAUTH_SECRET"
echo "  [ ] REDIS_URL (optional but recommended)"

read -p "Have you configured all required environment variables in Vercel? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please configure environment variables first at:${NC}"
    echo "https://vercel.com/[your-team]/[your-project]/settings/environment-variables"
    exit 1
fi

# Step 3: Build the project
echo -e "\n${YELLOW}Step 3: Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please fix errors before deploying.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Step 4: Deploy to production
echo -e "\n${YELLOW}Step 4: Deploying to production...${NC}"
npx vercel --prod

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. Check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployed to production${NC}"

# Step 5: Get production URL
echo -e "\n${YELLOW}Step 5: Getting production URL...${NC}"
PROD_URL=$(npx vercel ls --prod | grep -o 'https://[^ ]*' | head -1)

if [ -z "$PROD_URL" ]; then
    echo -e "${YELLOW}Could not automatically detect production URL${NC}"
    read -p "Please enter your production URL (e.g., https://your-app.vercel.app): " PROD_URL
fi

echo -e "Production URL: ${GREEN}$PROD_URL${NC}"

# Step 6: Test deployment
echo -e "\n${YELLOW}Step 6: Testing deployment...${NC}"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_STATUS=$(curl -s "$PROD_URL/api/embeddings/health" | jq -r '.status' 2>/dev/null || echo "error")

if [ "$HEALTH_STATUS" == "error" ]; then
    echo -e "${YELLOW}⚠️  Health endpoint not responding or not deployed${NC}"
else
    echo -e "${GREEN}✅ Health endpoint responding (status: $HEALTH_STATUS)${NC}"
fi

# Test stats endpoint
echo "Testing stats endpoint..."
COVERAGE=$(curl -s "$PROD_URL/api/embeddings/stats" | jq -r '.coverage' 2>/dev/null || echo "0%")
echo -e "Embedding coverage: ${YELLOW}$COVERAGE${NC}"

# Step 7: Next steps
echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Generate embeddings in production:"
echo "   - Option A: Run locally with production database"
echo "     DATABASE_URL=\"your-prod-db\" OPENAI_API_KEY=\"your-key\" npm run embeddings:generate"
echo ""
echo "   - Option B: Trigger GitHub Action manually"
echo "     Go to: https://github.com/[your-repo]/actions/workflows/update-embeddings.yml"
echo ""
echo "2. Monitor deployment:"
echo "   - Health: $PROD_URL/api/embeddings/health"
echo "   - Stats: $PROD_URL/api/embeddings/stats"
echo ""
echo "3. Test meal routing:"
echo "   curl -X POST $PROD_URL/api/search \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"what about lunch?\"}'"
echo ""
echo "4. Set up GitHub secrets for automatic updates:"
echo "   - PRODUCTION_DATABASE_URL"
echo "   - OPENAI_API_KEY"
echo "   - PINECONE_API_KEY"
echo "   - PRODUCTION_URL=$PROD_URL"

# Save production URL for future reference
echo "$PROD_URL" > .vercel/production-url.txt
echo -e "\n${GREEN}Production URL saved to .vercel/production-url.txt${NC}"