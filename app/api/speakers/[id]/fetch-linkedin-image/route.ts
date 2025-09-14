import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Dedicated endpoint to fetch and store LinkedIn profile images
 * This can be called separately when we have a LinkedIn URL but no image
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

    // If we have a LinkedIn URL, try to fetch the profile page
    if (speaker.linkedinUrl) {
      console.log(`Fetching LinkedIn image for ${speaker.name}`);
      console.log('LinkedIn URL:', speaker.linkedinUrl);

      try {
        // Use the web fetch endpoint to get LinkedIn page content
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011';

        // First try: Direct LinkedIn URL search
        let response = await fetch(`${baseUrl}/api/web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${speaker.linkedinUrl} profile picture`,
            context: 'Extract the LinkedIn profile photo URL. Look for media.licdn.com URLs, profile images, or any image URLs associated with this profile.',
            allowedDomains: ['linkedin.com']
          })
        });

        if (response.ok) {
          const data = await response.json();

          // Enhanced image extraction
          let imageUrl = extractLinkedInImage(data.content);

          if (imageUrl) {
            // Update the speaker with the image URL
            await prisma.speaker.update({
              where: { id: speakerId },
              data: { imageUrl }
            });

            return NextResponse.json({
              success: true,
              imageUrl,
              source: 'linkedin'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching LinkedIn image:', error);
      }
    }

    // Fallback: Try a general image search
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011';

      const response = await fetch(`${baseUrl}/api/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `"${speaker.name}" ${speaker.company || ''} professional headshot photo`,
          context: 'Find a professional headshot or profile photo of this person.',
        })
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = extractProfessionalImage(data.content);

        if (imageUrl) {
          await prisma.speaker.update({
            where: { id: speakerId },
            data: { imageUrl }
          });

          return NextResponse.json({
            success: true,
            imageUrl,
            source: 'web'
          });
        }
      }
    } catch (error) {
      console.error('Error searching for image:', error);
    }

    return NextResponse.json({
      success: false,
      message: 'No profile image found'
    });

  } catch (error) {
    console.error('Error fetching LinkedIn image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile image' },
      { status: 500 }
    );
  }
}

function extractLinkedInImage(content: string): string | null {
  if (!content) return null;

  console.log('Extracting LinkedIn image from content (length:', content.length, ')');

  // LinkedIn CDN patterns - more comprehensive
  const patterns = [
    // Modern LinkedIn CDN URLs - most common format
    /https:\/\/media[-.]licdn[-.]com\/dms\/image\/[A-Za-z0-9]+\/[A-Za-z0-9\-_]+/gi,
    /https:\/\/media\.licdn\.com\/dms\/image\/[^"\s<>\\]+/gi,

    // Profile photo specific patterns
    /https:\/\/media[^"]*\/profile-displayphoto[^"\s]*/gi,
    /https:\/\/media[^"]*\/profilepicture[^"\s]*/gi,

    // With query parameters
    /https:\/\/media\.licdn\.com[^"]+\.(jpg|jpeg|png|webp)(\?[^"\s]*)?/gi,

    // Generic LinkedIn media
    /https:\/\/[^\/]*\.licdn\.com\/[^"]*\/(image|photo|picture)\/[^"\s]+/gi,

    // Base64 encoded or escaped URLs
    /https%3A%2F%2Fmedia[^"\s]+licdn[^"\s]+/gi,

    // JSON patterns
    /"profilePicture"[^}]*"displayImage"[^"]*"([^"]+)"/gi,
    /"miniProfile"[^}]*"picture"[^"]*"([^"]+)"/gi,
    /"image":\s*"(https[^"]+licdn[^"]+)"/gi,

    // Open Graph and meta tags
    /property="og:image"\s+content="([^"]+licdn[^"]+)"/gi,
    /content="([^"]+licdn[^"]+)"\s+property="og:image"/gi
  ];

  let foundUrls = [];

  for (const pattern of patterns) {
    const matches = Array.from(content.matchAll(pattern));
    for (const match of matches) {
      const url = match[1] || match[0];

      // Decode URL if needed
      let cleanUrl = url
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/%2F/gi, '/')
        .replace(/%3A/gi, ':')
        .replace(/&amp;/g, '&')
        .replace(/["'<>\\]/g, '')
        .replace(/\\u[\dA-F]{4}/gi, '')
        .trim();

      // Skip if it's not a LinkedIn URL
      if (!cleanUrl.includes('licdn.com')) continue;

      console.log('Found potential LinkedIn image URL:', cleanUrl.substring(0, 100) + '...');
      foundUrls.push(cleanUrl);

      // Validate it's an image URL
      if (cleanUrl.includes('/dms/image/') ||
          cleanUrl.includes('/profile-displayphoto') ||
          cleanUrl.includes('/profilepicture') ||
          cleanUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {

        console.log('Valid LinkedIn image URL found!');
        return cleanUrl;
      }
    }
  }

  console.log(`Checked ${patterns.length} patterns, found ${foundUrls.length} potential URLs`);

  // If we found LinkedIn URLs but none validated, return the first one anyway
  if (foundUrls.length > 0) {
    console.log('Returning first found URL as fallback');
    return foundUrls[0];
  }

  return null;
}

function extractProfessionalImage(content: string): string | null {
  if (!content) return null;

  // Look for professional headshot patterns
  const patterns = [
    // Direct image URLs
    /https?:\/\/[^\s"']+\/[^\s"']*headshot[^\s"']*\.(?:jpg|jpeg|png|webp)/gi,
    /https?:\/\/[^\s"']+\/[^\s"']*profile[^\s"']*\.(?:jpg|jpeg|png|webp)/gi,
    /https?:\/\/[^\s"']+\/[^\s"']*photo[^\s"']*\.(?:jpg|jpeg|png|webp)/gi,

    // Company website patterns
    /https?:\/\/[^\s"']+\/(?:team|about|people|staff)\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi,

    // CDN patterns
    /https?:\/\/[^\s"']*cdn[^\s"']+\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches[0]) {
      const cleanUrl = matches[0]
        .replace(/["'<>]/g, '')
        .trim();

      // Filter out logos and icons
      if (!cleanUrl.includes('logo') &&
          !cleanUrl.includes('icon') &&
          !cleanUrl.includes('favicon')) {
        return cleanUrl;
      }
    }
  }

  return null;
}