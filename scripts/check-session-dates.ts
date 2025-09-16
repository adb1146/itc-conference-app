import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSessionDates() {
  try {
    // Get all unique dates from sessions
    const sessions = await prisma.session.findMany({
      select: {
        startTime: true,
        title: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Group sessions by date
    const sessionsByDate = new Map<string, number>();

    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);
    });

    console.log('\n📅 Sessions by Date:');
    console.log('====================');

    const sortedDates = Array.from(sessionsByDate.keys()).sort();
    sortedDates.forEach(date => {
      const count = sessionsByDate.get(date);
      const dateObj = new Date(date + 'T12:00:00Z');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`${date} (${dayName}): ${count} sessions`);
    });

    // Check if we have sessions for Oct 14, 15, 16
    console.log('\n🔍 Checking for Conference Days:');
    console.log('=================================');

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

    // Show a few sample sessions from each day
    console.log('\n📝 Sample Sessions:');
    console.log('==================');

    for (const { date, label } of expectedDates) {
      const daySessions = sessions.filter(s =>
        new Date(s.startTime).toISOString().split('T')[0] === date
      ).slice(0, 3);

      if (daySessions.length > 0) {
        console.log(`\n${label}:`);
        daySessions.forEach(s => {
          const time = new Date(s.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          console.log(`  - ${time}: ${s.title}`);
        });
      }
    }

    // Check for any sessions outside the conference dates
    console.log('\n⚠️  Sessions Outside Conference Dates:');
    console.log('======================================');

    const outsideSessions = sessions.filter(s => {
      const date = new Date(s.startTime).toISOString().split('T')[0];
      return !expectedDates.some(ed => ed.date === date);
    });

    if (outsideSessions.length > 0) {
      const outsideDates = new Set(outsideSessions.map(s =>
        new Date(s.startTime).toISOString().split('T')[0]
      ));

      outsideDates.forEach(date => {
        const count = outsideSessions.filter(s =>
          new Date(s.startTime).toISOString().split('T')[0] === date
        ).length;
        console.log(`  ${date}: ${count} sessions`);
      });
    } else {
      console.log('  None found - all sessions are within conference dates ✅');
    }

  } catch (error) {
    console.error('Error checking session dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionDates();