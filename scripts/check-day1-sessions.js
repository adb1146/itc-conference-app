const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay1Sessions() {
  console.log('=== CHECKING DAY 1 SESSIONS ===\n');
  
  // Get all sessions
  const allSessions = await prisma.session.count();
  console.log(`Total sessions in database: ${allSessions}\n`);
  
  // Count sessions by date
  const oct15Count = await prisma.session.count({
    where: {
      startTime: {
        gte: new Date('2025-10-15T00:00:00Z'),
        lt: new Date('2025-10-16T00:00:00Z')
      }
    }
  });
  
  const oct16Count = await prisma.session.count({
    where: {
      startTime: {
        gte: new Date('2025-10-16T00:00:00Z'),
        lt: new Date('2025-10-17T00:00:00Z')
      }
    }
  });
  
  const oct17Count = await prisma.session.count({
    where: {
      startTime: {
        gte: new Date('2025-10-17T00:00:00Z'),
        lt: new Date('2025-10-18T00:00:00Z')
      }
    }
  });
  
  console.log('Sessions by date:');
  console.log(`  October 15, 2025 (Tuesday - Day 1): ${oct15Count} sessions`);
  console.log(`  October 16, 2025 (Wednesday - Day 2): ${oct16Count} sessions`);
  console.log(`  October 17, 2025 (Thursday - Day 3): ${oct17Count} sessions\n`);
  
  // Get sessions with day1 tag
  const day1Tagged = await prisma.session.findMany({
    where: {
      tags: {
        has: 'day1'
      }
    },
    select: {
      title: true,
      startTime: true,
      location: true
    },
    take: 10
  });
  
  console.log(`Sessions tagged as 'day1': ${day1Tagged.length}`);
  if (day1Tagged.length > 0) {
    console.log('Sample Day 1 sessions:');
    day1Tagged.slice(0, 5).forEach(s => {
      const date = new Date(s.startTime);
      console.log(`  - "${s.title}"`);
      console.log(`    Date: ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
      console.log(`    Time: ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`    Location: ${s.location}`);
    });
  }
  
  // Check if Day 1 sessions are accessible
  const searchExample = await prisma.session.findMany({
    where: {
      OR: [
        { title: { contains: 'AI', mode: 'insensitive' } },
        { title: { contains: 'Underwriting', mode: 'insensitive' } }
      ],
      startTime: {
        gte: new Date('2025-10-15T00:00:00Z'),
        lt: new Date('2025-10-16T00:00:00Z')
      }
    },
    select: {
      title: true,
      startTime: true
    },
    take: 5
  });
  
  console.log(`\nSample search for AI/Underwriting sessions on Day 1:`);
  console.log(`Found ${searchExample.length} matching sessions`);
  searchExample.forEach(s => {
    console.log(`  - "${s.title}"`);
  });
  
  await prisma.$disconnect();
}

checkDay1Sessions().catch(console.error);