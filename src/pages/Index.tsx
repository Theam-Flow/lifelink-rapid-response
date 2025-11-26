import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Users, MapPin, Heart } from 'lucide-react';

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
        <p className="text-lg">{t('loading')}</p>
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
                  <CardTitle className="text-3xl">LifeLink Asia</CardTitle>
                  <CardDescription className="text-base">
                    Disaster Response & Coordination System
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={signOut}>
                {t('signout')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* SOS Button */}
          <Card 
            className="border-2 border-destructive hover:shadow-2xl hover:shadow-destructive/50 transition-all cursor-pointer group"
            onClick={() => navigate('/sos')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <AlertCircle className="h-8 w-8 text-destructive group-hover:animate-pulse" />
                {t('role_victim')}
              </CardTitle>
              <CardDescription className="text-base">
                Send an emergency signal if you need immediate help
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                variant="destructive" 
                className="w-full h-16 text-xl font-bold"
              >
                {t('sos_emergency')}
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
                {t('role_rescuer')}
              </CardTitle>
              <CardDescription className="text-base">
                View active SOS signals and coordinate rescue operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full h-16 text-xl font-bold"
              >
                {t('map_title')}
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
              <p className="text-sm text-muted-foreground">Active SOS</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.activeRescuers}</p>
              <p className="text-sm text-muted-foreground">Active Rescuers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Heart className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-3xl font-bold">{stats.peopleRescued}</p>
              <p className="text-sm text-muted-foreground">People Rescued</p>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Card className="bg-accent/50">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              <strong>Emergency Hotline:</strong> Thailand: 191 • Vietnam: 113 • Malaysia: 999 • Indonesia: 112
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
