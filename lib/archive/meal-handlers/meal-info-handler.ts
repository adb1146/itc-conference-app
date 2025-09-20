/**
 * Meal Information Handler
 * Intelligently provides meal information and recommendations
 */

import { PrismaClient } from '@prisma/client';
import { 
  detectMealQuery, 
  identifyMealSessions, 
  getMealRecommendations,
  formatMealType,
  type MealDetectionResult,
  type MealSession 
} from './meal-session-detector';

const prisma = new PrismaClient();

interface MealResponse {
  type: 'conference-meals' | 'external-dining' | 'combined';
  conferenceMeals?: {
    current: MealSession[];
    upcoming: MealSession[];
    today: MealSession[];
    byDay: Map<number, MealSession[]>;
  };
  externalOptions?: {
    restaurants: any[];
    cafes: any[];
    nearbyOptions: any[];
  };
  recommendations: string[];
  suggestedActions: string[];
}

interface VegasRestaurant {
  name: string;
  type: 'restaurant' | 'cafe' | 'fast-food' | 'buffet';
  cuisine: string;
  location: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  walkingTime: string;
  description: string;
  hours?: string;
}

// Curated list of popular dining options near Mandalay Bay
const VEGAS_DINING_OPTIONS: VegasRestaurant[] = [
  {
    name: "Aureole",
    type: "restaurant",
    cuisine: "American Contemporary",
    location: "Mandalay Bay",
    priceRange: "$$$$",
    walkingTime: "In hotel",
    description: "Award-winning fine dining with extensive wine tower",
    hours: "5:30pm-10pm"
  },
  {
    name: "Border Grill",
    type: "restaurant",
    cuisine: "Mexican",
    location: "Mandalay Bay",
    priceRange: "$$",
    walkingTime: "In hotel",
    description: "Modern Mexican cuisine from celebrity chefs",
    hours: "11am-10pm"
  },
  {
    name: "Citizens Kitchen & Bar",
    type: "restaurant",
    cuisine: "American",
    location: "Mandalay Bay",
    priceRange: "$$",
    walkingTime: "In hotel",
    description: "Contemporary American fare with craft cocktails",
    hours: "7am-11pm"
  },
  {
    name: "Raffles Cafe",
    type: "cafe",
    cuisine: "Coffee & Pastries",
    location: "Mandalay Bay",
    priceRange: "$",
    walkingTime: "In hotel",
    description: "Quick coffee and light bites",
    hours: "6am-6pm"
  },
  {
    name: "Bayside Buffet",
    type: "buffet",
    cuisine: "International",
    location: "Mandalay Bay",
    priceRange: "$$",
    walkingTime: "In hotel",
    description: "All-you-can-eat with global cuisine stations",
    hours: "7am-9pm"
  },
  {
    name: "Lupo by Wolfgang Puck",
    type: "restaurant",
    cuisine: "Italian",
    location: "Mandalay Bay",
    priceRange: "$$$",
    walkingTime: "In hotel",
    description: "Authentic Italian from celebrity chef",
    hours: "5pm-10pm"
  },
  {
    name: "Hussong's Cantina",
    type: "restaurant",
    cuisine: "Mexican",
    location: "Mandalay Bay (Shoppes)",
    priceRange: "$$",
    walkingTime: "2 min",
    description: "Casual Mexican with famous margaritas",
    hours: "11am-11pm"
  },
  {
    name: "Libertine Social",
    type: "restaurant",
    cuisine: "American",
    location: "Mandalay Bay",
    priceRange: "$$",
    walkingTime: "In hotel",
    description: "Gastropub with craft cocktails",
    hours: "11am-midnight"
  }
];

/**
 * Process meal-related queries and provide intelligent responses
 */
export async function handleMealQuery(
  query: string,
  currentTime: Date = new Date(),
  userPreferences?: {
    dietary?: string[];
    pricePreference?: string;
    includeExternal?: boolean;
  }
): Promise<MealResponse> {
  // Detect meal query type and intent
  const detection = detectMealQuery(query);
  
  if (!detection.isMealQuery) {
    return {
      type: 'conference-meals',
      recommendations: [],
      suggestedActions: []
    };
  }

  const response: MealResponse = {
    type: detection.queryType === 'conference-meal' ? 'conference-meals' : 
          detection.queryType === 'external-dining' ? 'external-dining' : 
          'combined',
    recommendations: [],
    suggestedActions: []
  };

  // Get conference meal sessions if needed
  if (detection.queryType === 'conference-meal' || detection.queryType === 'both') {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: 'Breakfast', mode: 'insensitive' } },
          { title: { contains: 'Lunch', mode: 'insensitive' } },
          { title: { contains: 'Dinner', mode: 'insensitive' } },
          { title: { contains: 'Reception', mode: 'insensitive' } },
          { location: { contains: 'Lunch Seminar', mode: 'insensitive' } }
        ]
      },
      orderBy: { startTime: 'asc' }
    });

    const mealSessions = identifyMealSessions(sessions);
    const { upcoming, current, past } = getMealRecommendations(mealSessions, currentTime);

    // Organize by day
    const byDay = new Map<number, MealSession[]>();
    mealSessions.forEach(session => {
      const dayMeals = byDay.get(session.day) || [];
      dayMeals.push(session);
      byDay.set(session.day, dayMeals);
    });

    // Get today's meals
    const currentDay = getConferenceDay(currentTime);
    const todayMeals = currentDay ? (byDay.get(currentDay) || []) : [];

    response.conferenceMeals = {
      current,
      upcoming,
      today: todayMeals,
      byDay
    };

    // Generate recommendations based on meal type and time
    if (current.length > 0) {
      response.recommendations.push(
        `🍽️ **Happening Now:** ${current[0].title} at ${current[0].location}`
      );
      if (current[0].isIncluded) {
        response.recommendations.push('✅ This meal is included with your registration!');
      }
    }

    if (upcoming.length > 0 && detection.timeContext === 'today') {
      const nextMeal = upcoming[0];
      const timeUntil = getTimeUntil(nextMeal.startTime, currentTime);
      response.recommendations.push(
        `⏰ **Next Conference Meal:** ${nextMeal.title} ${timeUntil} at ${nextMeal.location}`
      );
    }

    // Add specific meal type recommendations
    if (detection.mealType && detection.mealType !== 'general') {
      const typedMeals = mealSessions.filter(m => 
        m.type === detection.mealType || 
        (detection.mealType === 'lunch' && m.type === 'lunch-seminar')
      );

      if (typedMeals.length > 0) {
        response.suggestedActions.push(
          `View all ${formatMealType(detection.mealType as any)} sessions in the agenda`
        );
      }
    }
  }

  // Get external dining options if needed
  if (detection.queryType === 'external-dining' || 
      detection.queryType === 'both' || 
      userPreferences?.includeExternal) {
    
    const externalOptions = getExternalDiningOptions(
      detection.mealType,
      currentTime,
      userPreferences
    );

    response.externalOptions = externalOptions;

    // Add external recommendations
    if (detection.queryType === 'external-dining') {
      response.recommendations.push(
        '🍴 **Dining Options at Mandalay Bay:**'
      );
      
      const quickOptions = externalOptions.restaurants.filter(r => r.walkingTime === 'In hotel');
      if (quickOptions.length > 0) {
        response.recommendations.push(
          `Found ${quickOptions.length} restaurants in Mandalay Bay - no travel time needed!`
        );
      }
    }
  }

  // Add contextual suggestions
  if (detection.queryType === 'both') {
    response.suggestedActions.push(
      'Check if meals are included with your registration',
      'View external dining options if you prefer',
      'Set meal preferences in your profile'
    );
  }

  return response;
}

/**
 * Get external dining options based on meal type and preferences
 */
function getExternalDiningOptions(
  mealType?: MealDetectionResult['mealType'],
  currentTime?: Date,
  preferences?: {
    dietary?: string[];
    pricePreference?: string;
  }
): MealResponse['externalOptions'] {
  let restaurants = [...VEGAS_DINING_OPTIONS];
  const cafes = restaurants.filter(r => r.type === 'cafe');
  
  // Filter by meal type
  if (mealType === 'breakfast') {
    restaurants = restaurants.filter(r => 
      r.hours?.includes('7am') || 
      r.hours?.includes('6am') || 
      r.type === 'buffet' ||
      r.type === 'cafe'
    );
  } else if (mealType === 'lunch') {
    restaurants = restaurants.filter(r => 
      r.hours?.includes('11am') || 
      r.hours?.includes('12pm') ||
      r.type === 'buffet'
    );
  } else if (mealType === 'dinner') {
    restaurants = restaurants.filter(r => 
      r.hours?.includes('5pm') || 
      r.hours?.includes('6pm') ||
      r.type === 'buffet'
    );
  }

  // Filter by price preference
  if (preferences?.pricePreference) {
    const maxPrice = preferences.pricePreference;
    restaurants = restaurants.filter(r => 
      r.priceRange.length <= maxPrice.length
    );
  }

  // Sort by walking distance
  restaurants.sort((a, b) => {
    if (a.walkingTime === 'In hotel' && b.walkingTime !== 'In hotel') return -1;
    if (b.walkingTime === 'In hotel' && a.walkingTime !== 'In hotel') return 1;
    return 0;
  });

  return {
    restaurants: restaurants.slice(0, 5),
    cafes: cafes.slice(0, 3),
    nearbyOptions: restaurants.filter(r => r.walkingTime === 'In hotel')
  };
}

/**
 * Get the conference day number from a date
 */
function getConferenceDay(date: Date): number | null {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // ITC Vegas 2025: Oct 14-16
  if (year === 2025 && month === 9) { // October is month 9
    if (day === 14) return 1;
    if (day === 15) return 2;
    if (day === 16) return 3;
  }
  
  return null;
}

/**
 * Get human-readable time until an event
 */
function getTimeUntil(eventTime: Date, currentTime: Date): string {
  const diff = eventTime.getTime() - currentTime.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (minutes < 0) return 'started';
  if (minutes === 0) return 'starting now';
  if (minutes < 60) return `in ${minutes} minutes`;
  if (hours === 1) return 'in 1 hour';
  if (hours < 24) return `in ${hours} hours`;
  
  return `on ${eventTime.toLocaleDateString()}`;
}

/**
 * Format meal response for chat
 */
export function formatMealResponse(response: MealResponse): string {
  const parts: string[] = [];

  // Add recommendations first
  if (response.recommendations.length > 0) {
    parts.push(response.recommendations.join('\n'));
  }

  // Add conference meals
  if (response.conferenceMeals) {
    const { current, upcoming, today } = response.conferenceMeals;

    if (current.length === 0 && upcoming.length > 0) {
      parts.push('\n**📅 Upcoming Conference Meals:**');
      upcoming.slice(0, 3).forEach(meal => {
        const timeStr = meal.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        parts.push(
          `• **${meal.title}** - ${timeStr} at ${meal.location}` +
          (meal.isIncluded ? ' ✅ Included' : '')
        );
      });
    }

    if (today.length > 0 && current.length === 0) {
      parts.push(`\n**Today's Conference Meals (${today.length} total):**`);
      today.forEach(meal => {
        const timeStr = meal.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        parts.push(
          `• **${meal.title}** - ${timeStr} at ${meal.location}`
        );
      });
    }
  }

  // Add external options if present
  if (response.externalOptions && response.type !== 'conference-meals') {
    parts.push('\n**🍽️ Dining Options at Mandalay Bay:**');
    response.externalOptions.restaurants.forEach(restaurant => {
      parts.push(
        `• **${restaurant.name}** (${restaurant.cuisine}) - ${restaurant.priceRange} - ${restaurant.walkingTime}`
      );
    });
  }

  // Add suggested actions
  if (response.suggestedActions.length > 0) {
    parts.push('\n**💡 Suggestions:**');
    response.suggestedActions.forEach(action => {
      parts.push(`• ${action}`);
    });
  }

  return parts.join('\n');
}

/**
 * Check if a session provides a meal
 */
export function sessionProvidesMeal(session: any): boolean {
  const titleLower = session.title?.toLowerCase() || '';
  const locationLower = session.location?.toLowerCase() || '';
  
  return (
    titleLower.includes('breakfast sponsored') ||
    titleLower.includes('lunch sponsored') ||
    titleLower.includes('dinner') ||
    titleLower.includes('reception') ||
    locationLower.includes('lunch seminar')
  );
}

/**
 * Get meal context for embedding generation
 */
export function getMealContextForEmbedding(session: any): string | null {
  if (!sessionProvidesMeal(session)) return null;
  
  const mealSessions = identifyMealSessions([session]);
  if (mealSessions.length === 0) return null;
  
  const meal = mealSessions[0];
  const parts: string[] = [];
  
  parts.push(`This is a ${formatMealType(meal.type)} session`);
  
  if (meal.isIncluded) {
    parts.push('Meal included with registration');
  }
  
  if (meal.sponsor) {
    parts.push(`Sponsored by ${meal.sponsor}`);
  }
  
  if (meal.type === 'lunch-seminar') {
    parts.push('Lunch seminar with educational content and meal provided');
  }
  
  return parts.join('. ');
}