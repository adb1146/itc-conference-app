const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRemainingSpeakers() {
  try {
    // Specific fixes based on CSV data
    const manualFixes = [
      { currentName: 'Adarsh', newName: 'Adarsh Rachmale', role: 'CEO' }
    ];
    
    for (const fix of manualFixes) {
      const speaker = await prisma.speaker.findFirst({
        where: { name: fix.currentName }
      });
      
      if (speaker) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: {
            name: fix.newName,
            role: fix.role
          }
        });
        console.log(`Fixed: ${fix.currentName} -> ${fix.newName}`);
      }
    }
    
    // Check for any remaining single-word names (excluding companies)
    const singleNames = await prisma.speaker.findMany({
      where: {
        NOT: {
          OR: [
            { name: { contains: ' ' } },
            { name: 'Adobe' } // Adobe is a company, not a person
          ]
        }
      }
    });
    
    console.log('\n=== Remaining single-word names ===');
    console.log(`Found ${singleNames.length} speakers with single-word names`);
    
    if (singleNames.length > 0) {
      console.log('\nThese may need manual review:');
      singleNames.forEach(s => {
        console.log(`  Name: "${s.name}" | Role: "${s.role}" | Company: "${s.company}"`);
      });
    }
    
    // Final verification
    console.log('\n=== Verification Sample ===');
    const samples = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Adarsh' } },
          { name: { contains: 'Abhi' } },
          { name: { contains: 'Adrian' } },
          { name: { contains: 'Brad' } }
        ]
      }
    });
    
    samples.forEach(s => {
      console.log(`${s.name} - ${s.role} @ ${s.company}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingSpeakers();