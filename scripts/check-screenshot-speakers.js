const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScreenshotSpeakers() {
  try {
    // Check speakers that appear to have issues in the screenshot
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Ali' } },
          { name: { contains: 'Adrian' } },
          { name: { contains: 'Andrea' } },
          { name: { contains: 'Agim' } },
          { name: { contains: 'Javier' } },
          { name: { contains: 'Sandeep' } }
        ]
      },
      orderBy: { name: 'asc' }
    });
    
    console.log('=== Speakers from Screenshot ===');
    speakers.forEach(s => {
      console.log(`Name: "${s.name}"`);
      console.log(`  Role: "${s.role}"`);
      console.log(`  Company: "${s.company}"`);
      
      // Check if this still has issues
      if (s.role && /^[A-Z][a-z]+[A-Z]/.test(s.role)) {
        console.log(`  ⚠️  ISSUE: Role still has concatenated text`);
      }
      if (s.company && s.company.includes(s.role)) {
        console.log(`  ⚠️  ISSUE: Company contains role text`);
      }
      console.log('---');
    });
    
    // Revert the bad fixes
    const revertFixes = [
      {
        currentName: 'Javier Met',
        correctName: 'Javier',
        correctRole: 'SVP',
        correctCompany: 'MetLife Xcelerator'
      },
      {
        currentName: 'Sandeep Intellect',
        correctName: 'Sandeep',
        correctRole: 'EVP and Insurance Business Head',
        correctCompany: 'IntellectAI'
      }
    ];
    
    for (const fix of revertFixes) {
      const speaker = await prisma.speaker.findFirst({
        where: { name: fix.currentName }
      });
      
      if (speaker) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: {
            name: fix.correctName,
            role: fix.correctRole,
            company: fix.correctCompany
          }
        });
        console.log(`\n✅ Reverted: "${fix.currentName}" back to "${fix.correctName}"`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScreenshotSpeakers();