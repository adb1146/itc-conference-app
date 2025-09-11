const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpeakers() {
  try {
    // Check speakers with VP roles or Dan/Donovan names
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Dan' } },
          { name: { contains: 'Donovan' } },
          { role: { contains: 'VP' } }
        ]
      },
      take: 20,
      orderBy: { name: 'asc' }
    });
    
    console.log('=== Speakers with VP roles or Dan/Donovan names ===');
    speakers.forEach(s => {
      console.log(`${s.name} - ${s.role} @ ${s.company}`);
    });
    
    console.log('\n=== Total Speakers ===');
    const total = await prisma.speaker.count();
    console.log(`Total speakers in database: ${total}`);
    
  } catch (error) {
    console.error('Error checking speakers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpeakers();