/**
 * Validation utilities for critical operations
 * Ensures data integrity and prevents errors in production
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate SOS signal data before submission
 */
export function validateSOSSignal(data: {
  severity_level: number;
  type: string;
  location: { lng: number; lat: number };
  description?: string;
}): ValidationResult {
  // Check severity level
  if (data.severity_level < 1 || data.severity_level > 5) {
    return {
      isValid: false,
      error: 'Severity level must be between 1 and 5',
    };
  }

  // Check location coordinates
  if (
    typeof data.location.lng !== 'number' ||
    typeof data.location.lat !== 'number' ||
    isNaN(data.location.lng) ||
    isNaN(data.location.lat)
  ) {
    return {
      isValid: false,
      error: 'Invalid location coordinates',
    };
  }

  // Check if coordinates are in valid range
  if (
    data.location.lng < -180 ||
    data.location.lng > 180 ||
    data.location.lat < -90 ||
    data.location.lat > 90
  ) {
    return {
      isValid: false,
      error: 'Coordinates out of valid range',
    };
  }

  // Check emergency type
  const validTypes = [
    'flood_trap',
    'medical_emergency',
    'food_water',
    'evacuation',
    'power_outage',
    'structural_collapse',
    'fire',
    'other',
  ];

  if (!validTypes.includes(data.type)) {
    return {
      isValid: false,
      error: 'Invalid emergency type',
    };
  }

  return { isValid: true };
}

/**
 * Validate shelter registration data
 */
export function validateShelter(data: {
  name: string;
  type: string;
  location: { lng: number; lat: number };
  capacity_max?: number;
}): ValidationResult {
  // Check name
  if (!data.name || data.name.trim().length < 3) {
    return {
      isValid: false,
      error: 'Shelter name must be at least 3 characters',
    };
  }

  // Check location
  if (
    typeof data.location.lng !== 'number' ||
    typeof data.location.lat !== 'number' ||
    isNaN(data.location.lng) ||
    isNaN(data.location.lat)
  ) {
    return {
      isValid: false,
      error: 'Invalid location coordinates',
    };
  }

  // Check capacity
  if (data.capacity_max !== undefined && data.capacity_max < 1) {
    return {
      isValid: false,
      error: 'Capacity must be at least 1',
    };
  }

  // Check shelter type
  const validTypes = [
    'temple',
    'school',
    'hospital',
    'high_ground',
    'community_center',
    'sports_complex',
  ];

  if (!validTypes.includes(data.type)) {
    return {
      isValid: false,
      error: 'Invalid shelter type',
    };
  }

  return { isValid: true };
}

/**
 * Validate message before sending
 */
export function validateMessage(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (content.length > 2000) {
    return {
      isValid: false,
      error: 'Message too long (max 2000 characters)',
    };
  }

  return { isValid: true };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): ValidationResult {
  // Basic phone validation - at least 10 digits
  const phoneRegex = /^\+?[\d\s-]{10,}$/;

  if (!phoneRegex.test(phone)) {
    return {
      isValid: false,
      error: 'Invalid phone number format',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
