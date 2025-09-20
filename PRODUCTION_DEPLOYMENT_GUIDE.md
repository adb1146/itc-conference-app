# Production Deployment Guide - Embedding System

## Overview
This guide covers deploying the embedding management system to production on Vercel and ensuring embeddings are properly generated and maintained.

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure these environment variables are configured in Vercel:

```env
# Required API Keys
OPENAI_API_KEY=sk-proj-...  # Must be valid production key
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=itc-sessions

# Database
DATABASE_URL=postgresql://...  # Production database URL

# Redis (Optional but recommended for caching)
REDIS_URL=redis://...

# Other Required
NEXTAUTH_URL=https://your-production-domain.vercel.app
NEXTAUTH_SECRET=your-32-character-secret
NODE_ENV=production
```

### 2. Database Migrations
Ensure production database is up-to-date:
```bash
# Run migrations on production database
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

## Deployment Steps

### Step 1: Update Production Environment Variables

```bash
# List current environment variables
vercel env ls --production

# Add/Update required API keys
vercel env add OPENAI_API_KEY production
vercel env add PINECONE_API_KEY production
vercel env add PINECONE_INDEX production

# Verify all required vars are set
vercel env pull .env.production
```

### Step 2: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or if using Git integration
git push origin main  # Triggers automatic deployment
```

### Step 3: Generate Embeddings in Production

Since Vercel functions have time limits, we need to run embedding generation from a local machine or CI/CD pipeline:

```bash
# Option 1: Run locally with production database
DATABASE_URL="your-production-db-url" \
OPENAI_API_KEY="your-production-openai-key" \
PINECONE_API_KEY="your-production-pinecone-key" \
PINECONE_INDEX="itc-sessions" \
npm run embeddings:generate -- --batch-size 20

# Option 2: Use a GitHub Action (see below)
```

### Step 4: Verify Deployment

```bash
# Check production health
curl https://your-app.vercel.app/api/embeddings/health

# Test meal query routing
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what about lunch?"}'
```

## GitHub Action for Continuous Embedding Updates

Create `.github/workflows/update-embeddings.yml`:

```yaml
name: Update Production Embeddings

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Allow manual triggers

jobs:
  update-embeddings:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Generate embeddings
      env:
        DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
        PINECONE_INDEX: itc-sessions
      run: |
        npm run embeddings:generate -- --batch-size 20
        npm run embeddings:validate

    - name: Health check
      env:
        DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
      run: npm run embeddings:health
```

## API Routes for Production Monitoring

Create these API routes for production monitoring:

### `/app/api/embeddings/health/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { embeddingMonitor } from '@/lib/embedding-monitor';

export async function GET() {
  try {
    const health = await embeddingMonitor.getHealthStatus();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
```

### `/app/api/embeddings/stats/route.ts`
```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const total = await prisma.session.count();
    const withEmbeddings = await prisma.session.count({
      where: { embedding: { isEmpty: false } }
    });

    return NextResponse.json({
      total,
      withEmbeddings,
      coverage: total > 0 ? (withEmbeddings / total) * 100 : 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Stats check failed' },
      { status: 500 }
    );
  }
}
```

## Production Monitoring

### 1. Vercel Dashboard
- Monitor function execution times
- Check error logs
- Review API usage

### 2. Custom Monitoring Endpoints
```bash
# Check embedding coverage
curl https://your-app.vercel.app/api/embeddings/stats

# Health check
curl https://your-app.vercel.app/api/embeddings/health

# Test search
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI sessions"}'
```

### 3. Alerts Setup
Configure alerts in Vercel for:
- Function timeouts
- Error rate > 1%
- Response time > 3s

## Troubleshooting Production Issues

### Issue: Embeddings not generating
```bash
# Check API keys are set correctly
vercel env ls --production | grep -E "OPENAI|PINECONE"

# Test API keys locally with production values
OPENAI_API_KEY="prod-key" npm run embeddings:health
```

### Issue: Search falling back to database
```bash
# Check Pinecone index status
curl https://api.pinecone.io/indexes \
  -H "Api-Key: your-pinecone-key"

# Verify embeddings exist in database
DATABASE_URL="prod-db" npx prisma studio
```

### Issue: Meal queries returning wrong results
```bash
# Test meal detection
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "lunch options", "debug": true}'
```

## Performance Optimization

### 1. Caching Strategy
- Enable Redis for production caching
- Set appropriate TTLs (24 hours for embeddings)
- Use Vercel Edge caching for static responses

### 2. Batch Processing
- Process embeddings in batches of 20-50
- Use rate limiting to avoid API limits
- Schedule updates during low-traffic hours

### 3. Database Optimization
```sql
-- Create indexes for faster queries
CREATE INDEX idx_sessions_embedding ON "Session" USING GIN (embedding);
CREATE INDEX idx_sessions_title ON "Session" (title);
CREATE INDEX idx_sessions_start_time ON "Session" (startTime);
```

## Security Considerations

1. **API Key Rotation**
   - Rotate API keys quarterly
   - Use separate keys for production/staging
   - Never commit keys to repository

2. **Access Control**
   - Limit embedding generation to admin users or CI/CD
   - Add authentication to monitoring endpoints
   - Use Vercel's built-in DDoS protection

3. **Data Privacy**
   - Ensure embeddings don't contain PII
   - Comply with data retention policies
   - Regular security audits

## Rollback Plan

If issues occur after deployment:

```bash
# Immediate rollback
vercel rollback

# Or revert Git commit
git revert HEAD
git push origin main

# Clear problematic embeddings if needed
DATABASE_URL="prod-db" \
psql -c "UPDATE \"Session\" SET embedding = '{}' WHERE id IN (select id from \"Session\" where lastUpdated > NOW() - INTERVAL '1 hour');"
```

## Success Metrics

After deployment, verify:
- ✅ All 282 sessions have embeddings generated
- ✅ Meal queries return conference meals (not restaurants)
- ✅ Search response time < 500ms
- ✅ Embedding coverage > 95%
- ✅ Error rate < 1%
- ✅ Health check returns "healthy" status

## Maintenance Schedule

- **Daily**: Auto-sync new sessions (via GitHub Action)
- **Weekly**: Check health metrics
- **Monthly**: Optimize embeddings, clear old cache
- **Quarterly**: Rotate API keys, security audit