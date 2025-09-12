#!/bin/bash

# Railway Data Import Commands
# Copy and paste these commands into your terminal

# Step 1: Navigate to project directory
cd /Users/andrewbartels/Projects/my-itcAI-project/itc-conference-app/itc-conference-app

# Step 2: Link to Railway project (interactive - select your project)
railway link

# Step 3: Verify the link worked
railway status

# Step 4: Import the data to production
# This will clear existing data and import from data/exports/latest.json
railway run node scripts/import-data.js

# Step 5: Verify the import succeeded
railway run node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const stats = {
    sessions: await prisma.session.count(),
    speakers: await prisma.speaker.count(),
    users: await prisma.user.count(),
    favorites: await prisma.favorite.count()
  };
  console.log('=== PRODUCTION DATABASE STATS ===');
  console.log('Sessions:', stats.sessions);
  console.log('Speakers:', stats.speakers);
  console.log('Users:', stats.users);
  console.log('Favorites:', stats.favorites);
  
  // Check admin user
  const adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { email: true, name: true }
  });
  console.log('\nAdmin user:', adminUser ? adminUser.email : 'None found');
  
  await prisma.$disconnect();
})();"

# Expected results:
# - 295 sessions
# - 181 speakers
# - 7 users
# - 1 favorite
# - Admin: test@example.com