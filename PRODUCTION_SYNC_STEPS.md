# Production Data Sync - Next Steps

## Current Status
✅ Export/import scripts created and tested
✅ Data exported from dev database (data/exports/latest.json)
✅ Import tested successfully on test database
✅ Next.js 15 API route fix committed and pushed to GitHub
⏳ Waiting for Railway to auto-deploy the latest changes

## Once Railway Deployment Completes

### 1. Verify Build Success
- Check Railway dashboard for successful build
- Confirm the app is running at your production URL

### 2. Import Data to Production
```bash
# Using Railway CLI (recommended)
railway run node scripts/import-data.js

# Or using Railway dashboard
# Go to your service → Variables tab → Add temporary DATABASE_URL
# Then in Railway shell run:
node scripts/import-data.js
```

### 3. Verify Production Data
```bash
# Check counts
railway run node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const stats = {
    sessions: await prisma.session.count(),
    speakers: await prisma.speaker.count(),
    users: await prisma.user.count()
  };
  console.log('Production database:', stats);
  await prisma.$disconnect();
})();"
```

### 4. Test Production Site
- Visit your production URL
- Check agenda page loads with sessions
- Check speakers page shows all speakers
- Test login with existing user credentials

### 5. Optional: Production Admin Setup
```bash
# Create production admin (replace with your email)
railway run node scripts/promote-admin.js your-email@example.com

# Or keep test@example.com for now and change password later
```

## Data Summary
Your export contains:
- 181 speakers with profiles
- 295 sessions across 3 days
- 192 session-speaker relationships
- 7 users (including test@example.com as admin)
- 1 favorite

## Important Notes
- The import script will clear existing data by default
- To preserve existing data, use: `CLEAR_EXISTING=false railway run node scripts/import-data.js`
- All user passwords are preserved during export/import
- The test@example.com admin account will work in production with password: password123