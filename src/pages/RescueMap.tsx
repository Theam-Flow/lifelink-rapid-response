import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Navigation, AlertCircle } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
  const [sosSignals, setSOSSignals] = useState<SOSSignal[]>([]);
  const [selectedSOS, setSelectedSOS] = useState<SOSSignal | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      toast.error('Error de configuración', {
        description: 'El token de Mapbox no está configurado correctamente',
      });
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [100.5018, 13.7563], // Bangkok default
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Fetch SOS signals
  useEffect(() => {
    const fetchSOSSignals = async () => {
      const { data, error } = await supabase
        .from('sos_signals')
        .select('*')
        .eq('status', 'active')
        .order('severity_level', { ascending: false });

      if (error) {
        toast.error('Error loading SOS signals', { description: error.message });
        return;
      }

      setSOSSignals((data as any[]) || []);

      // Add markers to map
      if (map.current && data) {
        data.forEach((signal) => {
          // Parse PostGIS POINT format: "POINT(lng lat)"
          const locationStr = String(signal.location || '');
          const coords = locationStr
            .replace('POINT(', '')
            .replace(')', '')
            .split(' ')
            .map(parseFloat);

          if (coords.length === 2) {
            const [lng, lat] = coords;
            
            const el = document.createElement('div');
            el.className = 'sos-marker';
            el.style.backgroundColor = getSeverityColor(signal.severity_level);
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid white';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';

            new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(map.current!);

            el.addEventListener('click', () => {
              setSelectedSOS(signal as any);
              map.current?.flyTo({ center: [lng, lat], zoom: 15 });
            });
          }
        });
      }
    };

    fetchSOSSignals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sos-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sos_signals',
      }, () => {
        fetchSOSSignals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSeverityColor = (level: number): string => {
    const colors = ['#FFA500', '#FF6347', '#FF4500', '#DC143C', '#8B0000'];
    return colors[level - 1] || '#FF0000';
  };

  const assignToMe = async (sosId: string) => {
    const { error } = await supabase
      .from('sos_signals')
      .update({
        assigned_rescuer_id: user?.id,
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', sosId);

    if (error) {
      toast.error('Assignment failed', { description: error.message });
      return;
    }

    toast.success('Mission assigned', { description: 'Navigate to the location' });
    setSelectedSOS(null);
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
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-4 bg-background/90 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t('map_title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('map_active_sos')}: {sosSignals.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Selected SOS Details */}
      {selectedSOS && (
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
                    Severity: {selectedSOS.severity_level}/5 • {selectedSOS.victim_count || 1} people
                  </p>
                </div>
              </div>
            </div>
            
            {selectedSOS.description && (
              <p className="text-sm">{selectedSOS.description}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => assignToMe(selectedSOS.id)}
                className="flex-1"
                variant="default"
              >
                {t('map_assign')}
              </Button>
              <Button
                onClick={() => navigateToLocation(selectedSOS.location)}
                variant="secondary"
                className="flex-1"
              >
                <Navigation className="mr-2 h-4 w-4" />
                {t('map_navigate')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RescueMap;