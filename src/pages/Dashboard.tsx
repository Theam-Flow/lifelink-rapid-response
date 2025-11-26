import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Users, Heart, Clock, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Metrics {
  activeSOS: number;
  activeRescuers: number;
  totalRescued: number;
  rescuedLast24h: number;
  avgResponseTime: number | null;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({
    activeSOS: 0,
    activeRescuers: 0,
    totalRescued: 0,
    rescuedLast24h: 0,
    avgResponseTime: null,
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchMetrics = async () => {
      const { count: sosCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'acknowledged']);

      const { count: rescuerCount } = await supabase
        .from('rescuer_activity')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
        .gte('last_ping', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      const { count: rescuedCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued');

      const { count: rescued24h } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued')
        .gte('rescued_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: responseData } = await supabase
        .from('sos_signals')
        .select('acknowledged_at, rescued_at')
        .not('acknowledged_at', 'is', null)
        .not('rescued_at', 'is', null)
        .limit(100);

      let avgTime = null;
      if (responseData && responseData.length > 0) {
        const times = responseData.map((r) => {
          const ack = new Date(r.acknowledged_at!).getTime();
          const res = new Date(r.rescued_at!).getTime();
          return (res - ack) / (1000 * 60);
        });
        avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      }

      setMetrics({
        activeSOS: sosCount || 0,
        activeRescuers: rescuerCount || 0,
        totalRescued: rescuedCount || 0,
        rescuedLast24h: rescued24h || 0,
        avgResponseTime: avgTime,
      });
    };

    const fetchRecentIncidents = async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`
          *,
          sos_signals (type, severity_level),
          profiles:reported_by (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        return;
      }

      if (data) {
        setRecentIncidents(data);
      }
    };

    fetchMetrics();
    fetchRecentIncidents();

    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const exportReport = async () => {
    toast.info(t('dashboard.generatingReport'), { 
      description: t('dashboard.featureComingSoon')
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-2 md:p-4 pb-28 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-6 py-2 md:py-8">
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{t('dashboard.title')}</CardTitle>
                  <CardDescription className="text-sm md:text-base">{t('dashboard.subtitle')}</CardDescription>
                </div>
              </div>
              <Button onClick={exportReport} variant="outline" className="w-full sm:w-auto sm:self-end">
                <Download className="mr-2 h-4 w-4" />
                {t('dashboard.exportReport')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
          <Card className="border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                  <div className="text-xl md:text-2xl font-bold text-destructive">{metrics.activeSOS}</div>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground leading-tight">{t('dashboard.activeSOS')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Users className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  <div className="text-xl md:text-2xl font-bold text-primary">{metrics.activeRescuers}</div>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground leading-tight">{t('dashboard.activeRescuers')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Heart className="h-3 w-3 md:h-4 md:w-4 text-secondary" />
                  <div className="text-xl md:text-2xl font-bold text-secondary">{metrics.totalRescued}</div>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground leading-tight">{t('dashboard.totalRescued')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <div className="text-xl md:text-2xl font-bold text-green-500">{metrics.rescuedLast24h}</div>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground leading-tight">{t('dashboard.last24h')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                  <div className="text-xl md:text-2xl font-bold text-blue-500">
                    {metrics.avgResponseTime ? Math.round(metrics.avgResponseTime) : '-'}
                  </div>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground leading-tight">{t('dashboard.avgTime')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentIncidents')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('dashboard.noIncidents')}
              </p>
            ) : (
              <div className="space-y-4">
                {recentIncidents.map((incident: any) => (
                  <div
                    key={incident.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {incident.sos_signals?.type ? t(`emergencyTypes.${incident.sos_signals.type}`) : t('dashboard.unknown')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('dashboard.reportedBy')}: {incident.profiles?.full_name || t('dashboard.unknown')}
                      </p>
                      <p className="text-sm">
                        <span className={`font-semibold ${
                          incident.outcome === 'successful' ? 'text-green-500' :
                          incident.outcome === 'partial' ? 'text-yellow-500' :
                          incident.outcome === 'failed' ? 'text-red-500' :
                          'text-muted-foreground'
                        }`}>
                          {incident.outcome ? t(`dashboard.${incident.outcome}`) : t('dashboard.inProgress')}
                        </span>
                        {incident.victims_rescued && ` • ${incident.victims_rescued} ${t('dashboard.rescued')}`}
                        {incident.response_time_minutes && ` • ${incident.response_time_minutes} min`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
