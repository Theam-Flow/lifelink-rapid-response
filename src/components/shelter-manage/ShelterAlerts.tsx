import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface ShelterAlertsProps {
  shelterId: string;
}

const ShelterAlerts = ({ shelterId }: ShelterAlertsProps) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    fetchAlerts();

    // Set up realtime subscription
    const channel = supabase
      .channel('shelter-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shelter_alerts',
          filter: `shelter_id=eq.${shelterId}`
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shelterId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("shelter_alerts")
        .select("*")
        .eq("shelter_id", shelterId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("shelter_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success(t('shelters.alertResolved'));
      fetchAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error(t('shelters.errorResolvingAlert'));
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.is_resolved;
    if (filter === 'resolved') return alert.is_resolved;
    return true;
  });

  const activeCount = alerts.filter(a => !a.is_resolved).length;
  const criticalCount = alerts.filter(a => !a.is_resolved && a.severity === 'critical').length;

  if (loading) {
    return <div>{t('shelters.loadingAlerts')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-sm text-muted-foreground">{t('shelters.total')}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">{t('shelters.active')}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
                <p className="text-sm text-muted-foreground">{t('shelters.critical')}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-500">{alerts.filter(a => a.is_resolved).length}</p>
                <p className="text-sm text-muted-foreground">{t('shelters.resolved')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          {t('shelters.all')}
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          {t('shelters.active')}
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
        >
          {t('shelters.resolved')}
        </Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">
                {filter === 'active' && t('shelters.noActiveAlerts')}
                {filter === 'resolved' && t('shelters.noResolvedAlerts')}
                {filter === 'all' && t('shelters.noAlerts')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className={alert.severity === 'critical' ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.is_resolved && (
                          <Badge variant="outline" className="text-green-500">
                            {t('shelters.resolved')}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {new Date(alert.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                  {!alert.is_resolved && (
                    <Button
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('shelters.resolveAlert')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {alert.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  {alert.resolved_at && (
                    <p className="text-xs text-green-500 mt-2">
                      {t('shelters.resolvedOn')} {new Date(alert.resolved_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ShelterAlerts;
