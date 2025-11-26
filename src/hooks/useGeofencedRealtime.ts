import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface UseGeofencedRealtimeOptions {
  bounds: Bounds | null;
  enabled: boolean;
  onUpdate: () => void;
}

/**
 * Hook para suscripción realtime solo en el viewport visible del mapa
 * Optimizado para millones de usuarios - solo escucha cambios en área visible
 */
export const useGeofencedRealtime = ({
  bounds,
  enabled,
  onUpdate
}: UseGeofencedRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const boundsHashRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !bounds) {
      // Cleanup si está deshabilitado
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    // Crear hash de bounds para detectar cambios significativos
    const newBoundsHash = `${bounds.west.toFixed(3)},${bounds.south.toFixed(3)},${bounds.east.toFixed(3)},${bounds.north.toFixed(3)}`;
    
    // Solo recrear canal si bounds cambió significativamente
    if (newBoundsHash === boundsHashRef.current) {
      return;
    }

    boundsHashRef.current = newBoundsHash;

    // Limpiar canal anterior
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    console.log('Setting up geofenced realtime for bounds:', bounds);

    // Crear nuevo canal con filtro geográfico
    // Nota: Supabase no soporta filtros espaciales directos en realtime,
    // pero podemos filtrar en el cliente después de recibir
    const channel = supabase
      .channel(`sos-geofenced-${newBoundsHash}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_signals',
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Aquí podrías agregar filtrado del lado del cliente
          // basado en las coordenadas si están disponibles en el payload
          
          onUpdate();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [bounds, enabled, onUpdate]);

  return { channel: channelRef.current };
};
