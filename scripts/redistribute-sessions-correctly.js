const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function redistributeSessionsCorrectly() {
  console.log('=== REDISTRIBUTING SESSIONS TO CORRECT DATES ===\n');
  console.log('Target distribution:');
  console.log('  Day 1 (Oct 15): Sessions tagged as day1');
  console.log('  Day 2 (Oct 16): Sessions tagged as day2');
  console.log('  Day 3 (Oct 17): Sessions tagged as day3\n');
  
  try {
    // Process Day 1 sessions
    console.log('Processing Day 1 sessions...');
    const day1Sessions = await prisma.session.findMany({
      where: {
        tags: {
          has: 'day1'
        }
      }
    });
    
    let day1Fixed = 0;
    for (const session of day1Sessions) {
      const currentDate = new Date(session.startTime);
      
      // If not on Oct 15, move it there
      if (currentDate < new Date('2025-10-15T00:00:00Z') || currentDate >= new Date('2025-10-16T00:00:00Z')) {
        const hours = currentDate.getUTCHours();
        const minutes = currentDate.getUTCMinutes();
        
        const newStartTime = new Date('2025-10-15T00:00:00Z');
        newStartTime.setUTCHours(hours, minutes, 0, 0);
        
        const duration = new Date(session.endTime).getTime() - currentDate.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        });
        day1Fixed++;
      }
    }
    console.log(`  Moved ${day1Fixed} day1 sessions to October 15`);
    
    // Process Day 2 sessions
    console.log('\nProcessing Day 2 sessions...');
    const day2Sessions = await prisma.session.findMany({
      where: {
        tags: {
          has: 'day2'
        }
      }
    });
    
    let day2Fixed = 0;
    for (const session of day2Sessions) {
      const currentDate = new Date(session.startTime);
      
      // If not on Oct 16, move it there
      if (currentDate < new Date('2025-10-16T00:00:00Z') || currentDate >= new Date('2025-10-17T00:00:00Z')) {
        const hours = currentDate.getUTCHours();
        const minutes = currentDate.getUTCMinutes();
        
        const newStartTime = new Date('2025-10-16T00:00:00Z');
        newStartTime.setUTCHours(hours, minutes, 0, 0);
        
        const duration = new Date(session.endTime).getTime() - currentDate.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        });
        day2Fixed++;
      }
    }
    console.log(`  Moved ${day2Fixed} day2 sessions to October 16`);
    
    // Process Day 3 sessions
    console.log('\nProcessing Day 3 sessions...');
    const day3Sessions = await prisma.session.findMany({
      where: {
        tags: {
          has: 'day3'
        }
      }
    });
    
    let day3Fixed = 0;
    for (const session of day3Sessions) {
      const currentDate = new Date(session.startTime);
      
      // If not on Oct 17, move it there
      if (currentDate < new Date('2025-10-17T00:00:00Z') || currentDate >= new Date('2025-10-18T00:00:00Z')) {
        const hours = currentDate.getUTCHours();
        const minutes = currentDate.getUTCMinutes();
        
        const newStartTime = new Date('2025-10-17T00:00:00Z');
        newStartTime.setUTCHours(hours, minutes, 0, 0);
        
        const duration = new Date(session.endTime).getTime() - currentDate.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        await prisma.session.update({
          where: { id: session.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        });
        day3Fixed++;
      }
    }
    console.log(`  Moved ${day3Fixed} day3 sessions to October 17`);
    
    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    
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
    
    // Count by tags
    const day1TagCount = await prisma.session.count({
      where: { tags: { has: 'day1' } }
    });
    
    const day2TagCount = await prisma.session.count({
      where: { tags: { has: 'day2' } }
    });
    
    const day3TagCount = await prisma.session.count({
      where: { tags: { has: 'day3' } }
    });
    
    console.log('Sessions per date:');
    console.log(`  October 15, 2025 (Day 1): ${oct15Count} sessions`);
    console.log(`  October 16, 2025 (Day 2): ${oct16Count} sessions`);
    console.log(`  October 17, 2025 (Day 3): ${oct17Count} sessions`);
    console.log(`  Total: ${oct15Count + oct16Count + oct17Count} sessions\n`);
    
    console.log('Sessions per tag:');
    console.log(`  day1 tag: ${day1TagCount} sessions`);
    console.log(`  day2 tag: ${day2TagCount} sessions`);
    console.log(`  day3 tag: ${day3TagCount} sessions\n`);
    
    if (oct15Count === day1TagCount && oct16Count === day2TagCount && oct17Count === day3TagCount) {
      console.log('✅ SUCCESS! All sessions are now on their correct dates matching their tags.');
    } else {
      console.log('⚠️ Mismatch between dates and tags. Please investigate further.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

redistributeSessionsCorrectly().catch(console.error);