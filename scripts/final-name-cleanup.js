const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalNameCleanup() {
  try {
    // Find speakers with potential issues
    const speakers = await prisma.speaker.findMany();
    
    const issues = [];
    
    speakers.forEach(speaker => {
      const name = speaker.name;
      
      // Check for patterns that suggest concatenated data in name
      // Pattern 1: Name contains title keywords
      if (/(?:Senior|Managing|Director|CEO|President|VP|Chief|Head|Manager|Leader)/.test(name)) {
        issues.push(speaker);
      }
      // Pattern 2: Name is unusually long (might have concatenated data)
      else if (name.length > 30) {
        issues.push(speaker);
      }
      // Pattern 3: Name contains company-like words
      else if (/(?:Inc|Corp|LLC|Ltd|Company|Group|Services)/.test(name)) {
        issues.push(speaker);
      }
    });
    
    console.log('Found', issues.length, 'speakers with potential issues:\n');
    
    issues.forEach(s => {
      console.log(`Name: "${s.name}"`);
      console.log(`  Role: "${s.role}"`);
      console.log(`  Company: "${s.company}"`);
      console.log('---');
    });
    
    // Specific fixes based on patterns
    const fixes = [
      {
        currentName: 'R.K. Jobay CooneySenior Managing Director - Aon',
        newName: 'R.K. Jobay Cooney',
        newRole: 'Senior Managing Director',
        newCompany: 'Aon'
      }
    ];
    
    // Search for more specific cases
    const specificCases = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Cooney' } },
          { name: { contains: 'R.K.' } },
          { name: { contains: ' - ' } }
        ]
      }
    });
    
    console.log('\nSpecific cases found:');
    specificCases.forEach(s => {
      console.log(`  "${s.name}"`);
      
      // Parse pattern: "Name TitleText - Company"
      if (s.name.includes(' - ')) {
        const parts = s.name.split(' - ');
        if (parts.length === 2) {
          const nameAndRole = parts[0];
          const company = parts[1];
          
          // Try to separate name from role
          const match = nameAndRole.match(/^(.*?)([A-Z][a-z]*(?:Senior|Managing|Director|CEO|President|VP|Chief|Head).*)$/);
          if (match) {
            fixes.push({
              currentName: s.name,
              newName: match[1].trim(),
              newRole: match[2].trim(),
              newCompany: company
            });
          }
        }
      }
    });
    
    // Apply fixes
    console.log('\nApplying fixes...');
    for (const fix of fixes) {
      const speaker = await prisma.speaker.findFirst({
        where: { name: fix.currentName }
      });
      
      if (speaker) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: {
            name: fix.newName,
            role: fix.newRole || speaker.role,
            company: fix.newCompany || speaker.company
          }
        });
        console.log(`Fixed: "${fix.currentName}" -> "${fix.newName}"`);
      }
    }
    
    // Final check
    const remaining = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: 'Senior' } },
          { name: { contains: 'Managing' } },
          { name: { contains: 'Director' } },
          { name: { contains: ' - ' } }
        ]
      }
    });
    
    if (remaining.length > 0) {
      console.log('\nRemaining issues to check:');
      remaining.forEach(s => {
        console.log(`  "${s.name}"`);
      });
    } else {
      console.log('\nAll speaker names cleaned!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalNameCleanup();