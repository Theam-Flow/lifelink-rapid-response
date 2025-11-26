import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, AlertCircle, MapPin, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  isDarkMode?: boolean;
}

export const BottomNav = ({ isDarkMode = false }: BottomNavProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: t('bottomNav.home'),
      path: '/',
    },
    {
      icon: AlertCircle,
      label: t('bottomNav.sos'),
      path: '/sos',
      isEmergency: true,
    },
    {
      icon: MapPin,
      label: t('bottomNav.map'),
      path: '/rescue-map',
    },
    {
      icon: User,
      label: t('bottomNav.profile'),
      path: '/profile',
    },
  ];

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t-2 shadow-2xl z-50 safe-area-inset-bottom pointer-events-none ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-card/95 border-border'}`} aria-label="by @withkevinm">
      <div className="flex items-center justify-around h-20 px-1 pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center transition-all duration-200 min-h-[48px] min-w-[48px]',
                item.isEmergency ? 'flex-[1.5] px-4' : 'flex-1 px-2',
                isActive && !item.isEmergency ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.isEmergency ? (
                <div className="flex flex-col items-center gap-1 bg-destructive text-destructive-foreground rounded-2xl px-6 py-3 shadow-xl animate-pulse-sos w-full">
                  <Icon className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase">{item.label}</span>
                </div>
              ) : (
                <>
                  <Icon className={cn('w-7 h-7 mb-1', isActive && 'animate-scale-in')} />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
