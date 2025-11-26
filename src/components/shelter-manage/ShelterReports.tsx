import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShelterReportsProps {
  shelterId: string;
}

const ShelterReports = ({ shelterId }: ShelterReportsProps) => {
  const [period, setPeriod] = useState("7days");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [period, shelterId]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const daysAgo = period === "7days" ? 7 : period === "30days" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch activity logs
      const { data: logs } = await supabase
        .from("shelter_activity_logs")
        .select("*")
        .eq("shelter_id", shelterId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      // Fetch alerts
      const { data: alerts } = await supabase
        .from("shelter_alerts")
        .select("*")
        .eq("shelter_id", shelterId)
        .gte("created_at", startDate.toISOString());

      // Fetch shelter data
      const { data: shelter } = await supabase
        .from("shelters")
        .select("*")
        .eq("id", shelterId)
        .single();

      // Calculate statistics
      const checkIns = logs?.filter(l => l.action_type === 'check_in').length || 0;
      const checkOuts = logs?.filter(l => l.action_type === 'check_out').length || 0;
      const supplyUpdates = logs?.filter(l => l.action_type === 'supply_update').length || 0;
      const totalAlerts = alerts?.length || 0;
      const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;

      setReportData({
        period: daysAgo,
        shelter,
        stats: {
          checkIns,
          checkOuts,
          supplyUpdates,
          totalAlerts,
          criticalAlerts,
          totalActivities: logs?.length || 0,
        },
        logs: logs || [],
        alerts: alerts || [],
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const report = `
REPORTE DE SHELTER - ${reportData.shelter.name}
Período: Últimos ${reportData.period} días
Generado: ${new Date().toLocaleString('es')}

========================================
ESTADÍSTICAS GENERALES
========================================
Capacidad Actual: ${reportData.shelter.capacity_current}/${reportData.shelter.capacity_max}
Total de Actividades: ${reportData.stats.totalActivities}
Check-ins: ${reportData.stats.checkIns}
Check-outs: ${reportData.stats.checkOuts}
Actualizaciones de Suministros: ${reportData.stats.supplyUpdates}
Total de Alertas: ${reportData.stats.totalAlerts}
Alertas Críticas: ${reportData.stats.criticalAlerts}

========================================
ÚLTIMAS ACTIVIDADES
========================================
${reportData.logs.slice(0, 20).map((log: any) => 
  `${new Date(log.created_at).toLocaleString('es')} - ${log.action_type}: ${log.description}`
).join('\n')}

========================================
ALERTAS RECIENTES
========================================
${reportData.alerts.slice(0, 10).map((alert: any) => 
  `[${alert.severity.toUpperCase()}] ${alert.title} - ${new Date(alert.created_at).toLocaleString('es')}`
).join('\n')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-shelter-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Reporte exportado exitosamente");
  };

  if (!reportData) {
    return <div>Cargando reporte...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reportes y Estadísticas</CardTitle>
              <CardDescription>
                Visualiza y exporta reportes de actividad
              </CardDescription>
            </div>
            <Button onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Período del Reporte</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
                <SelectItem value="90days">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.checkIns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-outs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.checkOuts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actualizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.supplyUpdates}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actividades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.totalActivities}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.totalAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{reportData.stats.criticalAlerts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Período</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Durante los últimos <strong>{reportData.period} días</strong>, el shelter ha registrado{" "}
            <strong>{reportData.stats.totalActivities} actividades</strong> en total.
          </p>
          <p>
            Se realizaron <strong>{reportData.stats.checkIns} check-ins</strong> y{" "}
            <strong>{reportData.stats.checkOuts} check-outs</strong>, con una ocupación actual de{" "}
            <strong>{reportData.shelter.capacity_current}/{reportData.shelter.capacity_max}</strong> personas.
          </p>
          {reportData.stats.criticalAlerts > 0 && (
            <p className="text-destructive">
              ⚠️ Se registraron <strong>{reportData.stats.criticalAlerts} alertas críticas</strong> que requieren atención inmediata.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShelterReports;
