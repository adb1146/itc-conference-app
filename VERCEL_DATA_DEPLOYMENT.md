# Deploying Data to Vercel

## Overview
This guide explains how to deploy your ITC Conference App data to your Vercel deployment.

## Prerequisites
1. Vercel deployment (already done ✓)
2. PostgreSQL database (e.g., Vercel Postgres, Supabase, Neon, or Railway)
3. Environment variables configured in Vercel

## Step 1: Set Up Your Production Database

### Option A: Use Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Navigate to your project
3. Click on "Storage" tab
4. Click "Create Database" → Select "Postgres"
5. Follow the setup wizard
6. Vercel will automatically add the DATABASE_URL to your environment variables

### Option B: Use External Database (Supabase, Neon, Railway)
1. Create a PostgreSQL database on your chosen platform
2. Get your connection string (DATABASE_URL)
3. Add it to Vercel environment variables:
   - Go to Settings → Environment Variables
   - Add `DATABASE_URL` with your connection string

## Step 2: Export Your Local Data

First, export your local data to a JSON file:

```bash
# Export all data from your local database
DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_dev" node scripts/export-data.js
```

This will create a file called `exported-data.json` with all your:
- Sessions
- Speakers
- Session-Speaker relationships
- PS Advisory content

## Step 3: Configure Vercel Environment Variables

Go to your Vercel project settings and add these environment variables:

```bash
# Required
DATABASE_URL=your_production_database_url
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=generate_a_random_32_char_string

# AI APIs (if using AI features)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_index_name
```

## Step 4: Run Database Migrations on Production

### Method 1: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link to your project
vercel link

# Run migrations in production
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) npx prisma migrate deploy
```

### Method 2: Using Direct Connection
```bash
# Set your production DATABASE_URL
export DATABASE_URL="your_production_database_url"

# Generate Prisma client
npx prisma generate

# Push schema to production
npx prisma db push
```

## Step 5: Import Data to Production

### Method 1: Import Using Script
```bash
# Import the exported data to production
DATABASE_URL="your_production_database_url" node scripts/import-data.js
```

### Method 2: Seed Production Directly
```bash
# This will import the complete agenda from source files
DATABASE_URL="your_production_database_url" node scripts/seed-production.js
```

## Step 6: Generate Vector Embeddings (Optional)

If you're using semantic search features:

```bash
# Generate embeddings for all sessions
DATABASE_URL="your_production_database_url" node scripts/generate-embeddings.js
```

## Step 7: Verify Deployment

1. Visit your Vercel deployment URL
2. Check that:
   - Sessions are displaying correctly
   - Speakers are showing up
   - Search functionality works
   - Login/authentication works

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is correctly set in Vercel environment variables
- Check that your database allows connections from Vercel's IP addresses
- For Vercel Postgres, connections are automatically configured

### Missing Data
- Verify the export file was created successfully
- Check import script logs for errors
- Ensure all foreign key relationships are maintained

### Performance Issues
- Consider adding database indexes for frequently queried fields
- Enable Vercel's Edge caching for API routes
- Use ISR (Incremental Static Regeneration) for pages

## Automated Deployment Script

Create a deployment script for future updates:

```bash
#!/bin/bash
# deploy-data.sh

echo "🚀 Deploying ITC Conference Data to Production"

# Export local data
echo "📦 Exporting local data..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_dev" node scripts/export-data.js

# Get production DATABASE_URL from Vercel
echo "🔗 Fetching production credentials..."
vercel env pull .env.production

# Import to production
echo "📤 Importing data to production..."
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) node scripts/import-data.js

# Generate embeddings if needed
echo "🧮 Generating embeddings..."
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) node scripts/generate-embeddings.js

echo "✅ Data deployment complete!"
```

## Important Notes

1. **Backup First**: Always backup your production database before importing new data
2. **Test First**: Test the import process on a staging environment if possible
3. **API Keys**: Ensure all necessary API keys are configured in Vercel
4. **SSL**: Production databases usually require SSL. Add `?sslmode=require` to your DATABASE_URL if needed

## Quick Commands Reference

```bash
# Export local data
DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_dev" node scripts/export-data.js

# Import to production (replace with your actual DATABASE_URL)
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" node scripts/import-data.js

# Seed PS Advisory content
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" node scripts/seed-ps-advisory-content.ts

# Generate embeddings
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" node scripts/generate-embeddings.js
```

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify database connection
3. Ensure all environment variables are set
4. Check browser console for client-side errors