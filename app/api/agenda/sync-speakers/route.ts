import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultHeaders: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });

    console.log('Fetching speaker details from ITC Vegas 2025...');
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 16384,
      messages: [{
        role: 'user',
        content: `Please navigate to https://vegas.insuretechconnect.com/agenda-speakers/2025-speakers and extract ALL speaker information.
          
          IMPORTANT INSTRUCTIONS:
          1. Navigate to the SPEAKERS page (not agenda)
          2. Scroll through the ENTIRE page to load ALL speakers
          3. Click "Load More" or scroll to load additional speakers if pagination exists
          
          For EACH speaker, extract:
          - Full name
          - Job title/role
          - Company/organization
          - Full biography/description
          - Photo URL if available
          - Any social media links (LinkedIn, Twitter, etc.)
          - Speaking sessions they're involved in
          
          Return a JSON object with:
          {
            "speakers": [
              {
                "name": "Full Name",
                "title": "Job Title",
                "company": "Company Name",
                "bio": "Full biography text",
                "imageUrl": "URL to photo",
                "linkedIn": "LinkedIn URL if available",
                "twitter": "Twitter handle if available",
                "sessions": ["Session titles they're speaking at"]
              }
            ],
            "totalSpeakers": <number>
          }
          
          Return ONLY the JSON object, no other text.`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 10,
        allowed_domains: [
          'vegas.insuretechconnect.com',
          'insuretechconnect.com'
        ],
        max_content_tokens: 100000
      } as any]
    } as any);

    // Parse the response
    let speakerData: any = { speakers: [] };
    
    if (response.content && Array.isArray(response.content)) {
      for (let i = response.content.length - 1; i >= 0; i--) {
        const item = response.content[i];
        if (item.type === 'text') {
          const text = item.text || '';
          try {
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              speakerData = JSON.parse(jsonMatch[1]);
              break;
            }
            speakerData = JSON.parse(text);
            break;
          } catch (e) {
            continue;
          }
        }
      }
    }

    console.log(`Fetched ${speakerData.speakers?.length || 0} speakers`);

    // Save speakers to database
    let savedCount = 0;
    let updatedCount = 0;
    
    if (speakerData.speakers && Array.isArray(speakerData.speakers)) {
      for (const speaker of speakerData.speakers) {
        if (speaker.name) {
          try {
            const existing = await prisma.speaker.findUnique({
              where: { name: speaker.name }
            });

            if (existing) {
              // Update existing speaker with more details
              await prisma.speaker.update({
                where: { id: existing.id },
                data: {
                  role: speaker.title || existing.role,
                  company: speaker.company || existing.company,
                  bio: speaker.bio || existing.bio,
                  imageUrl: speaker.imageUrl || existing.imageUrl,
                }
              });
              updatedCount++;
            } else {
              // Create new speaker
              await prisma.speaker.create({
                data: {
                  name: speaker.name,
                  role: speaker.title || null,
                  company: speaker.company || null,
                  bio: speaker.bio || null,
                  imageUrl: speaker.imageUrl || null,
                }
              });
              savedCount++;
            }
          } catch (error: any) {
            console.error(`Error saving speaker "${speaker.name}":`, error.message);
          }
        }
      }
    }

    const totalSpeakers = await prisma.speaker.count();

    return NextResponse.json({
      success: true,
      message: `Synced speakers: ${savedCount} new, ${updatedCount} updated`,
      stats: {
        fetched: speakerData.speakers?.length || 0,
        newSpeakers: savedCount,
        updatedSpeakers: updatedCount,
        totalInDatabase: totalSpeakers
      }
    });

  } catch (error: any) {
    console.error('Error syncing speakers:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync speakers',
        details: error.message
      },
      { status: 500 }
    );
  }
}