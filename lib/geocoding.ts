/**
 * Geocoding Service
 *
 * Converts addresses to latitude/longitude coordinates using OpenStreetMap Nominatim API
 * Free for use, no API key required for basic usage
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
  confidence: number;
}

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string, city: string, state: string): Promise<GeocodeResult | null> {
  try {
    // Build full address string
    const fullAddress = `${address}, ${city}, ${state}, Nigeria`;

    // Call OpenStreetMap Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CheapestData-ServiceLocator', // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('[Geocoding] No results found for address:', fullAddress);
      return null;
    }

    const result = data[0];

    return {
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
      formattedAddress: result.display_name,
      confidence: parseFloat(result.importance || '0.5'),
    };
  } catch (error) {
    console.error('[Geocoding] Error geocoding address:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CheapestData-ServiceLocator',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      console.warn('[Geocoding] No results found for coordinates:', latitude, longitude);
      return null;
    }

    const addressParts = data.address || {};

    return {
      address: data.display_name || '',
      city: addressParts.city || addressParts.town || addressParts.village || '',
      state: addressParts.state || '',
      country: addressParts.country || '',
    };
  } catch (error) {
    console.error('[Geocoding] Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
    Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get bounding box for a location (for map display)
 */
export function getBoundingBox(
  coordinates: Coordinates,
  radiusKm: number = 5
): { north: number; south: number; east: number; west: number } {
  const latDelta = (radiusKm / 6371) * (180 / Math.PI);
  const lonDelta = (radiusKm / 6371) * (180 / Math.PI) / Math.cos(toRadians(coordinates.latitude));

  return {
    north: coordinates.latitude + latDelta,
    south: coordinates.latitude - latDelta,
    east: coordinates.longitude + lonDelta,
    west: coordinates.longitude - lonDelta,
  };
}
