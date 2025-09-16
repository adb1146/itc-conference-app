/**
 * Local Expert Agent
 * Provides recommendations for restaurants, venues, and activities in Las Vegas
 */

import { BaseAgent, AgentContext, AgentResponse, AgentDependencies } from './BaseAgent';

interface VenueRecommendation {
  name: string;
  type: 'restaurant' | 'bar' | 'attraction' | 'relaxation';
  location: string;
  description: string;
  priceRange?: string;
  walkingTime?: string;
  specialty?: string;
}

export class LocalExpertAgent extends BaseAgent {
  private readonly venueData: Map<string, VenueRecommendation[]>;
  
  constructor(dependencies: AgentDependencies) {
    super(
      'LocalExpertAgent',
      'I provide local recommendations for dining, entertainment, and relaxation in Las Vegas',
      dependencies
    );
    
    this.venueData = this.initializeVenueData();
  }
  
  /**
   * Check if this agent should handle the request
   */
  canHandle(context: AgentContext): boolean {
    return LocalExpertAgent.isLocalQuery(context.message);
  }
  
  /**
   * Static helper to check if message is about local recommendations
   */
  static isLocalQuery(message: string): boolean {
    const lower = message.toLowerCase();

    // First, check for explicit NON-local queries (negative patterns)
    // These are conference-specific terms that should NOT trigger local recommendations
    const notLocalPatterns = [
      'keynote', 'speaker', 'session', 'presentation', 'talk',
      'agenda', 'schedule', 'conference', 'track', 'panel',
      'sponsor', 'exhibitor', 'booth', 'workshop', 'attendee'
    ];

    // If query contains conference-specific terms, it's NOT a local query
    if (notLocalPatterns.some(pattern => lower.includes(pattern))) {
      return false;
    }

    const localKeywords = [
      'eat', 'lunch', 'dinner', 'breakfast', 'food', 'restaurant',
      'drink', 'bar', 'cocktail', 'wine', 'beer',
      'relax', 'spa', 'pool', 'rest',
      'vegas', 'mandalay', 'nearby', 'local',
      'where can i eat', 'where should i eat',
      'hungry', 'tired', 'stressed'
    ];

    // Handle "show" carefully - only match if it's about entertainment shows
    // NOT when it's "show me" which is typically a command
    if (lower.includes('show') &&
        !lower.includes('show me') &&
        !lower.includes('show us')) {
      return true; // Likely asking about entertainment shows
    }

    return localKeywords.some(keyword => lower.includes(keyword));
  }
  
  /**
   * Process the local recommendation request
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    try {
      const requestType = this.identifyRequestType(context.message);
      const recommendations = this.getRecommendations(requestType);
      
      // Log the recommendation request
      await this.dependencies.eventBus.emit('local.recommendation.requested', {
        sessionId: context.sessionId,
        type: requestType,
        count: recommendations.length
      });
      
      // Save to conversation
      await this.saveMessage(context.sessionId, 'assistant', this.formatResponse(recommendations, requestType));
      
      return {
        message: this.formatResponse(recommendations, requestType),
        data: { recommendations, type: requestType },
        metadata: {
          agentName: this.name,
          confidence: 0.95,
          toolsUsed: ['local_recommendations']
        }
      };
      
    } catch (error) {
      console.error('[LocalExpertAgent] Error getting recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Identify what type of recommendation is needed
   */
  private identifyRequestType(message: string): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('eat') || lower.includes('food') || lower.includes('hungry') || 
        lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast')) {
      return 'restaurant';
    }
    
    if (lower.includes('drink') || lower.includes('bar') || lower.includes('cocktail') ||
        lower.includes('wine') || lower.includes('beer')) {
      return 'bar';
    }
    
    if (lower.includes('relax') || lower.includes('spa') || lower.includes('tired') ||
        lower.includes('stressed') || lower.includes('rest')) {
      return 'relaxation';
    }
    
    if (lower.includes('fun') || lower.includes('entertainment') || lower.includes('show')) {
      return 'attraction';
    }
    
    // Default to restaurant
    return 'restaurant';
  }
  
  /**
   * Get recommendations based on type
   */
  private getRecommendations(type: string): VenueRecommendation[] {
    return this.venueData.get(type) || this.venueData.get('restaurant') || [];
  }
  
  /**
   * Format recommendations into a friendly response
   */
  private formatResponse(recommendations: VenueRecommendation[], requestType: string): string {
    if (recommendations.length === 0) {
      return "I apologize, but I don't have specific recommendations for that request. The Mandalay Bay has many great options - you might want to check with the concierge!";
    }
    
    const headers: Record<string, string> = {
      restaurant: '🍽️ **Dining Recommendations at Mandalay Bay**',
      bar: '🍸 **Bar & Lounge Recommendations**',
      relaxation: '🛁 **Relaxation & Wellness Options**',
      attraction: '🎭 **Entertainment & Attractions**'
    };
    
    let message = `${headers[requestType] || '📍 **Local Recommendations**'}\n\n`;
    message += `Here are my top picks for you:\n\n`;
    
    recommendations.forEach((venue, index) => {
      message += `**${index + 1}. ${venue.name}**\n`;
      message += `   📍 ${venue.location}\n`;
      message += `   ${venue.description}\n`;
      
      if (venue.specialty) {
        message += `   🌟 *Specialty:* ${venue.specialty}\n`;
      }
      
      if (venue.priceRange) {
        message += `   💵 *Price:* ${venue.priceRange}\n`;
      }
      
      if (venue.walkingTime) {
        message += `   🚶 *Walking time:* ${venue.walkingTime}\n`;
      }
      
      message += '\n';
    });
    
    // Add helpful tips based on type
    const tips: Record<string, string> = {
      restaurant: '💡 **Pro tip:** Make reservations for popular restaurants through the Mandalay Bay concierge or OpenTable app.',
      bar: '💡 **Pro tip:** Happy hour is typically 4-7 PM with great deals on drinks and appetizers.',
      relaxation: '💡 **Pro tip:** Book spa treatments in advance, especially during conference days.',
      attraction: '💡 **Pro tip:** Check for conference attendee discounts at the concierge desk.'
    };
    
    message += tips[requestType] || '';
    
    return message;
  }
  
  /**
   * Initialize venue database
   */
  private initializeVenueData(): Map<string, VenueRecommendation[]> {
    const data = new Map<string, VenueRecommendation[]>();
    
    // Restaurants
    data.set('restaurant', [
      {
        name: 'Aureole',
        type: 'restaurant',
        location: 'Mandalay Bay Main Floor',
        description: 'Award-winning fine dining by Chef Charlie Palmer with an extensive wine tower',
        priceRange: '$$$$',
        walkingTime: '5 minutes from conference',
        specialty: 'Contemporary American cuisine'
      },
      {
        name: 'Border Grill',
        type: 'restaurant',
        location: 'Mandalay Bay Casino Level',
        description: 'Modern Mexican cuisine from celebrity chefs Mary Sue Milliken and Susan Feniger',
        priceRange: '$$$',
        walkingTime: '3 minutes from conference',
        specialty: 'Mexican small plates and craft cocktails'
      },
      {
        name: 'Citizens Kitchen & Bar',
        type: 'restaurant',
        location: 'Mandalay Bay Restaurant Row',
        description: 'Gastropub featuring American comfort food and craft beers',
        priceRange: '$$',
        walkingTime: '2 minutes from conference',
        specialty: 'Burgers, mac & cheese, and local brews'
      },
      {
        name: 'Raffles Cafe',
        type: 'restaurant',
        location: 'Mandalay Bay Casino Floor',
        description: '24-hour cafe perfect for quick meals between sessions',
        priceRange: '$$',
        walkingTime: '3 minutes from conference',
        specialty: 'All-day breakfast and comfort food'
      }
    ]);
    
    // Bars
    data.set('bar', [
      {
        name: 'Minus5 Ice Bar',
        type: 'bar',
        location: 'Mandalay Bay Shops',
        description: 'Unique ice bar experience with everything made of ice - walls, seats, even glasses!',
        priceRange: '$$$',
        walkingTime: '7 minutes from conference',
        specialty: 'Vodka cocktails served in ice glasses'
      },
      {
        name: 'Foundation Room',
        type: 'bar',
        location: 'Mandalay Bay Tower, 63rd Floor',
        description: 'Upscale lounge with panoramic Strip views and live music',
        priceRange: '$$$$',
        walkingTime: '10 minutes from conference',
        specialty: 'Craft cocktails and stunning views'
      },
      {
        name: 'Eyecandy Sound Lounge',
        type: 'bar',
        location: 'Mandalay Bay Casino Floor',
        description: 'High-energy bar with DJs and creative cocktails',
        priceRange: '$$$',
        walkingTime: '4 minutes from conference',
        specialty: 'Signature cocktails and people watching'
      }
    ]);
    
    // Relaxation
    data.set('relaxation', [
      {
        name: 'Mandalay Bay Beach',
        type: 'relaxation',
        location: 'Pool Deck',
        description: '11-acre tropical pool complex with wave pool, lazy river, and beach',
        priceRange: 'Free for guests',
        walkingTime: '8 minutes from conference',
        specialty: 'Wave pool and beach experience'
      },
      {
        name: 'Spa Mandalay',
        type: 'relaxation',
        location: 'Mandalay Bay Spa Level',
        description: 'Full-service spa offering massages, facials, and wellness treatments',
        priceRange: '$$$$',
        walkingTime: '10 minutes from conference',
        specialty: 'Hot stone massage and aromatherapy'
      },
      {
        name: 'Bathhouse Spa',
        type: 'relaxation',
        location: 'Delano Las Vegas',
        description: 'Sophisticated spa with steam room, sauna, and relaxation lounges',
        priceRange: '$$$$',
        walkingTime: '12 minutes from conference',
        specialty: 'Hydrotherapy and meditation spaces'
      }
    ]);
    
    // Attractions
    data.set('attraction', [
      {
        name: 'Shark Reef Aquarium',
        type: 'attraction',
        location: 'Mandalay Bay Convention Center',
        description: '1.6 million gallon aquarium with sharks, rays, and sea turtles',
        priceRange: '$$',
        walkingTime: '5 minutes from conference',
        specialty: 'Walk-through tunnel with 360° views'
      },
      {
        name: 'Michael Jackson ONE',
        type: 'attraction',
        location: 'Mandalay Bay Theatre',
        description: 'Cirque du Soleil show celebrating the King of Pop',
        priceRange: '$$$$',
        walkingTime: '6 minutes from conference',
        specialty: 'Acrobatic performances to MJ hits'
      }
    ]);
    
    return data;
  }
}