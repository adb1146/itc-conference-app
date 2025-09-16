import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for Duplicate Sessions');
    console.log('===================================\n');

    // Get all sessions
    const sessions = await prisma.session.findMany({
      orderBy: { title: 'asc' }
    });

    // Group by title to find duplicates
    const titleGroups = new Map<string, typeof sessions>();

    sessions.forEach(session => {
      const existing = titleGroups.get(session.title) || [];
      existing.push(session);
      titleGroups.set(session.title, existing);
    });

    // Find titles with duplicates
    const duplicates = Array.from(titleGroups.entries()).filter(([_, sessions]) => sessions.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate sessions found!');
    } else {
      console.log(`❌ Found ${duplicates.length} titles with duplicates:\n`);

      duplicates.forEach(([title, sessions]) => {
        console.log(`📌 "${title}" - ${sessions.length} instances:`);
        sessions.forEach(session => {
          const date = new Date(session.startTime);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          console.log(`   - ID: ${session.id}`);
          console.log(`     Date: ${dateStr} at ${timeStr}`);
        });
        console.log('');
      });
    }

    // Specifically check for Expo Floor duplicates
    console.log('🎯 Specifically checking "Expo Floor Open" sessions:\n');

    const expoFloorSessions = await prisma.session.findMany({
      where: {
        title: { contains: 'Expo Floor Open' }
      },
      orderBy: { startTime: 'asc' }
    });

    expoFloorSessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      console.log(`📅 "${session.title}"`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Date: ${dateStr} (${dayOfWeek}) at ${timeStr}`);
      console.log('');
    });

    // Check for sessions on wrong days based on their title
    console.log('🔍 Checking for sessions on wrong days:\n');

    const oct14Sessions = await prisma.session.findMany({
      where: {
        AND: [
          { startTime: { gte: new Date('2025-10-14T00:00:00.000Z') } },
          { startTime: { lt: new Date('2025-10-15T00:00:00.000Z') } }
        ]
      }
    });

    const misplacedOnDay1 = oct14Sessions.filter(session =>
      session.title.includes('(Day 2)') || session.title.includes('(Day 3)')
    );

    if (misplacedOnDay1.length > 0) {
      console.log(`❌ Found ${misplacedOnDay1.length} misplaced sessions on Day 1:`);
      misplacedOnDay1.forEach(session => {
        console.log(`   - "${session.title}" (ID: ${session.id})`);
      });
    } else {
      console.log('✅ No misplaced Day 2/3 sessions on Day 1');
    }

  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();