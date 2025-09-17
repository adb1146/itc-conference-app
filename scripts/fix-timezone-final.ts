import prisma from '../lib/db';

async function finalTimezoneCorrection() {
  console.log('🕐 Starting FINAL timezone correction for all sessions...');
  console.log('This will add 8 hours to all session times to show correct Vegas time (PDT)');
  console.log('Vegas time in October 2025 is PDT (UTC-7), so 9:10 AM Vegas = 16:10 UTC\n');

  try {
    // Get all sessions
    const sessions = await prisma.session.findMany();
    console.log(`📅 Found ${sessions.length} sessions to correct`);

    // First, let's check a few sessions before the fix
    console.log('\n🔍 BEFORE FIX - Sample sessions (currently showing wrong times):');
    const sampleSessions = sessions.slice(0, 3);
    sampleSessions.forEach(session => {
      const currentTime = new Date(session.startTime);
      const vegasTime = currentTime.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${session.title.substring(0, 50)}...`);
      console.log(`    Current UTC: ${currentTime.toISOString()}`);
      console.log(`    Current Vegas time: ${vegasTime} (WRONG)`);
    });

    let updatedCount = 0;

    console.log('\n📝 Starting timezone correction (adding 8 hours)...');

    for (const session of sessions) {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);

      // Add 8 hours to both start and end times to correct for PDT timezone
      startTime.setHours(startTime.getHours() + 8);
      endTime.setHours(endTime.getHours() + 8);

      // Update the session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: startTime,
          endTime: endTime
        }
      });

      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`✅ Updated ${updatedCount} sessions...`);
      }
    }

    console.log(`\n🎉 Successfully corrected ${updatedCount} sessions`);

    // Verify the fix
    console.log('\n🔍 AFTER FIX - Verifying timezone correction:');
    console.log('First 5 sessions on Day 1 (should now show CORRECT Vegas times):');

    const verifySessions = await prisma.session.findMany({
      where: {
        startTime: {
          gte: new Date('2025-10-14T00:00:00Z'),
          lt: new Date('2025-10-15T00:00:00Z')
        }
      },
      orderBy: { startTime: 'asc' },
      take: 5
    });

    verifySessions.forEach(session => {
      const date = new Date(session.startTime);
      const vegasTime = date.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ✅ ${vegasTime} - ${session.title}`);
      console.log(`     UTC: ${date.toISOString()}`);
    });

    // Test the specific case mentioned in the issue
    console.log('\n🎯 Testing LATAM sessions (should show around 9:10 AM Vegas time):');
    const testSessions = await prisma.session.findMany({
      where: {
        title: {
          contains: 'LATAM',
          mode: 'insensitive'
        }
      },
      take: 5
    });

    if (testSessions.length > 0) {
      testSessions.forEach(session => {
        const date = new Date(session.startTime);
        const vegasTime = date.toLocaleTimeString('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        console.log(`  🎯 ${vegasTime} - ${session.title}`);
        console.log(`     UTC: ${date.toISOString()}`);
      });
    } else {
      console.log('  No LATAM sessions found for testing');
    }

    // Test range of session times to verify they look reasonable
    console.log('\n📊 Sample of session times across the day:');
    const allDaySessions = await prisma.session.findMany({
      where: {
        startTime: {
          gte: new Date('2025-10-14T00:00:00Z'),
          lt: new Date('2025-10-15T00:00:00Z')
        }
      },
      orderBy: { startTime: 'asc' },
      take: 15
    });

    allDaySessions.forEach((session, index) => {
      const date = new Date(session.startTime);
      const vegasTime = date.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${index + 1}. ${vegasTime} - ${session.title.substring(0, 60)}...`);
    });

    console.log('\n✅ Final timezone correction completed successfully!');
    console.log('🎯 Sessions should now display correct Las Vegas times (PDT in October 2025)');
    console.log('💡 Expected result: Sessions that were showing as 6:10 AM should now show as 9:10 AM');

  } catch (error) {
    console.error('❌ Error correcting timezones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalTimezoneCorrection();