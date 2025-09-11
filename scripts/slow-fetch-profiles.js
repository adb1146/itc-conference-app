const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env.local' });

// Configuration for rate limit management
const CONFIG = {
  DELAY_BETWEEN_REQUESTS: 45000,  // 45 seconds between each request
  MAX_RETRIES: 2,                 // Max retries per speaker
  RETRY_DELAY: 120000,            // 2 minutes wait before retry
  SAVE_PROGRESS_EVERY: 5,         // Save progress every 5 speakers
};

async function fetchProfileWithRetry(speaker, retryCount = 0) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found');
    return { profile: null, company: null };
  }
  
  try {
    // Fetch both speaker profile and company info in one request to save tokens
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Search for information about:
1. Person: ${speaker.name}, ${speaker.role} at ${speaker.company}
2. Company: ${speaker.company}

Provide two separate sections:

**PROFESSIONAL SUMMARY**
- Current role and responsibilities
- Key expertise and achievements
- Professional background
- LinkedIn URL if available

**COMPANY PROFILE**
- Company overview and description
- Industry and services
- Key facts and figures
- Notable clients or partnerships`
          }
        ],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3  // Allow 3 searches to get both person and company
        }],
        tool_choice: { type: 'auto' }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      
      // Check if it's a rate limit error
      if (error.includes('rate_limit_error')) {
        console.log(`    ⏳ Rate limited for ${speaker.name}, will retry later`);
        
        if (retryCount < CONFIG.MAX_RETRIES) {
          console.log(`    Waiting ${CONFIG.RETRY_DELAY/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          return fetchProfileWithRetry(speaker, retryCount + 1);
        }
      }
      
      console.error(`    Error for ${speaker.name}:`, error.substring(0, 200));
      return { profile: null, company: null };
    }
    
    const data = await response.json();
    
    // Extract content
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          // Clean the response
          let content = block.text;
          
          // Remove AI artifacts
          const patterns = [
            /Let me.*?[\n\r]/gi,
            /I'll.*?\./gi,
            /Based on.*?:/gi,
            /Here's what.*?:/gi,
            /I found.*?:/gi,
            /I can provide.*?:/gi,
            /I've searched.*?:/gi,
            /According to.*?search.*?:/gi
          ];
          
          patterns.forEach(pattern => {
            content = content.replace(pattern, '');
          });
          
          content = content.trim();
          
          // Only process if we got substantial content
          if (content.length > 100 && !content.includes('Mock profile')) {
            // Split into professional and company sections
            const profileMatch = content.match(/\*\*PROFESSIONAL SUMMARY\*\*([\s\S]*?)(?=\*\*COMPANY PROFILE\*\*|$)/i);
            const companyMatch = content.match(/\*\*COMPANY PROFILE\*\*([\s\S]*?)$/i);
            
            const profile = profileMatch ? profileMatch[1].trim() : null;
            const company = companyMatch ? companyMatch[1].trim() : null;
            
            // Clean up the sections
            const cleanSection = (text) => {
              if (!text) return null;
              // Remove markdown headers and clean up
              return text
                .replace(/\*\*/g, '')
                .replace(/^[-•]\s*/gm, '')
                .trim();
            };
            
            return {
              profile: cleanSection(profile),
              company: cleanSection(company)
            };
          }
        }
      }
    }
    
    return { profile: null, company: null };
  } catch (error) {
    console.error(`    Network error for ${speaker.name}:`, error.message);
    return { profile: null, company: null };
  }
}

async function slowFetchProfiles() {
  console.log('Starting slow profile fetch with rate limit protection...');
  console.log(`Configuration:`);
  console.log(`  - Delay between requests: ${CONFIG.DELAY_BETWEEN_REQUESTS/1000} seconds`);
  console.log(`  - Max retries: ${CONFIG.MAX_RETRIES}`);
  console.log(`  - Retry delay: ${CONFIG.RETRY_DELAY/1000} seconds\n`);
  
  try {
    // Get speakers needing profiles or company info
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock profile' } },
          { profileSummary: { contains: 'Context:' } },
          { profileSummary: null },
          { companyProfile: { contains: 'Mock profile' } },
          { companyProfile: { contains: 'Context:' } },
          { companyProfile: null }
        ]
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${speakers.length} speakers needing profile or company data`);
    console.log(`Estimated time: ${(speakers.length * CONFIG.DELAY_BETWEEN_REQUESTS / 60000).toFixed(1)} minutes\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    // Process one at a time
    for (let i = 0; i < speakers.length; i++) {
      const speaker = speakers[i];
      const progress = `[${i + 1}/${speakers.length}]`;
      
      console.log(`${progress} Processing: ${speaker.name} (${speaker.company})`);
      
      // Check if already has good data for both profile and company
      const hasGoodProfile = speaker.profileSummary && 
                            !speaker.profileSummary.includes('Mock') && 
                            !speaker.profileSummary.includes('Context:') &&
                            speaker.profileSummary.length > 100;
      
      const hasGoodCompany = speaker.companyProfile && 
                            !speaker.companyProfile.includes('Mock') && 
                            !speaker.companyProfile.includes('Context:') &&
                            speaker.companyProfile.length > 100;
      
      if (hasGoodProfile && hasGoodCompany) {
        console.log(`    ✓ Already has both profile and company data, skipping`);
        skipCount++;
        continue;
      }
      
      // Fetch both profile and company info
      const result = await fetchProfileWithRetry(speaker);
      
      if (result.profile || result.company) {
        // Update database with whichever data we got
        const updateData = {
          lastProfileSync: new Date()
        };
        
        if (result.profile && result.profile.length > 50) {
          updateData.profileSummary = result.profile;
        }
        
        if (result.company && result.company.length > 50) {
          updateData.companyProfile = result.company;
        }
        
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updateData
        });
        
        successCount++;
        const profileChars = result.profile ? result.profile.length : 0;
        const companyChars = result.company ? result.company.length : 0;
        console.log(`    ✅ Updated - Profile: ${profileChars} chars, Company: ${companyChars} chars`);
      } else {
        failCount++;
        console.log(`    ❌ Failed to fetch any data`);
      }
      
      // Progress report
      if ((i + 1) % CONFIG.SAVE_PROGRESS_EVERY === 0) {
        console.log(`\n📊 Progress Report:`);
        console.log(`  - Processed: ${i + 1}/${speakers.length}`);
        console.log(`  - Success: ${successCount}`);
        console.log(`  - Failed: ${failCount}`);
        console.log(`  - Skipped: ${skipCount}`);
        console.log(`  - Remaining: ${speakers.length - i - 1}`);
        console.log(`  - Est. time remaining: ${((speakers.length - i - 1) * CONFIG.DELAY_BETWEEN_REQUESTS / 60000).toFixed(1)} minutes\n`);
      }
      
      // Wait before next request (except for last one)
      if (i < speakers.length - 1) {
        console.log(`    ⏱️  Waiting ${CONFIG.DELAY_BETWEEN_REQUESTS/1000} seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
      }
    }
    
    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SLOW FETCH COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total speakers processed: ${speakers.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Skipped (already had data): ${skipCount}`);
    
    // Check final database state
    const finalStats = {
      total: await prisma.speaker.count(),
      withProfiles: await prisma.speaker.count({
        where: {
          profileSummary: { not: null },
          NOT: {
            OR: [
              { profileSummary: { contains: 'Mock profile' } },
              { profileSummary: { contains: 'Context:' } }
            ]
          }
        }
      }),
      withCompany: await prisma.speaker.count({
        where: {
          companyProfile: { not: null },
          NOT: {
            OR: [
              { companyProfile: { contains: 'Mock profile' } },
              { companyProfile: { contains: 'Context:' } }
            ]
          }
        }
      }),
      withMock: await prisma.speaker.count({
        where: {
          OR: [
            { profileSummary: { contains: 'Mock profile' } },
            { profileSummary: { contains: 'Context:' } }
          ]
        }
      })
    };
    
    console.log('\n📈 Final Database Statistics:');
    console.log(`  - Total speakers: ${finalStats.total}`);
    console.log(`  - With real profiles: ${finalStats.withProfiles}`);
    console.log(`  - With real company data: ${finalStats.withCompany}`);
    console.log(`  - Still with mock data: ${finalStats.withMock}`);
    console.log(`  - Profile coverage: ${Math.round((finalStats.withProfiles / finalStats.total) * 100)}%`);
    console.log(`  - Company coverage: ${Math.round((finalStats.withCompany / finalStats.total) * 100)}%`);
    
  } catch (error) {
    console.error('Fatal error in slow fetch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received interrupt signal, shutting down gracefully...');
  console.log('Progress has been saved. You can restart the script to continue.');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the slow fetch
console.log('🚀 Starting slow profile fetch script...');
console.log('⚠️  This will take several hours to complete.');
console.log('💡 You can safely stop and restart this script - it will skip already processed speakers.\n');

slowFetchProfiles();