import prisma from '../lib/db';

async function fixSessionTimezones() {
  console.log('Starting timezone fix for all sessions...');

  try {
    // Get all sessions
    const sessions = await prisma.session.findMany();
    console.log(`Found ${sessions.length} sessions to update`);

    let updatedCount = 0;

    for (const session of sessions) {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);

      // Add 3 hours to both start and end times
      startTime.setHours(startTime.getHours() + 3);
      endTime.setHours(endTime.getHours() + 3);

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
        console.log(`Updated ${updatedCount} sessions...`);
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} sessions`);

    // Verify the fix
    console.log('\nVerifying the fix - First 5 sessions on Day 1:');
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

    verifySessions.forEach(s => {
      const date = new Date(s.startTime);
      const vegasTime = date.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`${vegasTime} - ${s.title}`);
    });

  } catch (error) {
    console.error('Error fixing timezones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSessionTimezones();