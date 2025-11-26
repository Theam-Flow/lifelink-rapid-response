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
              // Weight increases with severity (1-5) - MÁS AGRESIVO
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                1, 0.5,  // Severity 1 = 50% weight (antes 30%)
                2, 0.7,  // Severity 2 = 70% weight (antes 50%)
                3, 0.85, // Severity 3 = 85% weight (antes 70%)
                4, 1.0,  // Severity 4 = 100% weight (antes 90%)
                5, 1.0   // Severity 5 = 100% weight
              ],
              
              // Intensity MUCHO MÁS ALTA para mejor visibilidad
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 2.0,   // Low zoom = 200% intensity (antes 80%)
                10, 3.0,  // Medium zoom = 300% intensity (antes 120%)
                15, 4.0   // High zoom = 400% intensity (antes 200%)
              ],
              
              // Colores MÁS BRILLANTES Y OPACOS - Emergency theme
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(255, 255, 0, 0)',       // Transparent yellow
                0.05, 'rgba(255, 255, 0, 0.6)',  // Bright yellow (antes 0.1, 0.3)
                0.2, 'rgba(255, 200, 0, 0.75)',  // Yellow-orange (antes 0.3, 0.5)
                0.4, 'rgba(255, 150, 0, 0.85)',  // Orange (antes 0.5, 0.7)
                0.6, 'rgba(255, 50, 0, 0.9)',    // Red-orange (antes 0.7, 0.85)
                0.8, 'rgba(255, 0, 0, 0.95)',    // Bright red (antes 0.9, 0.95)
                1, 'rgba(200, 0, 0, 1)'          // Dark red
              ],
              
              // Radio MÁS GRANDE para cubrir más área
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 30,    // World view (antes 15)
                8, 50,    // Country view (antes 25)
                10, 80,   // Region view (antes 40)
                12, 120,  // City view (antes 60)
                14, 150,  // District view (antes 80)
                16, 180   // Street view (antes 100)
              ],
              
              // Opacidad MÁS ALTA para mejor visibilidad
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.85,  // Más opaco en low zoom (antes 0.7)
                10, 0.9,  // Alto en medium zoom (antes 0.8)
                14, 0.95  // Muy opaco en high zoom (antes 0.85)
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
