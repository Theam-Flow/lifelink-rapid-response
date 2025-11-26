import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SOSSignal {
  id: string;
  user_id: string;
  type: string;
  severity_level: number;
  status: string;
  description: string | null;
  victim_count: number | null;
  lat: number;
  lng: number;
  distance_meters: number | null;
  created_at: string;
  accuracy_meters: number | null;
}

interface UseSOSPaginationOptions {
  userLocation: { lng: number; lat: number } | null;
  radiusKm?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const useSOSPagination = ({
  userLocation,
  radiusKm = 50,
  pageSize = 200,
  enabled = true
}: UseSOSPaginationOptions) => {
  return useQuery({
    queryKey: ['sos-signals', userLocation?.lng, userLocation?.lat, radiusKm],
    queryFn: async () => {
      if (!userLocation) {
        // Fallback: sin paginación si no hay ubicación
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
          .in('status', ['active', 'acknowledged', 'in_progress'])
          .order('severity_level', { ascending: false })
          .limit(pageSize);

        if (error) throw error;
        
        // Parse locations
        return (data || []).map((signal: any) => {
          if (signal.location) {
            const locationStr = String(signal.location);
            const coords = locationStr.replace('POINT(', '').replace(')', '').split(' ').map(parseFloat);
            if (coords.length === 2 && !coords.some(isNaN)) {
              return { ...signal, lng: coords[0], lat: coords[1] };
            }
          }
          return signal;
        }) as SOSSignal[];
      }

      // Usar función optimizada con paginación
      const { data, error } = await supabase.rpc('get_sos_nearby', {
        user_lng: userLocation.lng,
        user_lat: userLocation.lat,
        radius_km: radiusKm,
        page_size: pageSize,
        page_offset: 0
      });

      if (error) throw error;
      return (data || []) as SOSSignal[];
    },
    enabled: enabled,
    staleTime: 30_000, // 30 segundos
  });
};
