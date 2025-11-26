import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const useOfflineSync = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          setSwRegistration(registration);
        })
        .catch((error) => {
          // Silently handle SW registration errors
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          toast.success(t('offline.syncComplete'), {
            description: t('offline.connectionRestored'),
          });
        }
      });
    }

    // Online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(t('offline.connectionRestored'), {
        description: t('offline.syncingData'),
      });
      
      // Trigger sync if service worker supports it
      if (swRegistration && 'sync' in swRegistration) {
        (swRegistration.sync as any).register('sync-sos');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(t('offline.noConnection'), {
        description: t('offline.offlineMode'),
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [swRegistration]);

  return {
    isOnline,
    swRegistration,
  };
};
