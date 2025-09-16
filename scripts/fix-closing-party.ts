import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixClosingParty() {
  try {
    console.log('🎉 Fixing Closing Party Date');
    console.log('=============================\n');

    // Find the closing party
    const closingParty = await prisma.session.findFirst({
      where: {
        OR: [
          { title: { contains: 'closing party', mode: 'insensitive' } },
          { title: { contains: 'goo goo dolls', mode: 'insensitive' } }
        ]
      }
    });

    if (closingParty) {
      const currentDate = new Date(closingParty.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      console.log(`Found: ${closingParty.title}`);
      console.log(`Current Date: ${currentDateStr}`);
      console.log(`Current Time: ${currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);

      // Fix to Oct 16 (Thursday) - Day 3
      const hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();

      // Create new date for Oct 16, 2025 with same time
      const newStart = new Date(2025, 9, 16, hours, minutes, 0, 0); // Month is 0-indexed, so 9 = October

      // Calculate duration of event
      const duration = new Date(closingParty.endTime).getTime() - new Date(closingParty.startTime).getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      console.log(`\nMoving to: 2025-10-16 (Thursday)`);
      console.log(`New Start: ${newStart.toISOString()}`);
      console.log(`New End: ${newEnd.toISOString()}`);

      await prisma.session.update({
        where: { id: closingParty.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      console.log('\n✅ Successfully moved closing party to Thursday, October 16, 2025 (Day 3)');

      // Verify the fix
      const updated = await prisma.session.findUnique({
        where: { id: closingParty.id }
      });

      if (updated) {
        const verifyDate = new Date(updated.startTime).toISOString().split('T')[0];
        const dayOfWeek = new Date(updated.startTime).toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`\nVerification: Event is now on ${verifyDate} (${dayOfWeek})`);
      }
    } else {
      console.log('❌ Could not find closing party event');
    }

  } catch (error) {
    console.error('Error fixing closing party:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClosingParty();