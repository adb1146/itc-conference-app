import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug logging
    console.log('Admin Users API - Session:', session?.user?.email);
    console.log('Admin Users API - IsAdmin:', (session?.user as any)?.isAdmin);
    
    // Check if user is authenticated
    if (!session?.user) {
      console.log('Admin Users API - Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!(session?.user as any)?.isAdmin) {
      console.log('Admin Users API - Unauthorized: Not admin');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simple query without any complex relations
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform to match expected format
    const usersWithCount = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      _count: {
        favorites: 0
      }
    }));
    
    console.log('Admin Users API - Returning', usersWithCount.length, 'users');

    return NextResponse.json(usersWithCount);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
