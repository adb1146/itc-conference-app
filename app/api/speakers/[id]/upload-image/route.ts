import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Upload a profile image URL for a speaker
 * This allows manual entry of image URLs from authorized sources
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speakerId } = await params;
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Update the speaker with the provided image URL
    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: { imageUrl }
    });

    return NextResponse.json({
      success: true,
      speaker: updatedSpeaker
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}