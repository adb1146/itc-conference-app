import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDaySpecificSessions() {
  try {
    console.log('🔧 Fixing Day-Specific Sessions');
    console.log('================================\n');

    // Find all sessions that have "Day 2" or "Day 3" in their title but are on the wrong day
    const day2Sessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: '(Day 2)' } },
          { title: { contains: 'Day 2' } }
        ]
      }
    });

    const day3Sessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: '(Day 3)' } },
          { title: { contains: 'Day 3' } }
        ]
      }
    });

    console.log(`Found ${day2Sessions.length} Day 2 sessions to check`);
    console.log(`Found ${day3Sessions.length} Day 3 sessions to check\n`);

    // Fix Day 2 sessions - should be on Oct 15 (Wednesday)
    let day2Fixed = 0;
    for (const session of day2Sessions) {
      const currentDate = new Date(session.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (currentDateStr !== '2025-10-15') {
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();

        const newStart = new Date(2025, 9, 15, hours, minutes, 0, 0);
        const endDate = new Date(session.endTime);
        const newEnd = new Date(2025, 9, 15, endDate.getHours(), endDate.getMinutes(), 0, 0);

        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        console.log(`✅ Moved "${session.title}" to Oct 15 (Day 2)`);
        day2Fixed++;
      }
    }

    // Fix Day 3 sessions - should be on Oct 16 (Thursday)
    let day3Fixed = 0;
    for (const session of day3Sessions) {
      const currentDate = new Date(session.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (currentDateStr !== '2025-10-16') {
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();

        const newStart = new Date(2025, 9, 16, hours, minutes, 0, 0);
        const endDate = new Date(session.endTime);
        const newEnd = new Date(2025, 9, 16, endDate.getHours(), endDate.getMinutes(), 0, 0);

        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        console.log(`✅ Moved "${session.title}" to Oct 16 (Day 3)`);
        day3Fixed++;
      }
    }

    // Also check for any sessions that should be on Day 1 but aren't
    const day1Sessions = await prisma.session.findMany({
      where: {
        AND: [
          {
            NOT: [
              { title: { contains: '(Day 2)' } },
              { title: { contains: '(Day 3)' } },
              { title: { contains: 'Day 2' } },
              { title: { contains: 'Day 3' } }
            ]
          }
        ]
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`===========`);
    console.log(`Day 2 sessions moved: ${day2Fixed}`);
    console.log(`Day 3 sessions moved: ${day3Fixed}`);

    // Verify distribution
    console.log('\n📅 Final Session Distribution:');

    const allSessions = await prisma.session.findMany({
      select: { startTime: true, title: true }
    });

    const distribution = new Map<string, number>();
    allSessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      distribution.set(date, (distribution.get(date) || 0) + 1);
    });

    const dates = [
      { date: '2025-10-14', label: 'Day 1 (Tuesday)' },
      { date: '2025-10-15', label: 'Day 2 (Wednesday)' },
      { date: '2025-10-16', label: 'Day 3 (Thursday)' }
    ];

    dates.forEach(({ date, label }) => {
      const count = distribution.get(date) || 0;
      console.log(`${label}: ${count} sessions`);
    });

    // Check specific badge pickup sessions
    console.log('\n🎫 Badge Pickup Sessions Check:');

    const badgePickupSessions = await prisma.session.findMany({
      where: {
        title: { contains: 'Badge Pickup' }
      },
      select: {
        title: true,
        startTime: true
      }
    });

    badgePickupSessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      const dayOfWeek = new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`  - "${session.title}" is on ${date} (${dayOfWeek})`);
    });

    console.log('\n✨ Day-specific session fixes completed!');

  } catch (error) {
    console.error('Error fixing sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDaySpecificSessions();