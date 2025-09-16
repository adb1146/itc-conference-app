import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSessionDates() {
  try {
    console.log('🔧 Fixing session dates - shifting all sessions back by 1 day');
    console.log('===========================================================');

    // Map of old dates to new dates (shift back by 1 day)
    const dateMapping = {
      '2025-10-17': '2025-10-16', // Friday -> Thursday (Day 3)
      '2025-10-16': '2025-10-15', // Thursday -> Wednesday (Day 2)
      '2025-10-15': '2025-10-14', // Wednesday -> Tuesday (Day 1)
    };

    let totalUpdated = 0;

    for (const [oldDate, newDate] of Object.entries(dateMapping)) {
      console.log(`\n📅 Processing ${oldDate} -> ${newDate}`);

      // Get all sessions for this date
      const sessions = await prisma.session.findMany({
        where: {
          AND: [
            { startTime: { gte: new Date(`${oldDate}T00:00:00Z`) } },
            { startTime: { lt: new Date(`${oldDate}T23:59:59Z`) } }
          ]
        }
      });

      console.log(`  Found ${sessions.length} sessions to update`);

      // Update each session
      for (const session of sessions) {
        const oldStart = new Date(session.startTime);
        const oldEnd = new Date(session.endTime);

        // Shift the dates back by 1 day
        const newStart = new Date(oldStart);
        newStart.setDate(newStart.getDate() - 1);

        const newEnd = new Date(oldEnd);
        newEnd.setDate(newEnd.getDate() - 1);

        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        totalUpdated++;
      }

      console.log(`  ✅ Updated ${sessions.length} sessions`);
    }

    console.log(`\n✨ Successfully updated ${totalUpdated} sessions total`);

    // Verify the fix
    console.log('\n📊 Verification - Sessions by Date After Fix:');
    console.log('=============================================');

    const allSessions = await prisma.session.findMany({
      select: { startTime: true },
      orderBy: { startTime: 'asc' }
    });

    const sessionsByDate = new Map<string, number>();
    allSessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);
    });

    const expectedDates = [
      { date: '2025-10-14', label: 'Day 1 (Tuesday)' },
      { date: '2025-10-15', label: 'Day 2 (Wednesday)' },
      { date: '2025-10-16', label: 'Day 3 (Thursday)' }
    ];

    expectedDates.forEach(({ date, label }) => {
      const count = sessionsByDate.get(date) || 0;
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} ${label}: ${count} sessions`);
    });

    // Check for any remaining sessions on wrong dates
    const wrongDateSessions = allSessions.filter(s => {
      const date = new Date(s.startTime).toISOString().split('T')[0];
      return date === '2025-10-17' || date === '2025-10-13';
    });

    if (wrongDateSessions.length > 0) {
      console.log(`\n⚠️  WARNING: Still have ${wrongDateSessions.length} sessions on wrong dates!`);
    } else {
      console.log('\n✅ All sessions are now on the correct conference dates!');
    }

  } catch (error) {
    console.error('Error fixing session dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSessionDates();