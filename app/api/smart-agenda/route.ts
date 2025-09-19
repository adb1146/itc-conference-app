import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Retrieve the user's active smart agenda
export async function GET(req: NextRequest) {
  try {
    console.log('[Smart Agenda API] GET request received');
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log('[Smart Agenda API] No authenticated session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Smart Agenda API] Session user:', session.user.email);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the active agenda for the user
    const activeAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent' // Only get AI-generated smart agendas
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeAgenda) {
      console.log('[Smart Agenda API] No active agenda found for user:', user.id);
      return NextResponse.json({ agenda: null }, { status: 200 });
    }

    console.log('[Smart Agenda API] Found active agenda:', activeAgenda.id);

    // Return the agenda data with cache headers
    const response = NextResponse.json({
      agenda: activeAgenda.agendaData,
      metadata: activeAgenda.metadata,
      version: activeAgenda.version,
      createdAt: activeAgenda.createdAt,
      updatedAt: activeAgenda.updatedAt
    });

    // Set cache headers - private, short cache with revalidation
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30');
    response.headers.set('X-Cache-Version', String(activeAgenda.version));

    return response;

  } catch (error) {
    console.error('Error fetching smart agenda:', error);
    return NextResponse.json(
      { error: 'Failed to fetch smart agenda' },
      { status: 500 }
    );
  }
}

// POST - Save a new smart agenda
export async function POST(req: NextRequest) {
  try {
    console.log('[Smart Agenda API] POST request received');
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agenda, metadata, researchProfile } = body;

    console.log('[Smart Agenda API] POST body received with agenda days:', agenda?.days?.length);

    if (!agenda) {
      console.log('[Smart Agenda API] No agenda data in request');
      return NextResponse.json({ error: 'Agenda data is required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Deactivate any existing active agendas for this user
    await prisma.personalizedAgenda.updateMany({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent'
      },
      data: {
        isActive: false
      }
    });

    // Get the next version number
    const lastAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        generatedBy: 'ai_agent'
      },
      orderBy: {
        version: 'desc'
      }
    });

    const nextVersion = (lastAgenda?.version || 0) + 1;

    // Create the new agenda
    console.log('[Smart Agenda API] Creating new agenda for user:', user.id, 'version:', nextVersion);
    const newAgenda = await prisma.personalizedAgenda.create({
      data: {
        userId: user.id,
        title: `Smart Agenda v${nextVersion}`,
        description: 'AI-generated personalized conference schedule',
        agendaData: agenda,
        metadata: metadata || {},
        isActive: true,
        version: nextVersion,
        generatedBy: 'ai_agent',
        researchProfile: researchProfile || null
      }
    });

    console.log('[Smart Agenda API] Created new agenda with ID:', newAgenda.id);

    // Extract sessions from the agenda and create AgendaSession records
    if (agenda.days && Array.isArray(agenda.days)) {
      const agendaSessions = [];

      for (const day of agenda.days) {
        if (day.schedule && Array.isArray(day.schedule)) {
          for (const item of day.schedule) {
            if (item.type === 'session' && item.id) {
              // Extract session ID (remove 'item-' prefix if present)
              const sessionId = item.id.replace('item-', '');

              // Check if this session exists in the database
              const sessionExists = await prisma.session.findUnique({
                where: { id: sessionId }
              });

              if (sessionExists) {
                agendaSessions.push({
                  agendaId: newAgenda.id,
                  sessionId: sessionId,
                  dayNumber: day.dayNumber || 1,
                  priority: item.priority === 'required' ? 100 : item.priority === 'recommended' ? 85 : 70,
                  isLocked: false,
                  isFavorite: item.source === 'user-favorite',
                  addedReason: item.reason || null,
                  conflictResolved: false,
                  alternativeFor: null
                });
              }
            }
          }
        }
      }

      // Bulk create agenda sessions
      if (agendaSessions.length > 0) {
        await prisma.agendaSession.createMany({
          data: agendaSessions,
          skipDuplicates: true
        });
      }
    }

    // Create an initial version record
    await prisma.agendaVersion.create({
      data: {
        agendaId: newAgenda.id,
        version: 1,
        agendaData: agenda,
        changeDescription: 'Initial AI-generated agenda',
        changedBy: 'ai_agent'
      }
    });

    console.log('[Smart Agenda API] Successfully saved agenda:', newAgenda.id);
    return NextResponse.json({
      success: true,
      agendaId: newAgenda.id,
      version: newAgenda.version,
      message: 'Smart agenda saved successfully'
    });

  } catch (error) {
    console.error('Error saving smart agenda:', error);
    return NextResponse.json(
      { error: 'Failed to save smart agenda' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing smart agenda
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agenda, metadata, changeDescription } = body;

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda data is required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the active agenda
    const activeAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent'
      }
    });

    if (!activeAgenda) {
      // No active agenda, create a new one
      return POST(req);
    }

    // Update the existing agenda
    const updatedAgenda = await prisma.personalizedAgenda.update({
      where: { id: activeAgenda.id },
      data: {
        agendaData: agenda,
        metadata: metadata || activeAgenda.metadata,
        updatedAt: new Date()
      }
    });

    // Get the next version number for this agenda
    const lastVersion = await prisma.agendaVersion.findFirst({
      where: { agendaId: activeAgenda.id },
      orderBy: { version: 'desc' }
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Create a version record
    await prisma.agendaVersion.create({
      data: {
        agendaId: activeAgenda.id,
        version: nextVersion,
        agendaData: agenda,
        changeDescription: changeDescription || 'Updated smart agenda',
        changedBy: 'user'
      }
    });

    return NextResponse.json({
      success: true,
      agendaId: updatedAgenda.id,
      version: nextVersion,
      message: 'Smart agenda updated successfully'
    });

  } catch (error) {
    console.error('Error updating smart agenda:', error);
    return NextResponse.json(
      { error: 'Failed to update smart agenda' },
      { status: 500 }
    );
  }
}

// DELETE - Delete the user's active smart agenda
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find and delete the active agenda
    const activeAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent'
      }
    });

    if (!activeAgenda) {
      return NextResponse.json({ error: 'No active agenda found' }, { status: 404 });
    }

    // Delete the agenda (cascades to AgendaSession and AgendaVersion)
    await prisma.personalizedAgenda.delete({
      where: { id: activeAgenda.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Smart agenda deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting smart agenda:', error);
    return NextResponse.json(
      { error: 'Failed to delete smart agenda' },
      { status: 500 }
    );
  }
}