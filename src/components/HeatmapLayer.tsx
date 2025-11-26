import { useEffect, useRef, useState } from 'react';
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

/**
 * OPTIMIZED Heatmap Layer for millions of SOS signals
 * - Viewport culling: Only renders visible area
 * - Dynamic intensity based on zoom
 * - Efficient GeoJSON updates
 * - Severity-weighted rendering
 */
export const HeatmapLayer = ({ map, sosSignals }: HeatmapLayerProps) => {
  const layerIdRef = useRef('sos-heatmap');
  const sourceIdRef = useRef('sos-heatmap-source');
  const [currentZoom, setCurrentZoom] = useState(11);

  useEffect(() => {
    if (!map) return;

    const updateZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoom', updateZoom);
    updateZoom(); // Initial zoom

    return () => {
      map.off('zoom', updateZoom);
    };
  }, [map]);

  useEffect(() => {
    if (!map || sosSignals.length === 0) {
      // Remove heatmap if no signals
      try {
        if (map && map.getLayer(layerIdRef.current)) {
          map.removeLayer(layerIdRef.current);
        }
        if (map && map.getSource(sourceIdRef.current)) {
          map.removeSource(sourceIdRef.current);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      return;
    }

    const addOrUpdateHeatmap = () => {
      if (!map || !map.isStyleLoaded()) return;

      // OPTIMIZACIÓN: Viewport culling - solo incluir puntos visibles
      const bounds = map.getBounds();
      const padding = 0.5; // Add padding to include points just outside viewport
      
      const visibleSignals = sosSignals.filter(signal => {
        let lng: number | undefined, lat: number | undefined;
        
        if (signal.lng !== undefined && signal.lat !== undefined) {
          lng = signal.lng;
          lat = signal.lat;
        } else if (signal.location) {
          const locationStr = String(signal.location || '');
          const coords = locationStr.replace('POINT(', '').replace(')', '').split(' ').map(parseFloat);
          if (coords.length === 2 && !coords.some(isNaN)) {
            [lng, lat] = coords;
          }
        }
        
        if (lng === undefined || lat === undefined) return false;
        
        return lng >= bounds.getWest() - padding && 
               lng <= bounds.getEast() + padding &&
               lat >= bounds.getSouth() - padding && 
               lat <= bounds.getNorth() + padding;
      });

      // Convert visible SOS signals to GeoJSON features
      const features = visibleSignals.map((signal) => {
        let coords: number[];
        
        if (signal.lng !== undefined && signal.lat !== undefined) {
          coords = [signal.lng, signal.lat];
        } else if (signal.location) {
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
            // Weight based on severity (1-5 scale)
            weight: signal.severity_level,
          },
        };
      }).filter(Boolean);

      if (features.length === 0) {
        // Remove heatmap if no visible features
        try {
          if (map.getLayer(layerIdRef.current)) {
            map.removeLayer(layerIdRef.current);
          }
          if (map.getSource(sourceIdRef.current)) {
            map.removeSource(sourceIdRef.current);
          }
        } catch (error) {
          // Ignore
        }
        return;
      }

      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as GeoJSON.Feature[],
      };

      try {
        // Check if source exists
        const source = map.getSource(sourceIdRef.current) as maplibregl.GeoJSONSource;
        
        if (source) {
          // Update existing source (more efficient than removing/adding)
          source.setData(geojsonData);
        } else {
          // Add new source
          map.addSource(sourceIdRef.current, {
            type: 'geojson',
            data: geojsonData,
          });
        }

        // Add layer if it doesn't exist
        if (!map.getLayer(layerIdRef.current)) {
          // Dynamic radius based on zoom
          const getRadiusForZoom = (zoom: number) => {
            if (zoom < 8) return 15;
            if (zoom < 10) return 25;
            if (zoom < 12) return 40;
            if (zoom < 14) return 60;
            return 80;
          };

          map.addLayer({
            id: layerIdRef.current,
            type: 'heatmap',
            source: sourceIdRef.current,
            paint: {
              // Weight increases with severity (1-5)
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                1, 0.3,  // Severity 1 = 30% weight
                2, 0.5,  // Severity 2 = 50% weight
                3, 0.7,  // Severity 3 = 70% weight
                4, 0.9,  // Severity 4 = 90% weight
                5, 1.0   // Severity 5 = 100% weight
              ],
              
              // Intensity increases with zoom for better visibility
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.8,   // Low zoom = 80% intensity
                10, 1.2,  // Medium zoom = 120% intensity
                15, 2.0   // High zoom = 200% intensity
              ],
              
              // Emergency-themed color gradient (yellow → orange → red → dark red)
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(255, 255, 0, 0)',      // Transparent yellow
                0.1, 'rgba(255, 200, 0, 0.3)',  // Light yellow-orange
                0.3, 'rgba(255, 150, 0, 0.5)',  // Orange
                0.5, 'rgba(255, 100, 0, 0.7)',  // Red-orange
                0.7, 'rgba(255, 50, 0, 0.85)',  // Red
                0.9, 'rgba(200, 0, 0, 0.95)',   // Dark red
                1, 'rgba(139, 0, 0, 1)'         // Crimson
              ],
              
              // Dynamic radius based on zoom level
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 15,   // World view = small radius
                8, 25,   // Country view
                10, 40,  // Region view
                12, 60,  // City view
                14, 80,  // District view
                16, 100  // Street view = large radius
              ],
              
              // Opacity (slightly transparent for map visibility)
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.7,  // More transparent at low zoom
                10, 0.8, // Standard opacity at medium zoom
                14, 0.85 // Slightly more opaque at high zoom
              ],
            },
          });
        }
      } catch (error) {
        // Silently handle errors
        console.warn('Heatmap update error:', error);
      }
    };

    // Update heatmap when map moves (viewport culling)
    const updateOnMove = () => {
      addOrUpdateHeatmap();
    };

    // Initial render
    if (map.isStyleLoaded()) {
      addOrUpdateHeatmap();
    } else {
      map.once('styledata', addOrUpdateHeatmap);
    }

    // Update on map movement for viewport culling
    map.on('moveend', updateOnMove);
    map.on('zoomend', updateOnMove);

    return () => {
      map.off('styledata', addOrUpdateHeatmap);
      map.off('moveend', updateOnMove);
      map.off('zoomend', updateOnMove);
      
      // Cleanup
      try {
        if (map.getLayer(layerIdRef.current)) {
          map.removeLayer(layerIdRef.current);
        }
        if (map.getSource(sourceIdRef.current)) {
          map.removeSource(sourceIdRef.current);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [map, sosSignals, currentZoom]);

  return null;
};
