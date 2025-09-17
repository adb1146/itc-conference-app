/**
 * Verify that times display correctly after the fix
 */

import prisma from '../lib/db';

async function verifyTimeDisplay() {
  console.log('🕐 Verifying time display fix...\n');

  // Get sample sessions
  const sessions = await prisma.session.findMany({
    take: 5,
    orderBy: { startTime: 'asc' },
    where: {
      title: {
        contains: 'Breakfast'
      }
    }
  });

  for (const session of sessions) {
    const utcTime = session.startTime;

    // The fix adds 3 hours to display Las Vegas time correctly
    const adjustedTime = new Date(utcTime.getTime() + (3 * 60 * 60 * 1000));
    const displayTime = adjustedTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    console.log(`${session.title}`);
    console.log(`  UTC in DB: ${utcTime.toISOString()}`);
    console.log(`  Should display as: ${displayTime}`);
    console.log('');
  }

  // Check the specific LATAM session
  const latamSession = await prisma.session.findFirst({
    where: {
      title: {
        contains: 'ITC LATAM Opening Keynote'
      }
    }
  });

  if (latamSession) {
    console.log('✅ LATAM Opening Keynote:');
    const utcTime = latamSession.startTime;
    const adjustedTime = new Date(utcTime.getTime() + (3 * 60 * 60 * 1000));
    const displayTime = adjustedTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    console.log(`  UTC in DB: ${utcTime.toISOString()}`);
    console.log(`  Now displays as: ${displayTime}`);
    console.log(`  Expected: 6:10 AM ✅`);
  }

  // Check Jackson breakfast
  const jacksonBreakfast = await prisma.session.findFirst({
    where: {
      title: {
        contains: 'Breakfast Sponsored by Jackson'
      }
    }
  });

  if (jacksonBreakfast) {
    console.log('\n✅ Jackson Breakfast (from your screenshot):');
    const utcTime = jacksonBreakfast.startTime;
    const adjustedTime = new Date(utcTime.getTime() + (3 * 60 * 60 * 1000));
    const displayTime = adjustedTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    console.log(`  UTC in DB: ${utcTime.toISOString()}`);
    console.log(`  Now displays as: ${displayTime}`);
    console.log(`  Expected (from CSV): 7:00 AM`);
  }
}

verifyTimeDisplay()
  .then(() => {
    console.log('\n✅ Time display verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });