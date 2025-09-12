# Database Sync - Production Deployment Guide

## Overview
This guide explains how to sync data from development to production on Railway.

## Files Created
- `scripts/export-data.js` - Exports database to JSON
- `scripts/import-data.js` - Imports JSON data to database
- `scripts/setup-test-db.js` - Creates test database (for local testing)
- `data/exports/latest-export.json` - Latest database export

## Local Testing Complete ✅
We've successfully tested:
1. Exported 181 speakers, 295 sessions, 192 relationships, and 7 users from dev
2. Created a test database locally
3. Imported all data successfully into test database

## Production Deployment Steps

### Step 1: Deploy Code to Production
```bash
# Add all new files
git add scripts/export-data.js scripts/import-data.js scripts/setup-test-db.js
git add data/exports/latest-export.json
git add DEPLOYMENT.md

# Commit changes
git commit -m "Add database sync scripts and data export"

# Push to GitHub (Railway will auto-deploy)
git push origin main
```

### Step 2: Run Import on Railway

#### Option A: Using Railway CLI
```bash
# Install Railway CLI if needed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the import script
railway run node scripts/import-data.js
```

#### Option B: Using Railway Dashboard
1. Go to your Railway project dashboard
2. Navigate to your service
3. Open the "Settings" tab
4. Find "Run Command" or "Console"
5. Run: `node scripts/import-data.js`

### Step 3: Verify Production Data
After import, verify the data:
```bash
railway run node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  console.log('Sessions:', await prisma.session.count());
  console.log('Speakers:', await prisma.speaker.count());
  console.log('Users:', await prisma.user.count());
  await prisma.$disconnect();
}
check();
"
```

## Important Notes

### Data Security
- User passwords are hashed and safe to import
- The export contains 7 test users from dev
- You may want to delete test users after import:
  ```bash
  railway run node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.deleteMany({ 
    where: { email: { contains: 'test' } } 
  });
  await prisma.$disconnect();
  "
  ```

### Creating Admin User
After import, create a production admin user:
```bash
railway run node scripts/create-test-users.js
# Or manually create via the app registration
```

### Troubleshooting
- If import fails, check DATABASE_URL is set correctly in Railway
- Ensure Prisma migrations are up to date: `railway run npx prisma db push`
- Check Railway logs for any errors

## Data Overview
Current export contains:
- **181 Speakers** with profiles and expertise
- **295 Sessions** across 3 days (Oct 15-17, 2025)
- **192 Session-Speaker** relationships
- **7 Test Users** (including test@example.com as admin)

## Re-running Export/Import
To update data in the future:
1. Export from dev: `DATABASE_URL="..." node scripts/export-data.js`
2. Commit new export: `git add data/exports/latest-export.json && git commit -m "Update data export" && git push`
3. Run import on Railway: `railway run node scripts/import-data.js`