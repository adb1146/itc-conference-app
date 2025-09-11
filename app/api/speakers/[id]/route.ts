import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speakerId } = await params;
    
    // Get speaker with all their sessions
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId },
      include: {
        sessions: {
          include: {
            session: {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!speaker) {
      return NextResponse.json({ error: 'Speaker not found' }, { status: 404 });
    }
    
    // Format the response
    const formattedSpeaker = {
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      company: speaker.company,
      bio: speaker.bio,
      imageUrl: speaker.imageUrl,
      linkedinUrl: speaker.linkedinUrl,
      twitterUrl: speaker.twitterUrl,
      websiteUrl: speaker.websiteUrl,
      profileSummary: speaker.profileSummary,
      companyProfile: speaker.companyProfile,
      expertise: speaker.expertise,
      achievements: speaker.achievements,
      lastProfileSync: speaker.lastProfileSync,
      sessions: speaker.sessions.map(ss => ({
        id: ss.session.id,
        title: ss.session.title,
        description: ss.session.description,
        startTime: ss.session.startTime,
        endTime: ss.session.endTime,
        location: ss.session.location,
        track: ss.session.track,
        level: ss.session.level,
        tags: ss.session.tags,
        coSpeakers: ss.session.speakers
          .filter(s => s.speakerId !== speakerId)
          .map(s => ({
            id: s.speaker.id,
            name: s.speaker.name,
            role: s.speaker.role,
            company: s.speaker.company
          }))
      }))
    };
    
    return NextResponse.json(formattedSpeaker);
  } catch (error) {
    console.error('Error fetching speaker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speaker details' },
      { status: 500 }
    );
  }
}