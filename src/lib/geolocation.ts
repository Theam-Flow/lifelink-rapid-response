export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  error?: string;
}

export type GPSQuality = 'acquiring' | 'poor' | 'fair' | 'good' | 'excellent';

export const getGPSQuality = (accuracy: number): GPSQuality => {
  if (accuracy > 100) return 'poor';
  if (accuracy > 50) return 'fair';
  if (accuracy > 20) return 'good';
  return 'excellent';
};

export const getCurrentPosition = (): Promise<GeolocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ error: 'Geolocation is not supported by your browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject({ error: error.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

export const watchPosition = (
  onSuccess: (result: GeolocationResult) => void,
  onError: (error: string) => void
): number => {
  if (!navigator.geolocation) {
    onError('Geolocation is not supported');
    return 0;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      onError(error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  );
};

export const clearWatch = (watchId: number) => {
  navigator.geolocation.clearWatch(watchId);
};

export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};