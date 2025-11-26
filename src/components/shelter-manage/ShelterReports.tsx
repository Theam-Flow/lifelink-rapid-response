import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface ShelterReportsProps {
  shelterId: string;
}

const ShelterReports = ({ shelterId }: ShelterReportsProps) => {
  const { t } = useTranslation();
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
      toast.error(t('shelters.errorGeneratingReport'));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const report = `
${t('shelters.reportsAndStatistics')} - ${reportData.shelter.name}
${t('shelters.reportPeriod')}: ${reportData.period} ${t('common.days')}
${new Date().toLocaleString()}

========================================
${t('shelters.statistics')}
========================================
${t('shelters.currentCapacity')}: ${reportData.shelter.capacity_current}/${reportData.shelter.capacity_max}
${t('shelters.activities')}: ${reportData.stats.totalActivities}
${t('shelters.checkIns')}: ${reportData.stats.checkIns}
${t('shelters.checkOuts')}: ${reportData.stats.checkOuts}
${t('shelters.updates')}: ${reportData.stats.supplyUpdates}
${t('shelters.alerts')}: ${reportData.stats.totalAlerts}
${t('shelters.critical')}: ${reportData.stats.criticalAlerts}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(t('shelters.reportExported'));
  };

  if (!reportData) {
    return <div>{t('shelters.loadingReport')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('shelters.reportsAndStatistics')}</CardTitle>
                <CardDescription>
                  {t('shelters.viewExportReports')}
                </CardDescription>
              </div>
              <Button onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                {t('shelters.exportReport')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shelters.reportPeriod')}</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">{t('shelters.last7Days')}</SelectItem>
                  <SelectItem value="30days">{t('shelters.last30Days')}</SelectItem>
                  <SelectItem value="90days">{t('shelters.last90Days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.checkIns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.checkIns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.checkOuts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.checkOuts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.updates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.supplyUpdates}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.activities')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.totalActivities}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.alerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.stats.totalAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('shelters.critical')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{reportData.stats.criticalAlerts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('shelters.periodSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            {t('shelters.duringLast')} <strong>{reportData.period} {t('common.days')}</strong>, {t('shelters.shelterRecorded')}{" "}
            <strong>{reportData.stats.totalActivities} {t('shelters.activities')}</strong> {t('shelters.inTotal')}.
          </p>
          <p>
            {t('shelters.performedCheckIns')} <strong>{reportData.stats.checkIns} {t('shelters.checkIns')}</strong> {t('common.and')}{" "}
            <strong>{reportData.stats.checkOuts} {t('shelters.checkOuts')}</strong>, {t('shelters.withCurrentOccupancy')}{" "}
            <strong>{reportData.shelter.capacity_current}/{reportData.shelter.capacity_max}</strong> {t('shelters.people')}.
          </p>
          {reportData.stats.criticalAlerts > 0 && (
            <p className="text-destructive">
              ⚠️ {t('shelters.criticalAlertsRegistered')} <strong>{reportData.stats.criticalAlerts} {t('shelters.criticalAlerts')}</strong> {t('shelters.requireImmediateAttention')}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShelterReports;
