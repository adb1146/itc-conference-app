import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';
import {
  checkSessionConflicts,
  detectConflictsWithAgenda,
  flattenSmartAgenda,
  suggestAlternatives
} from '@/lib/services/conflict-detector';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, sessionIds, includeAlternatives = false } = await req.json();

    if (!sessionId && (!sessionIds || !Array.isArray(sessionIds))) {
      return NextResponse.json({
        error: 'Either sessionId or sessionIds array is required'
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // First, let's check all agendas for this user
    const allAgendas = await prisma.personalizedAgenda.findMany({
      where: {
        userId: user.id
      }
    });
    console.log('[Conflict Check] Total agendas for user:', allAgendas.length);
    allAgendas.forEach(agenda => {
      console.log(`[Conflict Check] Agenda: id=${agenda.id}, isActive=${agenda.isActive}, generatedBy=${agenda.generatedBy}`);
    });

    // Get user's active smart agenda
    const activeAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent'
      }
    });

    console.log('[Conflict Check] Active agenda found:', !!activeAgenda);
    if (activeAgenda) {
      console.log('[Conflict Check] Agenda ID:', activeAgenda.id);
      console.log('[Conflict Check] Agenda generatedBy:', activeAgenda.generatedBy);
      console.log('[Conflict Check] Agenda isActive:', activeAgenda.isActive);
      console.log('[Conflict Check] Agenda data exists:', !!activeAgenda.agendaData);
      if (activeAgenda.agendaData) {
        console.log('[Conflict Check] Agenda data type:', typeof activeAgenda.agendaData);
        const dataStr = JSON.stringify(activeAgenda.agendaData);
        console.log('[Conflict Check] Agenda data length:', dataStr.length);
        console.log('[Conflict Check] Agenda data sample:', dataStr.substring(0, 500));

        // Check the structure
        const agendaObj = activeAgenda.agendaData as any;
        console.log('[Conflict Check] Has days property:', !!agendaObj.days);
        if (agendaObj.days) {
          console.log('[Conflict Check] Days is array:', Array.isArray(agendaObj.days));
          console.log('[Conflict Check] Days count:', agendaObj.days.length);
          if (agendaObj.days.length > 0) {
            console.log('[Conflict Check] First day has schedule:', !!agendaObj.days[0].schedule);
            if (agendaObj.days[0].schedule) {
              console.log('[Conflict Check] First day schedule items:', agendaObj.days[0].schedule.length);
            }
          }
        }
      }
    }

    if (!activeAgenda || !activeAgenda.agendaData) {
      console.log('[Conflict Check] No active agenda - returning early');
      return NextResponse.json({
        hasAgenda: false,
        message: 'No active Smart Agenda found',
        conflicts: []
      });
    }

    // Handle single session check
    if (sessionId) {
      const sessionToCheck = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!sessionToCheck) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const conflictCheck = await checkSessionConflicts(sessionToCheck, activeAgenda.agendaData, prisma);

      // Find alternatives if requested and conflicts exist
      let alternatives = [];
      if (includeAlternatives && conflictCheck.hasConflicts) {
        const allSessions = await prisma.session.findMany();

        const agendaItems = await flattenSmartAgenda(activeAgenda.agendaData, prisma);
        alternatives = suggestAlternatives(sessionToCheck, allSessions, agendaItems);
      }

      return NextResponse.json({
        hasAgenda: true,
        sessionId,
        ...conflictCheck,
        alternatives
      });
    }

    // Handle multiple sessions check
    const sessionsToCheck = await prisma.session.findMany({
      where: {
        id: { in: sessionIds }
      }
    });

    console.log('[Conflict Check] Sessions to check:', sessionsToCheck.length);
    console.log('[Conflict Check] Session IDs:', sessionIds);

    const agendaItems = await flattenSmartAgenda(activeAgenda.agendaData, prisma);
    console.log('[Conflict Check] Agenda items count:', agendaItems.length);

    // Extra debugging to see what we're getting
    if (agendaItems.length === 0 && activeAgenda.agendaData) {
      const agendaObj = activeAgenda.agendaData as any;
      if (agendaObj.days?.[0]?.schedule?.[0]) {
        const firstItem = agendaObj.days[0].schedule[0];
        console.log('[Conflict Check] First schedule item structure:', {
          hasItem: !!firstItem.item,
          hasId: !!firstItem.id,
          hasType: !!firstItem.type,
          hasStartTime: !!firstItem.startTime,
          hasEndTime: !!firstItem.endTime,
          itemKeys: Object.keys(firstItem),
          itemDetails: firstItem.item ? {
            hasId: !!firstItem.item.id,
            hasStartTime: !!firstItem.item.startTime,
            hasEndTime: !!firstItem.item.endTime,
            itemStartTime: firstItem.item.startTime,
            itemEndTime: firstItem.item.endTime,
            itemKeys: Object.keys(firstItem.item)
          } : null,
          scheduleStartTime: firstItem.startTime,
          scheduleEndTime: firstItem.endTime,
          scheduleType: firstItem.type,
          time: firstItem.time,
          endTime: firstItem.endTime
        });
      }
    }

    const results = [];

    for (const sessionToCheck of sessionsToCheck) {
      const conflictCheck = detectConflictsWithAgenda(sessionToCheck, agendaItems);
      console.log(`[Conflict Check] Session "${sessionToCheck.title}":`, {
        hasConflicts: conflictCheck.hasConflicts,
        totalConflicts: conflictCheck.totalConflicts
      });
      results.push({
        sessionId: sessionToCheck.id,
        sessionTitle: sessionToCheck.title,
        ...conflictCheck
      });
    }

    const response = {
      hasAgenda: true,
      results,
      totalConflicts: results.reduce((sum, r) => sum + r.totalConflicts, 0)
    };

    console.log('[Conflict Check] Final response:', {
      totalConflicts: response.totalConflicts,
      resultsCount: response.results.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({
      error: 'Failed to check conflicts'
    }, { status: 500 });
  }
}

// GET endpoint to check if user has an active agenda
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has an active smart agenda
    const activeAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        generatedBy: 'ai_agent'
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    if (!activeAgenda) {
      return NextResponse.json({
        hasAgenda: false,
        message: 'No active Smart Agenda found'
      });
    }

    // Get conflict summary
    const agendaSessions = await prisma.agendaSession.count({
      where: { agendaId: activeAgenda.id }
    });

    const favoriteSessions = await prisma.favorite.count({
      where: {
        userId: user.id,
        type: 'session'
      }
    });

    return NextResponse.json({
      hasAgenda: true,
      agendaId: activeAgenda.id,
      version: activeAgenda.version,
      createdAt: activeAgenda.createdAt,
      updatedAt: activeAgenda.updatedAt,
      stats: {
        agendaSessions,
        favoriteSessions
      }
    });

  } catch (error) {
    console.error('Error checking agenda status:', error);
    return NextResponse.json({
      error: 'Failed to check agenda status'
    }, { status: 500 });
  }
}