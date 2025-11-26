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
  userLocation: { lng: number; lat: number }; // Ahora es requerido
  radiusKm?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const useSOSPagination = ({
  userLocation,
  radiusKm = 200,
  pageSize = 200,
  enabled = true
}: UseSOSPaginationOptions) => {
  return useQuery({
    queryKey: ['sos-signals', userLocation.lng, userLocation.lat, radiusKm],
    queryFn: async () => {
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
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};
