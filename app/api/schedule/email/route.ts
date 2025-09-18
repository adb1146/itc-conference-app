import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to email your schedule' },
        { status: 401 }
      );
    }

    // Check if agenda data was sent in the request
    const body = await request.json().catch(() => null);
    const hasAgendaData = body?.agenda?.days?.length > 0;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      include: {
        personalizedAgendas: {
          where: { isActive: true },
          include: {
            sessions: {
              include: {
                session: {
                  include: {
                    speakers: {
                      include: {
                        speaker: true
                      }
                    }
                  }
                }
              },
              orderBy: [
                { dayNumber: 'asc' },
                { priority: 'desc' }
              ]
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let schedule;

    // Check if agenda data was provided in the request (from Smart Agenda page)
    if (hasAgendaData) {
      // Format smart agenda data for email
      const dayMap: { [key: number]: string } = {
        1: 'October 14, 2025',
        2: 'October 15, 2025',
        3: 'October 16, 2025'
      };

      schedule = body.agenda.days.map((day: any) => ({
        day: dayMap[day.dayNumber] || `Day ${day.dayNumber}`,
        sessions: day.schedule.map((item: any) => ({
          title: item.item.title,
          time: `${item.time} - ${item.endTime}`,
          location: item.item.location || 'TBD',
          speakers: item.item.speakers,
          description: item.item.description?.substring(0, 200) || undefined
        }))
      }));
    } else {
      // Fallback to database-stored agenda
      const activeAgenda = user.personalizedAgendas[0];
      if (!activeAgenda || activeAgenda.sessions.length === 0) {
        return NextResponse.json(
          { error: 'No personalized schedule found. Please create a schedule first.' },
          { status: 404 }
        );
      }

      // Group sessions by day
      const sessionsByDay = activeAgenda.sessions.reduce((acc, agendaSession) => {
        const dayMap: { [key: number]: string } = {
          1: 'October 14, 2025',
          2: 'October 15, 2025',
          3: 'October 16, 2025'
        };

        const day = dayMap[agendaSession.dayNumber];
        if (!acc[day]) {
          acc[day] = [];
        }

        const session = agendaSession.session;
        acc[day].push({
          title: session.title,
          time: session.time,
          location: session.location || 'TBD',
          speakers: session.speakers.map(s => s.speaker.name),
          description: session.description?.substring(0, 200) || undefined,
          priority: agendaSession.priority
        });

        return acc;
      }, {} as Record<string, any[]>);

      // Sort sessions within each day by priority
      Object.keys(sessionsByDay).forEach(day => {
        sessionsByDay[day].sort((a, b) => b.priority - a.priority);
      });

      // Format for email
      schedule = Object.entries(sessionsByDay).map(([day, sessions]) => ({
        day,
        sessions: sessions.map(s => ({
          title: s.title,
          time: s.time,
          location: s.location,
          speakers: s.speakers.length > 0 ? s.speakers : undefined,
          description: s.description
        }))
      }));
    }

    // Send the email
    const result = await emailService.sendScheduleEmail({
      name: user.name || 'Conference Attendee',
      email: user.email,
      schedule
    });

    if (result.error) {
      console.error('Failed to send schedule email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }

    // Calculate total sessions count
    const sessionsCount = schedule.reduce((acc, day) => acc + day.sessions.length, 0);

    return NextResponse.json({
      success: true,
      message: `Your personalized schedule has been sent to ${user.email}`,
      sessionsCount
    });

  } catch (error) {
    console.error('Error in schedule email endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}