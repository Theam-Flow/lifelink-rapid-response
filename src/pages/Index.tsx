import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Users, MapPin, Heart, BarChart3, Package, Search, Home, User as UserIcon } from 'lucide-react';
import { Notifications } from '@/components/Notifications';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [stats, setStats] = useState({
    activeSOS: 0,
    activeRescuers: 0,
    peopleRescued: 0,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
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
