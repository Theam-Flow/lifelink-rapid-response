import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, AlertCircle, MapPin, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
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
      icon: Building2,
      label: t('bottomNav.shelters'),
      path: '/shelters',
    },
    {
      icon: User,
      label: t('bottomNav.profile'),
      path: '/profile',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground',
                item.isEmergency && 'relative'
              )}
            >
              {item.isEmergency ? (
                <div className="relative flex flex-col items-center">
                  <div className="absolute -top-8 w-16 h-16 bg-destructive rounded-full flex items-center justify-center shadow-xl animate-pulse-sos">
                    <Icon className="w-8 h-8 text-destructive-foreground" />
                  </div>
                  <span className="text-[10px] font-medium mt-10">{item.label}</span>
                </div>
              ) : (
                <>
                  <Icon className={cn('w-6 h-6 mb-1', isActive && 'animate-scale-in')} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
