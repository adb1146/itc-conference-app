const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProblematicSpeakers() {
  try {
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: 'Abhi' },
          { name: 'Adarsh' },
          { name: 'Adrian' },
          { name: 'Alessandra' },
          { name: 'Adobe' }
        ]
      }
    });
    
    console.log('=== Speakers with potential surname in role ===');
    speakers.forEach(s => {
      console.log(`Name: "${s.name}"`);
      console.log(`  Role: "${s.role}"`);
      console.log(`  Company: "${s.company}"`);
      console.log('---');
    });
    
    // Check all speakers with single word names
    const singleNameSpeakers = await prisma.speaker.findMany({
      where: {
        NOT: {
          name: {
            contains: ' '
          }
        }
      },
      take: 20
    });
    
    console.log('\n=== All single-word name speakers (first 20) ===');
    singleNameSpeakers.forEach(s => {
      if (s.role && /^[A-Z][a-z]+[A-Z]/.test(s.role)) {
        console.log(`Name: "${s.name}" | Role: "${s.role}"`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProblematicSpeakers();