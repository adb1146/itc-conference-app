const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessionDistribution() {
  console.log('=== CHECKING SESSION DISTRIBUTION ===\n');
  
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
  
  console.log('Current distribution:');
  console.log(`  Day 1 - October 15, 2025 (Wednesday): ${oct15Count} sessions`);
  console.log(`  Day 2 - October 16, 2025 (Thursday): ${oct16Count} sessions`);
  console.log(`  Day 3 - October 17, 2025 (Friday): ${oct17Count} sessions`);
  console.log(`  Total: ${oct15Count + oct16Count + oct17Count} sessions\n`);
  
  // Check sessions with day3 tag
  const day3Tagged = await prisma.session.findMany({
    where: {
      tags: {
        has: 'day3'
      }
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      tags: true
    }
  });
  
  console.log(`Found ${day3Tagged.length} sessions tagged as 'day3'`);
  
  if (day3Tagged.length > 0) {
    // Group by actual date
    const dateGroups = {};
    day3Tagged.forEach(s => {
      const date = new Date(s.startTime).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(s);
    });
    
    console.log('\nDay 3 tagged sessions by date:');
    Object.keys(dateGroups).forEach(date => {
      console.log(`  ${date}: ${dateGroups[date].length} sessions`);
      if (dateGroups[date].length <= 3) {
        dateGroups[date].forEach(s => {
          console.log(`    - "${s.title}"`);
        });
      }
    });
    
    // Check if Day 3 sessions are on wrong date
    const wrongDateSessions = day3Tagged.filter(s => {
      const date = new Date(s.startTime);
      return date < new Date('2025-10-17T00:00:00Z') || date >= new Date('2025-10-18T00:00:00Z');
    });
    
    if (wrongDateSessions.length > 0) {
      console.log(`\n⚠️ FOUND ${wrongDateSessions.length} Day 3 sessions on WRONG DATE!`);
      console.log('These sessions are tagged as day3 but are not on October 17.');
      console.log('They need to be moved to October 17, 2025.\n');
      
      // Show a few examples
      wrongDateSessions.slice(0, 3).forEach(s => {
        const date = new Date(s.startTime);
        console.log(`  - "${s.title}"`);
        console.log(`    Current date: ${date.toLocaleDateString('en-US')}`);
        console.log(`    Should be: October 17, 2025`);
      });
    }
  }
  
  await prisma.$disconnect();
}

checkSessionDistribution().catch(console.error);