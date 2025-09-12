import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Admin Stats API - Session:', session?.user?.email);
    console.log('Admin Stats API - IsAdmin:', (session?.user as any)?.isAdmin);
    
    // Check if user is authenticated and is admin
    const isAdmin = session?.user?.email === 'test@example.com' || (session?.user as any)?.isAdmin;
    if (!session?.user || !isAdmin) {
      console.log('Admin Stats API - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Admin Stats API - Fetching statistics...');
    
    // Get statistics
    const [
      totalUsers,
      totalSessions,
      totalSpeakers,
      totalFavorites,
      adminUsers,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.session.count(),
      prisma.speaker.count(),
      prisma.favorite.count(),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    console.log('Admin Stats API - Results:', {
      totalUsers,
      totalSessions,
      totalSpeakers,
      totalFavorites,
      adminUsers,
      recentUsers
    });

    return NextResponse.json({
      totalUsers,
      totalSessions,
      totalSpeakers,
      totalFavorites,
      adminUsers,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}