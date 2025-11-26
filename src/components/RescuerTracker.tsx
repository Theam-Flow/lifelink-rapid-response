import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface RescuerTrackerProps {
  map: mapboxgl.Map | null;
  rescuers: Array<{
    rescuer_id: string;
    location: unknown;
    status: string;
    profile?: {
      full_name: string;
    };
  }>;
}

export const RescuerTracker = ({ map, rescuers }: RescuerTrackerProps) => {
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!map) return;

    // Remove markers that are no longer active
    Object.keys(markersRef.current).forEach((rescuerId) => {
      if (!rescuers.find((r) => r.rescuer_id === rescuerId)) {
        markersRef.current[rescuerId].remove();
        delete markersRef.current[rescuerId];
      }
    });

    // Update or create markers for active rescuers
    rescuers.forEach((rescuer) => {
      const locationStr = String(rescuer.location || '');
      const coords = locationStr
        .replace('POINT(', '')
        .replace(')', '')
        .split(' ')
        .map(parseFloat);

      if (coords.length !== 2 || coords.some(isNaN)) return;

      const [lng, lat] = coords;

      // Update existing marker or create new one
      if (markersRef.current[rescuer.rescuer_id]) {
        markersRef.current[rescuer.rescuer_id].setLngLat([lng, lat]);
      } else {
        // Create rescuer marker
        const el = document.createElement('div');
        el.className = 'rescuer-marker';
        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="3"/>
            <path d="M16 8 L16 24 M8 16 L24 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        el.style.cursor = 'pointer';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2">
                <strong class="text-primary">Rescatista</strong>
                <p class="text-sm">${rescuer.profile?.full_name || 'Desconocido'}</p>
                <p class="text-xs text-muted-foreground">Estado: ${rescuer.status}</p>
              </div>
            `)
          )
          .addTo(map);

        markersRef.current[rescuer.rescuer_id] = marker;
      }
    });

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, [map, rescuers]);

  return null;
};
