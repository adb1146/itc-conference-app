// Venue distance calculator for ITC Vegas conference at Mandalay Bay

import { VenueDistance } from './types';

// Map of venue locations and their relationships
const VENUE_MAP = {
  // Ballrooms
  'Mandalay Bay Ballroom A': { building: 'mandalay', floor: 'ballroom', zone: 'A' },
  'Mandalay Bay Ballroom B': { building: 'mandalay', floor: 'ballroom', zone: 'B' },
  'Mandalay Bay Ballroom C': { building: 'mandalay', floor: 'ballroom', zone: 'C' },
  'Mandalay Bay Ballroom D': { building: 'mandalay', floor: 'ballroom', zone: 'D' },
  'Mandalay Bay Ballroom E': { building: 'mandalay', floor: 'ballroom', zone: 'E' },
  'Mandalay Bay Ballroom F': { building: 'mandalay', floor: 'ballroom', zone: 'F' },
  'Mandalay Bay Ballroom G': { building: 'mandalay', floor: 'ballroom', zone: 'G' },
  'Mandalay Bay Ballroom H': { building: 'mandalay', floor: 'ballroom', zone: 'H' },
  'Mandalay Bay Ballroom J': { building: 'mandalay', floor: 'ballroom', zone: 'J' },
  'Mandalay Bay Ballroom K': { building: 'mandalay', floor: 'ballroom', zone: 'K' },
  'Mandalay Bay Ballroom L': { building: 'mandalay', floor: 'ballroom', zone: 'L' },

  // Islander Rooms
  'Islander Ballroom A': { building: 'mandalay', floor: 'islander', zone: 'A' },
  'Islander Ballroom B': { building: 'mandalay', floor: 'islander', zone: 'B' },
  'Islander Ballroom C': { building: 'mandalay', floor: 'islander', zone: 'C' },
  'Islander Ballroom D': { building: 'mandalay', floor: 'islander', zone: 'D' },
  'Islander Ballroom E': { building: 'mandalay', floor: 'islander', zone: 'E' },
  'Islander Ballroom F': { building: 'mandalay', floor: 'islander', zone: 'F' },
  'Islander Ballroom G': { building: 'mandalay', floor: 'islander', zone: 'G' },
  'Islander Ballroom H': { building: 'mandalay', floor: 'islander', zone: 'H' },

  // Oceanside Rooms
  'Oceanside A': { building: 'mandalay', floor: 'oceanside', zone: 'A' },
  'Oceanside B': { building: 'mandalay', floor: 'oceanside', zone: 'B' },
  'Oceanside C': { building: 'mandalay', floor: 'oceanside', zone: 'C' },
  'Oceanside D': { building: 'mandalay', floor: 'oceanside', zone: 'D' },

  // Surf Rooms
  'Surf A': { building: 'mandalay', floor: 'surf', zone: 'A' },
  'Surf B': { building: 'mandalay', floor: 'surf', zone: 'B' },
  'Surf C': { building: 'mandalay', floor: 'surf', zone: 'C' },
  'Surf D': { building: 'mandalay', floor: 'surf', zone: 'D' },
  'Surf E': { building: 'mandalay', floor: 'surf', zone: 'E' },
  'Surf F': { building: 'mandalay', floor: 'surf', zone: 'F' },
  'Surf G': { building: 'mandalay', floor: 'surf', zone: 'G' },
  'Surf H': { building: 'mandalay', floor: 'surf', zone: 'H' },

  // Breakers Rooms
  'Breakers B': { building: 'mandalay', floor: 'breakers', zone: 'B' },
  'Breakers C': { building: 'mandalay', floor: 'breakers', zone: 'C' },
  'Breakers D': { building: 'mandalay', floor: 'breakers', zone: 'D' },
  'Breakers E': { building: 'mandalay', floor: 'breakers', zone: 'E' },
  'Breakers F': { building: 'mandalay', floor: 'breakers', zone: 'F' },
  'Breakers K': { building: 'mandalay', floor: 'breakers', zone: 'K' },
  'Breakers L': { building: 'mandalay', floor: 'breakers', zone: 'L' },
  'Breakers M': { building: 'mandalay', floor: 'breakers', zone: 'M' },
  'Breakers N': { building: 'mandalay', floor: 'breakers', zone: 'N' },

  // Other locations
  'Innovation Stage': { building: 'mandalay', floor: 'expo', zone: 'stage' },
  'Expo Hall': { building: 'mandalay', floor: 'expo', zone: 'hall' },
  'Networking Lounge': { building: 'mandalay', floor: 'ballroom', zone: 'lounge' },

  // Generic/Unknown
  'TBD': { building: 'unknown', floor: 'unknown', zone: 'unknown' },
  'Virtual': { building: 'virtual', floor: 'virtual', zone: 'virtual' }
};

// Walking times between different floor combinations (in minutes)
const FLOOR_DISTANCES: Record<string, Record<string, number>> = {
  'ballroom': {
    'ballroom': 0,
    'islander': 5,
    'oceanside': 7,
    'surf': 8,
    'breakers': 10,
    'expo': 5,
    'unknown': 10
  },
  'islander': {
    'ballroom': 5,
    'islander': 0,
    'oceanside': 5,
    'surf': 7,
    'breakers': 8,
    'expo': 7,
    'unknown': 10
  },
  'oceanside': {
    'ballroom': 7,
    'islander': 5,
    'oceanside': 0,
    'surf': 3,
    'breakers': 5,
    'expo': 8,
    'unknown': 10
  },
  'surf': {
    'ballroom': 8,
    'islander': 7,
    'oceanside': 3,
    'surf': 0,
    'breakers': 3,
    'expo': 10,
    'unknown': 10
  },
  'breakers': {
    'ballroom': 10,
    'islander': 8,
    'oceanside': 5,
    'surf': 3,
    'breakers': 0,
    'expo': 12,
    'unknown': 10
  },
  'expo': {
    'ballroom': 5,
    'islander': 7,
    'oceanside': 8,
    'surf': 10,
    'breakers': 12,
    'expo': 0,
    'unknown': 10
  },
  'unknown': {
    'ballroom': 10,
    'islander': 10,
    'oceanside': 10,
    'surf': 10,
    'breakers': 10,
    'expo': 10,
    'unknown': 0
  },
  'virtual': {
    'virtual': 0,
    'ballroom': 0,
    'islander': 0,
    'oceanside': 0,
    'surf': 0,
    'breakers': 0,
    'expo': 0,
    'unknown': 0
  }
};

/**
 * Calculate walking distance between two venues
 */
export function calculateVenueDistance(from: string, to: string): VenueDistance {
  // Handle same location
  if (from === to) {
    return {
      from,
      to,
      walkingMinutes: 0,
      distance: 'same-room'
    };
  }

  // Get venue information
  const fromVenue = VENUE_MAP[from] || VENUE_MAP['TBD'];
  const toVenue = VENUE_MAP[to] || VENUE_MAP['TBD'];

  // Virtual sessions require no travel
  if (fromVenue.building === 'virtual' || toVenue.building === 'virtual') {
    return {
      from,
      to,
      walkingMinutes: 0,
      distance: 'same-room'
    };
  }

  // Different buildings (if we expand beyond Mandalay Bay)
  if (fromVenue.building !== toVenue.building) {
    return {
      from,
      to,
      walkingMinutes: 15,
      distance: 'different-building'
    };
  }

  // Same floor
  if (fromVenue.floor === toVenue.floor) {
    // Adjacent zones on same floor
    if (isAdjacentZone(fromVenue.zone, toVenue.zone)) {
      return {
        from,
        to,
        walkingMinutes: 2,
        distance: 'same-floor'
      };
    }
    // Non-adjacent zones on same floor
    return {
      from,
      to,
      walkingMinutes: 5,
      distance: 'same-floor'
    };
  }

  // Different floors - use the distance matrix
  const walkingMinutes = FLOOR_DISTANCES[fromVenue.floor]?.[toVenue.floor] || 10;

  return {
    from,
    to,
    walkingMinutes,
    distance: 'same-building'
  };
}

/**
 * Check if two zones are adjacent (e.g., A and B, B and C)
 */
function isAdjacentZone(zone1: string, zone2: string): boolean {
  // For single letter zones, check if they're consecutive
  if (zone1.length === 1 && zone2.length === 1) {
    const diff = Math.abs(zone1.charCodeAt(0) - zone2.charCodeAt(0));
    return diff === 1;
  }

  return false;
}

/**
 * Check if there's enough time to walk between venues
 */
export function hasEnoughTravelTime(
  from: string,
  to: string,
  availableMinutes: number
): boolean {
  const distance = calculateVenueDistance(from, to);
  // Add 5 minute buffer for finding seats, bathroom, etc.
  return availableMinutes >= (distance.walkingMinutes + 5);
}

/**
 * Get a human-readable description of the venue distance
 */
export function getDistanceDescription(distance: VenueDistance): string {
  if (distance.distance === 'same-room') {
    return 'Same room - no travel needed';
  }
  if (distance.distance === 'same-floor') {
    return `Same floor - ${distance.walkingMinutes} minute walk`;
  }
  if (distance.distance === 'same-building') {
    return `Different floor - ${distance.walkingMinutes} minute walk`;
  }
  return `Different building - ${distance.walkingMinutes} minute walk`;
}

/**
 * Find sessions that are within walking distance given time constraints
 */
export function filterByWalkingDistance(
  currentLocation: string,
  availableSessions: any[],
  availableMinutes: number
): any[] {
  return availableSessions.filter(session => {
    const location = session.location || 'TBD';
    return hasEnoughTravelTime(currentLocation, location, availableMinutes);
  });
}