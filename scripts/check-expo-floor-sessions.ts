import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExpoFloorSessions() {
  try {
    console.log('🔍 Checking Expo Floor and Day-specific Sessions');
    console.log('=================================================\n');

    // Find ALL Expo Floor sessions
    const expoSessions = await prisma.session.findMany({
      where: {
        title: { contains: 'Expo Floor' }
      },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    console.log(`Found ${expoSessions.length} Expo Floor sessions:\n`);

    expoSessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      let expectedDay = '';
      if (session.title.includes('(Day 3)')) {
        expectedDay = '2025-10-16 (Thursday)';
      } else if (session.title.includes('(Day 2)')) {
        expectedDay = '2025-10-15 (Wednesday)';
      } else if (session.title.includes('(Day 1)') || !session.title.includes('Day')) {
        expectedDay = '2025-10-14 (Tuesday)';
      }

      const isCorrect =
        (session.title.includes('(Day 3)') && dateStr === '2025-10-16') ||
        (session.title.includes('(Day 2)') && dateStr === '2025-10-15') ||
        (!session.title.includes('(Day 2)') && !session.title.includes('(Day 3)') && dateStr === '2025-10-14');

      const status = isCorrect ? '✅' : '❌';

      console.log(`${status} "${session.title}"`);
      console.log(`   Current: ${dateStr} (${dayOfWeek})`);
      console.log(`   Expected: ${expectedDay}`);
      console.log(`   ID: ${session.id}\n`);
    });

    // Check ALL sessions that have Day 2 or Day 3 in the title
    console.log('📅 Checking ALL Day 2 and Day 3 sessions:\n');

    const day2Sessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: '(Day 2)' } },
          { title: { contains: 'Day 2' } }
        ]
      },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    const day3Sessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: '(Day 3)' } },
          { title: { contains: 'Day 3' } }
        ]
      },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    console.log('Day 2 Sessions (should be on Oct 15):\n');
    day2Sessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateStr = date.toISOString().split('T')[0];
      const isCorrect = dateStr === '2025-10-15';
      const status = isCorrect ? '✅' : '❌ NEEDS FIX';

      console.log(`${status} "${session.title}"`);
      console.log(`   Current date: ${dateStr}`);
      if (!isCorrect) {
        console.log(`   ID: ${session.id}`);
      }
      console.log('');
    });

    console.log('Day 3 Sessions (should be on Oct 16):\n');
    day3Sessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateStr = date.toISOString().split('T')[0];
      const isCorrect = dateStr === '2025-10-16';
      const status = isCorrect ? '✅' : '❌ NEEDS FIX';

      console.log(`${status} "${session.title}"`);
      console.log(`   Current date: ${dateStr}`);
      if (!isCorrect) {
        console.log(`   ID: ${session.id}`);
      }
      console.log('');
    });

    // Check sessions on Oct 14 that shouldn't be there
    console.log('🔍 Sessions on Oct 14 (Day 1) that might be misplaced:\n');

    const oct14Sessions = await prisma.session.findMany({
      where: {
        AND: [
          { startTime: { gte: new Date('2025-10-14T00:00:00Z') } },
          { startTime: { lt: new Date('2025-10-14T23:59:59Z') } },
          {
            OR: [
              { title: { contains: '(Day 2)' } },
              { title: { contains: '(Day 3)' } },
              { title: { contains: 'Day 2' } },
              { title: { contains: 'Day 3' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    if (oct14Sessions.length > 0) {
      console.log(`❌ Found ${oct14Sessions.length} misplaced sessions on Day 1:\n`);
      oct14Sessions.forEach(session => {
        console.log(`  - "${session.title}"`);
        console.log(`    ID: ${session.id}`);
      });
    } else {
      console.log('✅ No misplaced Day 2/3 sessions found on Day 1');
    }

  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExpoFloorSessions();