import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRescuerTracking } from '@/hooks/useRescuerTracking';
import { useSOSPagination } from '@/hooks/useSOSPagination';
import { useGeofencedRealtime } from '@/hooks/useGeofencedRealtime';
import { useBackendClustering } from '@/hooks/useBackendClustering';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Navigation, AlertCircle, Radio, Layers, MessageSquare, X, Bell, BellOff, Crosshair, Phone, Mail, MapPin, Moon, Sun } from 'lucide-react';
import { EARTHQUAKE_EPICENTERS, affectedZoneGeoJSON } from '@/data/earthquake-epicenters';
import { HeatmapCanvasLayer } from '@/components/HeatmapCanvasLayer';
import { RescuerTracker } from '@/components/RescuerTracker';
import { Chat } from '@/components/Chat';
import { SOSActionDialog } from '@/components/SOSActionDialog';
import { MapLegend } from '@/components/MapLegend';
import { requestNotificationPermission, setupSOSNotifications } from '@/lib/notifications';

interface SOSSignal {
  id: string;
  location?: unknown;
  severity_level: number;
  type: string;
  description: string | null;
  victim_count: number | null;
  status: string | null;
  created_at: string | null;
  user_id: string;
  accuracy_meters: number | null;
  lng?: number;
  lat?: number;
  distance_meters?: number;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_line_id?: string | null;
}

interface Shelter {
  id: string;
  name: string;
  type: string;
  location: unknown;
  address: string | null;
  contact_phone: string | null;
  capacity_max: number | null;
  capacity_current: number | null;
  is_verified: boolean | null;
  photo_urls: string[] | null;
}

const RescueMap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const shelterMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [currentZoom, setCurrentZoom] = useState(11);
  const [sosSignals, setSOSSignals] = useState<SOSSignal[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedSOS, setSelectedSOS] = useState<SOSSignal | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSOSList, setShowSOSList] = useState(false); // Changed to false by default
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showOnlyNearby, setShowOnlyNearby] = useState(false); // Toggle para filtro de distancia
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mapDarkMode');
    return saved === 'true';
  }); // Toggle para modo noche del mapa
  const sosNotificationChannelRef = useRef<ReturnType<typeof setupSOSNotifications> | null>(null);

  const { rescuers, isSharing, startSharing, stopSharing } = useRescuerTracking();

  // OPTIMIZACIÓN: React Query para caching + paginación
  // Radio dinámico basado en el toggle del usuario
  const effectiveRadius = showOnlyNearby ? 200 : 1000;
  const { data: sosSignalsData, refetch: refetchSOS, isLoading: sosLoading } = useSOSPagination({
    userLocation: userLocation || { lng: -66.9036, lat: 10.4806 },
    radiusKm: effectiveRadius,
    pageSize: 500,
    enabled: mapLoaded
  });

  // Actualizar estado local cuando cambien los datos
  useEffect(() => {
    if (sosSignalsData) {
      setSOSSignals(sosSignalsData);
    }
  }, [sosSignalsData]);

  // OPTIMIZACIÓN: Realtime geofenced (solo viewport visible)
  const [mapBounds, setMapBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  
  const handleRealtimeUpdate = useCallback(() => {
    refetchSOS();
  }, [refetchSOS]);

  useGeofencedRealtime({
    bounds: mapBounds,
    enabled: mapLoaded && !!user,
    onUpdate: handleRealtimeUpdate
  });

  // OPTIMIZACIÓN: Backend clustering para bajo zoom
  const shouldUseBackendClustering = currentZoom < 12;
  const { data: backendClusters } = useBackendClustering({
    bounds: mapBounds,
    zoom: currentZoom,
    enabled: shouldUseBackendClustering && mapLoaded
  });

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // MapLibre doesn't need a token - it's 100% free!

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Using reliable OpenStreetMap styles with day/night modes
    const lightStyle = {
      version: 8 as const,
      sources: {
        'osm': {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster' as const,
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const darkStyle = {
      version: 8 as const,
      sources: {
        'carto-dark': {
          type: 'raster' as const,
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors © CARTO'
        }
      },
      layers: [
        {
          id: 'carto-dark',
          type: 'raster' as const,
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: isDarkMode ? darkStyle : lightStyle,
      center: [-66.9036, 10.4806],
      zoom: 11,
    });

    // Add navigation controls only at top-right
    const navControl = new maplibregl.NavigationControl({ 
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    });
    newMap.addControl(navControl, 'top-right');

    // Wait for map to fully load before allowing operations
    newMap.on('load', () => {
      map.current = newMap;
      setMapLoaded(true);

      // Official USGS earthquake epicenters (2026-06-24 doublet) — static context layer
      EARTHQUAKE_EPICENTERS.forEach((eq) => {
        const el = document.createElement('div');
        el.style.cssText =
          'width:22px;height:22px;border-radius:50%;background:rgba(220,38,38,0.35);' +
          'border:2px solid #dc2626;box-shadow:0 0 0 4px rgba(220,38,38,0.15);cursor:pointer;';
        el.title = `Epicentro M${eq.magnitude}`;
        new maplibregl.Marker({ element: el })
          .setLngLat([eq.lng, eq.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font-size:12px"><strong>Epicentro M${eq.magnitude}</strong><br/>${eq.place}<br/>Prof. ${eq.depthKm} km · 24 jun 2026</div>`
            )
          )
          .addTo(newMap);
      });

      // Official affected-zone context (USGS shaking radius) — not damage points
      if (!newMap.getSource('affected-zone')) {
        newMap.addSource('affected-zone', { type: 'geojson', data: affectedZoneGeoJSON() as any });
        newMap.addLayer({
          id: 'affected-zone-fill', type: 'fill', source: 'affected-zone',
          paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.06 },
        });
        newMap.addLayer({
          id: 'affected-zone-line', type: 'line', source: 'affected-zone',
          paint: { 'line-color': '#dc2626', 'line-opacity': 0.25, 'line-width': 1 },
        });
      }

      // Get user's current location and center map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lng: longitude, lat: latitude });
            
            if (map.current) {
              map.current.setCenter([longitude, latitude]);
              map.current.setZoom(14);
              
              // Add a marker for user's location
              new maplibregl.Marker({ color: '#3b82f6' })
                .setLngLat([longitude, latitude])
                .setPopup(new maplibregl.Popup().setHTML('<p>Tu ubicación</p>'))
                .addTo(map.current);
            }
          },
          (error) => {
            toast.error(t('map.errorLoadingLocation') || 'No se pudo obtener tu ubicación');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    });

    // Track zoom changes
    newMap.on('zoom', () => {
      setCurrentZoom(newMap.getZoom());
    });

    // Track bounds for geofencing
    const updateBounds = () => {
      if (!newMap) return;
      const bounds = newMap.getBounds();
      setMapBounds({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
      });
    };

    newMap.on('moveend', updateBounds);
    updateBounds(); // Initial bounds

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      shelterMarkersRef.current.forEach(marker => marker.remove());
      shelterMarkersRef.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [t]);

  // Toggle between day and night mode dynamically
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Save to localStorage
    localStorage.setItem('mapDarkMode', String(isDarkMode));

    const lightStyle = {
      version: 8 as const,
      sources: {
        'osm': {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster' as const,
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const darkStyle = {
      version: 8 as const,
      sources: {
        'carto-dark': {
          type: 'raster' as const,
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors © CARTO'
        }
      },
      layers: [
        {
          id: 'carto-dark',
          type: 'raster' as const,
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    map.current.setStyle(isDarkMode ? darkStyle : lightStyle);
  }, [isDarkMode, mapLoaded]);

  // SUPER-OPTIMIZED HTML markers with viewport culling, clustering, and massive scale support
  useEffect(() => {
    if (!map.current || !mapLoaded || sosSignals.length === 0) return;

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const getSeverityColor = (level: number) => {
      const colors: Record<number, string> = {
        1: '#FFA500', 2: '#FF6347', 3: '#FF4500', 4: '#DC143C', 5: '#FF0000'
      };
      return colors[level] || '#FF0000';
    };

    // Adaptive marker size based on zoom (smaller at low zoom)
    const getMarkerSize = (zoom: number) => {
      if (zoom < 10) return { width: 4, height: 4, border: 1 };
      if (zoom < 12) return { width: 8, height: 8, border: 1 };
      if (zoom < 14) return { width: 12, height: 12, border: 2 };
      return { width: 16, height: 16, border: 2 };
    };

    const markerSize = getMarkerSize(currentZoom);

    // CLUSTERING: Group nearby signals at low zoom levels
    const shouldCluster = currentZoom < 13;
    const clusterDistance = currentZoom < 11 ? 0.05 : 0.01; // degrees (~5km at low zoom, ~1km at medium)
    
    let processedSignals = [...sosSignals];
    
    if (shouldCluster && sosSignals.length > 50) {
      // Simple clustering algorithm
      const clusters: Map<string, SOSSignal[]> = new Map();
      
      processedSignals.forEach(signal => {
        let lng: number | undefined, lat: number | undefined;
        
        if (signal.lng !== undefined && signal.lat !== undefined) {
          lng = signal.lng;
          lat = signal.lat;
        } else if (signal.location) {
          const locationStr = String(signal.location || '');
          const coords = locationStr.replace('POINT(', '').replace(')', '').split(' ').map(parseFloat);
          if (coords.length === 2 && !coords.some(isNaN)) [lng, lat] = coords;
        }
        
        if (lng === undefined || lat === undefined) return;
        
        // Find nearby cluster
        let foundCluster = false;
        for (const [key, group] of clusters.entries()) {
          const [clusterLng, clusterLat] = key.split(',').map(Number);
          const distance = Math.sqrt(Math.pow(lng - clusterLng, 2) + Math.pow(lat - clusterLat, 2));
          
          if (distance < clusterDistance) {
            group.push(signal);
            foundCluster = true;
            break;
          }
        }
      
      if (!foundCluster) {
        clusters.set(`${lng},${lat}`, [signal]);
      }
    });
    
    // Use representative from each cluster
    processedSignals = Array.from(clusters.values()).map(group => {
      return group.reduce((highest, signal) => 
        signal.severity_level > highest.severity_level ? signal : highest
      , group[0]);
    });
  }

    // VIEWPORT CULLING: Only render markers in current view (for future optimization)
    const bounds = map.current.getBounds();
    const visibleSignals = processedSignals.filter(signal => {
      let lng: number | undefined, lat: number | undefined;
      
      if (signal.lng !== undefined && signal.lat !== undefined) {
        lng = signal.lng;
        lat = signal.lat;
      } else if (signal.location) {
        const locationStr = String(signal.location || '');
        const coords = locationStr.replace('POINT(', '').replace(')', '').split(' ').map(parseFloat);
        if (coords.length === 2 && !coords.some(isNaN)) [lng, lat] = coords;
      }
      
      if (lng === undefined || lat === undefined) return false;
      
    return lng >= bounds.getWest() - 0.1 && lng <= bounds.getEast() + 0.1 &&
           lat >= bounds.getSouth() - 0.1 && lat <= bounds.getNorth() + 0.1;
  });

  // Batch create markers with DOM fragment for performance
  const markers: maplibregl.Marker[] = [];
  visibleSignals.forEach(signal => {
    let lng: number, lat: number;

    if (signal.lng !== undefined && signal.lat !== undefined) {
      lng = signal.lng;
      lat = signal.lat;
    } else if (signal.location) {
      const locationStr = String(signal.location || '');
      const coords = locationStr.replace('POINT(', '').replace(')', '').split(' ').map(parseFloat);
      
      if (coords.length !== 2 || coords.some(isNaN)) {
        return;
      }
      [lng, lat] = coords;
    } else {
      return;
    }

      const color = getSeverityColor(signal.severity_level);

      // OPTIMIZED: Minimal DOM manipulation, no hover transforms
      const el = document.createElement('div');
      el.className = 'sos-marker-point';
      
      // Fixed styles - NO TRANSFORM to prevent movement
      el.style.cssText = `
        width: ${markerSize.width}px;
        height: ${markerSize.height}px;
        border-radius: 50%;
        background-color: ${color};
        border: ${markerSize.border}px solid white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: auto;
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      `;

      // Optimized popup - lazy creation
      const popup = new maplibregl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px',
        className: 'sos-popup'
      }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
            <h3 style="font-weight: bold; margin: 0; font-size: 14px;">
              ${t(`emergencyTypes.${signal.type}`)}
            </h3>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            <p style="margin: 4px 0;"><strong>${t('sos.severity')}:</strong> ${signal.severity_level}/5</p>
            ${signal.victim_count ? `<p style="margin: 4px 0;"><strong>${t('sos.victimCount')}:</strong> ${signal.victim_count} ${t('sos.people')}</p>` : ''}
            ${signal.distance_meters !== undefined ? `
              <p style="margin: 4px 0;"><strong>${t('map.distance')}:</strong> 
                ${signal.distance_meters < 1000 
                  ? `${Math.round(signal.distance_meters)}m` 
                  : `${(signal.distance_meters / 1000).toFixed(1)}km`}
              </p>
            ` : ''}
            ${signal.description ? `<p style="margin: 4px 0; font-style: italic;">${signal.description.substring(0, 50)}${signal.description.length > 50 ? '...' : ''}</p>` : ''}
          </div>
          <button 
            id="view-details-btn-${signal.id}"
            style="width: 100%; padding: 6px; background-color: hsl(var(--primary)); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
          >
            ${t('map.viewDetails')}
          </button>
        </div>
      `);

      // Create marker
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Attach event handler when popup opens
      popup.on('open', () => {
        const btn = document.getElementById(`view-details-btn-${signal.id}`);
        if (btn) {
          btn.onclick = () => {
            setSelectedSOS(signal);
            setShowActionDialog(true);
            popup.remove();
          };
        }
      });

      markers.push(marker);
    });

    markersRef.current = markers;

    // Update markers on map move (viewport culling)
    const updateVisibleMarkers = () => {
      // Re-render only when zoom changes significantly or map moves far
      // This will be called by the zoom change effect
    };

    map.current.on('moveend', updateVisibleMarkers);

    return () => {
      map.current?.off('moveend', updateVisibleMarkers);
      markers.forEach(marker => marker.remove());
    };
  }, [sosSignals, mapLoaded, currentZoom, t]);

  // No longer needed - usando hooks optimizados

  // Fetch shelters
  useEffect(() => {
    const fetchShelters = async () => {
      const { data, error } = await supabase
        .from('shelters')
        .select('*');

      if (error) {
        toast.error(t('map.errorLoadingShelters') || 'Error al cargar refugios');
        return;
      }

      if (data) {
        setShelters(data);
      }
    };

    fetchShelters();
  }, []);

  // Create HTML markers for shelters
  useEffect(() => {
    if (!map.current || !mapLoaded || shelters.length === 0) return;

    // Clear existing shelter markers
    shelterMarkersRef.current.forEach(marker => marker.remove());
    shelterMarkersRef.current = [];

    // Create a marker for each shelter
    shelters.forEach(shelter => {
      let lng: number, lat: number;

      // Parse location
      if (shelter.location) {
        const locationStr = String(shelter.location || '');
        const match = locationStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        } else {
          return; // Skip invalid shelter location silently
        }
      } else {
        return; // Skip shelter without location silently
      }

      if (isNaN(lng) || isNaN(lat)) {
        return; // Skip invalid coordinates silently
      }

      // Get shelter icon
      const icon = getShelterIcon(shelter.type);

      // Create marker element
      const el = document.createElement('div');
      el.className = 'shelter-marker';
      el.innerHTML = `
        <div class="shelter-marker-icon">
          <span>${icon}</span>
        </div>
      `;

      // Create popup with shelter info
      const capacityPercentage = shelter.capacity_max && shelter.capacity_current 
        ? (shelter.capacity_current / shelter.capacity_max) * 100 
        : 0;
      
      const capacityColor = capacityPercentage >= 90 ? '#dc2626' 
        : capacityPercentage >= 70 ? '#eab308' 
        : '#22c55e';

      const popup = new maplibregl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 8px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 24px;">${icon}</span>
            <h3 style="font-weight: bold; margin: 0;">
              ${shelter.name}
            </h3>
            ${shelter.is_verified ? '<span style="color: #22c55e;">✓</span>' : ''}
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
            ${t(`shelters.type_${shelter.type}`) || shelter.type}
          </p>
          ${shelter.capacity_max ? `
            <div style="padding: 8px; background: #f3f4f6; border-radius: 4px; margin-bottom: 8px;">
              <p style="font-size: 12px; margin: 0;">
                <span style="color: #666;">Capacidad:</span>
                <span style="color: ${capacityColor}; font-weight: bold;">
                  ${shelter.capacity_current || 0} / ${shelter.capacity_max}
                </span>
              </p>
            </div>
          ` : ''}
          ${shelter.address ? `
            <p style="font-size: 11px; color: #666; margin: 4px 0;">
              📍 ${shelter.address}
            </p>
          ` : ''}
          ${shelter.contact_phone ? `
            <p style="font-size: 11px; color: #666; margin: 4px 0;">
              📞 <a href="tel:${shelter.contact_phone}" style="color: inherit;">${shelter.contact_phone}</a>
            </p>
          ` : ''}
        </div>
      `);

      // Create marker
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      shelterMarkersRef.current.push(marker);
    });
  }, [shelters, mapLoaded, t]);

  const getShelterIcon = (type: string) => {
    switch (type) {
      case 'temple': return '🛕';
      case 'school': return '🏫';
      case 'hospital': return '🏥';
      case 'high_ground': return '⛰️';
      case 'community_center': return '🏛️';
      case 'sports_complex': return '🏟️';
      default: return '🏠';
    }
  };

  // Setup SOS notifications
  useEffect(() => {
    if (userLocation && notificationsEnabled) {
      sosNotificationChannelRef.current = setupSOSNotifications(userLocation);
    }

    return () => {
      if (sosNotificationChannelRef.current) {
        supabase.removeChannel(sosNotificationChannelRef.current);
      }
    };
  }, [userLocation, notificationsEnabled]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        toast.success('Notificaciones activadas', {
          description: 'Recibirás alertas de nuevos SOS cercanos'
        });
      } else {
        toast.error('Permisos denegados', {
          description: 'Activa los permisos en la configuración del navegador'
        });
      }
    } else {
      setNotificationsEnabled(false);
      toast.info('Notificaciones desactivadas');
    }
  };

  const getSeverityColor = (level: number): string => {
    const colors = ['#FFA500', '#FF6347', '#FF4500', '#DC143C', '#8B0000'];
    return colors[level - 1] || '#FF0000';
  };

  const assignToMe = async (sosId: string) => {
    if (!user) {
      toast.error(t('map.loginToAssign'));
      navigate('/auth');
      return;
    }

    const { error } = await supabase
      .from('sos_signals')
      .update({
        status: 'acknowledged',
        assigned_rescuer_id: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', sosId);

    if (error) {
      toast.error(t('map.assignError'));
    } else {
      toast.success(t('map.assignSuccess'));
      setSelectedSOS(null);
    }
  };

  const navigateToLocation = (signal: SOSSignal) => {
    let lng: number, lat: number;
    
    // Use lng/lat if available (from distance function)
    if (signal.lng !== undefined && signal.lat !== undefined) {
      lng = signal.lng;
      lat = signal.lat;
    } else if (signal.location) {
      // Parse location string as fallback
      const locationStr = String(signal.location || '');
      const coords = locationStr
        .replace('POINT(', '')
        .replace(')', '')
        .split(' ')
        .map(parseFloat);
      
      if (coords.length !== 2 || coords.some(isNaN)) {
        toast.error('Ubicación no válida');
        return;
      }
      [lng, lat] = coords;
    } else {
      toast.error('Ubicación no disponible');
      return;
    }

    // Use Google Maps URL that works on both Android and iOS
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const handleViewDetails = () => {
    // Show details panel
    setShowChat(false);
    setShowDetails(true);
  };

  const handleOpenChat = () => {
    setShowDetails(false);
    setShowChat(true);
  };

  const recenterToUserLocation = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1000
      });
    } else {
      toast.error(t('sos.noLocation'));
    }
  };

  return (
    <div className={`relative h-screen w-full flex flex-col md:flex-row ${isDarkMode ? 'dark' : ''}`}>
      {/* Map Container */}
      <div className={`flex-1 relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div 
          ref={mapContainer} 
          className={`absolute inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} ${isMobile ? '[&_.maplibregl-ctrl-bottom-left]:!bottom-[-20px] [&_.maplibregl-ctrl-bottom-right]:!bottom-[-20px]' : '[&_.maplibregl-ctrl-bottom-left]:!-bottom-4 [&_.maplibregl-ctrl-bottom-right]:!-bottom-4'}`}
          style={{ 
            bottom: isMobile ? '60px' : '0',
            top: isMobile ? '75px' : '0'
          }} 
        />
        
        {/* Heatmap Layer - HTML Canvas */}
        {showHeatmap && <HeatmapCanvasLayer map={map.current} sosSignals={sosSignals} />}
        
        {/* Rescuer Tracker */}
        <RescuerTracker map={map.current} rescuers={rescuers} />
        
        {/* Desktop Controls - Top Left */}
        {!isMobile && (
          <div className="absolute top-4 left-4 z-10 space-y-2">
            <Card className={`p-4 backdrop-blur ${isDarkMode ? 'bg-gray-900/90 text-white' : 'bg-background/90'}`}>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{t('map.title')}</h1>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
                    SOS: {sosSignals.length} | {t('map.rescuers_count')}: {rescuers.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className={`p-2 backdrop-blur space-y-2 ${isDarkMode ? 'bg-gray-900/90' : 'bg-background/90'}`}>
              <Button
                variant={showHeatmap ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <Layers className="mr-2 h-4 w-4" />
                {t('map.heatmap')}
              </Button>
              <Button
                variant={isSharing ? 'destructive' : 'default'}
                size="sm"
                className="w-full"
                onClick={isSharing ? stopSharing : startSharing}
              >
                <Radio className="mr-2 h-4 w-4" />
                {isSharing ? t('map.stopTracking') : t('map.shareLocation')}
              </Button>
              <Button
                variant={notificationsEnabled ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={toggleNotifications}
              >
                {notificationsEnabled ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                {notificationsEnabled ? t('map.disableNotifications') : t('map.enableNotifications')}
              </Button>
              <Button
                variant={isDarkMode ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                {isDarkMode ? 'Modo Noche' : 'Modo Día'}
              </Button>
            </Card>
          </div>
        )}

        {/* Mobile Header - Fixed at top */}
        {isMobile && (
          <div className={`absolute top-0 left-0 right-0 z-10 backdrop-blur ${isDarkMode ? 'bg-gray-900/95 text-white border-gray-900' : 'bg-background/95 border-b'}`}>
            <div className="flex items-center justify-between p-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <h1 className="text-sm font-bold">{t('map.title')}</h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
                  SOS: {sosSignals.length} | Rescuers: {rescuers.length}
                </p>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant={showHeatmap ? 'default' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button 
                  variant={isSharing ? 'destructive' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8"
                  onClick={isSharing ? stopSharing : startSharing}
                >
                  <Radio className="h-4 w-4" />
                </Button>
                <Button 
                  variant={notificationsEnabled ? 'default' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleNotifications}
                >
                  {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </Button>
                <Button 
                  variant={isDarkMode ? 'default' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating SOS List Button */}
        {isMobile && !showSOSList && !showChat && sosSignals.length > 0 && (
          <Button
            className={`absolute bottom-24 right-4 z-10 shadow-sm h-8 px-3 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : ''}`}
            variant="secondary"
            size="sm"
            onClick={() => setShowSOSList(true)}
          >
            <span className="text-xs">{t('map.activeAlerts')} ({sosSignals.length})</span>
          </Button>
        )}

        {/* Mobile Legend */}
        {isMobile && !showChat && !showSOSList && (
          <div className="absolute bottom-24 left-4 z-10">
            <MapLegend isDarkMode={isDarkMode} />
          </div>
        )}

        {/* Mobile Recenter Button */}
        {isMobile && userLocation && (
          <Button
            className={`absolute top-[180px] right-4 z-10 h-10 w-10 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700 border-gray-700' : ''}`}
            variant="outline"
            size="icon"
            onClick={recenterToUserLocation}
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        )}

        {/* Desktop SOS Details (bottom card when selected) */}
        {!isMobile && selectedSOS && !showChat && (
          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto">
            <Card className={`p-4 backdrop-blur space-y-3 ${isDarkMode ? 'bg-gray-900/95 text-white' : 'bg-background/95'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle 
                    className="h-6 w-6 mt-1" 
                    style={{ color: getSeverityColor(selectedSOS.severity_level) }}
                  />
                  <div>
                    <h3 className="font-bold text-lg">{t(`emergencyTypes.${selectedSOS.type}`)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('sos.severity')}: {selectedSOS.severity_level}/5 • {selectedSOS.victim_count || 1} {t('sos.people')}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedSOS.description && (
                <p className="text-sm">{selectedSOS.description}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={() => assignToMe(selectedSOS.id)} className="flex-1" variant="default">
                  {t('map.assign')}
                </Button>
                <Button onClick={() => navigateToLocation(selectedSOS)} variant="secondary" className="flex-1">
                  <Navigation className="mr-2 h-4 w-4" />
                  {t('map.navigate')}
                </Button>
                <Button onClick={() => setShowChat(true)} variant="outline" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Desktop SOS List Panel - Right Side */}
      {!isMobile && showSOSList && !showChat && sosSignals.length > 0 && (
        <div className={`w-80 border-l overflow-y-auto ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-background'}`}>
          <div className={`p-3 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-background'}`}>
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-sm text-muted-foreground">SOS Activos ({sosSignals.length})</h2>
              <Button 
                variant={showOnlyNearby ? 'default' : 'secondary'}
                size="sm"
                className="h-7 text-xs w-fit"
                onClick={() => setShowOnlyNearby(!showOnlyNearby)}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {showOnlyNearby ? 'Cercanos 200km' : 'Todos 1000km'}
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSOSList(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-2 space-y-2">
            {sosSignals.map((signal, index) => (
              <Card 
                key={signal.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedSOS(signal);
                  
                  // Navigate to SOS location on map
                  let lng: number | undefined, lat: number | undefined;
                  
                  if (signal.lng !== undefined && signal.lat !== undefined) {
                    lng = signal.lng;
                    lat = signal.lat;
                  } else if (signal.location) {
                    // Parse location if needed
                    const locationStr = String(signal.location || '');
                    const match = locationStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                    if (match) {
                      lng = parseFloat(match[1]);
                      lat = parseFloat(match[2]);
                    }
                  }
                  
                  if (lng !== undefined && lat !== undefined && map.current) {
                    map.current.flyTo({
                      center: [lng, lat],
                      zoom: 16,
                      duration: 1500,
                      essential: true
                    });
                  }
                }}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle 
                      className="h-5 w-5 mt-0.5" 
                      style={{ color: getSeverityColor(signal.severity_level) }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{t(`emergencyTypes.${signal.type}`)}</h3>
                      <div className="text-xs text-muted-foreground">
                        {t('sos.severity')}: {signal.severity_level}/5
                      </div>
                      {signal.distance_meters !== undefined && (
                        <div className="text-xs text-primary font-medium mt-1">
                          {signal.distance_meters < 1000 
                            ? `${Math.round(signal.distance_meters)}m` 
                            : `${(signal.distance_meters / 1000).toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{index + 1}
                    </div>
                  </div>
                  {signal.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{signal.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        assignToMe(signal.id);
                      }}
                    >
                      {t('map.assign')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSOS(signal);
                        setShowChat(true);
                      }}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mobile SOS List - Bottom Sheet */}
      {isMobile && showSOSList && !showChat && sosSignals.length > 0 && (
        <div className={`fixed inset-x-0 bottom-0 z-50 border-t rounded-t-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-background'}`} style={{ maxHeight: '70vh', paddingBottom: '80px' }}>
          <div className={`p-3 border-b flex items-center justify-between sticky top-0 z-10 rounded-t-3xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-muted-foreground">SOS Activos ({sosSignals.length})</h2>
              <Button 
                variant={showOnlyNearby ? 'default' : 'secondary'}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setShowOnlyNearby(!showOnlyNearby)}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {showOnlyNearby ? 'Cercanos 200km' : 'Todos 1000km'}
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSOSList(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(70vh - 140px)' }}>
            {sosSignals.map((signal, index) => (
              <Card 
                key={signal.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedSOS(signal);
                  setShowSOSList(false);
                  
                  // Navigate to SOS location on map
                  let lng: number | undefined, lat: number | undefined;
                  
                  if (signal.lng !== undefined && signal.lat !== undefined) {
                    lng = signal.lng;
                    lat = signal.lat;
                  } else if (signal.location) {
                    // Parse location if needed
                    const locationStr = String(signal.location || '');
                    const match = locationStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                    if (match) {
                      lng = parseFloat(match[1]);
                      lat = parseFloat(match[2]);
                    }
                  }
                  
                  if (lng !== undefined && lat !== undefined && map.current) {
                    map.current.flyTo({
                      center: [lng, lat],
                      zoom: 16,
                      duration: 1500,
                      essential: true
                    });
                  }
                }}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle 
                      className="h-5 w-5 mt-0.5" 
                      style={{ color: getSeverityColor(signal.severity_level) }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{t(`emergencyTypes.${signal.type}`)}</h3>
                      <div className="text-xs text-muted-foreground">
                        {t('sos.severity')}: {signal.severity_level}/5
                      </div>
                      {signal.distance_meters !== undefined && (
                        <div className="text-xs text-primary font-medium mt-1">
                          {signal.distance_meters < 1000 
                            ? `${Math.round(signal.distance_meters)}m` 
                            : `${(signal.distance_meters / 1000).toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{index + 1}
                    </div>
                  </div>
                  {signal.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{signal.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        assignToMe(signal.id);
                      }}
                    >
                      {t('map.assign')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToLocation(signal);
                      }}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      IR
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSOS(signal);
                        setShowChat(true);
                        setShowSOSList(false);
                      }}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Desktop - Show SOS List Toggle Button (when hidden) */}
      {!isMobile && !showSOSList && !showChat && sosSignals.length > 0 && (
        <Button
          className="absolute right-4 top-4 z-10"
          variant="default"
          size="sm"
          onClick={() => setShowSOSList(true)}
        >
          {t('map.activeAlerts')} ({sosSignals.length})
        </Button>
      )}

      {/* SOS Action Dialog */}
      <SOSActionDialog
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
        signal={selectedSOS}
        onViewDetails={handleViewDetails}
        onChat={handleOpenChat}
      />

      {/* Details Panel - Full width on mobile, sidebar on desktop */}
      {showDetails && selectedSOS && (
        <div className={isMobile ? `fixed inset-0 z-[2000] overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-background'}` : `w-96 h-full border-l z-[1500] overflow-y-auto ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-background'}`}>
          <Card className={`h-full border-none rounded-none ${isDarkMode ? 'bg-gray-900 text-white' : ''}`}>
            <CardHeader className={`border-b ${isDarkMode ? 'border-gray-700' : ''}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle 
                    className="h-5 w-5" 
                    style={{ color: getSeverityColor(selectedSOS.severity_level) }}
                  />
                  {t('map.sosDetails')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Emergency Type */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.type')}</h3>
                <p className="text-lg font-semibold">{t(`emergencyTypes.${selectedSOS.type}`)}</p>
              </div>

              {/* Severity Level */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.severity')}</h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 w-8 rounded ${
                          level <= selectedSOS.severity_level ? 'bg-destructive' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{selectedSOS.severity_level}/5</span>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.status')}</h3>
                <p className="capitalize">{selectedSOS.status || 'active'}</p>
              </div>

              {/* Description */}
              {selectedSOS.description && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.description')}</h3>
                  <p className="text-sm">{selectedSOS.description}</p>
                </div>
              )}

              {/* Victim Count */}
              {selectedSOS.victim_count && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.victimCount')}</h3>
                  <p className="text-lg font-semibold">{selectedSOS.victim_count} {t('sos.people')}</p>
                </div>
              )}

              {/* Distance */}
              {selectedSOS.distance_meters !== undefined && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('map.distance')}</h3>
                  <p className="text-lg font-semibold text-primary">
                    {selectedSOS.distance_meters < 1000 
                      ? `${Math.round(selectedSOS.distance_meters)}m` 
                      : `${(selectedSOS.distance_meters / 1000).toFixed(1)}km`}
                  </p>
                </div>
              )}

              {/* Location Accuracy */}
              {selectedSOS.accuracy_meters && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.accuracy')}</h3>
                  <p className="text-sm">±{Math.round(selectedSOS.accuracy_meters)}m</p>
                </div>
              )}

              {/* Created At */}
              {selectedSOS.created_at && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('sos.createdAt')}</h3>
                  <p className="text-sm">
                    {new Date(selectedSOS.created_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              {(selectedSOS.contact_phone || selectedSOS.contact_whatsapp || selectedSOS.contact_line_id) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('profile.contactInfo')}</h3>
                  <div className="space-y-2">
                    {selectedSOS.contact_phone && (
                      <Button
                        onClick={() => window.open(`tel:${selectedSOS.contact_phone}`, '_self')}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                      >
                        <Phone className="mr-3 h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">{t('profile.phone')}</div>
                          <div className="font-semibold">{selectedSOS.contact_phone}</div>
                        </div>
                      </Button>
                    )}
                    {selectedSOS.contact_whatsapp && (
                      <Button
                        onClick={() => window.open(`https://wa.me/${selectedSOS.contact_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                        className="w-full justify-start h-auto py-3 bg-[#25D366] hover:bg-[#25D366]/90"
                      >
                        <MessageSquare className="mr-3 h-5 w-5 text-white" />
                        <div className="text-left text-white">
                          <div className="text-xs opacity-90">{t('profile.whatsapp')}</div>
                          <div className="font-semibold">{selectedSOS.contact_whatsapp}</div>
                        </div>
                      </Button>
                    )}
                    {selectedSOS.contact_line_id && (
                      <Button
                        onClick={() => window.open(`https://line.me/ti/p/${selectedSOS.contact_line_id}`, '_blank')}
                        className="w-full justify-start h-auto py-3 bg-[#06C755] hover:bg-[#06C755]/90"
                      >
                        <Mail className="mr-3 h-5 w-5" />
                        <div className="text-left text-white">
                          <div className="text-xs opacity-90">LINE ID</div>
                          <div className="font-semibold">{selectedSOS.contact_line_id}</div>
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button 
                  className="w-full bg-[#06C755] hover:bg-[#06C755]/90 text-white" 
                  onClick={() => {
                    const sosUrl = `${window.location.origin}/rescue-map?sos=${selectedSOS.id}`;
                    const text = `🚨 ${t('sos.emergency')}!\n${t(`emergencyTypes.${selectedSOS.type}`)}\n${t('sos.severity')}: ${selectedSOS.severity_level}/5\n${sosUrl}`;
                    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {t('profile.shareLine')}
                </Button>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => {
                    setShowDetails(false);
                    setShowChat(true);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('map.chat')}
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => navigateToLocation(selectedSOS)}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  {t('map.navigate')}
                </Button>
                {user?.id && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => assignToMe(selectedSOS.id)}
                  >
                    {t('map.assign')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Panel - Full width on mobile, sidebar on desktop */}
      {showChat && selectedSOS && (
        <div className={isMobile ? "fixed inset-0 z-[2000] bg-background flex flex-col" : "w-96 h-full border-l bg-background z-[1500] flex flex-col"}>
          <Chat sosId={selectedSOS.id} onClose={() => setShowChat(false)} />
        </div>
      )}
    </div>
  );
};

export default RescueMap;
