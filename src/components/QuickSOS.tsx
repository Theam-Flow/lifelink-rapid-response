import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/geolocation';

export const QuickSOS = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  // Reset tap count after 2 seconds
  useEffect(() => {
    if (tapCount > 0) {
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 2000);
    }
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [tapCount]);

  // Countdown logic
  useEffect(() => {
    if (isHolding && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            sendQuickSOS();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isHolding, countdown]);

  const handleTap = () => {
    if (!user) {
      toast.error(t('sos.loginRequired'));
      navigate('/auth');
      return;
    }

    // Vibrate on tap
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // PANIC MODE: 3 taps in less than 2 seconds
    if (newTapCount === 3) {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
      toast.success(t('quickSOS.panicModeActivated'), {
        description: t('quickSOS.sending'),
      });
      sendQuickSOS();
      setTapCount(0);
      return;
    }

    // Start hold countdown
    setIsHolding(true);
    setCountdown(5);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHolding(false);
    setCountdown(5);
    toast.info(t('quickSOS.cancelled'));
  };

  const sendQuickSOS = async () => {
    setIsHolding(false);
    setCountdown(5);
    setTapCount(0);

    try {
      // Get location
      const position = await getCurrentPosition();
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Send SOS with maximum severity
      const { error } = await supabase.from('sos_signals').insert({
        user_id: user!.id,
        type: 'flood_trap',
        severity_level: 5,
        victim_count: 1,
        description: 'Emergency SOS - Quick Send',
        location: `POINT(${position.longitude} ${position.latitude})`,
        accuracy_meters: position.accuracy,
        status: 'active',
      });

      if (error) throw error;

      toast.success(t('quickSOS.sentSuccess'), {
        description: t('sos.sent'),
        duration: 5000,
      });

      // Navigate to map after 2 seconds
      setTimeout(() => {
        navigate('/rescue-map');
      }, 2000);
    } catch (error) {
      console.error('Error sending quick SOS:', error);
      toast.error(t('sos.error'), {
        description: error instanceof Error ? error.message : t('quickSOS.noLocation'),
      });
    }
  };

  if (!user) return null;

  return (
    <div className="hidden md:block fixed bottom-8 right-8 z-50">
      <button
        onClick={handleTap}
        className="relative w-20 h-20 md:w-24 md:h-24 bg-destructive hover:bg-destructive/90 rounded-full shadow-2xl animate-pulse-sos transition-all duration-300 hover:scale-110 group"
        aria-label={t('quickSOS.title')}
      >
        <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-destructive-foreground mx-auto animate-pulse" />
        
        {isHolding && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-destructive-foreground animate-wave"></div>
            <span className="text-2xl font-bold text-destructive-foreground z-10">
              {countdown}
            </span>
            <button
              onClick={handleCancel}
              className="absolute -top-2 -right-2 w-8 h-8 bg-card text-card-foreground rounded-full shadow-lg hover:bg-accent transition-colors z-20 flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Tap indicator */}
        {tapCount > 0 && !isHolding && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-card text-card-foreground rounded-full shadow-lg flex items-center justify-center text-xs font-bold animate-scale-in">
            {tapCount}
          </div>
        )}
      </button>
      
      <p className="text-center text-xs mt-2 text-muted-foreground max-w-[120px]">
        {t('quickSOS.holdToSend')}
      </p>
    </div>
  );
};
