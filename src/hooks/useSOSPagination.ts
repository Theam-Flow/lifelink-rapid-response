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
  radiusKm = 200, // Increased default radius to 200km
  pageSize = 200,
  enabled = true
}: UseSOSPaginationOptions) => {
  return useQuery({
    queryKey: ['sos-signals', userLocation?.lng, userLocation?.lat, radiusKm],
    queryFn: async () => {
      // Always use optimized function, even without user location
      // Use center of Thailand as fallback for distance calculation
      const lng = userLocation?.lng ?? 100.5018; // Bangkok center
      const lat = userLocation?.lat ?? 13.7563;

      const { data, error } = await supabase.rpc('get_sos_nearby', {
        user_lng: lng,
        user_lat: lat,
        radius_km: userLocation ? radiusKm : 1000, // Much wider radius if no location (1000km)
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
