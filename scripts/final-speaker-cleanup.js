const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalSpeakerCleanup() {
  try {
    console.log('Starting final speaker cleanup...\n');
    
    // List of entries that are companies/organizations, not speakers
    const companiesToRemove = [
      'Adobe', 'MetLife', 'MAPFRE', 'Tata', 'Datos', 'Viewpoint', 'Yelp',
      'Eventual', 'State', 'KOVR', 'One', 'Shift', 'Carpe', 'Vexcel', 'WTW',
      'DXC', 'IBM', 'Imperial', 'EOX', 'Hexaware', 'Duck', 'Quantiphi', 'RegEd',
      'Tiger', 'Spear', 'Prudential', 'Microsoft', 'Lazarus', 'Mulberri',
      'Lumenova', 'Prediction', 'RAVIN', 'Lifebridge', 'Weav', 'DQLabs',
      'Property', 'Decisions', 'Arivonix', 'Liberty'
    ];
    
    // Remove company/organization entries
    for (const company of companiesToRemove) {
      const speaker = await prisma.speaker.findFirst({
        where: { name: company }
      });
      
      if (speaker) {
        // First remove any session relationships
        await prisma.sessionSpeaker.deleteMany({
          where: { speakerId: speaker.id }
        });
        
        // Then delete the speaker
        await prisma.speaker.delete({
          where: { id: speaker.id }
        });
        
        console.log(`Removed company entry: ${company}`);
      }
    }
    
    // Remove generic entries
    const genericToRemove = ['Speaker', 'Moderator'];
    for (const generic of genericToRemove) {
      const speaker = await prisma.speaker.findFirst({
        where: { name: generic }
      });
      
      if (speaker) {
        // First remove any session relationships
        await prisma.sessionSpeaker.deleteMany({
          where: { speakerId: speaker.id }
        });
        
        // Then delete the speaker
        await prisma.speaker.delete({
          where: { id: speaker.id }
        });
        
        console.log(`Removed generic entry: ${generic}`);
      }
    }
    
    // Specific fixes for concatenated surnames in roles
    const specificFixes = [
      { 
        currentName: 'Carlos',
        role: 'Cendra FalconScouting & Investment Lead',
        newName: 'Carlos Cendra Falcon',
        newRole: 'Scouting & Investment Lead'
      },
      {
        currentName: 'Ori',
        role: 'Ben',
        company: 'YishaiPartner - Viewpoint Ventures',
        newName: 'Ori Ben Yishai',
        newRole: 'Partner',
        newCompany: 'Viewpoint Ventures'
      },
      {
        currentName: 'Philip',
        role: 'Charles',
        company: 'PierreCEO - Semsee',
        newName: 'Philip Charles Pierre',
        newRole: 'CEO',
        newCompany: 'Semsee'
      },
      {
        currentName: 'Pierre',
        role: 'Du ToitChief Data Officer',
        newName: 'Pierre Du Toit',
        newRole: 'Chief Data Officer'
      },
      {
        currentName: 'Rudy',
        role: 'HervéChief Operating Officer',
        company: 'HervéChief Operating Officer - Palomar',
        newName: 'Rudy Hervé',
        newRole: 'Chief Operating Officer',
        newCompany: 'Palomar'
      },
      {
        currentName: 'Bruce',
        role: 'F Broussard JrManaging Director',
        newName: 'Bruce F Broussard Jr',
        newRole: 'Managing Director'
      },
      {
        currentName: 'Ivan',
        role: "O'NeillCEO and Co-founder",
        company: "O'NeillCEO and Co-founder - Wuuii",
        newName: "Ivan O'Neill",
        newRole: 'CEO and Co-founder',
        newCompany: 'Wuuii'
      }
    ];
    
    // Apply specific fixes
    for (const fix of specificFixes) {
      const speaker = await prisma.speaker.findFirst({
        where: {
          name: fix.currentName,
          role: fix.role
        }
      });
      
      if (speaker) {
        const updateData = {
          name: fix.newName,
          role: fix.newRole
        };
        
        if (fix.newCompany) {
          updateData.company = fix.newCompany;
        }
        
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updateData
        });
        
        console.log(`Fixed: "${fix.currentName}" -> "${fix.newName}" (${fix.newRole})`);
      }
    }
    
    // Check all remaining single-word names and try to extract surnames from roles
    const singleNames = await prisma.speaker.findMany({
      where: {
        NOT: {
          name: { contains: ' ' }
        }
      }
    });
    
    console.log(`\nChecking ${singleNames.length} single-word names for remaining issues...`);
    
    let fixedCount = 0;
    for (const speaker of singleNames) {
      let needsUpdate = false;
      let newName = speaker.name;
      let newRole = speaker.role || '';
      let newCompany = speaker.company || '';
      
      // Check if role starts with a capitalized word that could be a surname
      if (newRole && /^[A-Z][a-z]+[A-Z]/.test(newRole)) {
        // Extract potential surname from beginning of role
        const match = newRole.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)([A-Z].*)/);
        if (match) {
          const potentialSurname = match[1];
          const restOfRole = match[2];
          
          // Add spaces before capital letters in the rest of the role
          const formattedRole = restOfRole
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .trim();
          
          newName = speaker.name + ' ' + potentialSurname;
          newRole = formattedRole;
          needsUpdate = true;
        }
      }
      
      // Clean up company field if it contains role information
      if (newCompany && newCompany.includes(newRole)) {
        const cleanCompany = newCompany.replace(newRole, '').replace(/^[\s-]+/, '').trim();
        if (cleanCompany && cleanCompany !== newCompany) {
          newCompany = cleanCompany;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: {
            name: newName,
            role: newRole,
            company: newCompany
          }
        });
        console.log(`Auto-fixed: "${speaker.name}" -> "${newName}"`);
        fixedCount++;
      }
    }
    
    console.log(`\nAuto-fixed ${fixedCount} additional speakers`);
    
    // Final statistics
    const totalSpeakers = await prisma.speaker.count();
    const speakersWithFullNames = await prisma.speaker.count({
      where: {
        name: { contains: ' ' }
      }
    });
    
    console.log('\n=== Final Statistics ===');
    console.log(`Total speakers: ${totalSpeakers}`);
    console.log(`Speakers with full names: ${speakersWithFullNames}`);
    console.log(`Single-word names remaining: ${totalSpeakers - speakersWithFullNames}`);
    
    // Show sample of properly formatted speakers
    console.log('\n=== Sample of Properly Formatted Speakers ===');
    const samples = await prisma.speaker.findMany({
      where: {
        name: { contains: ' ' }
      },
      take: 10,
      orderBy: { name: 'asc' }
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

finalSpeakerCleanup();