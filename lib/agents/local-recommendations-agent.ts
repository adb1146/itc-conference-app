/**
 * Local Recommendations Agent
 * Fast, cached agent for Mandalay Bay venue recommendations
 * Optimized for speed with pre-loaded data
 */

import venueData from '../data/mandalay-bay-venues.json';

export type VenueCategory = 'restaurant' | 'bar' | 'entertainment' | 'activity' | 'all';
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$' | 'any';

interface RecommendationQuery {
  category?: VenueCategory;
  mealTime?: MealTime;
  priceRange?: PriceRange;
  dietary?: string[];
  quickOnly?: boolean;
  walkTime?: number; // max minutes
}

interface Venue {
  name: string;
  cuisine?: string;
  type?: string;
  price: string;
  location: string;
  walk_time: string;
  hours?: string;
  quick_note: string;
  dietary?: string[];
  age_restriction?: string;
  reservations?: string;
  website?: string;
  phone?: string;
}

export class LocalRecommendationsAgent {
  private venues = venueData;

  /**
   * Get recommendations based on query - FAST (no external calls)
   */
  async getRecommendations(query: string): Promise<string> {
    const startTime = Date.now();

    // Quick category detection from query
    const parsedQuery = this.parseQuery(query);

    // Get matching venues
    const recommendations = this.filterVenues(parsedQuery);

    // Format response
    const response = this.formatResponse(recommendations, parsedQuery);

    console.log(`[LocalRecommendations] Response generated in ${Date.now() - startTime}ms`);
    return response;
  }

  /**
   * Parse user query to extract intent - INSTANT
   */
  private parseQuery(query: string): RecommendationQuery {
    const lowerQuery = query.toLowerCase();
    const result: RecommendationQuery = {};

    // Detect category
    if (lowerQuery.includes('restaurant') || lowerQuery.includes('eat') ||
        lowerQuery.includes('food') || lowerQuery.includes('dining')) {
      result.category = 'restaurant';
    } else if (lowerQuery.includes('bar') || lowerQuery.includes('drink') ||
               lowerQuery.includes('cocktail')) {
      result.category = 'bar';
    } else if (lowerQuery.includes('entertainment') || lowerQuery.includes('show') ||
               lowerQuery.includes('fun') || lowerQuery.includes('activity')) {
      result.category = 'entertainment';
    } else {
      result.category = 'all';
    }

    // Detect meal time
    if (lowerQuery.includes('breakfast')) {
      result.mealTime = 'breakfast';
      result.quickOnly = true;
    } else if (lowerQuery.includes('lunch')) {
      result.mealTime = 'lunch';
    } else if (lowerQuery.includes('dinner')) {
      result.mealTime = 'dinner';
    } else if (lowerQuery.includes('snack') || lowerQuery.includes('coffee')) {
      result.mealTime = 'snack';
      result.quickOnly = true;
    }

    // Detect urgency
    if (lowerQuery.includes('quick') || lowerQuery.includes('fast') ||
        lowerQuery.includes('between sessions')) {
      result.quickOnly = true;
      result.walkTime = 3;
    }

    // Detect price preference
    if (lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
      result.priceRange = '$';
    } else if (lowerQuery.includes('fancy') || lowerQuery.includes('upscale') ||
               lowerQuery.includes('business dinner')) {
      result.priceRange = '$$$$';
    }

    // Detect dietary restrictions
    const dietary = [];
    if (lowerQuery.includes('vegetarian')) dietary.push('vegetarian_options');
    if (lowerQuery.includes('vegan')) dietary.push('vegan_options');
    if (lowerQuery.includes('gluten')) dietary.push('gluten_free_options');
    if (dietary.length > 0) result.dietary = dietary;

    return result;
  }

  /**
   * Filter venues based on query parameters - INSTANT
   */
  private filterVenues(query: RecommendationQuery): Venue[] {
    let results: Venue[] = [];

    // Get venues by category
    if (query.category === 'restaurant' || query.category === 'all') {
      // Add restaurants
      if (query.quickOnly || query.mealTime === 'breakfast' || query.mealTime === 'snack') {
        results.push(...this.venues.restaurants.quick_bites);
      } else if (query.mealTime === 'lunch') {
        results.push(...this.venues.restaurants.casual);
        results.push(...this.venues.restaurants.quick_bites);
      } else if (query.mealTime === 'dinner' || query.priceRange === '$$$$') {
        results.push(...this.venues.restaurants.fine_dining);
        results.push(...this.venues.restaurants.casual);
      } else {
        // All restaurants
        results.push(...this.venues.restaurants.fine_dining);
        results.push(...this.venues.restaurants.casual);
        results.push(...this.venues.restaurants.quick_bites);
      }
    }

    if (query.category === 'bar' || query.category === 'all') {
      results.push(...this.venues.bars);
    }

    if (query.category === 'entertainment' || query.category === 'all') {
      results.push(...this.venues.entertainment);
    }

    // Filter by walk time
    if (query.walkTime) {
      results = results.filter(v => {
        const walkMinutes = parseInt(v.walk_time);
        return walkMinutes <= query.walkTime;
      });
    }

    // Filter by price
    if (query.priceRange && query.priceRange !== 'any') {
      results = results.filter(v => v.price === query.priceRange);
    }

    // Filter by dietary
    if (query.dietary && query.dietary.length > 0) {
      results = results.filter(v =>
        v.dietary && query.dietary!.some(d => v.dietary!.includes(d))
      );
    }

    // Limit results for speed
    return results.slice(0, 8);
  }

  /**
   * Format recommendations into readable response - INSTANT
   */
  private formatResponse(venues: Venue[], query: RecommendationQuery): string {
    if (venues.length === 0) {
      return "I couldn't find specific venues matching your criteria, but Mandalay Bay has many dining options. The food court offers quick bites, and there are numerous restaurants throughout the property. Ask the concierge for current recommendations!";
    }

    let response = '';

    // Title based on query
    if (query.quickOnly) {
      response = '⚡ **Quick Options at Mandalay Bay:**\n\n';
    } else if (query.mealTime === 'lunch') {
      response = '🍽️ **Lunch Options at Mandalay Bay:**\n\n';
    } else if (query.mealTime === 'dinner') {
      response = '🍷 **Dinner Recommendations at Mandalay Bay:**\n\n';
    } else if (query.category === 'bar') {
      response = '🍹 **Bars & Lounges at Mandalay Bay:**\n\n';
    } else if (query.category === 'entertainment') {
      response = '🎭 **Entertainment at Mandalay Bay:**\n\n';
    } else {
      response = '📍 **Mandalay Bay Recommendations:**\n\n';
    }

    // Format each venue
    venues.forEach((venue, index) => {
      if (index < 5) { // Limit to top 5 for readability
        response += `**${venue.name}**`;

        // Add emoji based on type
        if (venue.cuisine) {
          const emoji = this.getCuisineEmoji(venue.cuisine);
          response += ` ${emoji}\n`;
          response += `${venue.cuisine} • `;
        } else if (venue.type) {
          response += ` 🎭\n`;
          response += `${venue.type} • `;
        } else {
          response += '\n';
        }

        response += `${venue.price} • ${venue.location} • ${venue.walk_time} walk\n`;

        if (venue.quick_note) {
          response += `*${venue.quick_note}*\n`;
        }

        // Add website link if available
        if (venue.website) {
          response += `🌐 [Visit Website](${venue.website})`;
          if (venue.phone) {
            response += ` • 📞 [${venue.phone}](tel:${venue.phone.replace(/[^0-9]/g, '')})\n`;
          } else {
            response += '\n';
          }
        } else if (venue.phone) {
          response += `📞 [${venue.phone}](tel:${venue.phone.replace(/[^0-9]/g, '')})\n`;
        }

        if (venue.reservations && venue.reservations !== 'Not required') {
          response += `📅 Reservations: ${venue.reservations}\n`;
        }

        if (venue.age_restriction) {
          response += `⚠️ ${venue.age_restriction}\n`;
        }

        response += '\n';
      }
    });

    // Add relevant tips
    response += this.getRelevantTips(query);

    // Add legal/safety note if bars or entertainment
    if (query.category === 'bar' || venues.some(v => v.age_restriction)) {
      response += '\n*🎰 Please gamble responsibly. Must be 21+ for gaming and alcohol.*';
    }

    return response;
  }

  /**
   * Get cuisine emoji for visual appeal
   */
  private getCuisineEmoji(cuisine: string): string {
    const cuisineMap: Record<string, string> = {
      'Mexican': '🌮',
      'Italian': '🍝',
      'Pizza': '🍕',
      'Steakhouse': '🥩',
      'American': '🍔',
      'French': '🥐',
      'Asian': '🍜',
      'Irish': '🍺',
      'Coffee': '☕',
      'International': '🌍'
    };

    for (const [key, emoji] of Object.entries(cuisineMap)) {
      if (cuisine.includes(key)) return emoji;
    }
    return '🍽️';
  }

  /**
   * Add relevant tips based on query
   */
  private getRelevantTips(query: RecommendationQuery): string {
    let tips = '\n💡 **Tips:**\n';

    if (query.quickOnly) {
      tips += '• Food court and Starbucks are fastest options\n';
      tips += '• Citizens Kitchen has grab-and-go items\n';
    } else if (query.mealTime === 'dinner') {
      tips += '• Make reservations for fine dining\n';
      tips += '• Happy hour 3-6pm at most bars\n';
    }

    if (query.dietary && query.dietary.length > 0) {
      tips += '• Border Grill and Citizens Kitchen have best vegetarian/vegan options\n';
    }

    tips += '• Conference center is on Level 2 - South Convention Center\n';
    tips += '• Free tram to Excalibur and Park MGM until 2am\n';

    return tips;
  }

  /**
   * Check if query is about local recommendations
   */
  static isLocalQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = [
      'restaurant', 'eat', 'food', 'lunch', 'dinner', 'breakfast',
      'bar', 'drink', 'cocktail', 'beer',
      'mandalay', 'nearby', 'around here', 'walking distance',
      'entertainment', 'show', 'things to do', 'activities',
      'where can i', 'what restaurants', 'any good'
    ];

    return keywords.some(keyword => lowerQuery.includes(keyword));
  }
}