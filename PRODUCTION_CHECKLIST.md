# 🚀 Production Deployment Checklist

## Pre-Deployment Requirements

### ✅ Code Changes Ready
- [x] Embedding management system implemented (`/lib/embedding-manager.ts`)
- [x] Embedding monitoring system (`/lib/embedding-monitor.ts`)
- [x] CLI management tools (`/scripts/manage-embeddings.ts`)
- [x] Health monitoring API (`/app/api/embeddings/health/route.ts`)
- [x] Stats API (`/app/api/embeddings/stats/route.ts`)
- [x] Meal query routing fixed in `enhanced-session-search.ts`
- [x] GitHub Action for automatic updates (`.github/workflows/update-embeddings.yml`)
- [x] Production deployment script (`/scripts/deploy-to-production.sh`)

### 🔑 Environment Variables Required in Vercel

Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables

Add these production environment variables:

- [ ] `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- [ ] `ANTHROPIC_API_KEY` - Your Anthropic API key
- [ ] `PINECONE_API_KEY` - Your Pinecone API key
- [ ] `PINECONE_INDEX` - Set to `itc-sessions`
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `REDIS_URL` - Optional but recommended for caching
- [ ] `NODE_ENV` - Set to `production`

## Deployment Process

### Step 1: Login to Vercel
```bash
npx vercel login
```

### Step 2: Deploy to Production
```bash
# Option A: Use the deployment script
./scripts/deploy-to-production.sh

# Option B: Manual deployment
npm run build
npx vercel --prod
```

### Step 3: Generate Embeddings in Production

**Option A: Run Locally with Production Database**
```bash
# Get a valid OpenAI API key first!
DATABASE_URL="postgresql://..." \
OPENAI_API_KEY="sk-proj-..." \
PINECONE_API_KEY="pcsk_..." \
PINECONE_INDEX="itc-sessions" \
npm run embeddings:generate -- --batch-size 20
```

**Option B: GitHub Action (Recommended)**
1. Go to your repository settings
2. Add these GitHub Secrets:
   - `PRODUCTION_DATABASE_URL`
   - `OPENAI_API_KEY` (must be valid!)
   - `PINECONE_API_KEY`
   - `PRODUCTION_URL`

3. Trigger manually:
   - Go to Actions tab
   - Select "Update Production Embeddings"
   - Click "Run workflow"

### Step 4: Verify Deployment

```bash
# Check health
curl https://your-app.vercel.app/api/embeddings/health

# Check stats
curl https://your-app.vercel.app/api/embeddings/stats

# Test meal routing (MOST IMPORTANT!)
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what about lunch?"}'

# Should return conference lunch sessions, NOT restaurants!
```

## Post-Deployment Verification

### ✅ Success Criteria
- [ ] Health endpoint returns `status: "healthy"` or `"degraded"`
- [ ] Stats endpoint shows embeddings coverage > 0%
- [ ] Meal queries return conference meal sessions
- [ ] Search response time < 3 seconds
- [ ] No 500 errors in Vercel logs

### 🔍 Testing Meal Query Fix
Test these queries and verify they return conference sessions:

```bash
# Test lunch query
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what about lunch?"}'

# Test breakfast query
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "when is breakfast?"}'

# Test general meal query
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what meals are included?"}'
```

Expected results should include:
- "WIISE Workshop: Lunch"
- "Breakfast Sponsored by Jackson"
- "Lunch Sponsored by isolved"
- "ITC Agents & Brokers Lunch & Expo"

## Monitoring & Maintenance

### Daily Monitoring
- Check health: `https://your-app.vercel.app/api/embeddings/health`
- Check coverage: `https://your-app.vercel.app/api/embeddings/stats`
- Review Vercel logs for errors

### Automatic Updates
The GitHub Action will run daily at 2 AM UTC to:
- Update embeddings for new sessions
- Validate existing embeddings
- Report any issues

### Manual Intervention
If needed, trigger embedding regeneration:
```bash
# Force refresh all embeddings
DATABASE_URL="..." OPENAI_API_KEY="..." \
npm run embeddings:generate -- --force --batch-size 20
```

## Troubleshooting

### Problem: "Invalid API key" errors
**Solution**: The OpenAI API key in .env.local is invalid. Get a new one from https://platform.openai.com/api-keys

### Problem: Embeddings not generating
**Solution**: Check that all environment variables are set in Vercel and GitHub Secrets

### Problem: Meal queries still showing restaurants
**Solution**:
1. Verify the enhanced-session-search.ts file is deployed
2. Check that meal sessions exist in the database
3. Test with `curl` to verify the API response

### Problem: Health check failing
**Solution**:
1. Check Vercel logs for errors
2. Verify database connection
3. Ensure API keys are valid

## Rollback Plan

If issues occur:
```bash
# Immediate rollback in Vercel
npx vercel rollback

# Or revert the deployment
git revert HEAD
git push origin main
```

## Important Notes

⚠️ **API Key Issue**: The current OpenAI API key in `.env.local` appears to be invalid or expired. You'll need to update it with a valid key before embeddings can be generated.

⚠️ **Vercel Function Limits**: Embedding generation cannot run directly in Vercel due to time limits. Use the GitHub Action or run locally.

✅ **Meal Query Fix**: Even without embeddings, the meal query routing will work using database fallback search!

## Contact & Support

- Vercel Dashboard: https://vercel.com
- GitHub Actions: Check `.github/workflows/update-embeddings.yml`
- Monitoring: `/api/embeddings/health` and `/api/embeddings/stats`

---

**Remember**: The most important feature is that meal queries now return conference sessions, not restaurant recommendations! 🍽️ → 🎯