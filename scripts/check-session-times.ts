/**
 * Check session times to understand the timezone issue
 */

import prisma from '../lib/db';

async function checkSessionTimes() {
  console.log('📋 Checking session times to understand timezone issue...\n');

  // Get a sample session
  const sampleSession = await prisma.session.findFirst({
    where: {
      title: {
        contains: 'ITC LATAM Opening Keynote'
      }
    }
  });

  if (sampleSession) {
    console.log('Session: ITC LATAM Opening Keynote');
    console.log('=====================================');

    const utcTime = sampleSession.startTime;
    console.log(`UTC in DB: ${utcTime.toISOString()}`);
    console.log(`UTC Hours: ${utcTime.getUTCHours()}:${String(utcTime.getUTCMinutes()).padStart(2, '0')}`);

    // Show what it displays as in different timezones
    console.log('\nWhen displayed with different timezone settings:');

    // Pacific Time (what we're currently using)
    const pacificTime = utcTime.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    console.log(`America/Los_Angeles: ${pacificTime}`);

    // Try UTC directly
    const utcDisplay = utcTime.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    console.log(`UTC: ${utcDisplay}`);

    // What if we DON'T specify timezone (uses system default)
    const noTimezone = utcTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    console.log(`No timezone specified: ${noTimezone}`);

    console.log('\n🎯 Expected Las Vegas time: 6:10 AM');
    console.log('\n💡 Analysis:');
    console.log('- UTC time in DB: 10:10 AM');
    console.log('- Las Vegas in October is PDT (UTC-7)');
    console.log('- So 10:10 AM UTC should be 3:10 AM PDT');
    console.log('- But we want it to show 6:10 AM');
    console.log('- This means the UTC times in DB are 3 hours too early!');
    console.log('\n✅ Solution: Add 3 hours to all UTC times in database');
  }

  // Check a few more sessions
  console.log('\n📊 Checking more sessions:');
  const moreSessions = await prisma.session.findMany({
    take: 5,
    orderBy: { startTime: 'asc' }
  });

  for (const session of moreSessions) {
    const vegasTime = session.startTime.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    console.log(`\n${session.title.substring(0, 50)}...`);
    console.log(`  UTC: ${session.startTime.toISOString()}`);
    console.log(`  Displays as: ${vegasTime}`);
  }
}

checkSessionTimes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });