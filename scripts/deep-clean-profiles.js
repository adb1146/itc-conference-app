const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function deepCleanProfileContent(content) {
  if (!content) return null;
  
  // If it's clearly mock data, return null
  if (content.includes('Mock profile') || 
      content.includes('mock data') || 
      content.includes('Context: Extract') ||
      content.length < 100) {
    return null;
  }
  
  // Remove all AI processing artifacts
  let cleaned = content;
  
  // Remove search/AI process phrases more aggressively
  const removePatterns = [
    /I'll search for.*?\./gi,
    /Let me.*?\./gi,
    /I can provide.*?\./gi,
    /Based on.*?:/gi,
    /I'll provide.*?\./gi,
    /I'll compile.*?\./gi,
    /Let me gather.*?\./gi,
    /I couldn't find.*?\./gi,
    /Unfortunately.*?\./gi,
    /If you need.*?\./gi,
    /you may want to:.*?\./gi,
    /Context:.*?\./gi,
    /\d+\.\s*(Verify|Check|Look|Connect).*?\./gi,
    /URLs found in searches:.*$/gi,
    /Key Facts:\s*\d+\./gi,
    /Unfortunately, I couldn't.*?$/gi
  ];
  
  removePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Extract main content sections
  const sections = [];
  
  // Common section headers to look for
  const sectionHeaders = [
    'IBM Overview',
    'Company Overview', 
    'Professional Background',
    'Current Role',
    'Insurance Technology Focus',
    'Recent Developments',
    'Leadership & Expertise',
    'Industry Events',
    'Notable Achievements',
    'Current Industry Focus',
    'Services',
    'Key Statistics',
    'Global Presence',
    'Technology Services',
    'Market Position'
  ];
  
  // Find and extract sections
  sectionHeaders.forEach(header => {
    const regex = new RegExp(`${header}:([^]+?)(?=\\n[A-Z][^:]+:|$)`, 'gi');
    const match = regex.exec(cleaned);
    if (match && match[1]) {
      const sectionContent = match[1].trim();
      if (sectionContent.length > 50) { // Only keep substantial content
        sections.push(`${header}: ${sectionContent}`);
      }
    }
  });
  
  // If we found sections, use them
  if (sections.length > 0) {
    cleaned = sections.join('\n\n');
  }
  
  // Final cleanup
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/^\s*[-\*]\s*$/gm, '') // Remove empty bullet points
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+\./g, '.') // Fix spacing before periods
    .trim();
  
  // If the result is too short or still contains artifacts, return null
  if (cleaned.length < 100 || 
      cleaned.includes('couldn\'t find specific') ||
      cleaned.includes('may want to') ||
      cleaned.includes('Check direct company')) {
    return null;
  }
  
  return cleaned;
}

function extractCleanCompanyInfo(content) {
  if (!content) return null;
  
  // For company profiles, extract only actual company information
  const companyInfo = [];
  
  // Look for company-specific patterns
  const patterns = {
    overview: /(?:Company Overview|Overview):([^]+?)(?=\n[A-Z]|$)/i,
    services: /(?:Services|Technology Services|Capabilities):([^]+?)(?=\n[A-Z]|$)/i,
    presence: /(?:Global Presence|Presence):([^]+?)(?=\n[A-Z]|$)/i,
    stats: /(?:Key Statistics|Statistics):([^]+?)(?=\n[A-Z]|$)/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1]
        .trim()
        .replace(/^\s*[-\*]\s*/gm, '• ') // Standardize bullet points
        .replace(/\n{2,}/g, '\n'); // Remove excessive newlines
      
      if (cleaned.length > 50) {
        companyInfo.push(cleaned);
      }
    }
  }
  
  return companyInfo.length > 0 ? companyInfo.join('\n\n') : null;
}

async function deepCleanAllProfiles() {
  console.log('Starting deep profile cleanup...\n');
  
  try {
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { not: null } },
          { companyProfile: { not: null } }
        ]
      }
    });
    
    console.log(`Found ${speakers.length} speakers to process\n`);
    
    let cleanedCount = 0;
    let nullifiedCount = 0;
    
    for (const speaker of speakers) {
      const updateData = {};
      let updated = false;
      
      // Deep clean profile summary
      if (speaker.profileSummary) {
        const cleaned = deepCleanProfileContent(speaker.profileSummary);
        if (cleaned === null) {
          updateData.profileSummary = null;
          nullifiedCount++;
          console.log(`✗ Removed low-quality profile for: ${speaker.name}`);
        } else if (cleaned !== speaker.profileSummary) {
          updateData.profileSummary = cleaned;
          updated = true;
        }
      }
      
      // Deep clean company profile - more aggressive for company data
      if (speaker.companyProfile) {
        // First try to extract clean company info
        let cleaned = extractCleanCompanyInfo(speaker.companyProfile);
        
        // If that fails, try general cleaning
        if (!cleaned) {
          cleaned = deepCleanProfileContent(speaker.companyProfile);
        }
        
        // If it's still mock or low quality, nullify it
        if (cleaned === null || 
            cleaned.includes('Context:') || 
            cleaned.includes('Extract company') ||
            cleaned.length < 100) {
          updateData.companyProfile = null;
          nullifiedCount++;
          console.log(`✗ Removed low-quality company profile for: ${speaker.name}`);
        } else if (cleaned !== speaker.companyProfile) {
          updateData.companyProfile = cleaned;
          updated = true;
        }
      }
      
      // Update if changes were made
      if (Object.keys(updateData).length > 0) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updateData
        });
        
        if (updated) {
          cleanedCount++;
          console.log(`✓ Deep cleaned profile for: ${speaker.name}`);
        }
      }
    }
    
    console.log('\n=== DEEP CLEANUP COMPLETE ===');
    console.log(`Total speakers processed: ${speakers.length}`);
    console.log(`Profiles cleaned: ${cleanedCount}`);
    console.log(`Low-quality profiles removed: ${nullifiedCount}`);
    
    // Show final statistics
    const finalStats = await prisma.speaker.findMany({
      where: {
        AND: [
          { profileSummary: { not: null } },
          { companyProfile: { not: null } }
        ]
      },
      select: { name: true }
    });
    
    console.log(`\nSpeakers with complete profiles: ${finalStats.length}`);
    
    if (finalStats.length > 0) {
      console.log('\nSample of speakers with complete profiles:');
      finalStats.slice(0, 5).forEach(s => {
        console.log(`  • ${s.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error during deep cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deep cleanup
deepCleanAllProfiles();