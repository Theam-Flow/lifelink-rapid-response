import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRescuerTracking } from '@/hooks/useRescuerTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Navigation, AlertCircle, Radio, Layers, MessageSquare, X, Bell, BellOff, Crosshair } from 'lucide-react';
import { HeatmapLayer } from '@/components/HeatmapLayer';
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
  const [sosSignals, setSOSSignals] = useState<SOSSignal[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedSOS, setSelectedSOS] = useState<SOSSignal | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showSOSList, setShowSOSList] = useState(false); // Changed to false by default
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const sosNotificationChannelRef = useRef<ReturnType<typeof setupSOSNotifications> | null>(null);

  const { rescuers, isSharing, startSharing, stopSharing } = useRescuerTracking();

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

    // Using reliable OpenStreetMap standard style
    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [100.5018, 13.7563],
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

      // Get user's current location and center map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lng: longitude, lat: latitude });
            
            // Use setCenter instead of flyTo for better reliability
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
            console.error('Error getting location:', error);
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

    return () => {
      // Clean up markers
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

  // Fetch SOS signals and setup clustering
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const fetchSOSSignals = async () => {
      // Try to fetch with distance if user location is available
      if (userLocation) {
        const { data, error } = await supabase
          .rpc('get_sos_with_distance', { 
            user_lng: userLocation.lng, 
            user_lat: userLocation.lat 
          });

        if (error) {
          console.error('Error fetching SOS signals with distance:', error);
          // Don't return, fallback to regular fetch
        } else if (data) {
          setSOSSignals(data as SOSSignal[]);
          
          // Convert to GeoJSON format for clustering
          const geojson = {
            type: 'FeatureCollection',
            features: data.map((signal: SOSSignal) => ({
              type: 'Feature',
              properties: {
                id: signal.id,
                severity_level: signal.severity_level,
                type: signal.type,
                description: signal.description,
                victim_count: signal.victim_count,
                status: signal.status,
                created_at: signal.created_at,
                user_id: signal.user_id,
                accuracy_meters: signal.accuracy_meters,
                distance_meters: signal.distance_meters,
              },
              geometry: {
                type: 'Point',
                coordinates: [signal.lng, signal.lat]
              }
            })).filter((f: any) => f.geometry.coordinates[0] && f.geometry.coordinates[1])
          };

          updateClusterLayers(geojson);
          return; // Success with distance, don't need fallback
        }
      }
      
      // Fallback: fetch without distance (always runs if no user location or if distance fetch failed)
      const { data, error } = await supabase
        .from('sos_signals')
        .select(`
          id,
          type,
          severity_level,
          status,
          description,
          victim_count,
          created_at,
          user_id,
          accuracy_meters,
          location
        `)
        .in('status', ['active', 'acknowledged'])
        .order('severity_level', { ascending: false });

      if (error) {
        console.error('Error fetching SOS signals:', error);
        toast.error(t('map.errorLoadingSignals'));
        return;
      }

      if (data) {
        console.log('Fetched SOS signals (fallback):', data.length, 'signals');
        setSOSSignals(data);

        // Process coordinates and create GeoJSON
        const promises = data.map(async (signal) => {
          const { data: coordData, error: coordError } = await supabase
            .rpc('get_sos_coordinates', { sos_id: signal.id });
          
          if (coordError || !coordData || coordData.length === 0) {
            console.error('Error getting coordinates for signal', signal.id, coordError);
            return null;
          }
          
          const coords = coordData[0];
          return {
            type: 'Feature',
            properties: {
              id: signal.id,
              severity_level: signal.severity_level,
              type: signal.type,
              description: signal.description,
              victim_count: signal.victim_count,
              status: signal.status,
              created_at: signal.created_at,
              user_id: signal.user_id,
              accuracy_meters: signal.accuracy_meters,
            },
            geometry: {
              type: 'Point',
              coordinates: [coords.lng, coords.lat]
            }
          };
        });

        const features = (await Promise.all(promises)).filter(f => f !== null);
        const geojson = {
          type: 'FeatureCollection',
          features
        };

        updateClusterLayers(geojson);
      }
    };

    const updateClusterLayers = (geojson: any) => {
      if (!map.current) {
        console.log('No map reference');
        return;
      }

      console.log('Updating cluster layers with', geojson.features.length, 'features');

      // Update source data if exists, otherwise create it
      const source = map.current.getSource('sos-signals') as maplibregl.GeoJSONSource;
      if (source) {
        console.log('Updating existing source data');
        source.setData(geojson);
      } else {
        console.log('Creating new source and layers');
        // First time setup: Add source and layers
        map.current.addSource('sos-signals', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Add cluster circles layer
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'sos-signals',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#FF6347',
              100,
              '#FF4500',
              750,
              '#DC143C'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        // Add cluster count labels
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'sos-signals',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add unclustered points layer - BRIGHT CIRCLES
        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'sos-signals',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'severity_level'],
              1, '#FFA500',
              2, '#FF6347',
              3, '#FF4500',
              4, '#DC143C',
              5, '#FF0000',
              '#FF0000'
            ],
            'circle-radius': 12,
            'circle-stroke-width': 4,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.9
          }
        });

        console.log('Layers created successfully');

        // Click event on clusters to zoom in (only add once)
        map.current.on('click', 'clusters', async (e) => {
          if (!map.current) return;
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          if (!features.length) return;
          const clusterId = features[0].properties.cluster_id;
          
          try {
            const zoom = await (map.current.getSource('sos-signals') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId);
            if (!map.current) return;
            
            map.current.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          } catch (err) {
            console.error('Error expanding cluster:', err);
          }
        });

        // Click event on unclustered points (only add once)
        map.current.on('click', 'unclustered-point', (e) => {
          console.log('Clicked on unclustered point');
          if (!map.current || !e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const coordinates = (feature.geometry as any).coordinates.slice();
          const properties = feature.properties;

          // Reconstruct signal from properties
          const signal: SOSSignal = {
            id: properties.id,
            severity_level: properties.severity_level,
            type: properties.type,
            description: properties.description,
            victim_count: properties.victim_count,
            status: properties.status,
            created_at: properties.created_at,
            user_id: properties.user_id,
            accuracy_meters: properties.accuracy_meters || null,
            lng: coordinates[0],
            lat: coordinates[1],
            distance_meters: properties.distance_meters,
          };

          setSelectedSOS(signal);
          setShowActionDialog(true);
          
          // Center map on clicked SOS
          if (map.current) {
            map.current.flyTo({
              center: coordinates,
              zoom: 15,
              duration: 800
            });
          }
        });

        // Change cursor on hover (only add once)
        map.current.on('mouseenter', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
        map.current.on('mouseenter', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      }
    };

    fetchSOSSignals();

    const channel = supabase
      .channel('sos_signals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_signals',
        },
        () => {
          fetchSOSSignals();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      if (map.current) {
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        if (map.current.getSource('sos-signals')) map.current.removeSource('sos-signals');
      }
    };
  }, [mapLoaded, t]); // Removed userLocation dependency

  // Re-fetch SOS signals when user location becomes available to show distances
  useEffect(() => {
    if (userLocation && mapLoaded && map.current) {
      // Re-fetch to get distance data
      const fetchWithDistance = async () => {
        const { data, error } = await supabase
          .rpc('get_sos_with_distance', { 
            user_lng: userLocation.lng, 
            user_lat: userLocation.lat 
          });

        if (!error && data) {
          setSOSSignals(data as SOSSignal[]);
        }
      };
      
      fetchWithDistance();
    }
  }, [userLocation, mapLoaded]);

  // SOS points are now rendered using MapLibre layers (clustering system)
  // No HTML markers needed - the circle layers handle both visualization and interaction

  // Fetch shelters
  useEffect(() => {
    const fetchShelters = async () => {
      const { data, error } = await supabase
        .from('shelters')
        .select('*');

      if (error) {
        console.error('Error fetching shelters:', error);
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
          console.error('Invalid location format for shelter', shelter.id);
          return;
        }
      } else {
        console.error('No location data for shelter', shelter.id);
        return;
      }

      if (isNaN(lng) || isNaN(lat)) {
        console.error('Invalid coordinates for shelter', shelter.id);
        return;
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
      console.error(error);
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
    // Just show the details, don't open chat
    setShowChat(false);
  };

  const handleOpenChat = () => {
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
    <div className="relative h-screen w-full flex flex-col md:flex-row">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div 
          ref={mapContainer} 
          className="absolute inset-0" 
          style={{ 
            bottom: isMobile ? '60px' : '0',
            top: isMobile ? '75px' : '0'
          }} 
        />
        
        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer map={map.current} sosSignals={sosSignals} />}
        
        {/* Rescuer Tracker */}
        <RescuerTracker map={map.current} rescuers={rescuers} />
        
        {/* Desktop Controls - Top Left */}
        {!isMobile && (
          <div className="absolute top-4 left-4 z-10 space-y-2">
            <Card className="p-4 bg-background/90 backdrop-blur">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{t('map.title')}</h1>
                  <p className="text-sm text-muted-foreground">
                    SOS: {sosSignals.length} | {t('map.rescuers_count')}: {rescuers.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-2 bg-background/90 backdrop-blur space-y-2">
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
            </Card>
          </div>
        )}

        {/* Mobile Header - Fixed at top */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center justify-between p-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <h1 className="text-sm font-bold">{t('map.title')}</h1>
                <p className="text-xs text-muted-foreground">
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
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating SOS List Button */}
        {isMobile && !showSOSList && !showChat && sosSignals.length > 0 && (
          <Button
            className="absolute bottom-24 right-4 z-10 shadow-lg h-12 px-4"
            variant="default"
            onClick={() => setShowSOSList(true)}
          >
            {t('map.activeAlerts')} ({sosSignals.length})
          </Button>
        )}

        {/* Mobile Legend */}
        {isMobile && !showChat && !showSOSList && (
          <div className="absolute bottom-24 left-4 z-10">
            <MapLegend />
          </div>
        )}

        {/* Mobile Recenter Button */}
        {isMobile && userLocation && (
          <Button
            className="absolute top-20 right-4 z-10 h-10 w-10"
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
            <Card className="p-4 bg-background/95 backdrop-blur space-y-3">
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
        <div className="w-80 border-l bg-background overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
            <h2 className="font-bold text-lg">SOS Activos ({sosSignals.length})</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSOSList(false)}>
              <X className="h-4 w-4" />
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
        <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-3xl shadow-2xl" style={{ maxHeight: '70vh', paddingBottom: '80px' }}>
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10 rounded-t-3xl">
            <h2 className="font-bold text-lg">SOS Activos ({sosSignals.length})</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSOSList(false)}>
              <X className="h-4 w-4" />
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
