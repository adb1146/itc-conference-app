import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

/**
 * Fetch profile image using Gravatar as a fallback
 * This is a privacy-respecting alternative to scraping LinkedIn
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speakerId } = await params;

    // Get the speaker
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId }
    });

    if (!speaker) {
      return NextResponse.json(
        { error: 'Speaker not found' },
        { status: 404 }
      );
    }

    // If we already have an image, return it
    if (speaker.imageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: speaker.imageUrl,
        source: 'existing'
      });
    }

    // Try to generate a professional avatar using UI Avatars service
    // This is a privacy-friendly alternative that creates consistent avatars
    const initials = speaker.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Use UI Avatars service for professional-looking avatars
    const uiAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&size=256&background=random&color=fff&bold=true`;

    // Alternative: Use Gravatar if we have an email (would need email field)
    // const emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    // const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?s=256&d=identicon`;

    // For now, we'll use a placeholder service that respects privacy
    // In production, you might want to use a service like Clearbit or FullContact
    // that has proper API agreements for profile data

    // Update the speaker with a generated avatar URL
    await prisma.speaker.update({
      where: { id: speakerId },
      data: {
        imageUrl: uiAvatarUrl
      }
    });

    return NextResponse.json({
      success: true,
      imageUrl: uiAvatarUrl,
      source: 'generated',
      message: 'Generated a professional avatar. For actual photos, please upload manually or use an authorized API service.'
    });

  } catch (error) {
    console.error('Error generating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to generate avatar' },
      { status: 500 }
    );
  }
}