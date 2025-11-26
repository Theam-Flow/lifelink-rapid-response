import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface Cluster {
  cluster_id: number;
  centroid_lng: number;
  centroid_lat: number;
  point_count: number;
  max_severity: number;
  representative_id: string;
  representative_type: string;
  representative_status: string;
}

interface UseBackendClusteringOptions {
  bounds: Bounds | null;
  zoom: number;
  enabled: boolean;
}

/**
 * Hook para clustering backend - maneja clustering en PostgreSQL
 * Para escalabilidad masiva con millones de puntos
 */
export const useBackendClustering = ({
  bounds,
  zoom,
  enabled
}: UseBackendClusteringOptions) => {
  return useQuery({
    queryKey: ['sos-clusters', bounds?.west, bounds?.south, bounds?.east, bounds?.north, Math.floor(zoom)],
    queryFn: async () => {
      if (!bounds) return [];

      // Llamar a edge function para clustering
      const { data, error } = await supabase.functions.invoke('get-clusters', {
        body: { bounds, zoom }
      });

      if (error) {
        throw error;
      }

      return (data?.clusters || []) as Cluster[];
    },
    enabled: enabled && !!bounds,
    staleTime: 45_000, // 45 segundos - clusters cambian menos frecuentemente
  });
};
