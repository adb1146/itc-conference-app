const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fetchRealProfile(speaker) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in environment');
    return null;
  }
  
  const searchQuery = `${speaker.name} ${speaker.company} ${speaker.role} insurtech professional background`;
  
  try {
    // Direct call to Anthropic API with web search
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
            content: `Search the web for: ${searchQuery}
            
Please provide:
1. Professional background and current role
2. Key achievements and expertise
3. Company information
4. LinkedIn URL if found

Focus on real, factual information only.`
          }
        ],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3
        }],
        tool_choice: { type: 'auto' }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`API error for ${speaker.name}:`, error);
      return null;
    }
    
    const data = await response.json();
    
    // Extract content from response
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          // Clean the response
          let cleaned = block.text;
          
          // Remove AI artifacts
          const removePatterns = [
            /Let me provide.*?[\n\r]/gi,
            /I'll search for.*?\./gi,
            /Based on.*?:/gi,
            /Here's what I found.*?:/gi
          ];
          
          removePatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
          });
          
          return cleaned.trim();
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching profile for ${speaker.name}:`, error);
    return null;
  }
}

async function fetchRealProfiles() {
  console.log('Fetching real profiles for speakers with mock data...\n');
  
  try {
    // Find speakers with mock data
    const mockSpeakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock profile' } },
          { profileSummary: { contains: 'Context:' } },
          { profileSummary: null }
        ]
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${mockSpeakers.length} speakers needing real profiles\n`);
    
    // Process in batches of 3 to avoid rate limits
    const batchSize = 3;
    let successCount = 0;
    
    for (let i = 0; i < mockSpeakers.length; i += batchSize) {
      const batch = mockSpeakers.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(mockSpeakers.length / batchSize);
      
      console.log(`\nProcessing batch ${batchNum} of ${totalBatches}...`);
      
      // Process batch in parallel
      const promises = batch.map(async (speaker) => {
        console.log(`  Fetching: ${speaker.name}`);
        const profile = await fetchRealProfile(speaker);
        
        if (profile && profile.length > 100) {
          // Update database with real profile
          await prisma.speaker.update({
            where: { id: speaker.id },
            data: {
              profileSummary: profile,
              lastProfileSync: new Date()
            }
          });
          console.log(`    ✓ Updated ${speaker.name}`);
          return true;
        } else {
          console.log(`    ✗ Failed to get real data for ${speaker.name}`);
          return false;
        }
      });
      
      const results = await Promise.all(promises);
      successCount += results.filter(r => r).length;
      
      // Wait 2 seconds between batches to avoid rate limits
      if (i + batchSize < mockSpeakers.length) {
        console.log('  Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== FETCH COMPLETE ===');
    console.log(`Successfully updated: ${successCount} of ${mockSpeakers.length} speakers`);
    
    // Final statistics
    const finalStats = await prisma.speaker.aggregate({
      _count: {
        _all: true,
        profileSummary: true
      }
    });
    
    const withMock = await prisma.speaker.count({
      where: {
        OR: [
          { profileSummary: { contains: 'Mock profile' } },
          { profileSummary: { contains: 'Context:' } }
        ]
      }
    });
    
    console.log('\n=== FINAL STATISTICS ===');
    console.log(`Total speakers: ${finalStats._count._all}`);
    console.log(`With profiles: ${finalStats._count.profileSummary}`);
    console.log(`Still with mock data: ${withMock}`);
    
  } catch (error) {
    console.error('Error in fetch process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fetch
fetchRealProfiles();