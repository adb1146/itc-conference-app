/**
 * Meal Session Response Formatter
 * Formats meal and food-related sessions with enhanced information
 */

export interface MealSession {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  track?: string | null;
  speakers?: any[];
}

/**
 * Determine the meal type from session title/description
 */
function getMealType(session: MealSession): string {
  const text = `${session.title} ${session.description || ''}`.toLowerCase();

  if (text.includes('breakfast')) return 'Breakfast';
  if (text.includes('lunch')) return 'Lunch';
  if (text.includes('dinner')) return 'Dinner';
  if (text.includes('reception')) return 'Reception';
  if (text.includes('coffee')) return 'Coffee Break';
  if (text.includes('snack')) return 'Snack Break';
  if (text.includes('happy hour')) return 'Happy Hour';

  return 'Food Service';
}

/**
 * Extract dietary options from description
 */
function getDietaryOptions(description: string | null | undefined): string[] {
  if (!description) return [];

  const options: string[] = [];
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('vegetarian')) options.push('Vegetarian');
  if (lowerDesc.includes('vegan')) options.push('Vegan');
  if (lowerDesc.includes('gluten')) options.push('Gluten-Free');
  if (lowerDesc.includes('kosher')) options.push('Kosher');
  if (lowerDesc.includes('halal')) options.push('Halal');

  return options;
}

/**
 * Format time for display
 */
function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format meal sessions with rich information
 */
export function formatMealResponse(sessions: MealSession[], query: string): string {
  if (!sessions || sessions.length === 0) {
    return `I couldn't find specific meal information for "${query}". Please check the conference agenda or ask about specific meal times (breakfast, lunch, or dinner).`;
  }

  let response = '🍽️ **Conference Meal Information**\n\n';

  // Group sessions by meal type
  const groupedMeals = sessions.reduce((acc, session) => {
    const mealType = getMealType(session);
    if (!acc[mealType]) acc[mealType] = [];
    acc[mealType].push(session);
    return acc;
  }, {} as Record<string, MealSession[]>);

  // Format each meal group
  Object.entries(groupedMeals).forEach(([mealType, mealSessions]) => {
    response += `### ${mealType}\n\n`;

    mealSessions.forEach(session => {
      // Create clickable link to session
      response += `📍 **[${session.title}](/agenda/session/${session.id})**\n`;

      // Add time and location
      if (session.startTime) {
        const date = formatDate(session.startTime);
        const startTime = formatTime(session.startTime);
        const endTime = session.endTime ? formatTime(session.endTime) : '';

        response += `⏰ ${date}`;
        if (startTime) {
          response += ` • ${startTime}`;
          if (endTime) response += ` - ${endTime}`;
        }
        response += '\n';
      }

      if (session.location) {
        response += `📍 Location: ${session.location}\n`;
      }

      // Add description excerpt
      if (session.description) {
        const excerpt = session.description.length > 200
          ? session.description.substring(0, 200) + '...'
          : session.description;
        response += `*${excerpt}*\n`;
      }

      // Add dietary options if found
      const dietaryOptions = getDietaryOptions(session.description);
      if (dietaryOptions.length > 0) {
        response += `🥗 Dietary Options: ${dietaryOptions.join(', ')}\n`;
      }

      // Add track information if relevant
      if (session.track && session.track !== 'General') {
        response += `🏷️ Track: ${session.track}\n`;
      }

      response += '\n';
    });
  });

  // Add helpful tips
  response += '---\n\n';
  response += '💡 **Tips:**\n';
  response += '• All conference meals are included with your registration\n';
  response += '• Dietary restrictions? Contact conference services\n';
  response += '• Click any meal session above for full details\n';
  response += '• Looking for restaurants? Ask "What restaurants are at Mandalay Bay?"\n';

  return response;
}

/**
 * Format a simple meal list for quick reference
 */
export function formatQuickMealList(sessions: MealSession[]): string {
  if (!sessions || sessions.length === 0) {
    return 'No meal sessions found.';
  }

  let response = '**Quick Meal Schedule:**\n\n';

  // Sort by start time
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  let lastDate = '';
  sortedSessions.forEach(session => {
    if (session.startTime) {
      const date = formatDate(session.startTime);
      const time = formatTime(session.startTime);

      // Add date header if changed
      if (date !== lastDate) {
        response += `\n**${date}**\n`;
        lastDate = date;
      }

      const mealType = getMealType(session);
      response += `• ${time} - ${mealType}: [${session.title}](/agenda/session/${session.id})`;

      if (session.location) {
        response += ` (${session.location})`;
      }
      response += '\n';
    }
  });

  return response;
}