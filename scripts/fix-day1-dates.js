const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDay1Dates() {
  console.log('=== FIXING DAY 1 DATES ===\n');
  console.log('Day 1 sessions are currently on October 14 (Monday)');
  console.log('They should be on October 15 (Tuesday)\n');
  
  try {
    // Find all sessions on October 14, 2025 (the incorrect date)
    const oct14Sessions = await prisma.session.findMany({
      where: {
        AND: [
          {
            startTime: {
              gte: new Date('2025-10-14T00:00:00Z'),
              lt: new Date('2025-10-15T00:00:00Z')
            }
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
    
    console.log(`Found ${oct14Sessions.length} sessions on October 14 that need to be moved to October 15\n`);
    
    if (oct14Sessions.length === 0) {
      console.log('No sessions to fix!');
      await prisma.$disconnect();
      return;
    }
    
    // Show sample of what will be changed
    console.log('Sample sessions to be updated:');
    oct14Sessions.slice(0, 3).forEach(s => {
      const oldDate = new Date(s.startTime);
      console.log(`  - "${s.title}"`);
      console.log(`    Current: ${oldDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
      console.log(`    Will be: Tuesday, October 15, 2025`);
    });
    
    console.log('\nProceeding with date fix...\n');
    
    // Update each session to be one day later
    let updateCount = 0;
    for (const session of oct14Sessions) {
      const newStartTime = new Date(session.startTime);
      const newEndTime = new Date(session.endTime);
      
      // Add one day (24 hours in milliseconds)
      newStartTime.setTime(newStartTime.getTime() + (24 * 60 * 60 * 1000));
      newEndTime.setTime(newEndTime.getTime() + (24 * 60 * 60 * 1000));
      
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
    
    console.log(`\n✅ Successfully updated ${updateCount} sessions from October 14 to October 15`);
    
    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    
    // Check if any sessions remain on Oct 14
    const remainingOct14 = await prisma.session.count({
      where: {
        startTime: {
          gte: new Date('2025-10-14T00:00:00Z'),
          lt: new Date('2025-10-15T00:00:00Z')
        }
      }
    });
    
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
    console.log(`  October 14 (Monday): ${remainingOct14} sessions ${remainingOct14 === 0 ? '✓' : '❌ STILL HAS SESSIONS!'}`);
    console.log(`  October 15 (Tuesday - Day 1): ${oct15Count} sessions`);
    console.log(`  October 16 (Wednesday - Day 2): ${oct16Count} sessions`);
    console.log(`  October 17 (Thursday - Day 3): ${oct17Count} sessions`);
    
    if (remainingOct14 === 0 && oct15Count > 0 && oct16Count > 0 && oct17Count > 0) {
      console.log('\n✅ All dates are now correct! ITC Vegas 2025 runs October 15-17 as expected.');
    } else {
      console.log('\n⚠️ Something may still be wrong with the dates. Please review.');
    }
    
  } catch (error) {
    console.error('Error fixing dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDay1Dates().catch(console.error);