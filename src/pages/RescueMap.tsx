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
  location: unknown;
  severity_level: number;
  type: string;
  description: string | null;
  victim_count: number | null;
  status: string | null;
  created_at: string | null;
  user_id: string;
  accuracy_meters: number | null;
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

  const { rescuers, isSharing, startSharing, stopSharing } = useRescuerTracking();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          toast.error('Error al cargar el mapa', {
            description: 'No se pudo obtener el token de Mapbox',
          });
          setIsLoadingToken(false);
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          toast.error('Error de configuración', {
            description: 'El token de Mapbox no está configurado',
          });
        }
      } catch (err) {
        console.error('Exception fetching Mapbox token:', err);
        toast.error('Error al cargar el mapa', {
          description: 'Error al conectar con el servidor',
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

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Fetch SOS signals
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    const fetchSOSSignals = async () => {
      const { data, error } = await supabase
        .from('sos_signals')
        .select('*')
        .in('status', ['active', 'acknowledged'])
        .order('severity_level', { ascending: false });

      if (error) {
        console.error('Error fetching SOS signals:', error);
        toast.error('Error al cargar señales SOS');
        return;
      }

      if (data) {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        setSOSSignals(data);

        data.forEach((signal) => {
          if (!map.current) return;
          
          const locationStr = String(signal.location || '');
          const coords = locationStr
            .replace('POINT(', '')
            .replace(')', '')
            .split(' ')
            .map(parseFloat);

          if (coords.length !== 2 || coords.some(isNaN)) {
            console.error('Invalid coordinates for signal:', signal.id);
            return;
          }

          const [lng, lat] = coords;

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
            .addTo(map.current);

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
  }, [mapboxToken]);

  const getSeverityColor = (level: number): string => {
    const colors = ['#FFA500', '#FF6347', '#FF4500', '#DC143C', '#8B0000'];
    return colors[level - 1] || '#FF0000';
  };

  const assignToMe = async (sosId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para asignar rescates');
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
      toast.error('Error al asignar rescate');
      console.error(error);
    } else {
      toast.success('Rescate asignado correctamente');
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
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer map={map.current} sosSignals={sosSignals} />}
        
        {/* Rescuer Tracker */}
        <RescuerTracker map={map.current} rescuers={rescuers} />
        
        {isLoadingToken && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
            <Card className="p-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-medium">Cargando mapa...</span>
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
                <h1 className="text-xl font-bold">{t('map_title')}</h1>
                <p className="text-sm text-muted-foreground">
                  SOS: {sosSignals.length} | Rescatistas: {rescuers.length}
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
              Mapa de Calor
            </Button>
            <Button
              variant={isSharing ? 'destructive' : 'default'}
              size="sm"
              className="w-full"
              onClick={isSharing ? stopSharing : startSharing}
            >
              <Radio className="mr-2 h-4 w-4" />
              {isSharing ? 'Detener Tracking' : 'Compartir Ubicación'}
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
                    <h3 className="font-bold text-lg">{t(selectedSOS.type)}</h3>
                    <p className="text-sm text-muted-foreground">
                      Severidad: {selectedSOS.severity_level}/5 • {selectedSOS.victim_count || 1} personas
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedSOS.description && (
                <p className="text-sm">{selectedSOS.description}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={() => assignToMe(selectedSOS.id)} className="flex-1" variant="default">
                  {t('map_assign')}
                </Button>
                <Button onClick={() => navigateToLocation(selectedSOS.location)} variant="secondary" className="flex-1">
                  <Navigation className="mr-2 h-4 w-4" />
                  {t('map_navigate')}
                </Button>
                <Button onClick={() => setShowChat(true)} variant="outline" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

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
