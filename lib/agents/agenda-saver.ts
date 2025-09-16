/**
 * Agenda Saver - Saves generated agendas to user profiles
 */

import prisma from '@/lib/db';
import { getPendingAgenda } from '@/lib/conversation-state';

/**
 * Save a pending agenda to the user's profile
 */
export async function saveAgendaToProfile(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message: string; agendaId?: string }> {
  try {
    // Get the pending agenda from session
    const pendingAgenda = getPendingAgenda(sessionId);

    if (!pendingAgenda) {
      return {
        success: false,
        message: 'No agenda found to save. Please generate an agenda first.'
      };
    }

    // Check if user already has an agenda
    const existingAgenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId,
        isActive: true
      }
    });

    let savedAgenda;

    if (existingAgenda) {
      // Update existing agenda
      savedAgenda = await prisma.personalizedAgenda.update({
        where: { id: existingAgenda.id },
        data: {
          agendaData: pendingAgenda,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new agenda
      savedAgenda = await prisma.personalizedAgenda.create({
        data: {
          userId,
          agendaData: pendingAgenda,
          isActive: true,
          generatedBy: 'ai_agent'
        }
      });
    }

    // Also update user's interests based on agenda
    if (pendingAgenda.metadata?.interests) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          interests: pendingAgenda.metadata.interests
        }
      });
    }

    return {
      success: true,
      message: 'Your agenda has been saved to your profile!',
      agendaId: savedAgenda.id
    };
  } catch (error) {
    console.error('[Agenda Saver] Failed to save agenda:', error);
    return {
      success: false,
      message: 'Failed to save agenda. Please try again.'
    };
  }
}

/**
 * Get user's saved agenda
 */
export async function getUserSavedAgenda(userId: string) {
  try {
    const agenda = await prisma.personalizedAgenda.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return agenda;
  } catch (error) {
    console.error('[Agenda Saver] Failed to get user agenda:', error);
    return null;
  }
}

/**
 * Export agenda to various formats
 */
export async function exportAgenda(
  agenda: any,
  format: 'ics' | 'pdf' | 'email' = 'ics'
): Promise<{ success: boolean; data?: string; message?: string }> {
  try {
    switch (format) {
      case 'ics':
        // Generate ICS calendar file
        const icsContent = generateICSContent(agenda);
        return {
          success: true,
          data: icsContent
        };

      case 'email':
        // Format for email
        const emailContent = generateEmailContent(agenda);
        return {
          success: true,
          data: emailContent
        };

      default:
        return {
          success: false,
          message: 'Unsupported format'
        };
    }
  } catch (error) {
    console.error('[Agenda Saver] Failed to export agenda:', error);
    return {
      success: false,
      message: 'Failed to export agenda'
    };
  }
}

/**
 * Generate ICS calendar file content
 */
function generateICSContent(agenda: any): string {
  let ics = 'BEGIN:VCALENDAR\n';
  ics += 'VERSION:2.0\n';
  ics += 'PRODID:-//ITC Vegas 2025//EN\n';
  ics += 'CALSCALE:GREGORIAN\n';
  ics += 'METHOD:PUBLISH\n';

  if (agenda.sessions && Array.isArray(agenda.sessions)) {
    agenda.sessions.forEach((session: any) => {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${session.id || Math.random().toString(36)}\n`;
      ics += `SUMMARY:${session.title}\n`;
      ics += `DESCRIPTION:${session.description || ''}\n`;
      ics += `LOCATION:${session.location || 'Mandalay Bay, Las Vegas'}\n`;

      const startDate = new Date(session.startTime);
      const endDate = new Date(session.endTime || startDate.getTime() + 60 * 60 * 1000);

      ics += `DTSTART:${formatDateForICS(startDate)}\n`;
      ics += `DTEND:${formatDateForICS(endDate)}\n`;
      ics += 'END:VEVENT\n';
    });
  }

  ics += 'END:VCALENDAR\n';
  return ics;
}

/**
 * Format date for ICS file
 */
function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate email content
 */
function generateEmailContent(agenda: any): string {
  let content = 'Your ITC Vegas 2025 Personalized Agenda\n';
  content += '=========================================\n\n';

  const days = ['Tuesday, Oct 14', 'Wednesday, Oct 15', 'Thursday, Oct 16'];

  days.forEach((day, index) => {
    content += `${day}\n`;
    content += '-------------------\n';

    const daySessions = agenda.sessions?.filter((s: any) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate.getDate() === (14 + index);
    }) || [];

    if (daySessions.length > 0) {
      daySessions.forEach((session: any) => {
        const startTime = new Date(session.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        content += `${startTime} - ${session.title}\n`;
        content += `Location: ${session.location || 'Mandalay Bay'}\n`;

        if (session.speakers?.length > 0) {
          const speakerNames = session.speakers
            .map((s: any) => s.speaker?.name || s.name)
            .filter(Boolean)
            .join(', ');
          if (speakerNames) {
            content += `Speakers: ${speakerNames}\n`;
          }
        }

        content += '\n';
      });
    } else {
      content += 'No sessions scheduled\n\n';
    }
  });

  content += '\nPowered by ITC Vegas 2025 AI Conference Concierge\n';
  return content;
}