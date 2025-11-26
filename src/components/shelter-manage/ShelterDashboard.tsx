import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

interface ShelterDashboardProps {
  shelter: any;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

const ShelterDashboard = ({ shelter }: ShelterDashboardProps) => {
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unresolvedAlerts: 0,
    recentActivity: 0,
    criticalSupplies: 0,
  });
  const [capacityHistory, setCapacityHistory] = useState<any[]>([]);
  const [suppliesData, setSuppliesData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('shelter-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shelter_activity_logs',
          filter: `shelter_id=eq.${shelter.id}`
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shelter.id]);

  const fetchDashboardData = async () => {
    // Fetch alerts
    const { data: alerts } = await supabase
      .from("shelter_alerts")
      .select("*")
      .eq("shelter_id", shelter.id);

    // Fetch recent activity
    const { data: activities } = await supabase
      .from("shelter_activity_logs")
      .select("*")
      .eq("shelter_id", shelter.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Calculate stats
    setStats({
      totalAlerts: alerts?.length || 0,
      unresolvedAlerts: alerts?.filter(a => !a.is_resolved).length || 0,
      recentActivity: activities?.length || 0,
      criticalSupplies: Object.entries(shelter.supplies_status || {}).filter(
        ([_, value]: [string, any]) => value.level === 'critical'
      ).length,
    });

    // Prepare capacity history data (mock for now)
    const history = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('es', { weekday: 'short' }),
        ocupacion: shelter.capacity_current || 0,
        capacidad: shelter.capacity_max || 100,
      };
    });
    setCapacityHistory(history);

    // Prepare supplies data
    const supplies = Object.entries(shelter.supplies_status || {}).map(([name, data]: [string, any]) => ({
      name,
      cantidad: data.quantity || 0,
      nivel: data.level || 'good',
    }));
    setSuppliesData(supplies);
  };

  const capacityPercentage = shelter.capacity_max 
    ? Math.round((shelter.capacity_current / shelter.capacity_max) * 100)
    : 0;

  const getCapacityColor = () => {
    if (capacityPercentage >= 90) return "text-destructive";
    if (capacityPercentage >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shelter.capacity_current || 0}/{shelter.capacity_max || 0}</div>
            <p className={`text-xs ${getCapacityColor()}`}>
              {capacityPercentage}% de capacidad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unresolvedAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAlerts} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suministros Críticos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalSupplies}</div>
            <p className="text-xs text-destructive">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              Eventos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ocupación (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={capacityHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ocupacion" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="capacidad" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Suministros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={suppliesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Visual Map */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Ocupación Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: shelter.capacity_max || 100 }, (_, i) => (
              <div
                key={i}
                className={`aspect-square rounded border-2 ${
                  i < (shelter.capacity_current || 0)
                    ? "bg-primary border-primary"
                    : "bg-muted border-muted-foreground/20"
                }`}
                title={i < (shelter.capacity_current || 0) ? "Ocupado" : "Disponible"}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary border-2 border-primary" />
              <span className="text-sm">Ocupado ({shelter.capacity_current || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border-2 border-muted-foreground/20" />
              <span className="text-sm">Disponible ({(shelter.capacity_max || 0) - (shelter.capacity_current || 0)})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Verificado</span>
              <Badge variant={shelter.is_verified ? "default" : "secondary"}>
                {shelter.is_verified ? "Sí" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tipo</span>
              <Badge variant="outline">{shelter.type}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contacto</span>
              <span className="text-sm text-muted-foreground">{shelter.contact_phone || "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShelterDashboard;
