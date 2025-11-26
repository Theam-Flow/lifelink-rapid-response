import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface HeatmapCanvasLayerProps {
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
 * HTML Canvas-based Heatmap - Always visible, no MapLibre layer issues
 * Uses same DOM/HTML approach as markers for guaranteed visibility
 */
export const HeatmapCanvasLayer = ({ map, sosSignals }: HeatmapCanvasLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create canvas overlay
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      opacity: 0.7;
    `;
    
    container.appendChild(canvas);
    map.getCanvasContainer().appendChild(container);
    
    canvasRef.current = canvas;
    containerRef.current = container;

    return () => {
      if (containerRef.current) {
        containerRef.current.remove();
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map || !canvasRef.current || sosSignals.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawHeatmap = () => {
      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get current zoom for radius calculation - balanced for visibility
      const zoom = map.getZoom();
      const baseRadius = zoom < 10 ? 15 : zoom < 12 ? 22 : zoom < 14 ? 30 : 38;
      
      // Pulsation effect using timestamp
      const time = Date.now() / 1000;
      const pulse = 0.85 + Math.sin(time * 2) * 0.15; // oscillates between 0.7 and 1.0

      // Draw each SOS signal as a radial gradient
      sosSignals.forEach(signal => {
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

        if (lng === undefined || lat === undefined) return;

        // Convert geo coordinates to pixel coordinates
        const point = map.project([lng, lat]);

        // Calculate radius based on severity (higher severity = larger radius)
        const severityMultiplier = 0.5 + (signal.severity_level / 5) * 0.5; // 0.5 to 1.0
        const radius = baseRadius * severityMultiplier * pulse;

        // Create radial gradient (emergency colors: yellow -> orange -> red)
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, radius
        );

        // Balanced alpha for visibility - subtle but present
        const alpha = (0.15 + (signal.severity_level / 5) * 0.15) * pulse; // 0.15 to 0.3
        
        if (signal.severity_level <= 2) {
          // Low severity: Yellow to Orange - subtle gradient
          gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 200, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 200, 0, 0)`);
        } else if (signal.severity_level <= 3) {
          // Medium severity: Orange - subtle gradient
          gradient.addColorStop(0, `rgba(255, 150, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 100, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
        } else {
          // High severity: Red to Dark Red - subtle gradient
          gradient.addColorStop(0, `rgba(255, 50, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 0, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        }

        // Draw circle with gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Apply subtle blur for smoother heatmap effect
      ctx.filter = 'blur(15px)';
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      ctx.putImageData(imageData, 0, 0);
      
      // Request animation frame for pulsation
      requestAnimationFrame(drawHeatmap);
    };

    // Draw on map move/zoom
    const updateHeatmap = () => {
      drawHeatmap();
    };

    // Initial draw
    if (map.loaded()) {
      drawHeatmap();
    } else {
      map.once('load', drawHeatmap);
    }

    // Redraw on map movement
    map.on('move', updateHeatmap);
    map.on('zoom', updateHeatmap);

    return () => {
      map.off('move', updateHeatmap);
      map.off('zoom', updateHeatmap);
    };
  }, [map, sosSignals]);

  return null;
};
