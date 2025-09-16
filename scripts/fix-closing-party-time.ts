import prisma from '../lib/db';

async function fixClosingPartyTime() {
  try {
    // Find the closing party
    const closingParty = await prisma.session.findFirst({
      where: {
        title: { contains: 'ITC Vegas Official Closing Party' }
      }
    });

    if (!closingParty) {
      console.log('Closing party not found!');
      return;
    }

    console.log('Found closing party:', closingParty.title);
    console.log('Current time:', new Date(closingParty.startTime).toLocaleString());

    // Update to Thursday evening at 7:00 PM
    const updatedSession = await prisma.session.update({
      where: {
        id: closingParty.id
      },
      data: {
        startTime: new Date('2025-10-16T19:00:00'), // 7:00 PM
        endTime: new Date('2025-10-16T23:00:00')    // 11:00 PM
      }
    });

    console.log('\n✅ Updated closing party time!');
    console.log('New start time:', new Date(updatedSession.startTime).toLocaleString());
    console.log('New end time:', new Date(updatedSession.endTime).toLocaleString());

  } catch (error) {
    console.error('Error updating closing party time:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClosingPartyTime();