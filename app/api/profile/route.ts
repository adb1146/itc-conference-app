import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        interests: user.interests,
        goals: user.goals,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        role: data.role,
        company: data.company,
        interests: data.interests,
        goals: data.goals
      },
      include: {
        profile: true
      }
    });

    // Update or create user profile
    if (data.profileData) {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          bio: data.profileData.bio,
          experience: data.profileData.experience,
          contactPreferences: data.profileData.contactPreferences,
          networkingGoals: data.profileData.networkingGoals,
          conferenceGoals: data.profileData.conferenceGoals
        },
        create: {
          userId: user.id,
          bio: data.profileData.bio,
          experience: data.profileData.experience,
          contactPreferences: data.profileData.contactPreferences,
          networkingGoals: data.profileData.networkingGoals,
          conferenceGoals: data.profileData.conferenceGoals
        }
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true
      }
    });

    return NextResponse.json({ 
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
        company: updatedUser!.company,
        interests: updatedUser!.interests,
        goals: updatedUser!.goals,
        profile: updatedUser!.profile
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}