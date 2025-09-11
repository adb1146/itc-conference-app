const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllDayAssignments() {
  console.log('=== FIXING ALL DAY ASSIGNMENTS ===\n');
  console.log('Correct conference dates:');
  console.log('  Day 1: October 15, 2025 (Wednesday)');
  console.log('  Day 2: October 16, 2025 (Thursday)');
  console.log('  Day 3: October 17, 2025 (Friday)\n');
  
  try {
    // Get all sessions
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        title: true,
        tags: true,
        startTime: true,
        endTime: true
      }
    });
    
    console.log(`Total sessions: ${sessions.length}\n`);
    
    // Count sessions by day tag
    const tagCounts = { day1: 0, day2: 0, day3: 0, none: 0 };
    sessions.forEach(s => {
      if (s.tags.includes('day1')) tagCounts.day1++;
      else if (s.tags.includes('day2')) tagCounts.day2++;
      else if (s.tags.includes('day3')) tagCounts.day3++;
      else tagCounts.none++;
    });
    
    console.log('Sessions by tag:');
    console.log(`  day1: ${tagCounts.day1}`);
    console.log(`  day2: ${tagCounts.day2}`);
    console.log(`  day3: ${tagCounts.day3}`);
    console.log(`  no day tag: ${tagCounts.none}\n`);
    
    // Fix Day 2 sessions
    console.log('Looking for Day 2 sessions...');
    
    // Find sessions tagged as day2
    const day2Sessions = await prisma.session.findMany({
      where: {
        tags: {
          has: 'day2'
        }
      }
    });
    
    if (day2Sessions.length === 0) {
      console.log('⚠️ No sessions tagged as day2 found!');
      console.log('This explains why Day 2 (Oct 16) has no sessions.\n');
      
      // Look for sessions that should be on Day 2 based on original data
      // Sessions between Day 1 and Day 3 sessions by time
      const allSessionsSorted = await prisma.session.findMany({
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          title: true,
          tags: true,
          startTime: true
        }
      });
      
      // Find the gap between day1 and day3 sessions
      let lastDay1Index = -1;
      let firstDay3Index = sessions.length;
      
      for (let i = 0; i < allSessionsSorted.length; i++) {
        if (allSessionsSorted[i].tags.includes('day1')) {
          lastDay1Index = i;
        }
        if (allSessionsSorted[i].tags.includes('day3') && firstDay3Index === sessions.length) {
          firstDay3Index = i;
        }
      }
      
      console.log(`Based on session order:`);
      console.log(`  Last day1 session index: ${lastDay1Index}`);
      console.log(`  First day3 session index: ${firstDay3Index}`);
      
      // The sessions between should be day2
      if (firstDay3Index - lastDay1Index > 1) {
        const probableDay2Sessions = allSessionsSorted.slice(lastDay1Index + 1, firstDay3Index);
        console.log(`\nFound ${probableDay2Sessions.length} sessions between day1 and day3 that should be day2`);
        
        if (probableDay2Sessions.length > 0) {
          console.log('Adding day2 tag to these sessions and moving to Oct 16...\n');
          
          let updateCount = 0;
          for (const session of probableDay2Sessions) {
            // Add day2 tag if not present
            const newTags = [...session.tags];
            if (!newTags.includes('day2')) {
              newTags.push('day2');
            }
            
            // Set date to October 16
            const oldStartTime = new Date(session.startTime);
            const startHours = oldStartTime.getUTCHours();
            const startMinutes = oldStartTime.getUTCMinutes();
            
            const newStartTime = new Date('2025-10-16T00:00:00Z');
            newStartTime.setUTCHours(startHours, startMinutes, 0, 0);
            
            // Calculate end time (assuming same duration)
            const duration = new Date(session.endTime || session.startTime).getTime() - oldStartTime.getTime();
            const newEndTime = new Date(newStartTime.getTime() + duration);
            
            await prisma.session.update({
              where: { id: session.id },
              data: {
                tags: newTags,
                startTime: newStartTime,
                endTime: newEndTime
              }
            });
            
            updateCount++;
            if (updateCount % 10 === 0) {
              console.log(`  Updated ${updateCount} sessions...`);
            }
          }
          
          console.log(`\n✅ Added day2 tag and moved ${updateCount} sessions to October 16`);
        }
      }
    } else {
      console.log(`Found ${day2Sessions.length} sessions already tagged as day2`);
      
      // Make sure they're on October 16
      let movedCount = 0;
      for (const session of day2Sessions) {
        const currentDate = new Date(session.startTime);
        if (currentDate < new Date('2025-10-16T00:00:00Z') || currentDate >= new Date('2025-10-17T00:00:00Z')) {
          const startHours = currentDate.getUTCHours();
          const startMinutes = currentDate.getUTCMinutes();
          
          const newStartTime = new Date('2025-10-16T00:00:00Z');
          newStartTime.setUTCHours(startHours, startMinutes, 0, 0);
          
          const duration = new Date(session.endTime).getTime() - currentDate.getTime();
          const newEndTime = new Date(newStartTime.getTime() + duration);
          
          await prisma.session.update({
            where: { id: session.id },
            data: {
              startTime: newStartTime,
              endTime: newEndTime
            }
          });
          movedCount++;
        }
      }
      
      if (movedCount > 0) {
        console.log(`✅ Moved ${movedCount} day2 sessions to October 16`);
      }
    }
    
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
    
    console.log('Sessions per day:');
    console.log(`  Day 1 - October 15, 2025: ${oct15Count} sessions`);
    console.log(`  Day 2 - October 16, 2025: ${oct16Count} sessions`);
    console.log(`  Day 3 - October 17, 2025: ${oct17Count} sessions`);
    console.log(`  Total: ${oct15Count + oct16Count + oct17Count} sessions`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllDayAssignments().catch(console.error);