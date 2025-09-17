const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  console.log('Fixing session dates - shifting all dates forward by 1 day...\n');

  try {
    // Get all sessions
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' }
    });

    console.log(`Found ${sessions.length} sessions to fix\n`);

    let fixedCount = 0;

    for (const session of sessions) {
      const currentStart = new Date(session.startTime);
      const currentEnd = new Date(session.endTime);

      // Add 1 day to both start and end times
      const newStart = new Date(currentStart);
      newStart.setDate(newStart.getDate() + 1);

      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + 1);

      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      fixedCount++;
      if (fixedCount % 50 === 0) {
        console.log(`  Fixed ${fixedCount} sessions...`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} sessions!\n`);

    // Show new date distribution
    const updatedSessions = await prisma.session.findMany();
    const dateCounts = {};

    updatedSessions.forEach(s => {
      const date = new Date(s.startTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    console.log('New date distribution:');
    Object.entries(dateCounts).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} sessions`);
    });

    // Show sample sessions for each day
    console.log('\n=== Sample Sessions by Day ===');

    const dates = ['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

    for (let i = 0; i < dates.length; i++) {
      const dayStart = new Date(dates[i] + 'T00:00:00');
      const dayEnd = new Date(dates[i] + 'T23:59:59');

      const daySessions = await prisma.session.findMany({
        where: {
          startTime: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        take: 3,
        orderBy: { startTime: 'asc' }
      });

      if (daySessions.length > 0) {
        console.log(`\n${dayNames[i]}, Oct ${13 + i}:`);
        daySessions.forEach(session => {
          const time = new Date(session.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          console.log(`  ${time}: ${session.title.substring(0, 50)}`);
        });
      }
    }

  } catch (error) {
    console.error('Error fixing dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDates();