import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, MapPin, Phone, Users, CheckCircle } from 'lucide-react';

interface Shelter {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_phone: string | null;
  capacity_max: number | null;
  capacity_current: number | null;
  is_verified: boolean;
  photo_urls: string[] | null;
}

interface SheltersMapProps {
  shelters: Shelter[];
  onShelterSelect?: (shelter: Shelter) => void;
}

export const SheltersMap = ({ shelters, onShelterSelect }: SheltersMapProps) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error: any) {
        console.error('Error fetching Mapbox token:', error);
        toast.error(t('map.errorMapToken'));
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Default center (Thailand)
    const defaultCenter: [number, number] = [100.5018, 13.7563];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update shelter markers
  useEffect(() => {
    if (!map.current || shelters.length === 0) return;

    // Remove existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    shelters.forEach((shelter) => {
      // Try to get coordinates from shelter data
      const shelterData = shelter as any;
      let lat: number | null = null;
      let lng: number | null = null;

      // Check if we have coordinates
      if (shelterData.location) {
        // Parse PostGIS point format
        const match = shelterData.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }

      if (!lat || !lng) return; // Skip shelters without coordinates

      hasValidCoordinates = true;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'shelter-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';
      
      // Get shelter icon
      const icon = getShelterIcon(shelter.type);
      el.innerHTML = `
        <div class="flex items-center justify-center w-full h-full bg-primary/90 rounded-full shadow-lg border-2 border-background hover:scale-110 transition-transform">
          <span class="text-2xl">${icon}</span>
        </div>
      `;

      // Add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Add click handler
      el.addEventListener('click', () => {
        setSelectedShelter(shelter);
        if (onShelterSelect) onShelterSelect(shelter);
      });

      markers.current.push(marker);
      bounds.extend([lng, lat]);
    });

    // Fit bounds if we have valid coordinates
    if (hasValidCoordinates && markers.current.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15,
      });
    }
  }, [shelters, onShelterSelect]);

  const getShelterIcon = (type: string) => {
    switch (type) {
      case 'temple': return '🛕';
      case 'school': return '🏫';
      case 'hospital': return '🏥';
      case 'community_center': return '🏛️';
      case 'sports_complex': return '🏟️';
      default: return '🏠';
    }
  };

  const getCapacityPercentage = (current: number | null, max: number | null) => {
    if (!current || !max) return 0;
    return (current / max) * 100;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!mapboxToken) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {/* Selected Shelter Card */}
      {selectedShelter && (
        <Card className="absolute top-4 left-4 max-w-sm z-10 shadow-lg animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                <span className="text-3xl">{getShelterIcon(selectedShelter.type)}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{selectedShelter.name}</h3>
                    {selectedShelter.is_verified && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t(`shelters.type_${selectedShelter.type}`)}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedShelter(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Capacity */}
            {selectedShelter.capacity_max && (
              <div className="mb-3 p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span className="text-muted-foreground">{t('shelters.capacity')}:</span>
                  <span className={`font-semibold ${getCapacityColor(
                    getCapacityPercentage(selectedShelter.capacity_current, selectedShelter.capacity_max)
                  )}`}>
                    {selectedShelter.capacity_current || 0} / {selectedShelter.capacity_max}
                  </span>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              {selectedShelter.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{selectedShelter.address}</span>
                </div>
              )}
              {selectedShelter.contact_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${selectedShelter.contact_phone}`} className="hover:text-primary">
                    {selectedShelter.contact_phone}
                  </a>
                </div>
              )}
            </div>

            {/* Photos */}
            {selectedShelter.photo_urls && selectedShelter.photo_urls.length > 0 && (
              <div className="mt-3">
                <img
                  src={selectedShelter.photo_urls[0]}
                  alt={selectedShelter.name}
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};