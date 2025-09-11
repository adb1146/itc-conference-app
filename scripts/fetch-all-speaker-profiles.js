const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchAllSpeakerProfiles() {
  try {
    console.log('Starting to fetch profiles for all speakers...\n');
    
    // Get all speakers
    const speakers = await prisma.speaker.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${speakers.length} speakers to process\n`);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011';
    let successCount = 0;
    let errorCount = 0;
    
    // Process speakers in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < speakers.length; i += batchSize) {
      const batch = speakers.slice(i, Math.min(i + batchSize, speakers.length));
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(speakers.length/batchSize)}...`);
      
      await Promise.all(batch.map(async (speaker) => {
        try {
          console.log(`  Fetching profile for: ${speaker.name}`);
          
          const response = await fetch(`${baseUrl}/api/speakers/${speaker.id}/fetch-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`    ✓ Successfully fetched profile for ${speaker.name}`);
            successCount++;
          } else {
            console.error(`    ✗ Failed to fetch profile for ${speaker.name}: ${response.status}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`    ✗ Error fetching profile for ${speaker.name}:`, error.message);
          errorCount++;
        }
      }));
      
      // Add a small delay between batches to be respectful to any external APIs
      if (i + batchSize < speakers.length) {
        console.log('  Waiting before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total speakers: ${speakers.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
    // Show a sample of updated speakers
    console.log('\n=== Sample Updated Speakers ===');
    const updatedSpeakers = await prisma.speaker.findMany({
      where: {
        profileSummary: { not: null }
      },
      take: 5
    });
    
    updatedSpeakers.forEach(speaker => {
      console.log(`\n${speaker.name} (${speaker.company}):`);
      if (speaker.profileSummary) {
        console.log(`  Profile: ${speaker.profileSummary.substring(0, 100)}...`);
      }
      if (speaker.linkedinUrl) {
        console.log(`  LinkedIn: ${speaker.linkedinUrl}`);
      }
      if (speaker.expertise && speaker.expertise.length > 0) {
        console.log(`  Expertise: ${speaker.expertise.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error fetching speaker profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchAllSpeakerProfiles();