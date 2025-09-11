const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSpeakerNames() {
  try {
    console.log('Fetching all speakers...');
    const speakers = await prisma.speaker.findMany();
    
    console.log(`Found ${speakers.length} speakers to clean`);
    
    let cleanedCount = 0;
    
    for (const speaker of speakers) {
      let needsUpdate = false;
      let cleanName = speaker.name;
      let cleanRole = speaker.role || '';
      let cleanCompany = speaker.company || '';
      
      // Check if name is just a first name and role starts with a surname pattern
      if (!cleanName.includes(' ') && cleanRole) {
        // Pattern 1: Role starts with surname directly concatenated with a capitalized word
        // e.g., "BakreVice President", "CoxProduct Leader", "BlidarusGlobal Head"
        const roleWithDirectSurnamePattern = /^([A-Z][a-z]+)([A-Z].*)/;
        const directMatch = cleanRole.match(roleWithDirectSurnamePattern);
        
        if (directMatch) {
          const surname = directMatch[1];
          const restOfRole = directMatch[2];
          
          // Add spaces before capital letters to properly format the role
          // But preserve existing spaces and common patterns
          let formattedRole = restOfRole
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between lowercase and uppercase
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // Handle acronyms like "SVPHead" -> "SVP Head"
            .trim();
          
          cleanName = cleanName + ' ' + surname;
          cleanRole = formattedRole;
          needsUpdate = true;
          console.log(`Found surname directly concatenated: "${speaker.name}" + "${surname}" from "${speaker.role}"`);
        }
      }
      
      // Also check if the role starts with a name pattern but name already has spaces
      // This handles cases where the full name might be in the role field
      if (cleanRole) {
        const roleStartsWithNamePattern = /^([A-Z][a-z]+(?:[A-Z][a-z]+)*)((?:SVP|EVP|VP|CEO|CTO|CFO|CIO|COO|President|Director|Manager|Head|Chief|Senior|Lead|Executive|Partner|Principal|Founder).*)/;
        const roleMatch = cleanRole.match(roleStartsWithNamePattern);
        
        if (roleMatch && cleanName.split(' ').length === 1) {
          // If we only have a first name, extract surname from role
          const possibleSurname = roleMatch[1];
          if (possibleSurname.length > 2) { // Avoid single letters
            cleanName = cleanName + ' ' + possibleSurname;
            cleanRole = roleMatch[2].trim();
            needsUpdate = true;
          }
        }
      }
      
      // Check if the name contains role information (common patterns)
      const nameWithRolePattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*([A-Z]{2,}.*|VP.*|Chief.*|Director.*|Manager.*|Head.*|Senior.*|Lead.*)/;
      const nameMatch = cleanName.match(nameWithRolePattern);
      
      if (nameMatch) {
        cleanName = nameMatch[1].trim();
        // If we extracted role from name, use it if we don't have a role
        const extractedRole = nameMatch[2].trim();
        if (extractedRole && !cleanRole) {
          cleanRole = extractedRole;
          needsUpdate = true;
        }
      }
      
      // Clean up role field that might have company info
      if (cleanRole && cleanRole.includes(' - ')) {
        const roleParts = cleanRole.split(' - ');
        cleanRole = roleParts[0].trim();
        if (roleParts[1] && (cleanCompany === 'TBD' || !cleanCompany)) {
          cleanCompany = roleParts[1].trim();
        }
      }
      
      // Clean up role field - ensure it starts with a title, not a name
      // If role starts with lowercase or has no common title words, it might be malformed
      if (cleanRole) {
        // Remove any leading commas or special characters
        cleanRole = cleanRole
          .replace(/^[,\s-]+/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Ensure role starts with a title or is properly formatted
        if (cleanRole && !/^(SVP|EVP|VP|CEO|CTO|CFO|CIO|COO|President|Director|Manager|Head|Chief|Senior|Lead|Executive|Partner|Principal|Founder|Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)/i.test(cleanRole)) {
          // Check if it might be a concatenated surname+title
          const concatPattern = /^([A-Z][a-z]+)(SVP|EVP|VP|CEO|CTO|CFO|CIO|COO|President|Director|Manager|Head|Chief|Senior|Lead|Executive|Partner|Principal|Founder)/;
          const concatMatch = cleanRole.match(concatPattern);
          if (concatMatch) {
            cleanRole = concatMatch[2] + cleanRole.substring(concatMatch[0].length);
            needsUpdate = true;
          }
        }
      }
      
      // Additional cleanup for common patterns
      cleanRole = (cleanRole || '')
        .replace(/^,\s*/, '') // Remove leading commas
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      cleanCompany = (cleanCompany || '')
        .replace(/\s+/g, ' ')
        .trim();
      
      cleanName = cleanName
        .replace(/\s+/g, ' ')
        .trim();
      
      // Only update if something changed
      if (cleanName !== speaker.name || cleanRole !== speaker.role || cleanCompany !== speaker.company) {
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`Cleaning: "${speaker.name}" -> "${cleanName}"`);
        console.log(`  Role: "${speaker.role}" -> "${cleanRole}"`);
        console.log(`  Company: "${speaker.company}" -> "${cleanCompany}"`);
        
        try {
          await prisma.speaker.update({
            where: { id: speaker.id },
            data: {
              name: cleanName,
              role: cleanRole,
              company: cleanCompany
            }
          });
          cleanedCount++;
        } catch (error) {
          console.error(`Error updating speaker ${speaker.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n=== Cleaning Complete ===`);
    console.log(`Cleaned ${cleanedCount} out of ${speakers.length} speakers`);
    
    // Show some examples of cleaned data
    console.log('\n=== Sample Cleaned Speakers ===');
    const samples = await prisma.speaker.findMany({
      take: 10,
      orderBy: { name: 'asc' }
    });
    
    samples.forEach(s => {
      console.log(`${s.name} - ${s.role} @ ${s.company}`);
    });
    
  } catch (error) {
    console.error('Error cleaning speaker names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSpeakerNames();