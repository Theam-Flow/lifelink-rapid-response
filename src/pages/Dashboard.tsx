import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      // Fetch active SOS
      const { count: sosCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'acknowledged']);

      // Fetch active rescuers
      const { count: rescuerCount } = await supabase
        .from('rescuer_activity')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
        .gte('last_ping', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      // Fetch rescued count
      const { count: rescuedCount } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued');

      // Fetch rescued last 24h
      const { count: rescued24h } = await supabase
        .from('sos_signals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued')
        .gte('rescued_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Fetch average response time
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
          return (res - ack) / (1000 * 60); // Minutes
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
        console.error('Error fetching incidents:', error);
        return;
      }

      if (data) {
        setRecentIncidents(data);
      }
    };

    fetchMetrics();
    fetchRecentIncidents();

    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const exportReport = async () => {
    toast.info('Generando reporte...', { description: 'Esta función estará disponible pronto' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-7xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Métricas</h1>
              <p className="text-muted-foreground">Análisis en tiempo real de operaciones de rescate</p>
            </div>
          </div>
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">SOS Activos</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.activeSOS}</div>
              <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rescatistas Activos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.activeRescuers}</div>
              <p className="text-xs text-muted-foreground mt-1">Compartiendo ubicación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Rescatados</CardTitle>
              <Heart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalRescued}</div>
              <p className="text-xs text-muted-foreground mt-1">Desde el inicio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.rescuedLast24h}</div>
              <p className="text-xs text-muted-foreground mt-1">Rescates completados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.avgResponseTime ? Math.round(metrics.avgResponseTime) : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minutos de respuesta</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Reportes Recientes de Incidentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay reportes de incidentes todavía
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
                        {incident.sos_signals?.type || 'Desconocido'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reportado por: {incident.profiles?.full_name || 'Desconocido'}
                      </p>
                      <p className="text-sm">
                        <span className={`font-semibold ${
                          incident.outcome === 'successful' ? 'text-green-500' :
                          incident.outcome === 'partial' ? 'text-yellow-500' :
                          incident.outcome === 'failed' ? 'text-red-500' :
                          'text-muted-foreground'
                        }`}>
                          {incident.outcome || 'En progreso'}
                        </span>
                        {incident.victims_rescued && ` • ${incident.victims_rescued} rescatados`}
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
