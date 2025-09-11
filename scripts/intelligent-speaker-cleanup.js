const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function intelligentNameParser(name, role, company) {
  let cleanName = name;
  let cleanRole = role || '';
  let cleanCompany = company || '';
  
  // Pattern 1: Check if role contains a concatenated surname at the beginning
  // Examples: "HassouniCEO", "CollinsCMO", "BlidarusGlobal Head"
  if (cleanRole && /^[A-Z][a-z]+[A-Z]/.test(cleanRole)) {
    // Find where the surname ends and the title begins
    const match = cleanRole.match(/^([A-Z][a-z]+?)([A-Z].*)/);
    if (match) {
      const surname = match[1];
      let title = match[2];
      
      // Add spaces before capital letters in the title
      title = title
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .replace(/CEO/g, 'CEO')
        .replace(/CMO/g, 'CMO')
        .replace(/CTO/g, 'CTO')
        .replace(/CFO/g, 'CFO')
        .replace(/COO/g, 'COO')
        .replace(/CIO/g, 'CIO')
        .replace(/VP/g, 'VP')
        .replace(/SVP/g, 'SVP')
        .replace(/EVP/g, 'EVP')
        .trim();
      
      // Only append surname if name doesn't already include it
      if (!cleanName.includes(surname)) {
        cleanName = cleanName + ' ' + surname;
      }
      cleanRole = title;
    }
  }
  
  // Pattern 2: Check if company contains the role (duplicated info)
  // Example: "RengacharySVP, Head of Underwriting, U.S. Individual Life - RGA"
  if (cleanCompany && cleanRole && cleanCompany.includes(cleanRole)) {
    // Extract just the company name
    const companyParts = cleanCompany.split(' - ');
    if (companyParts.length > 1) {
      cleanCompany = companyParts[companyParts.length - 1].trim();
    } else {
      // Try to extract company name after role text
      const roleIndex = cleanCompany.indexOf(cleanRole);
      if (roleIndex === 0) {
        const remaining = cleanCompany.substring(cleanRole.length).trim();
        if (remaining.startsWith('- ')) {
          cleanCompany = remaining.substring(2).trim();
        } else if (remaining) {
          cleanCompany = remaining;
        }
      }
    }
  }
  
  // Pattern 3: Check if company has concatenated text at the beginning
  if (cleanCompany && /^[A-Z][a-z]+[A-Z]/.test(cleanCompany)) {
    // Check if it starts with a name pattern
    const match = cleanCompany.match(/^([A-Z][a-z]+)([A-Z].*)/);
    if (match) {
      // This might be a surname concatenated with company
      const possibleSurname = match[1];
      const restOfCompany = match[2];
      
      // Check if this looks like it should be part of the speaker's name
      if (cleanName.split(' ').length === 1 && possibleSurname.length > 2) {
        cleanName = cleanName + ' ' + possibleSurname;
        cleanCompany = restOfCompany
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .trim();
      }
    }
  }
  
  // Pattern 4: Clean up "at" duplications in the display
  // The UI shows "role at company" so we should ensure role doesn't contain "at Company"
  if (cleanRole.includes(' at ') && cleanCompany) {
    const roleParts = cleanRole.split(' at ');
    if (roleParts.length === 2) {
      cleanRole = roleParts[0].trim();
      // If company is empty or generic, use the part after "at"
      if (!cleanCompany || cleanCompany === 'TBD') {
        cleanCompany = roleParts[1].trim();
      }
    }
  }
  
  // Pattern 5: Handle single-name speakers with potential missing surnames
  // Look for patterns like "Andrea" with nothing else, but other data suggests "Andrea Collins"
  if (cleanName.split(' ').length === 1 && cleanRole) {
    // Check common name patterns where surname might be in an unexpected place
    const namePatterns = {
      'Andrea': 'Collins',
      'Ali': 'Hassouni',
      // Add more known mappings as needed
    };
    
    if (namePatterns[cleanName]) {
      cleanName = cleanName + ' ' + namePatterns[cleanName];
    }
  }
  
  return {
    name: cleanName.trim(),
    role: cleanRole.trim(),
    company: cleanCompany.trim()
  };
}

async function intelligentCleanup() {
  try {
    console.log('Starting intelligent speaker cleanup...\n');
    
    // Fetch all speakers
    const speakers = await prisma.speaker.findMany();
    console.log(`Processing ${speakers.length} speakers...\n`);
    
    let fixedCount = 0;
    const updates = [];
    
    for (const speaker of speakers) {
      const cleaned = intelligentNameParser(speaker.name, speaker.role, speaker.company);
      
      // Check if anything changed
      if (cleaned.name !== speaker.name || 
          cleaned.role !== speaker.role || 
          cleaned.company !== speaker.company) {
        
        updates.push({
          id: speaker.id,
          original: {
            name: speaker.name,
            role: speaker.role,
            company: speaker.company
          },
          cleaned: cleaned
        });
        
        fixedCount++;
      }
    }
    
    // Apply updates
    console.log(`Found ${fixedCount} speakers that need fixing:\n`);
    
    for (const update of updates) {
      console.log(`Fixing: "${update.original.name}"`);
      console.log(`  From: Role="${update.original.role}" Company="${update.original.company}"`);
      console.log(`  To:   Name="${update.cleaned.name}" Role="${update.cleaned.role}" Company="${update.cleaned.company}"`);
      
      await prisma.speaker.update({
        where: { id: update.id },
        data: update.cleaned
      });
    }
    
    console.log(`\n=== Cleanup Complete ===`);
    console.log(`Fixed ${fixedCount} speakers`);
    
    // Show verification
    console.log('\n=== Verification Sample ===');
    const samples = await prisma.speaker.findMany({
      take: 15,
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

intelligentCleanup();