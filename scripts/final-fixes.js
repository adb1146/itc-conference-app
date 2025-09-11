const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyFinalFixes() {
  try {
    const fixes = [
      {
        currentName: 'Ali el',
        newName: 'Ali el Hassouni',
        role: 'CEO',
        company: 'MarvelX'
      },
      {
        currentName: 'Ali Safavi',
        newName: 'Ali Safavi',
        currentRole: 'CEO & Co',
        currentCompany: 'Founder - COVU',
        newRole: 'CEO & Co-Founder',
        newCompany: 'COVU'
      }
    ];
    
    console.log('Applying final fixes...\n');
    
    for (const fix of fixes) {
      const whereClause = { name: fix.currentName };
      if (fix.currentRole) whereClause.role = fix.currentRole;
      
      const speaker = await prisma.speaker.findFirst({
        where: whereClause
      });
      
      if (speaker) {
        const updateData = {};
        if (fix.newName && fix.newName !== fix.currentName) {
          updateData.name = fix.newName;
        }
        if (fix.newRole) {
          updateData.role = fix.newRole;
        }
        if (fix.newCompany) {
          updateData.company = fix.newCompany;
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.speaker.update({
            where: { id: speaker.id },
            data: updateData
          });
          
          console.log(`Fixed: "${fix.currentName}"`);
          if (updateData.name) console.log(`  Name: "${updateData.name}"`);
          if (updateData.role) console.log(`  Role: "${updateData.role}"`);
          if (updateData.company) console.log(`  Company: "${updateData.company}"`);
        }
      }
    }
    
    console.log('\n=== Final Verification ===');
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Ali' } },
          { name: { contains: 'Andrea' } },
          { name: { contains: 'Adrian' } },
          { name: { contains: 'Abhi' } },
          { name: { contains: 'Adarsh' } }
        ]
      },
      orderBy: { name: 'asc' }
    });
    
    speakers.forEach(s => {
      console.log(`${s.name} - ${s.role} @ ${s.company}`);
    });
    
    console.log('\n=== Summary ===');
    const totalSpeakers = await prisma.speaker.count();
    const speakersWithFullNames = await prisma.speaker.count({
      where: {
        name: { contains: ' ' }
      }
    });
    
    console.log(`Total speakers: ${totalSpeakers}`);
    console.log(`Speakers with full names: ${speakersWithFullNames}`);
    console.log(`Single-name speakers: ${totalSpeakers - speakersWithFullNames}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyFinalFixes();