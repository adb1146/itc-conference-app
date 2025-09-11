const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAllMockData() {
  console.log('=== CLEANING ALL MOCK DATA ===\n');
  
  try {
    // Find all speakers with mock data
    const speakersWithMock = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock profile' } },
          { profileSummary: { contains: 'mock profile' } },
          { profileSummary: { contains: 'Mock data' } },
          { profileSummary: { contains: 'mock data' } },
          { companyProfile: { contains: 'Mock profile' } },
          { companyProfile: { contains: 'mock profile' } },
          { companyProfile: { contains: 'Mock data' } },
          { companyProfile: { contains: 'mock data' } }
        ]
      }
    });
    
    console.log(`Found ${speakersWithMock.length} speakers with mock data`);
    
    if (speakersWithMock.length === 0) {
      console.log('No mock data found in database!');
      return;
    }
    
    // Clean each speaker
    let cleanedCount = 0;
    for (const speaker of speakersWithMock) {
      const updates = {};
      
      // Check and clean profileSummary
      if (speaker.profileSummary && 
          (speaker.profileSummary.toLowerCase().includes('mock profile') || 
           speaker.profileSummary.toLowerCase().includes('mock data'))) {
        updates.profileSummary = null;
      }
      
      // Check and clean companyProfile
      if (speaker.companyProfile && 
          (speaker.companyProfile.toLowerCase().includes('mock profile') || 
           speaker.companyProfile.toLowerCase().includes('mock data'))) {
        updates.companyProfile = null;
      }
      
      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updates
        });
        cleanedCount++;
        console.log(`  Cleaned: ${speaker.name} (${speaker.company})`);
      }
    }
    
    console.log(`\n✅ Successfully cleaned mock data from ${cleanedCount} speakers`);
    
    // Verify cleanup
    const remainingMock = await prisma.speaker.count({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock' } },
          { companyProfile: { contains: 'Mock' } }
        ]
      }
    });
    
    if (remainingMock > 0) {
      console.log(`⚠️ Warning: ${remainingMock} speakers still have data containing 'Mock'`);
    } else {
      console.log('✅ All mock data has been removed from the database');
    }
    
    // Final statistics
    const stats = {
      total: await prisma.speaker.count(),
      withProfile: await prisma.speaker.count({ 
        where: { profileSummary: { not: null } } 
      }),
      withCompany: await prisma.speaker.count({ 
        where: { companyProfile: { not: null } } 
      })
    };
    
    console.log('\n=== FINAL DATABASE STATUS ===');
    console.log(`Total speakers: ${stats.total}`);
    console.log(`With profile summary: ${stats.withProfile} (${Math.round((stats.withProfile/stats.total)*100)}%)`);
    console.log(`With company profile: ${stats.withCompany} (${Math.round((stats.withCompany/stats.total)*100)}%)`);
    console.log(`Need profile data: ${stats.total - stats.withProfile} speakers`);
    
  } catch (error) {
    console.error('Error cleaning mock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllMockData().catch(console.error);