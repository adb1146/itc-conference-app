import prisma from '@/lib/db';
import { formatSessionTime } from '@/lib/utils/format-time';

async function checkSessionTime() {
  const session = await prisma.session.findFirst({
    where: {
      title: {
        contains: 'Great Convergence'
      }
    },
    select: {
      title: true,
      startTime: true,
      endTime: true
    }
  });

  if (session) {
    console.log('\n=== Session Time Check ===');
    console.log('Session:', session.title);
    console.log('Start Time (raw from DB):', session.startTime);
    console.log('End Time (raw from DB):', session.endTime);

    // Show what the time should display as using our format function
    console.log('\n=== Display Times (Las Vegas) ===');
    console.log('Start Time Display:', formatSessionTime(session.startTime));
    console.log('End Time Display:', formatSessionTime(session.endTime));

    // Also show manual calculation for verification
    const start = new Date(session.startTime);
    const hours = start.getUTCHours();
    const minutes = start.getUTCMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    console.log('\n=== Manual Verification ===');
    console.log('UTC Hours:', hours);
    console.log('UTC Minutes:', minutes);
    console.log('Formatted:', `${displayHours}:${displayMinutes} ${period}`);
  } else {
    console.log('Session not found');
  }

  await prisma.$disconnect();
}

checkSessionTime();