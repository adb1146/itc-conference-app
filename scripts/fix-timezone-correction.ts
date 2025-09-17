import prisma from '../lib/db';

async function correctSessionTimezones() {
  console.log('🕐 Starting timezone correction for all sessions...');
  console.log('This will subtract 3 hours from all session times to fix the Vegas timezone issue');

  try {
    // Get all sessions
    const sessions = await prisma.session.findMany();
    console.log(`📅 Found ${sessions.length} sessions to correct`);

    // First, let's check a few sessions before the fix
    console.log('\n🔍 BEFORE FIX - Sample sessions:');
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
      console.log(`    Current Vegas time: ${vegasTime}`);
    });

    let updatedCount = 0;

    for (const session of sessions) {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);

      // Subtract 3 hours from both start and end times to correct the timezone
      startTime.setHours(startTime.getHours() - 3);
      endTime.setHours(endTime.getHours() - 3);

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
    console.log('First 5 sessions on Day 1 (should now show correct Vegas times):');

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
    console.log('\n🎯 Testing for sessions that should show 9:10 AM Vegas time:');
    const testSessions = await prisma.session.findMany({
      where: {
        title: {
          contains: 'LATAM',
          mode: 'insensitive'
        }
      },
      take: 3
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
      });
    } else {
      console.log('  No LATAM sessions found for testing');
    }

    console.log('\n✅ Timezone correction completed successfully!');
    console.log('Sessions should now display correct Las Vegas times (PDT in October 2025)');

  } catch (error) {
    console.error('❌ Error correcting timezones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

correctSessionTimezones();