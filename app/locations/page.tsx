'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation2, Clock, Users, Info, ExternalLink, ChevronRight } from 'lucide-react';

// ITC Vegas 2025 takes place at Mandalay Bay Resort & Casino
const venueInfo = {
  name: 'Mandalay Bay Resort & Casino',
  address: '3950 S Las Vegas Blvd, Las Vegas, NV 89119',
  phone: '(877) 632-2000',
  website: 'https://mandalaybay.mgmresorts.com',
  mapUrl: 'https://maps.google.com/?q=Mandalay+Bay+Resort+Casino+Las+Vegas',
  description: 'ITC Vegas 2025 will be held at the luxurious Mandalay Bay Resort & Casino, featuring over 2 million square feet of meeting and exhibit space.'
};

// Detailed location information
const locationDetails: { [key: string]: {
  name: string;
  level?: string;
  capacity?: string;
  description?: string;
  type: 'ballroom' | 'meeting' | 'restaurant' | 'expo' | 'other';
  features?: string[];
}} = {
  'Mandalay Bay Ballroom': {
    name: 'Mandalay Bay Ballroom',
    level: 'Level 2',
    capacity: 'Up to 4,000 attendees',
    description: 'The main ballroom complex divided into sections A-L, hosting keynotes and major tracks',
    type: 'ballroom',
    features: ['State-of-the-art AV', 'Divisible space', 'Theater seating']
  },
  'Oceanside Ballroom': {
    name: 'Oceanside Ballroom',
    level: 'Level 2',
    capacity: 'Up to 2,500 attendees',
    description: 'Home to the Main Stage and large plenary sessions',
    type: 'ballroom',
    features: ['Main Stage setup', 'Premium sound system', 'HD projection']
  },
  'Reef Ballroom': {
    name: 'Reef Ballroom',
    level: 'Level 1',
    capacity: 'Up to 1,800 attendees',
    description: 'Versatile space for sessions and lunch seminars',
    type: 'ballroom',
    features: ['Natural lighting', 'Flexible setup', 'Catering friendly']
  },
  'Lagoon Ballroom': {
    name: 'Lagoon Ballroom',
    level: 'Level 1',
    capacity: 'Up to 1,500 attendees',
    description: 'Mid-size ballroom for concurrent sessions',
    type: 'ballroom',
    features: ['Multiple configurations', 'Breakout capable']
  },
  'Surf Ballroom': {
    name: 'Surf Ballroom',
    level: 'Level 1',
    capacity: 'Up to 1,200 attendees',
    description: 'Ideal for workshops and interactive sessions',
    type: 'ballroom',
    features: ['Workshop setup', 'Round table options']
  },
  'Breakers Ballroom': {
    name: 'Breakers Ballroom',
    level: 'Level 1',
    capacity: 'Up to 1,000 attendees',
    description: 'Intimate setting for specialized tracks',
    type: 'ballroom',
    features: ['Classroom setup', 'Interactive displays']
  },
  'Shoreline': {
    name: 'Shoreline',
    level: 'Level 2',
    description: 'Meeting rooms and networking space',
    type: 'meeting',
    features: ['Private meeting rooms', 'Lounge areas']
  },
  'ITC Community Center': {
    name: 'ITC Community Center',
    level: 'Expo Floor',
    description: 'Central hub for community meet-ups and networking',
    type: 'expo',
    features: ['Open networking', 'Coffee stations', 'Charging stations']
  },
  'Border Grill': {
    name: 'Border Grill Mandalay Bay',
    description: 'Upscale Mexican restaurant for business dinners',
    type: 'restaurant',
    features: ['Private dining rooms', 'Group reservations']
  },
  'House of Blues': {
    name: 'House of Blues',
    description: 'Entertainment venue in Mandalay Bay Casino for evening events',
    type: 'other',
    features: ['Live entertainment', 'Networking events', 'Private parties']
  },
  'Bali Hai Golf Club': {
    name: 'Bali Hai Golf Club',
    description: 'Off-site venue for golf networking events',
    type: 'other',
    features: ['18-hole course', 'Tournament ready', 'Shuttle service provided']
  }
};

// Track locations mapping
const trackLocations: { [key: string]: string } = {
  'Claims Track': 'Mandalay Bay Ballroom I',
  'Underwriting Track': 'Mandalay Bay Ballroom K',
  'Data & Analytics Track': 'Mandalay Bay Ballroom H',
  'Innovation in Action Track': 'Mandalay Bay Ballroom L',
  'Customer Experience, Retention & Acquisition Track': 'Mandalay Bay Ballroom K',
  'Property, Motor & Travel Track': 'Mandalay Bay Ballroom I',
  'Specialty & Commercial Insurance Track': 'Mandalay Bay Ballroom J',
  'Cyber Insurance Summit': 'Mandalay Bay Ballroom J',
  'Deep Dives': 'Multiple Locations',
  'Masterclass Series': 'Oceanside Ballroom B',
  'Main Stage': 'Oceanside Ballroom CD'
};

function LocationsContent() {
  const searchParams = useSearchParams();
  const locationQuery = searchParams.get('location');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    if (locationQuery) {
      // Clean up the location query
      const cleanLocation = decodeURIComponent(locationQuery)
        .replace(/\s*(Track|Summit|Series|Stage)$/i, '')
        .trim();
      setSelectedLocation(cleanLocation);
    }
  }, [locationQuery]);

  const getLocationInfo = (locationName: string) => {
    // Try exact match first
    if (locationDetails[locationName]) {
      return locationDetails[locationName];
    }

    // Try to find partial matches
    const cleanName = locationName.replace(/\s*[A-L]$/, '').trim();
    for (const [key, value] of Object.entries(locationDetails)) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return value;
      }
    }

    // Check if it's a specific ballroom section
    if (locationName.match(/Mandalay Bay Ballroom [A-L]/)) {
      return {
        ...locationDetails['Mandalay Bay Ballroom'],
        name: locationName,
        description: `Section ${locationName.slice(-1)} of the main Mandalay Bay Ballroom complex`
      };
    }

    // Default for unknown locations
    return {
      name: locationName,
      type: 'other' as const,
      description: 'Meeting space at Mandalay Bay Resort & Casino'
    };
  };

  const currentLocationInfo = selectedLocation ? getLocationInfo(selectedLocation) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Venue & Locations
            </h1>
            <p className="text-lg text-gray-600">
              ITC Vegas 2025 Conference Venue Information
            </p>
          </div>

          {/* Main Venue Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{venueInfo.name}</h2>
                <p className="text-gray-600 mb-4">{venueInfo.description}</p>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Address:</span> {venueInfo.address}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Phone:</span> {venueInfo.phone}
                  </p>
                  <div className="flex gap-4 mt-4">
                    <a
                      href={venueInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Hotel Website
                    </a>
                    <a
                      href={venueInfo.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Navigation2 className="w-4 h-4" />
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Location Detail */}
          {currentLocationInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">You asked about:</h3>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-3">{currentLocationInfo.name}</h4>
                {currentLocationInfo.level && (
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium">Level:</span> {currentLocationInfo.level}
                  </p>
                )}
                {currentLocationInfo.capacity && (
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium">Capacity:</span> {currentLocationInfo.capacity}
                  </p>
                )}
                {currentLocationInfo.description && (
                  <p className="text-gray-600 mb-3">{currentLocationInfo.description}</p>
                )}
                {currentLocationInfo.features && (
                  <div className="mt-4">
                    <p className="font-medium text-gray-700 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {currentLocationInfo.features.map((feature, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conference Spaces */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Ballrooms */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Conference Ballrooms
              </h3>
              <div className="space-y-3">
                {Object.entries(locationDetails)
                  .filter(([_, detail]) => detail.type === 'ballroom')
                  .map(([key, detail]) => (
                    <div key={key} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{detail.name}</p>
                        {detail.level && <p className="text-sm text-gray-600">{detail.level}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Tracks & Their Locations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Navigation2 className="w-6 h-6 text-purple-600" />
                Track Locations
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(trackLocations).map(([track, location]) => (
                  <div key={track} className="p-2 hover:bg-gray-50 rounded">
                    <p className="font-medium text-gray-900 text-sm">{track}</p>
                    <p className="text-sm text-gray-600">{location}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Venues */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Venues</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(locationDetails)
                .filter(([_, detail]) => detail.type === 'restaurant' || detail.type === 'other')
                .map(([key, detail]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{detail.name}</h4>
                    <p className="text-sm text-gray-600">{detail.description}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Navigation Tips */}
          <div className="bg-blue-50 rounded-xl p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Venue Navigation Tips
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Allow 5-10 minutes to walk between different ballroom areas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Digital signage throughout the venue will guide you to session locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>ITC Vegas mobile app provides indoor navigation and real-time updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Information desks are located on each level for assistance</span>
              </li>
            </ul>
          </div>
        </div>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <>
      
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading locations...</p>
          </div>
        </div>
      }>
        <LocationsContent />
      </Suspense>
    </>
  );
}