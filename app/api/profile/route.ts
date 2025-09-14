import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name || '',
      email: user.email,
      role: user.role || '',
      company: user.company || '',
      organizationType: user.organizationType || '',
      interests: user.interests || [],
      goals: user.goals || [],
      usingSalesforce: user.usingSalesforce || false,
      interestedInSalesforce: user.interestedInSalesforce || false,
      profile: user.profile ? {
        bio: user.profile.bio || '',
        linkedinUrl: user.profile.linkedinUrl || '',
        position: user.profile.position || '',
        yearsExperience: user.profile.yearsExperience || 0,
        timezone: user.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: user.profile.notifications ?? true
      } : {
        bio: '',
        linkedinUrl: '',
        position: '',
        yearsExperience: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: true
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      role,
      company,
      organizationType,
      interests,
      goals,
      usingSalesforce,
      interestedInSalesforce,
      profile
    } = body;

    // Update user information
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        role,
        company,
        organizationType,
        interests,
        goals,
        usingSalesforce,
        interestedInSalesforce
      }
    });

    // Update or create user profile
    if (profile) {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          bio: profile.bio,
          linkedinUrl: profile.linkedinUrl,
          position: profile.position,
          yearsExperience: profile.yearsExperience,
          timezone: profile.timezone,
          notifications: profile.notifications
        },
        create: {
          userId: user.id,
          bio: profile.bio,
          linkedinUrl: profile.linkedinUrl,
          position: profile.position,
          yearsExperience: profile.yearsExperience,
          timezone: profile.timezone,
          notifications: profile.notifications ?? true
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}