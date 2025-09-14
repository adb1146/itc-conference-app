import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import { SmartAgenda } from '@/lib/tools/schedule/types';

// Generate ICS (iCalendar) format
function generateICS(agenda: SmartAgenda): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ITC Vegas 2025//Smart Agenda//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ITC Vegas 2025 - My Agenda',
    'X-WR-TIMEZONE:America/Los_Angeles'
  ];

  // Add all events
  agenda.days.forEach(day => {
    day.schedule.forEach(item => {
      if (item.type === 'session' || item.type === 'meal') {
        const startDate = item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
        const endDate = item.endTime instanceof Date ? item.endTime : new Date(item.endTime);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${item.id}@itcvegas2025.com`);
        lines.push(`DTSTART:${formatICSDate(startDate)}`);
        lines.push(`DTEND:${formatICSDate(endDate)}`);
        lines.push(`SUMMARY:${escapeICS(item.title)}`);

        if (item.description) {
          lines.push(`DESCRIPTION:${escapeICS(item.description)}`);
        }

        if (item.location) {
          lines.push(`LOCATION:${escapeICS(item.location)}`);
        }

        // Add category based on source
        if (item.source === 'user-favorite') {
          lines.push('CATEGORIES:Favorite');
        } else if (item.source === 'ai-suggested') {
          lines.push('CATEGORIES:AI Suggested');
        }

        lines.push('END:VEVENT');
      }
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Convert 12-hour time to 24-hour format
function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');

  if (hours === '12') {
    hours = '00';
  }

  if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }

  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

// Format date for ICS
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters for ICS
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Generate HTML for PDF or email
function generateHTML(agenda: SmartAgenda): string {
  const sessionsByDay = agenda.days.map(day => {
    const dayDate = new Date(day.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const scheduleHTML = day.schedule.map(item => {
      const sourceBadge = item.source === 'user-favorite'
        ? '<span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 12px; font-size: 12px;">⭐ Your Favorite</span>'
        : item.source === 'ai-suggested'
        ? '<span style="background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 12px; font-size: 12px;">🤖 AI Suggested</span>'
        : '';

      return `
        <div style="margin-bottom: 20px; padding: 15px; background: ${
          item.source === 'user-favorite' ? '#FFFBEB' :
          item.source === 'ai-suggested' ? '#EFF6FF' :
          '#F9FAFB'
        }; border: 1px solid ${
          item.source === 'user-favorite' ? '#FCD34D' :
          item.source === 'ai-suggested' ? '#93C5FD' :
          '#E5E7EB'
        }; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #111827; font-size: 16px;">${item.title}</h3>
            ${sourceBadge}
          </div>
          ${item.description ? `<p style="color: #6B7280; font-size: 14px; margin: 10px 0;">${item.description}</p>` : ''}
          <div style="display: flex; gap: 20px; font-size: 14px; color: #6B7280;">
            <span>⏰ ${new Date(item.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(item.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            ${item.location ? `<span>📍 ${item.location}</span>` : ''}
          </div>
          ${item.aiMetadata ? `
            <div style="margin-top: 10px; padding: 10px; background: white; border: 1px solid #DBEAFE; border-radius: 6px;">
              <p style="color: #2563EB; font-size: 12px; margin: 0;">
                💡 <strong>Why this was chosen:</strong> ${item.aiMetadata.reasoning}
              </p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 40px;">
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 20px;">
          Day ${day.dayNumber} - ${dayDate}
        </h2>
        <div style="display: flex; gap: 15px; margin-bottom: 20px; font-size: 14px; color: #6B7280;">
          <span>${day.stats.totalSessions} sessions</span>
          <span style="color: #EAB308;">⭐ ${day.stats.favoritesCovered} favorites</span>
          <span style="color: #3B82F6;">🤖 ${day.stats.aiSuggestions} AI picks</span>
        </div>
        ${scheduleHTML}
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ITC Vegas 2025 - My Smart Agenda</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 { color: #111827; font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #6B7280; font-size: 14px; margin-bottom: 30px; }
        .metrics {
          display: flex;
          gap: 20px;
          padding: 20px;
          background: #F3F4F6;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .metric {
          flex: 1;
          text-align: center;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #111827;
        }
        .metric-label {
          font-size: 12px;
          color: #6B7280;
        }
      </style>
    </head>
    <body>
      <h1>🎯 Your Smart Conference Agenda</h1>
      <p class="subtitle">Generated on ${new Date(agenda.generatedAt).toLocaleString()}</p>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${agenda.metrics.favoritesIncluded}/${agenda.metrics.totalFavorites}</div>
          <div class="metric-label">Favorites Included</div>
        </div>
        <div class="metric">
          <div class="metric-value">${agenda.metrics.aiSuggestionsAdded}</div>
          <div class="metric-label">AI Suggestions</div>
        </div>
        <div class="metric">
          <div class="metric-value">${agenda.metrics.overallConfidence}%</div>
          <div class="metric-label">AI Confidence</div>
        </div>
        <div class="metric">
          <div class="metric-value">${agenda.days.reduce((sum, day) => sum + day.stats.totalSessions, 0)}</div>
          <div class="metric-label">Total Sessions</div>
        </div>
      </div>

      ${agenda.suggestions.length > 0 ? `
        <div style="padding: 15px; background: #EFF6FF; border: 1px solid #93C5FD; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #2563EB; font-size: 16px; margin: 0 0 10px 0;">✨ AI Insights</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1E40AF;">
            ${agenda.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${sessionsByDay}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px;">
        <p>Generated by ITC Vegas 2025 Smart Agenda Builder</p>
        <p>Visit <a href="https://itcvegas2025.com" style="color: #3B82F6;">itcvegas2025.com</a> for more information</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { format, agenda } = body as { format: 'ics' | 'pdf' | 'email', agenda: SmartAgenda };

    if (!agenda) {
      return NextResponse.json(
        { error: 'Agenda data is required' },
        { status: 400 }
      );
    }

    switch (format) {
      case 'ics': {
        const icsContent = generateICS(agenda);
        return new NextResponse(icsContent, {
          headers: {
            'Content-Type': 'text/calendar',
            'Content-Disposition': 'attachment; filename="itc-vegas-2025-agenda.ics"'
          }
        });
      }

      case 'pdf': {
        // For PDF, we'll return HTML that can be converted client-side or server-side
        const htmlContent = generateHTML(agenda);
        return NextResponse.json({
          success: true,
          html: htmlContent,
          filename: 'itc-vegas-2025-agenda.pdf'
        });
      }

      case 'email': {
        // For email, we'll prepare the content but actual sending would need email service integration
        const htmlContent = generateHTML(agenda);

        // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
        // For now, we'll return the prepared content
        return NextResponse.json({
          success: true,
          message: 'Email content prepared',
          subject: 'Your ITC Vegas 2025 Smart Agenda',
          html: htmlContent,
          recipient: session.user.email
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid export format' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error exporting agenda:', error);
    return NextResponse.json(
      { error: 'Failed to export agenda' },
      { status: 500 }
    );
  }
}