import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface HeatmapLayerProps {
  map: mapboxgl.Map | null;
  sosSignals: Array<{
    id: string;
    location?: unknown;
    severity_level: number;
    lng?: number;
    lat?: number;
  }>;
}

export const HeatmapLayer = ({ map, sosSignals }: HeatmapLayerProps) => {
  const layerIdRef = useRef('sos-heatmap');

  useEffect(() => {
    if (!map || !map.loaded() || sosSignals.length === 0) return;

    // Remove existing layer if it exists
    try {
      if (map.getLayer(layerIdRef.current)) {
        map.removeLayer(layerIdRef.current);
      }
      if (map.getSource(layerIdRef.current)) {
        map.removeSource(layerIdRef.current);
      }
    } catch (error) {
      console.error('Error removing existing layer:', error);
      return;
    }

    // Convert SOS signals to GeoJSON
    const features = sosSignals.map((signal) => {
      let coords: number[];
      
      // Use lng/lat if available (from distance function)
      if (signal.lng !== undefined && signal.lat !== undefined) {
        coords = [signal.lng, signal.lat];
      } else if (signal.location) {
        // Parse location string
        const locationStr = String(signal.location || '');
        coords = locationStr
          .replace('POINT(', '')
          .replace(')', '')
          .split(' ')
          .map(parseFloat);
      } else {
        return null;
      }

      if (coords.length !== 2 || coords.some(isNaN)) {
        return null;
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords,
        },
        properties: {
          weight: signal.severity_level,
        },
      };
    }).filter(Boolean);

    if (features.length === 0) return;

    // Add source and layer
    try {
      map.addSource(layerIdRef.current, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features as any,
        },
      });

      // Add heatmap layer
      map.addLayer({
        id: layerIdRef.current,
        type: 'heatmap',
        source: layerIdRef.current,
        paint: {
          // Increase weight as severity increases
          'heatmap-weight': ['get', 'weight'],
          // Increase intensity as zoom level increases
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          // Color ramp for heatmap
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)',
          ],
          // Radius of influence of one point
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 50],
          // Opacity
          'heatmap-opacity': 0.7,
        },
      });
    } catch (error) {
      console.error('Error adding heatmap layer:', error);
    }

    return () => {
      try {
        if (map && map.loaded()) {
          if (map.getLayer(layerIdRef.current)) {
            map.removeLayer(layerIdRef.current);
          }
          if (map.getSource(layerIdRef.current)) {
            map.removeSource(layerIdRef.current);
          }
        }
      } catch (error) {
        console.error('Error cleaning up heatmap layer:', error);
      }
    };
  }, [map, sosSignals]);

  return null;
};
