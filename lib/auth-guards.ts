import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * Check if the current user is an admin
 * Returns the user object if admin, null otherwise
 */
export async function getAdminUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true
    }
  });

  return user?.isAdmin ? user : null;
}

/**
 * Middleware to check if user is admin
 * Returns NextResponse error if not admin
 */
export async function requireAdmin() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  return adminUser;
}

/**
 * Check if the current user is authenticated
 * Returns the user object if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
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

  return user;
}

/**
 * Middleware to check if user is authenticated
 * Returns NextResponse error if not authenticated
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  return user;
}