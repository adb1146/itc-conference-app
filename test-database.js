const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection and data...\n');
    
    // Get session count
    const sessionCount = await prisma.session.count();
    console.log(`Total sessions in database: ${sessionCount}`);
    
    // Get speaker count
    const speakerCount = await prisma.speaker.count();
    console.log(`Total speakers in database: ${speakerCount}`);
    
    // Get first 5 sessions with details
    console.log('\n--- First 5 Sessions ---');
    const sessions = await prisma.session.findMany({
      take: 5,
      orderBy: { startTime: 'asc' },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
    
    sessions.forEach(session => {
      console.log(`\nTitle: ${session.title}`);
      console.log(`Time: ${session.startTime.toLocaleString()} - ${session.endTime.toLocaleString()}`);
      console.log(`Location: ${session.location}`);
      console.log(`Track: ${session.track || 'N/A'}`);
      console.log(`Description: ${session.description.substring(0, 100)}...`);
      if (session.speakers.length > 0) {
        console.log(`Speakers: ${session.speakers.map(s => s.speaker.name).join(', ')}`);
      }
    });
    
    // Get sessions by track
    console.log('\n--- Sessions by Track ---');
    const tracks = await prisma.session.groupBy({
      by: ['track'],
      _count: true,
      orderBy: {
        _count: {
          track: 'desc'
        }
      }
    });
    
    tracks.forEach(track => {
      console.log(`${track.track || 'No Track'}: ${track._count} sessions`);
    });
    
    // Get sessions for Day 1 (October 14)
    console.log('\n--- Day 1 Sessions (Oct 14) ---');
    const day1Sessions = await prisma.session.count({
      where: {
        startTime: {
          gte: new Date('2025-10-14T00:00:00'),
          lt: new Date('2025-10-15T00:00:00')
        }
      }
    });
    console.log(`Day 1 sessions: ${day1Sessions}`);
    
    // Get sessions for Day 2 (October 15)
    const day2Sessions = await prisma.session.count({
      where: {
        startTime: {
          gte: new Date('2025-10-15T00:00:00'),
          lt: new Date('2025-10-16T00:00:00')
        }
      }
    });
    console.log(`Day 2 sessions: ${day2Sessions}`);
    
    // Get sessions for Day 3 (October 16)
    const day3Sessions = await prisma.session.count({
      where: {
        startTime: {
          gte: new Date('2025-10-16T00:00:00'),
          lt: new Date('2025-10-17T00:00:00')
        }
      }
    });
    console.log(`Day 3 sessions: ${day3Sessions}`);
    
  } catch (error) {
    console.error('Error testing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();