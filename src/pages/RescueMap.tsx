import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRescuerTracking } from '@/hooks/useRescuerTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Navigation, AlertCircle, Loader2, Radio, Layers, MessageSquare } from 'lucide-react';
import { HeatmapLayer } from '@/components/HeatmapLayer';
import { RescuerTracker } from '@/components/RescuerTracker';
import { Chat } from '@/components/Chat';

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

const RescueMap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [sosSignals, setSOSSignals] = useState<SOSSignal[]>([]);
  const [selectedSOS, setSelectedSOS] = useState<SOSSignal | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showSOSList, setShowSOSList] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

  const { rescuers, isSharing, startSharing, stopSharing } = useRescuerTracking();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          toast.error(t('map.errorLoadingMap'), {
            description: t('map.errorMapToken'),
          });
          setIsLoadingToken(false);
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          toast.error(t('map.configError'), {
            description: t('map.tokenNotConfigured'),
          });
        }
      } catch (err) {
        console.error('Exception fetching Mapbox token:', err);
        toast.error(t('map.errorLoadingMap'), {
          description: t('map.errorConnecting'),
        });
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [100.5018, 13.7563],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Get user's current location and center map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lng: longitude, lat: latitude });
          
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 2000
          });

          // Add a marker for user's location
          new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setHTML('<p>Tu ubicación</p>'))
            .addTo(map.current!);
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

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, t]);

  // Fetch SOS signals
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    const fetchSOSSignals = async () => {
      // If user location available, fetch with distance
      if (userLocation) {
        const { data, error } = await supabase
          .rpc('get_sos_with_distance', { 
            user_lng: userLocation.lng, 
            user_lat: userLocation.lat 
          });

        if (error) {
          console.error('Error fetching SOS signals with distance:', error);
          toast.error(t('map.errorLoadingSignals'));
          return;
        }

        if (data) {
          console.log('SOS Signals with distance fetched:', data);
          setSOSSignals(data as SOSSignal[]);
          
          // Clear existing markers
          markersRef.current.forEach(marker => marker.remove());
          markersRef.current = [];

          // Add markers for each SOS
          data.forEach((signal: SOSSignal) => {
            if (!map.current || !signal.lng || !signal.lat) return;

            const el = document.createElement('div');
            el.className = 'sos-marker';
            el.style.backgroundColor = getSeverityColor(signal.severity_level);
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid white';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            const marker = new mapboxgl.Marker(el)
              .setLngLat([signal.lng, signal.lat])
              .addTo(map.current!);

            marker.getElement().addEventListener('click', () => {
              setSelectedSOS(signal);
              setShowChat(true);
              map.current?.flyTo({
                center: [signal.lng!, signal.lat!],
                zoom: 14,
                duration: 1000
              });
            });

            markersRef.current.push(marker);
          });
        }
      } else {
        // Fallback to old method if no user location
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
          console.log('SOS Signals fetched:', data);
          
          markersRef.current.forEach(marker => marker.remove());
          markersRef.current = [];

          setSOSSignals(data);

          data.forEach((signal) => {
            if (!map.current) return;
            
            // Extract coordinates using PostGIS helper
            const extractCoords = async () => {
              const { data: coordData, error: coordError } = await supabase
                .rpc('get_sos_coordinates', { sos_id: signal.id });
              
              if (coordError || !coordData || coordData.length === 0) {
                console.error('Error getting coordinates for signal:', signal.id, coordError);
                return null;
              }
              
              return coordData[0];
            };

            extractCoords().then((coords) => {
              if (!coords || !map.current) return;
              
              const lng = coords.lng;
              const lat = coords.lat;

              console.log(`Creating marker for SOS ${signal.id} at [${lng}, ${lat}]`);

              const el = document.createElement('div');
              el.className = 'sos-marker';
              el.style.backgroundColor = getSeverityColor(signal.severity_level);
              el.style.width = '30px';
              el.style.height = '30px';
              el.style.borderRadius = '50%';
              el.style.border = '3px solid white';
              el.style.cursor = 'pointer';
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

              const marker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(map.current!);

              marker.getElement().addEventListener('click', () => {
                setSelectedSOS(signal);
                setShowChat(true);
                map.current?.flyTo({
                  center: [lng, lat],
                  zoom: 14,
                  duration: 1000
                });
              });

              markersRef.current.push(marker);
            });
          });
        }
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
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [mapboxToken, t, userLocation]);

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

  const navigateToLocation = (location: unknown) => {
    const locationStr = String(location || '');
    const coords = locationStr
      .replace('POINT(', '')
      .replace(')', '')
      .split(' ')
      .map(parseFloat);

    if (coords.length === 2) {
      const [lng, lat] = coords;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="relative h-screen w-full flex">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0 md:inset-0" style={{ bottom: window.innerWidth < 768 ? '80px' : '0' }} />
        
        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer map={map.current} sosSignals={sosSignals} />}
        
        {/* Rescuer Tracker */}
        <RescuerTracker map={map.current} rescuers={rescuers} />
        
        {isLoadingToken && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
            <Card className="p-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-medium">{t('map.loading')}</span>
            </Card>
          </div>
        )}
        
        {/* Controls */}
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
          </Card>
        </div>

        {/* SOS Details */}
        {selectedSOS && !showChat && (
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
                <Button onClick={() => navigateToLocation(selectedSOS.location)} variant="secondary" className="flex-1">
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

      {/* SOS List Panel */}
      {showSOSList && !showChat && sosSignals.length > 0 && (
        <div className="w-80 border-l bg-background overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
            <h2 className="font-bold text-lg">SOS Activos ({sosSignals.length})</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSOSList(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2 space-y-2">
            {sosSignals.map((signal, index) => (
              <Card 
                key={signal.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedSOS(signal);
                  if (signal.lng && signal.lat) {
                    map.current?.flyTo({
                      center: [signal.lng, signal.lat],
                      zoom: 14,
                      duration: 1000
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

      {/* Show SOS List Toggle (when hidden) */}
      {!showSOSList && !showChat && sosSignals.length > 0 && (
        <Button
          className="absolute right-4 top-4 z-10"
          variant="default"
          size="sm"
          onClick={() => setShowSOSList(true)}
        >
          Ver SOS ({sosSignals.length})
        </Button>
      )}

      {/* Chat Panel */}
      {showChat && selectedSOS && (
        <div className="w-96 border-l bg-background">
          <Chat sosId={selectedSOS.id} onClose={() => setShowChat(false)} />
        </div>
      )}
    </div>
  );
};

export default RescueMap;
