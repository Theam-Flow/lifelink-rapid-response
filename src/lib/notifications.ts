import { supabase } from '@/integrations/supabase/client';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function showNotification(
  title: string,
  options?: any
) {
  if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      badge: '/icon-192.png',
      icon: '/icon-192.png',
      requireInteraction: true,
      ...options,
    });
  }
}

export function setupSOSNotifications(
  userLocation: { lng: number; lat: number } | null
) {
  if (!userLocation) return null;

  const channel = supabase
    .channel('new_sos_notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sos_signals',
      },
      async (payload) => {
        const newSOS = payload.new as any;

        // Calculate distance if user location available
        let distance: number | null = null;
        if (newSOS.location && userLocation) {
          try {
            const { data } = await supabase.rpc('get_sos_with_distance', {
              user_lng: userLocation.lng,
              user_lat: userLocation.lat,
            });

            const sosWithDistance = data?.find(
              (s: any) => s.id === newSOS.id
            );
            if (sosWithDistance) {
              distance = sosWithDistance.distance_meters;
            }
          } catch (error) {
            // Silently handle distance calculation errors
          }
        }

        // Only notify for nearby SOS (within 10km) or critical severity
        const shouldNotify =
          (distance !== null && distance < 10000) ||
          newSOS.severity_level >= 4;

        if (shouldNotify) {
          const distanceText =
            distance !== null
              ? distance < 1000
                ? `${Math.round(distance)}m`
                : `${(distance / 1000).toFixed(1)}km`
              : '';

          await showNotification('🚨 Nuevo SOS de Emergencia', {
            body: `Severidad ${newSOS.severity_level}/5${distanceText ? ` - ${distanceText} de tu ubicación` : ''}`,
            tag: `sos-${newSOS.id}`,
            data: { sosId: newSOS.id, url: '/rescue-map' },
            vibrate: [200, 100, 200],
            actions: [
              { action: 'view', title: 'Ver en mapa' },
              { action: 'dismiss', title: 'Cerrar' },
            ],
          });
        }
      }
    )
    .subscribe();

  return channel;
}
