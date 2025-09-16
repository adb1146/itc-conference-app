#!/bin/bash

echo "🚀 ITC Conference App - Production Data Deployment Script"
echo "========================================================="

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your production DATABASE_URL"
    echo ""
    echo "Usage: ./deploy-to-production.sh 'your-database-url'"
    echo ""
    echo "You can find your DATABASE_URL in:"
    echo "  Vercel Dashboard → Your Project → Settings → Environment Variables"
    echo ""
    exit 1
fi

DATABASE_URL=$1

echo ""
echo "📊 Step 1: Pushing database schema..."
echo "-------------------------------------"
DATABASE_URL="$DATABASE_URL" npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to push database schema"
    exit 1
fi

echo "✅ Database schema pushed successfully!"
echo ""

echo "📦 Step 2: Importing data..."
echo "----------------------------"
DATABASE_URL="$DATABASE_URL" node scripts/import-data.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to import data"
    exit 1
fi

echo ""
echo "🎉 Success! Your data has been deployed to production!"
echo ""
echo "📋 Next steps:"
echo "  1. Visit your Vercel deployment URL"
echo "  2. Verify that sessions and speakers are showing"
echo "  3. Test the search functionality"
echo ""
echo "⚠️  Don't forget to add these environment variables in Vercel:"
echo "  - NEXTAUTH_SECRET (generate a random 32-character string)"
echo "  - NEXTAUTH_URL (your deployment URL)"
echo "  - OPENAI_API_KEY (if using AI features)"
echo "  - ANTHROPIC_API_KEY (if using AI features)"
echo ""