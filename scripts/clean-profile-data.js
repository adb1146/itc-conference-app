const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanProfileContent(content) {
  if (!content) return '';
  
  // Remove search process text
  const searchPhrases = [
    /I'll search for.*?\./gi,
    /Let me search.*?\./gi,
    /Let me try.*?\./gi,
    /Let me provide.*?\./gi,
    /Based on the search results.*?:/gi,
    /I can provide.*?:/gi,
    /I'll provide.*?:/gi,
    /Mock profile data.*?\./gi,
    /Search performed for:.*?\./gi,
    /I'll compile.*?\./gi,
    /Let me gather.*?\./gi
  ];
  
  let cleaned = content;
  searchPhrases.forEach(phrase => {
    cleaned = cleaned.replace(phrase, '');
  });
  
  // Extract only the meaningful content after common headers
  const contentStart = cleaned.search(/\b(Company Overview|Professional Background|Current Role|Key Facts|Services|Background|Overview):/i);
  if (contentStart > 0) {
    cleaned = cleaned.substring(contentStart);
  }
  
  // Remove excessive whitespace and newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // If the content is still mock data, return a proper message
  if (cleaned.includes('Mock profile') || cleaned.includes('mock data')) {
    return null; // Will be handled separately
  }
  
  // Clean up any remaining artifacts
  cleaned = cleaned.replace(/^\s*\n/gm, ''); // Remove empty lines
  cleaned = cleaned.replace(/^[-\s]+$/gm, ''); // Remove lines with only dashes or spaces
  
  return cleaned.trim();
}

async function cleanAllProfiles() {
  console.log('Starting profile data cleanup...\n');
  
  try {
    // Get all speakers with profile data
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { not: null } },
          { companyProfile: { not: null } }
        ]
      }
    });
    
    console.log(`Found ${speakers.length} speakers with profile data to clean\n`);
    
    let cleanedCount = 0;
    let mockCount = 0;
    
    for (const speaker of speakers) {
      let updated = false;
      const updateData = {};
      
      // Clean profile summary
      if (speaker.profileSummary) {
        const cleanedSummary = cleanProfileContent(speaker.profileSummary);
        if (cleanedSummary === null) {
          // It's mock data, set to null to refetch later
          updateData.profileSummary = null;
          mockCount++;
        } else if (cleanedSummary !== speaker.profileSummary) {
          updateData.profileSummary = cleanedSummary;
          updated = true;
        }
      }
      
      // Clean company profile
      if (speaker.companyProfile) {
        const cleanedCompany = cleanProfileContent(speaker.companyProfile);
        if (cleanedCompany === null) {
          // It's mock data, set to null to refetch later
          updateData.companyProfile = null;
          mockCount++;
        } else if (cleanedCompany !== speaker.companyProfile) {
          updateData.companyProfile = cleanedCompany;
          updated = true;
        }
      }
      
      // Update the speaker if changes were made
      if (Object.keys(updateData).length > 0) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updateData
        });
        
        if (updated) {
          cleanedCount++;
          console.log(`✓ Cleaned profile for: ${speaker.name}`);
        }
      }
    }
    
    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`Total speakers processed: ${speakers.length}`);
    console.log(`Profiles cleaned: ${cleanedCount}`);
    console.log(`Mock profiles removed: ${mockCount}`);
    
    // Show statistics
    const stats = await prisma.speaker.aggregate({
      _count: {
        profileSummary: true,
        companyProfile: true
      },
      where: {
        profileSummary: { not: null }
      }
    });
    
    console.log(`\nRemaining profiles with data: ${stats._count.profileSummary}`);
    
  } catch (error) {
    console.error('Error cleaning profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanAllProfiles();