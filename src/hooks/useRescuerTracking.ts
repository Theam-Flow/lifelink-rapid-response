import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RescuerLocation {
  rescuer_id: string;
  location: unknown;
  status: string;
  last_ping: string;
  current_sos_id: string | null;
  profile?: {
    full_name: string;
    role: string;
  };
}

export const useRescuerTracking = () => {
  const { user } = useAuth();
  const [rescuers, setRescuers] = useState<RescuerLocation[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  let watchId: number | null = null;

  // Fetch rescuer locations
  useEffect(() => {
    const fetchRescuers = async () => {
      const { data, error } = await supabase
        .from('rescuer_activity')
        .select(`
          *,
          profiles:rescuer_id (full_name, role)
        `)
        .eq('status', 'available')
        .gte('last_ping', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) {
        return;
      }

      if (data) {
        setRescuers(data as any);
      }
    };

    fetchRescuers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('rescuer_locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescuer_activity',
        },
        () => {
          fetchRescuers();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Start sharing location
  const startSharing = () => {
    if (!user || !navigator.geolocation) return;

    setIsSharing(true);

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading, speed, altitude, altitudeAccuracy } = position.coords;

        await supabase.from('rescuer_activity').upsert({
          rescuer_id: user.id,
          location: `POINT(${longitude} ${latitude})`,
          status: 'available',
          last_ping: new Date().toISOString(),
          heading: heading || 0,
          speed_kmh: speed ? speed * 3.6 : 0, // Convert m/s to km/h
          altitude_meters: altitude,
          altitude_accuracy_meters: altitudeAccuracy,
        });
      },
      (error) => {
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  // Stop sharing location
  const stopSharing = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    if (user) {
      await supabase
        .from('rescuer_activity')
        .delete()
        .eq('rescuer_id', user.id);
    }

    setIsSharing(false);
  };

  return {
    rescuers,
    isSharing,
    startSharing,
    stopSharing,
  };
};
