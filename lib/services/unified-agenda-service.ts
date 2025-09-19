import prisma from '@/lib/db';
import { SmartAgenda, DaySchedule } from '@/lib/tools/schedule/types';

export class UnifiedAgendaService {
  /**
   * Add a favorited session to the user's Smart Agenda
   * Finds the best spot in the agenda and handles conflicts
   */
  async addFavoriteToAgenda(userId: string, sessionId: string) {
    try {
      // Get the user's active Smart Agenda
      const activeAgenda = await prisma.personalizedAgenda.findFirst({
        where: {
          userId,
          isActive: true,
          generatedBy: 'ai_agent'
        }
      });

      if (!activeAgenda || !activeAgenda.agendaData) {
        console.log('No active Smart Agenda found for user');
        return { success: false, message: 'No active Smart Agenda' };
      }

      // Get session details
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      if (!session) {
        return { success: false, message: 'Session not found' };
      }

      // Parse the agenda data
      const agendaData = activeAgenda.agendaData as any;

      // Check if session is already in the agenda
      const alreadyInAgenda = this.isSessionInAgenda(agendaData, sessionId);
      if (alreadyInAgenda) {
        // Update the source to indicate it's now a favorite
        this.updateSessionSource(agendaData, sessionId, 'user-favorite');
      } else {
        // Add the session to the appropriate day
        this.addSessionToAgenda(agendaData, session);
      }

      // Update the agenda in the database
      await prisma.personalizedAgenda.update({
        where: { id: activeAgenda.id },
        data: {
          agendaData: agendaData,
          updatedAt: new Date()
        }
      });

      // Also update AgendaSession table for easier querying
      await prisma.agendaSession.upsert({
        where: {
          agendaId_sessionId: {
            agendaId: activeAgenda.id,
            sessionId: sessionId
          }
        },
        update: {
          source: 'user-favorite',
          updatedAt: new Date()
        },
        create: {
          agendaId: activeAgenda.id,
          sessionId: sessionId,
          source: 'user-favorite'
        }
      });

      return { success: true, message: 'Session added to Smart Agenda' };
    } catch (error) {
      console.error('Error adding favorite to agenda:', error);
      return { success: false, message: 'Failed to update Smart Agenda' };
    }
  }

  /**
   * Remove a session from the user's Smart Agenda when unfavorited
   */
  async removeFavoriteFromAgenda(userId: string, sessionId: string) {
    try {
      const activeAgenda = await prisma.personalizedAgenda.findFirst({
        where: {
          userId,
          isActive: true,
          generatedBy: 'ai_agent'
        }
      });

      if (!activeAgenda || !activeAgenda.agendaData) {
        return { success: false, message: 'No active Smart Agenda' };
      }

      // Parse the agenda data
      const agendaData = activeAgenda.agendaData as any;

      // Remove the session from the agenda
      this.removeSessionFromAgenda(agendaData, sessionId);

      // Update the agenda in the database
      await prisma.personalizedAgenda.update({
        where: { id: activeAgenda.id },
        data: {
          agendaData: agendaData,
          updatedAt: new Date()
        }
      });

      // Remove from AgendaSession table
      await prisma.agendaSession.deleteMany({
        where: {
          agendaId: activeAgenda.id,
          sessionId: sessionId
        }
      });

      return { success: true, message: 'Session removed from Smart Agenda' };
    } catch (error) {
      console.error('Error removing favorite from agenda:', error);
      return { success: false, message: 'Failed to update Smart Agenda' };
    }
  }

  /**
   * Sync all user favorites with their Smart Agenda
   */
  async syncFavoritesWithAgenda(userId: string) {
    try {
      // Get all user favorites
      const favorites = await prisma.favorite.findMany({
        where: {
          userId,
          type: 'session'
        }
      });

      // Get active agenda
      const activeAgenda = await prisma.personalizedAgenda.findFirst({
        where: {
          userId,
          isActive: true,
          generatedBy: 'ai_agent'
        }
      });

      if (!activeAgenda || !activeAgenda.agendaData) {
        return { success: false, message: 'No active Smart Agenda' };
      }

      const agendaData = activeAgenda.agendaData as any;
      const favoriteSessionIds = favorites.map(f => f.sessionId).filter(Boolean) as string[];

      // Mark all favorites in the agenda
      for (const sessionId of favoriteSessionIds) {
        if (this.isSessionInAgenda(agendaData, sessionId)) {
          this.updateSessionSource(agendaData, sessionId, 'user-favorite');
        } else {
          // Add missing favorites
          const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
              speakers: {
                include: {
                  speaker: true
                }
              }
            }
          });
          if (session) {
            this.addSessionToAgenda(agendaData, session);
          }
        }
      }

      // Update the agenda
      await prisma.personalizedAgenda.update({
        where: { id: activeAgenda.id },
        data: {
          agendaData: agendaData,
          updatedAt: new Date()
        }
      });

      return { success: true, message: 'Favorites synced with Smart Agenda' };
    } catch (error) {
      console.error('Error syncing favorites:', error);
      return { success: false, message: 'Failed to sync favorites' };
    }
  }

  // Helper methods
  private isSessionInAgenda(agendaData: any, sessionId: string): boolean {
    if (!agendaData.days) return false;

    for (const day of agendaData.days) {
      if (day.schedule) {
        for (const item of day.schedule) {
          if (item.type === 'session' && item.item?.id === sessionId) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private updateSessionSource(agendaData: any, sessionId: string, source: string) {
    if (!agendaData.days) return;

    for (const day of agendaData.days) {
      if (day.schedule) {
        for (const item of day.schedule) {
          if (item.type === 'session' && item.item?.id === sessionId) {
            item.source = source;
            item.isFavorite = source === 'user-favorite';
          }
        }
      }
    }
  }

  private addSessionToAgenda(agendaData: any, session: any) {
    if (!agendaData.days || !session.startTime) return;

    // Determine which day this session belongs to
    const sessionDate = new Date(session.startTime);
    const dayNumber = this.getDayNumber(sessionDate);

    // Find the appropriate day
    const day = agendaData.days.find((d: any) => d.dayNumber === dayNumber);
    if (!day) return;

    // Format the session for the agenda
    const agendaItem = {
      id: `item-${session.id}`,
      type: 'session',
      source: 'user-favorite',
      isFavorite: true,
      time: this.formatTime(session.startTime),
      endTime: this.formatTime(session.endTime),
      item: {
        id: session.id,
        title: session.title,
        description: session.description,
        location: session.location,
        track: session.track,
        speakers: session.speakers?.map((s: any) => ({
          id: s.speaker.id,
          name: s.speaker.name,
          role: s.speaker.role,
          company: s.speaker.company
        }))
      }
    };

    // Add to the schedule, maintaining time order
    if (!day.schedule) day.schedule = [];

    // Find the right position based on time
    const insertIndex = day.schedule.findIndex((item: any) => {
      if (item.time) {
        return this.compareTimeStrings(agendaItem.time, item.time) < 0;
      }
      return false;
    });

    if (insertIndex === -1) {
      day.schedule.push(agendaItem);
    } else {
      day.schedule.splice(insertIndex, 0, agendaItem);
    }

    // Update day stats
    if (day.stats) {
      day.stats.favoritesCount = (day.stats.favoritesCount || 0) + 1;
      day.stats.totalSessions = (day.stats.totalSessions || 0) + 1;
    }
  }

  private removeSessionFromAgenda(agendaData: any, sessionId: string) {
    if (!agendaData.days) return;

    for (const day of agendaData.days) {
      if (day.schedule) {
        const index = day.schedule.findIndex((item: any) =>
          item.type === 'session' && item.item?.id === sessionId
        );

        if (index !== -1) {
          const wasFavorite = day.schedule[index].source === 'user-favorite';
          day.schedule.splice(index, 1);

          // Update day stats
          if (day.stats && wasFavorite) {
            day.stats.favoritesCount = Math.max(0, (day.stats.favoritesCount || 0) - 1);
            day.stats.totalSessions = Math.max(0, (day.stats.totalSessions || 0) - 1);
          }
          return;
        }
      }
    }
  }

  private getDayNumber(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    if (dateStr === '2025-10-14') return 1;
    if (dateStr === '2025-10-15') return 2;
    if (dateStr === '2025-10-16') return 3;
    return 1; // Default to day 1
  }

  private formatTime(dateTime: Date | string): string {
    // Times in database are already in Las Vegas timezone
    // We just need to format them without any timezone conversion
    if (typeof dateTime === 'string') {
      // For ISO strings like "2025-10-15T10:30:00.000Z"
      // The time portion represents Las Vegas time despite the Z suffix
      const match = dateTime.match(/T(\d{2}):(\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = match[2];

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        return `${displayHours}:${minutes} ${period}`;
      }
    }

    // For Date objects, use UTC methods since the times are stored as UTC
    // but represent Las Vegas local time
    const date = new Date(dateTime);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }

  private compareTimeStrings(time1: string, time2: string): number {
    // Convert "9:00 AM" format to comparable values
    const parse = (time: string) => {
      const [timePart, period] = time.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
      return totalMinutes;
    };
    return parse(time1) - parse(time2);
  }
}

export default new UnifiedAgendaService();