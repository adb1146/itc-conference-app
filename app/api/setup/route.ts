import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Check if database already has data
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return NextResponse.json({ 
        message: 'Database already initialized',
        users: userCount 
      });
    }

    console.log('🚀 Starting one-time database setup...');
    
    // Read the export file
    const exportsDir = path.join(process.cwd(), 'data', 'exports');
    const filepath = path.join(exportsDir, 'latest-export.json');
    
    console.log(`📁 Reading from: ${filepath}`);
    
    const fileContent = await fs.readFile(filepath, 'utf-8');
    const exportData = JSON.parse(fileContent);
    
    const metadata = exportData.metadata;
    console.log(`📊 Export metadata:`, metadata);
    
    // Import speakers
    console.log('👥 Importing speakers...');
    if (exportData.data.speakers?.length > 0) {
      await prisma.speaker.createMany({
        data: exportData.data.speakers
      });
    }
    
    // Import sessions
    console.log('📅 Importing sessions...');
    if (exportData.data.sessions?.length > 0) {
      await prisma.session.createMany({
        data: exportData.data.sessions
      });
    }
    
    // Import session-speaker relationships
    console.log('🔗 Importing session-speaker relationships...');
    if (exportData.data.sessionSpeakers?.length > 0) {
      await prisma.sessionSpeaker.createMany({
        data: exportData.data.sessionSpeakers
      });
    }
    
    // Import users
    console.log('👤 Importing users...');
    if (exportData.data.users?.length > 0) {
      await prisma.user.createMany({
        data: exportData.data.users
      });
    }
    
    // Import favorites
    console.log('⭐ Importing favorites...');
    if (exportData.data.favorites?.length > 0) {
      await prisma.favorite.createMany({
        data: exportData.data.favorites
      });
    }
    
    // Get final counts
    const finalCounts = {
      speakers: await prisma.speaker.count(),
      sessions: await prisma.session.count(),
      sessionSpeakers: await prisma.sessionSpeaker.count(),
      users: await prisma.user.count(),
      favorites: await prisma.favorite.count()
    };
    
    console.log('✅ Setup completed successfully!');
    console.log('📊 Final database counts:', finalCounts);
    
    return NextResponse.json({
      success: true,
      message: 'One-time setup completed successfully',
      imported: metadata.counts,
      final: finalCounts,
      note: 'You can now login with test@example.com / password123'
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return NextResponse.json(
      { 
        error: 'Setup failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}