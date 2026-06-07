/**
 * Location Safety & Privacy Utilities
 *
 * Implements privacy-preserving location features to protect users
 */

export interface SafeLocation {
  /** Approximate area (neighborhood/district level) */
  area: string;
  /** City only */
  city: string;
  /** State only */
  state: string;
  /** Obfuscated coordinates (rounded to ~100m precision) */
  approximateCoordinates?: {
    latitude: number;
    longitude: number;
  };
  /** Distance band (e.g., "0-5km", "5-10km") */
  distanceBand?: string;
}

export interface LocationVisibilitySettings {
  /** Show exact address to provider after booking confirmed */
  showAddressAfterBooking: boolean;
  /** Show general area to provider before booking */
  showAreaToProvider: boolean;
  /** Allow provider to see distance */
  showDistance: boolean;
  /** Include coordinates in public data */
  includeInPublicData: boolean;
}

/**
 * Obfuscate coordinates for privacy (reduces precision to ~100m)
 * This prevents reverse-geocoding to exact addresses
 */
export function obfuscateCoordinates(coordinates: { latitude: number; longitude: number }): { latitude: number; longitude: number } {
  // Round to 3 decimal places (~100m precision)
  return {
    latitude: Math.round(coordinates.latitude * 1000) / 1000,
    longitude: Math.round(coordinates.longitude * 1000) / 1000,
  };
}

/**
 * Check if coordinates should be visible based on context
 */
export function shouldShowCoordinates(
  userRole: 'customer' | 'provider' | 'admin',
  bookingStatus: string,
  visibilitySettings: LocationVisibilitySettings
): boolean {
  // Admins can always see (with proper authorization)
  if (userRole === 'admin') return true;

  // Providers can only see after booking is confirmed
  if (userRole === 'provider') {
    const confirmedStatuses = ['confirmed', 'in_progress', 'completed'];
    return confirmedStatuses.includes(bookingStatus) && visibilitySettings.showAddressAfterBooking;
  }

  // Customers can see their own data
  if (userRole === 'customer') return true;

  return false;
}

/**
 * Format location for display based on visibility rules
 */
export function formatLocationForDisplay(
  location: any,
  userRole: 'customer' | 'provider' | 'admin',
  bookingStatus?: string
): string {
  const settings: LocationVisibilitySettings = {
    showAddressAfterBooking: true,
    showAreaToProvider: true,
    showDistance: true,
    includeInPublicData: false,
  };

  const canShowAddress = shouldShowCoordinates(userRole, bookingStatus || 'pending', settings);

  if (canShowAddress) {
    return `${location.address}, ${location.city}, ${location.state}`;
  }

  // Show general area only
  if (settings.showAreaToProvider && location.city && location.state) {
    return `${location.city}, ${location.state} (Area)`;
  }

  // Show state only
  return location.state || 'Location hidden';
}

/**
 * Calculate distance band instead of exact distance
 */
export function getDistanceBand(distanceKm: number): string {
  if (distanceKm < 1) return 'Less than 1km';
  if (distanceKm < 5) return '1-5km';
  if (distanceKm < 10) return '5-10km';
  if (distanceKm < 25) return '10-25km';
  if (distanceKm < 50) return '25-50km';
  return '50km+';
}

/**
 * Sanitize location data for API responses
 * Removes sensitive information based on user role
 */
export function sanitizeLocationForAPI(
  location: any,
  userRole: 'customer' | 'provider' | 'admin',
  bookingStatus?: string
): SafeLocation {
  const settings: LocationVisibilitySettings = {
    showAddressAfterBooking: true,
    showAreaToProvider: true,
    showDistance: true,
    includeInPublicData: false,
  };

  const canShowFull = shouldShowCoordinates(userRole, bookingStatus || 'pending', settings);

  return {
    area: location.city || 'Unknown',
    city: location.city || 'Unknown',
    state: location.state || 'Unknown',
    // Only include approximate coordinates if authorized
    ...(canShowFull && location.latitude && location.longitude ? {
      approximateCoordinates: obfuscateCoordinates({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    } : {}),
  };
}

/**
 * Generate privacy warning message for users
 */
export function getPrivacyWarningMessage(): string {
  return 'For your safety, your exact address will only be shared with providers after booking confirmation. Until then, providers will only see your general area (city, state).';
}

/**
 * Check if location data should be logged (for audit trails)
 */
export function shouldLogLocationData(action: string): boolean {
  const auditableActions = [
    'booking_confirmed',
    'provider_assigned',
    'service_completed',
    'admin_access',
  ];
  return auditableActions.includes(action);
}

/**
 * Generate location access log entry
 */
export interface LocationAccessLog {
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  locationId: string;
  bookingId?: string;
  ipAddress?: string;
}

export function createLocationAccessLog(
  userId: string,
  userRole: string,
  action: string,
  locationId: string,
  bookingId?: string
): LocationAccessLog {
  return {
    timestamp: new Date(),
    userId,
    userRole,
    action,
    locationId,
    bookingId,
  };
}
