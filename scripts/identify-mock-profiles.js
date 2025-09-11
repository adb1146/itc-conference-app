const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function identifyMockProfiles() {
  console.log('Identifying speakers with mock profile data...\n');
  
  try {
    // Find all speakers with mock profile data
    const mockSpeakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock profile' } },
          { profileSummary: { contains: 'Context:' } },
          { companyProfile: { contains: 'Mock profile' } },
          { companyProfile: { contains: 'Context:' } }
        ]
      },
      select: {
        id: true,
        name: true,
        company: true,
        role: true,
        profileSummary: true,
        companyProfile: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${mockSpeakers.length} speakers with mock data:\n`);
    
    // Create list of speakers needing updates
    const speakersToUpdate = [];
    
    mockSpeakers.forEach(speaker => {
      const hasMockProfile = speaker.profileSummary?.includes('Mock profile') || 
                             speaker.profileSummary?.includes('Context:');
      const hasMockCompany = speaker.companyProfile?.includes('Mock profile') || 
                             speaker.companyProfile?.includes('Context:');
      
      console.log(`${speaker.name} (${speaker.company})`);
      console.log(`  - Profile: ${hasMockProfile ? '❌ Mock' : '✓ Real'}`);
      console.log(`  - Company: ${hasMockCompany ? '❌ Mock' : '✓ Real'}`);
      
      speakersToUpdate.push({
        id: speaker.id,
        name: speaker.name,
        company: speaker.company,
        role: speaker.role
      });
    });
    
    // Save the list to a JSON file for targeted processing
    const outputFile = './speakers-with-mock-data.json';
    fs.writeFileSync(outputFile, JSON.stringify(speakersToUpdate, null, 2));
    console.log(`\nList saved to ${outputFile}`);
    
    // Also check for speakers with no data at all
    const speakersWithoutProfiles = await prisma.speaker.findMany({
      where: {
        profileSummary: null
      },
      select: { name: true }
    });
    
    console.log(`\nSpeakers without any profile data: ${speakersWithoutProfiles.length}`);
    if (speakersWithoutProfiles.length > 0 && speakersWithoutProfiles.length <= 10) {
      console.log('Names:', speakersWithoutProfiles.map(s => s.name).join(', '));
    }
    
    // Summary statistics
    const totalSpeakers = await prisma.speaker.count();
    const withRealProfiles = await prisma.speaker.count({
      where: {
        profileSummary: {
          not: null,
          notIn: ['']
        },
        NOT: {
          OR: [
            { profileSummary: { contains: 'Mock profile' } },
            { profileSummary: { contains: 'Context:' } }
          ]
        }
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total speakers: ${totalSpeakers}`);
    console.log(`With real profiles: ${withRealProfiles}`);
    console.log(`With mock data: ${mockSpeakers.length}`);
    console.log(`Without any data: ${speakersWithoutProfiles.length}`);
    console.log(`Coverage: ${Math.round((withRealProfiles / totalSpeakers) * 100)}% have real profiles`);
    
  } catch (error) {
    console.error('Error identifying mock profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

identifyMockProfiles();