const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeMockCompanyProfiles() {
  console.log('Removing mock company profile data...\n');
  
  try {
    // Find all speakers with mock company profiles
    const speakersWithMock = await prisma.speaker.findMany({
      where: {
        OR: [
          { companyProfile: { contains: 'Mock profile' } },
          { companyProfile: { contains: 'Context:' } },
          { companyProfile: { contains: 'Context: Extract' } }
        ]
      }
    });
    
    console.log(`Found ${speakersWithMock.length} speakers with mock company profiles\n`);
    
    // Clear mock company profiles
    for (const speaker of speakersWithMock) {
      await prisma.speaker.update({
        where: { id: speaker.id },
        data: { companyProfile: null }
      });
      console.log(`✓ Cleared mock company profile for: ${speaker.name}`);
    }
    
    // Final statistics
    const finalStats = {
      total: await prisma.speaker.count(),
      withProfile: await prisma.speaker.count({ where: { profileSummary: { not: null } } }),
      withCompany: await prisma.speaker.count({ where: { companyProfile: { not: null } } })
    };
    
    console.log('\n=== FINAL CLEANUP COMPLETE ===');
    console.log(`Total speakers: ${finalStats.total}`);
    console.log(`With profile summary: ${finalStats.withProfile}`);
    console.log(`With company profile: ${finalStats.withCompany}`);
    console.log(`Removed ${speakersWithMock.length} mock company profiles`);
    
  } catch (error) {
    console.error('Error removing mock profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeMockCompanyProfiles();