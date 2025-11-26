import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, User } from "lucide-react";

interface ShelterActivityLogsProps {
  shelterId: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  metadata: any;
  created_at: string;
  user_id: string | null;
}

const ShelterActivityLogs = ({ shelterId }: ShelterActivityLogsProps) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription
    const channel = supabase
      .channel('activity-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shelter_activity_logs',
          filter: `shelter_id=eq.${shelterId}`
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shelterId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("shelter_activity_logs")
        .select("*")
        .eq("shelter_id", shelterId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'check_in': return 'default';
      case 'check_out': return 'secondary';
      case 'supply_update': return 'outline';
      case 'alert_created': return 'destructive';
      case 'capacity_update': return 'default';
      default: return 'secondary';
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'check_in': 'Check-In',
      'check_out': 'Check-Out',
      'supply_update': 'Suministro',
      'alert_created': 'Alerta',
      'capacity_update': 'Capacidad',
      'info_update': 'Información',
      'photo_added': 'Foto Agregada',
      'photo_removed': 'Foto Eliminada',
      'status_change': 'Estado',
    };
    return labels[actionType] || actionType;
  };

  if (loading) {
    return <div>Cargando registros...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Registro de Actividades
          </CardTitle>
          <CardDescription>
            Historial completo de todas las acciones realizadas en el shelter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividades registradas</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.created_at).toLocaleString('es', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action_type)}>
                          {getActionLabel(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="max-w-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['check_in', 'check_out', 'supply_update', 'alert_created'].map(type => {
          const count = logs.filter(l => l.action_type === type).length;
          return (
            <Card key={type}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{getActionLabel(type)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ShelterActivityLogs;
