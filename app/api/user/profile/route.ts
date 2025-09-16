import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        interests: true,
        goals: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate and clean the data
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.organizationType !== undefined) updateData.organizationType = body.organizationType;
    if (body.interests !== undefined) updateData.interests = body.interests;
    if (body.goals !== undefined) updateData.goals = body.goals;

    // Update the user profile in the database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        organizationType: true,
        interests: true,
        goals: true
      }
    });

    console.log('[Profile API] Updated user profile:', {
      email: session.user.email,
      updates: Object.keys(updateData),
      interests: updateData.interests
    });

    // Revalidate any cached pages
    revalidatePath('/profile');
    revalidatePath('/chat');

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('[Profile API] Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}