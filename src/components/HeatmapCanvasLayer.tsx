import { useEffect, useRef, useState } from 'react';
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

interface ParsedSignal {
  id: string;
  lng: number;
  lat: number;
  severity: number;
}

interface ClusterCell {
  lng: number;
  lat: number;
  intensity: number;
  maxSeverity: number;
  count: number;
}

/**
 * Optimized Canvas-based Heatmap with:
 * - Grid clustering by zoom level
 * - Viewport culling for performance
 * - Pulse animation for high severity (4-5)
 * - Proper blur effect via CSS
 */
export const HeatmapCanvasLayer = ({ map, sosSignals }: HeatmapCanvasLayerProps) => {
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [parsedSignals, setParsedSignals] = useState<ParsedSignal[]>([]);

  // Parse coordinates from SOS signals
  useEffect(() => {
    const parsed: ParsedSignal[] = [];
    
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

      if (lng !== undefined && lat !== undefined) {
        parsed.push({ id: signal.id, lng, lat, severity: signal.severity_level });
      }
    });

    setParsedSignals(parsed);
  }, [sosSignals]);

  // Initialize canvas overlay
  useEffect(() => {
    if (!map) return;

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

    // Draw canvas (hidden, used for rendering)
    const drawCanvas = document.createElement('canvas');
    drawCanvas.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      display: none;
    `;

    // Blur canvas (visible with CSS blur)
    const blurCanvas = document.createElement('canvas');
    blurCanvas.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0.85;
      filter: blur(30px);
    `;
    
    container.appendChild(drawCanvas);
    container.appendChild(blurCanvas);
    map.getCanvasContainer().appendChild(container);
    
    drawCanvasRef.current = drawCanvas;
    blurCanvasRef.current = blurCanvas;
    containerRef.current = container;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current) {
        containerRef.current.remove();
      }
    };
  }, [map]);

  // Grid clustering based on zoom level
  const clusterSignals = (signals: ParsedSignal[], zoom: number, bounds: maplibregl.LngLatBounds): ClusterCell[] => {
    // Determine cell size based on zoom
    let cellSize: number;
    if (zoom < 10) {
      cellSize = 0.5; // ~50km cells for country view
    } else if (zoom < 14) {
      cellSize = 0.05; // ~5km cells for city view
    } else {
      // No clustering for detailed view, return individual signals
      return signals
        .filter(s => bounds.contains([s.lng, s.lat]))
        .map(s => ({
          lng: s.lng,
          lat: s.lat,
          intensity: s.severity,
          maxSeverity: s.severity,
          count: 1
        }));
    }

    // Add 10% padding to viewport for smoother experience
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const lngPadding = (ne.lng - sw.lng) * 0.1;
    const latPadding = (ne.lat - sw.lat) * 0.1;

    // Grid clustering with spatial hash
    const grid = new Map<string, ClusterCell>();

    signals.forEach(signal => {
      // Check if signal is within padded viewport
      if (signal.lng < sw.lng - lngPadding || signal.lng > ne.lng + lngPadding ||
          signal.lat < sw.lat - latPadding || signal.lat > ne.lat + latPadding) {
        return;
      }

      const cellX = Math.floor(signal.lng / cellSize);
      const cellY = Math.floor(signal.lat / cellSize);
      const key = `${cellX},${cellY}`;

      const existing = grid.get(key);
      if (existing) {
        existing.intensity += signal.severity;
        existing.maxSeverity = Math.max(existing.maxSeverity, signal.severity);
        existing.count++;
      } else {
        grid.set(key, {
          lng: (cellX + 0.5) * cellSize,
          lat: (cellY + 0.5) * cellSize,
          intensity: signal.severity,
          maxSeverity: signal.severity,
          count: 1
        });
      }
    });

    return Array.from(grid.values());
  };

  // Draw heatmap with optional pulse animation
  const drawHeatmap = (timestamp: number = 0) => {
    if (!map || !drawCanvasRef.current || !blurCanvasRef.current || parsedSignals.length === 0) return;

    const drawCanvas = drawCanvasRef.current;
    const blurCanvas = blurCanvasRef.current;
    const drawCtx = drawCanvas.getContext('2d', { alpha: true });
    const blurCtx = blurCanvas.getContext('2d', { alpha: true });
    if (!drawCtx || !blurCtx) return;

    // CRITICAL: Use exact map canvas size for perfect alignment
    const mapCanvas = map.getCanvas();
    const width = mapCanvas.width;
    const height = mapCanvas.height;
    
    // Set canvas size to match map canvas exactly
    drawCanvas.width = width;
    drawCanvas.height = height;
    blurCanvas.width = width;
    blurCanvas.height = height;

    // Clear canvases
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    const zoom = map.getZoom();
    const bounds = map.getBounds();
    const clusters = clusterSignals(parsedSignals, zoom, bounds);

    // Base radius calculation
    const baseRadius = zoom < 10 ? 60 : zoom < 12 ? 80 : zoom < 14 ? 100 : 120;

    // Pulse animation parameters (sine wave)
    const pulseSpeed = 0.002; // 2 seconds per cycle
    const pulseCycle = Math.sin(timestamp * pulseSpeed);

    clusters.forEach(cell => {
      const point = map.project([cell.lng, cell.lat]);
      
      // Calculate radius based on intensity and zoom
      let radius = baseRadius * (0.5 + (cell.intensity / (cell.count * 5)) * 0.5);

      // Apply pulse animation for high severity (4-5)
      let alpha = 0.6 + (cell.maxSeverity / 5) * 0.4;
      if (cell.maxSeverity >= 4) {
        const pulseIntensity = cell.maxSeverity === 5 ? 0.25 : 0.15;
        radius = radius * (1 + pulseCycle * pulseIntensity);
        alpha = alpha * (1 + pulseCycle * 0.2);
      }

      // Create radial gradient
      const gradient = drawCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      );

      // Color based on max severity
      if (cell.maxSeverity <= 2) {
        // Low severity: Yellow to Orange
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 200, 0, ${alpha * 0.7})`);
        gradient.addColorStop(0.7, `rgba(255, 150, 0, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(255, 150, 0, 0)`);
      } else if (cell.maxSeverity === 3) {
        // Medium severity: Orange to Red
        gradient.addColorStop(0, `rgba(255, 150, 0, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 100, 0, ${alpha * 0.7})`);
        gradient.addColorStop(0.7, `rgba(255, 50, 0, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
      } else if (cell.maxSeverity === 4) {
        // High severity: Red to Crimson
        gradient.addColorStop(0, `rgba(255, 50, 0, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 0, 0, ${alpha * 0.7})`);
        gradient.addColorStop(0.7, `rgba(220, 0, 0, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(220, 0, 0, 0)`);
      } else {
        // Critical severity: Intense Red to Dark Crimson
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(220, 0, 0, ${alpha * 0.8})`);
        gradient.addColorStop(0.6, `rgba(180, 0, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(180, 0, 0, 0)`);
      }

      // Draw circle with gradient
      drawCtx.fillStyle = gradient;
      drawCtx.beginPath();
      drawCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      drawCtx.fill();
    });

    // Copy to blur canvas
    blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
    blurCtx.drawImage(drawCanvas, 0, 0);

    // Continue animation if there are high severity signals
    const hasHighSeverity = clusters.some(c => c.maxSeverity >= 4);
    if (hasHighSeverity) {
      animationFrameRef.current = requestAnimationFrame(drawHeatmap);
    }
  };

  // Trigger redraw on data or map changes
  useEffect(() => {
    if (!map || parsedSignals.length === 0) return;

    const updateHeatmap = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      drawHeatmap(performance.now());
    };

    // Initial draw
    if (map.loaded()) {
      updateHeatmap();
    } else {
      map.once('load', updateHeatmap);
    }

    // Only redraw when movement/zoom is FINISHED (not during animation)
    map.on('moveend', updateHeatmap);
    map.on('zoomend', updateHeatmap);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.off('moveend', updateHeatmap);
      map.off('zoomend', updateHeatmap);
    };
  }, [map, parsedSignals]);

  return null;
};
