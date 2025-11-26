import { useState, useEffect, useRef } from 'react';
import type { GeolocationResult, GPSQuality } from '@/lib/geolocation';
import { getGPSQuality, watchPosition, clearWatch } from '@/lib/geolocation';

interface EnhancedGeolocationState {
  location: GeolocationResult | null;
  quality: GPSQuality;
  isImproving: boolean;
  error: string | null;
  isTracking: boolean;
}

const MAX_READINGS = 5;

export const useEnhancedGeolocation = (autoStart = false) => {
  const [state, setState] = useState<EnhancedGeolocationState>({
    location: null,
    quality: 'acquiring',
    isImproving: false,
    error: null,
    isTracking: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const readingsRef = useRef<GeolocationResult[]>([]);
  const previousAccuracyRef = useRef<number | null>(null);

  const startTracking = () => {
    if (watchIdRef.current !== null) return;

    setState(prev => ({ ...prev, isTracking: true, error: null }));
    readingsRef.current = [];

    watchIdRef.current = watchPosition(
      (result) => {
        // Add to readings buffer
        readingsRef.current.push(result);
        if (readingsRef.current.length > MAX_READINGS) {
          readingsRef.current.shift();
        }

        // Find best reading (lowest accuracy value = highest precision)
        const bestReading = readingsRef.current.reduce((best, current) => 
          current.accuracy < best.accuracy ? current : best
        );

        // Check if GPS is improving
        const isImproving = previousAccuracyRef.current !== null && 
          result.accuracy < previousAccuracyRef.current;
        previousAccuracyRef.current = result.accuracy;

        const quality = getGPSQuality(bestReading.accuracy);

        setState({
          location: bestReading,
          quality,
          isImproving,
          error: null,
          isTracking: true,
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          error,
          isTracking: false,
        }));
        if (watchIdRef.current !== null) {
          clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
    readingsRef.current = [];
    previousAccuracyRef.current = null;
  };

  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
      }
    };
  }, [autoStart]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
};
