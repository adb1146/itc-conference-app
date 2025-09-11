const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDay3Dates() {
  console.log('=== FIXING DAY 3 DATES ===\n');
  console.log('Day 3 sessions are currently on October 16 (Day 2)');
  console.log('They should be on October 17 (Day 3)\n');
  
  try {
    // Find all sessions tagged as day3 that are NOT on October 17
    const day3Sessions = await prisma.session.findMany({
      where: {
        AND: [
          {
            tags: {
              has: 'day3'
            }
          },
          {
            OR: [
              {
                startTime: {
                  lt: new Date('2025-10-17T00:00:00Z')
                }
              },
              {
                startTime: {
                  gte: new Date('2025-10-18T00:00:00Z')
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        tags: true
      }
    });
    
    console.log(`Found ${day3Sessions.length} Day 3 sessions on wrong date\n`);
    
    if (day3Sessions.length === 0) {
      console.log('No sessions to fix!');
      await prisma.$disconnect();
      return;
    }
    
    // Show sample of what will be changed
    console.log('Sample sessions to be moved:');
    day3Sessions.slice(0, 3).forEach(s => {
      const oldDate = new Date(s.startTime);
      console.log(`  - "${s.title}"`);
      console.log(`    Current: ${oldDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
      console.log(`    Will be: Friday, October 17, 2025`);
    });
    
    console.log('\nProceeding with date fix...\n');
    
    // Update each session to be on October 17
    let updateCount = 0;
    for (const session of day3Sessions) {
      const oldStartTime = new Date(session.startTime);
      const oldEndTime = new Date(session.endTime);
      
      // Calculate the time of day
      const startHours = oldStartTime.getUTCHours();
      const startMinutes = oldStartTime.getUTCMinutes();
      const endHours = oldEndTime.getUTCHours();
      const endMinutes = oldEndTime.getUTCMinutes();
      
      // Create new dates on October 17 with same time
      const newStartTime = new Date('2025-10-17T00:00:00Z');
      newStartTime.setUTCHours(startHours, startMinutes, 0, 0);
      
      const newEndTime = new Date('2025-10-17T00:00:00Z');
      newEndTime.setUTCHours(endHours, endMinutes, 0, 0);
      
      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime
        }
      });
      
      updateCount++;
      if (updateCount % 10 === 0) {
        console.log(`  Updated ${updateCount} sessions...`);
      }
    }
    
    console.log(`\n✅ Successfully moved ${updateCount} Day 3 sessions to October 17`);
    
    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    
    // Count sessions per day
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
    
    console.log('Sessions per day after fix:');
    console.log(`  October 15, 2025 (Wednesday - Day 1): ${oct15Count} sessions`);
    console.log(`  October 16, 2025 (Thursday - Day 2): ${oct16Count} sessions`);
    console.log(`  October 17, 2025 (Friday - Day 3): ${oct17Count} sessions`);
    console.log(`  Total: ${oct15Count + oct16Count + oct17Count} sessions`);
    
    // Verify day3 tagged sessions are now on correct date
    const day3OnCorrectDate = await prisma.session.count({
      where: {
        AND: [
          {
            tags: {
              has: 'day3'
            }
          },
          {
            startTime: {
              gte: new Date('2025-10-17T00:00:00Z'),
              lt: new Date('2025-10-18T00:00:00Z')
            }
          }
        ]
      }
    });
    
    const totalDay3 = await prisma.session.count({
      where: {
        tags: {
          has: 'day3'
        }
      }
    });
    
    console.log(`\nDay 3 tag verification:`);
    console.log(`  Total sessions tagged as day3: ${totalDay3}`);
    console.log(`  Day3 sessions on October 17: ${day3OnCorrectDate}`);
    
    if (day3OnCorrectDate === totalDay3) {
      console.log('\n✅ All Day 3 sessions are now on the correct date!');
    } else {
      console.log('\n⚠️ Some Day 3 sessions may still be on wrong dates. Please review.');
    }
    
  } catch (error) {
    console.error('Error fixing dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDay3Dates().catch(console.error);