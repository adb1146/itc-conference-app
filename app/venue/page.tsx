'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VenuePage() {
  const router = useRouter();

  useEffect(() => {
    // Get the hash from the URL
    const hash = window.location.hash;

    if (hash) {
      // Extract location from hash (e.g., #ballroomF -> Mandalay Bay Ballroom F)
      let locationId = hash.replace('#', '').toLowerCase();

      // Map common location IDs to full names
      const locationMap: { [key: string]: string } = {
        'ballroomf': 'Mandalay Bay Ballroom F',
        'ballroomd': 'Mandalay Bay Ballroom D',
        'ballroome': 'Mandalay Bay Ballroom E',
        'ballroomg': 'Mandalay Bay Ballroom G',
        'ballroomh': 'Mandalay Bay Ballroom H',
        'ballroomi': 'Mandalay Bay Ballroom I',
        'ballroomj': 'Mandalay Bay Ballroom J',
        'ballroomk': 'Mandalay Bay Ballroom K',
        'ballrooml': 'Mandalay Bay Ballroom L',
        'mandalay bay ballroom f': 'Mandalay Bay Ballroom F',
        'mandalay bay ballroom d': 'Mandalay Bay Ballroom D',
        'mandalay bay ballroom e': 'Mandalay Bay Ballroom E',
        'mandalay bay ballroom g': 'Mandalay Bay Ballroom G',
        'mandalay bay ballroom h': 'Mandalay Bay Ballroom H',
        'mandalay bay ballroom i': 'Mandalay Bay Ballroom I',
        'mandalay bay ballroom j': 'Mandalay Bay Ballroom J',
        'mandalay bay ballroom k': 'Mandalay Bay Ballroom K',
        'mandalay bay ballroom l': 'Mandalay Bay Ballroom L',
        'oceanside': 'Oceanside Ballroom',
        'oceanside ballroom': 'Oceanside Ballroom',
        'reef': 'Reef Ballroom',
        'reef ballroom': 'Reef Ballroom',
        'lagoon': 'Lagoon Ballroom',
        'lagoon ballroom': 'Lagoon Ballroom',
        'surf': 'Surf Ballroom',
        'surf ballroom': 'Surf Ballroom',
        'breakers': 'Breakers Ballroom',
        'breakers ballroom': 'Breakers Ballroom',
        'shoreline': 'Shoreline',
        'itccenter': 'ITC Community Center',
        'itc community center': 'ITC Community Center',
        'bordergrill': 'Border Grill',
        'border grill': 'Border Grill',
        'houseofblues': 'House of Blues',
        'house of blues': 'House of Blues',
        'balihai': 'Bali Hai Golf Club',
        'bali hai': 'Bali Hai Golf Club',
        'bali hai golf club': 'Bali Hai Golf Club'
      };

      // Try to decode the location ID if it's URL encoded
      try {
        locationId = decodeURIComponent(locationId).toLowerCase();
      } catch (e) {
        // If decoding fails, use the original
      }

      const fullLocationName = locationMap[locationId] ||
                              locationId.charAt(0).toUpperCase() + locationId.slice(1);

      // Redirect to locations page with query parameter
      router.replace(`/locations?location=${encodeURIComponent(fullLocationName)}`);
    } else {
      // No hash, just redirect to locations page
      router.replace('/locations');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to venue information...</p>
      </div>
    </div>
  );
}