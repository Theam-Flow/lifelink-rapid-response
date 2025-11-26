import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface HeatmapLayerProps {
  map: maplibregl.Map | null;
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
    if (!map || sosSignals.length === 0) {
      return;
    }

    const addHeatmap = () => {
      if (!map || !map.isStyleLoaded()) return;

    // Remove existing layer if it exists
    try {
      if (map.getLayer(layerIdRef.current)) {
        map.removeLayer(layerIdRef.current);
      }
      if (map.getSource(layerIdRef.current)) {
        map.removeSource(layerIdRef.current);
      }
      } catch (error) {
        // Silently handle heatmap removal errors
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
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.5, 5, 1],
          // Increase intensity as zoom level increases
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          // Color ramp for heatmap - red/orange theme for emergencies
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255,0,0,0)',
            0.2, 'rgba(255,165,0,0.5)',
            0.4, 'rgba(255,69,0,0.6)',
            0.6, 'rgba(255,0,0,0.7)',
            0.8, 'rgba(220,20,60,0.8)',
            1, 'rgba(139,0,0,1)',
          ],
          // Radius of influence of one point
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 30, 15, 80],
          // Opacity
          'heatmap-opacity': 0.8,
        },
      });
    } catch (error) {
      // Silently handle heatmap layer errors
    }
    };

    // Wait for style to load before adding heatmap
    if (map.isStyleLoaded()) {
      addHeatmap();
    } else {
      map.once('styledata', addHeatmap);
    }

    return () => {
      map.off('styledata', addHeatmap);
      try {
        if (map) {
          if (map.getLayer(layerIdRef.current)) {
            map.removeLayer(layerIdRef.current);
          }
          if (map.getSource(layerIdRef.current)) {
            map.removeSource(layerIdRef.current);
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [map, sosSignals]);

  return null;
};
