import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Users, MapPin, Heart, BarChart3, Package, Search, Home, User as UserIcon, Building2, Waves } from 'lucide-react';
import { Notifications } from '@/components/Notifications';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { QuickSOS } from '@/components/QuickSOS';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeable } from 'react-swipeable';
import { motion } from 'framer-motion';


const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading, signOut } = useAuth();
  const [stats, setStats] = useState({
    activeSOS: 0,
    activeRescuers: 0,
    peopleRescued: 0,
  });

  // Swipe navigation for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobile) navigate('/rescue-map');
    },
    onSwipedRight: () => {
      if (isMobile) navigate('/profile');
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch active SOS count
      const { count: sosCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'acknowledged']);

      // Fetch active rescuers count
      const { count: rescuerCount } = await supabase
        .from('rescuer_activity')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      // Fetch rescued count
      const { count: rescuedCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued');

      setStats({
        activeSOS: sosCount || 0,
        activeRescuers: rescuerCount || 0,
        peopleRescued: rescuedCount || 0,
      });
    };

    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('stats_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_signals' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescuer_activity' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) return null;

  // Mobile-first simplified view
  if (isMobile) {
    return (
      <div {...swipeHandlers} className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background pb-28 overflow-y-auto">
        {/* Simple Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-xl font-bold">LifeLink</h1>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <UserIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Giant SOS Button - Most Important */}
        <div className="flex items-center justify-center py-12 px-4">
          <motion.button
            onClick={() => navigate('/sos')}
            className="w-64 h-64 rounded-full bg-destructive text-destructive-foreground shadow-2xl animate-pulse-sos flex flex-col items-center justify-center gap-4"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <AlertCircle className="w-28 h-28 animate-pulse" />
            <span className="text-3xl font-bold uppercase">{t('sos.emergency')}</span>
          </motion.button>
        </div>

        {/* Compact Statistics */}
        <div className="grid grid-cols-3 gap-3 px-4 mb-6">
          <Card className="border-destructive/50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.activeSOS}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1">{t('index.activeSOS')}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.activeRescuers}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1">{t('index.activeRescuers')}</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-secondary">{stats.peopleRescued}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1">{t('index.peopleRescued')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="px-4 space-y-3">
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Card 
              className="border-2 border-primary hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/rescue-map')}
            >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">{t('index.rescuerHelp')}</h3>
                <p className="text-xs text-muted-foreground">{t('index.rescuerDesc')}</p>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/resources')}
              >
              <CardContent className="pt-4 pb-3 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{t('index.resources')}</p>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/shelters')}
              >
              <CardContent className="pt-4 pb-3 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{t('index.shelters')}</p>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/missing-persons')}
              >
              <CardContent className="pt-4 pb-3 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{t('index.missingPersons')}</p>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/dashboard')}
              >
              <CardContent className="pt-4 pb-3 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{t('index.metrics')}</p>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 pb-20 md:pb-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Quick SOS Floating Button */}
        <QuickSOS />
        
        {/* Header */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <div>
                  <CardTitle className="text-3xl">{t('index.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('index.subtitle')}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <LanguageSwitcher />
                <Notifications />
                <Button variant="outline" onClick={() => navigate('/profile')}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  {t('index.profile')}
                </Button>
                <Button variant="outline" onClick={signOut}>
                  {t('auth.signOut')}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/resources')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5 text-primary" />
                  {t('index.resources')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('index.resourcesDesc')}</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/dashboard')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t('index.metrics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('index.metricsDesc')}</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/missing-persons')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-5 w-5 text-primary" />
                  {t('index.missingPersons')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('index.missingPersonsDesc')}</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/shelters')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-5 w-5 text-primary" />
                  {t('index.shelters')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('index.sheltersDesc')}</p>
              </CardContent>
            </Card>
          </div>
          {/* SOS Button */}
          <Card 
            className="border-2 border-destructive hover:shadow-2xl hover:shadow-destructive/50 transition-all cursor-pointer group"
            onClick={() => navigate('/sos')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <AlertCircle className="h-8 w-8 text-destructive group-hover:animate-pulse" />
                {t('index.victimHelp')}
              </CardTitle>
              <CardDescription className="text-base">
                {t('index.victimDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                variant="destructive" 
                className="w-full h-16 text-xl font-bold"
              >
                {t('sos.emergency')}
              </Button>
            </CardContent>
          </Card>

          {/* Rescuer Map */}
          <Card 
            className="border-2 border-primary hover:shadow-2xl hover:shadow-primary/50 transition-all cursor-pointer group"
            onClick={() => navigate('/rescue-map')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <MapPin className="h-8 w-8 text-primary group-hover:animate-bounce" />
                {t('index.rescuerHelp')}
              </CardTitle>
              <CardDescription className="text-base">
                {t('index.rescuerDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full h-16 text-xl font-bold"
              >
                {t('map.title')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-3xl font-bold">{stats.activeSOS}</p>
              <p className="text-sm text-muted-foreground">{t('index.activeSOS')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.activeRescuers}</p>
              <p className="text-sm text-muted-foreground">{t('index.activeRescuers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Heart className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-3xl font-bold">{stats.peopleRescued}</p>
              <p className="text-sm text-muted-foreground">{t('index.peopleRescued')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Card className="bg-accent/50">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              <strong>{t('index.emergencyHotline')}:</strong> Thailand: 191 • Vietnam: 113 • Malaysia: 999 • Indonesia: 112
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
