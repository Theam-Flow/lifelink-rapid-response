import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ShelterDashboard from "@/components/shelter-manage/ShelterDashboard";
import ShelterCapacityManager from "@/components/shelter-manage/ShelterCapacityManager";
import ShelterSuppliesManager from "@/components/shelter-manage/ShelterSuppliesManager";
import ShelterReports from "@/components/shelter-manage/ShelterReports";
import ShelterActivityLogs from "@/components/shelter-manage/ShelterActivityLogs";
import ShelterAlerts from "@/components/shelter-manage/ShelterAlerts";

interface Shelter {
  id: string;
  name: string;
  type: string;
  address: string | null;
  capacity_current: number | null;
  capacity_max: number | null;
  contact_phone: string | null;
  manager_id: string | null;
  is_verified: boolean | null;
  supplies_status: any;
  photo_urls: string[] | null;
  created_at: string;
}

const ShelterManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchShelter();
  }, [id, user, navigate]);

  const fetchShelter = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("shelters")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Verify user is the manager
      if (data.manager_id !== user?.id) {
        toast.error("No tienes permiso para administrar este shelter");
        navigate("/shelters");
        return;
      }

      setShelter(data);
    } catch (error: any) {
      console.error("Error fetching shelter:", error);
      toast.error("Error al cargar el shelter");
      navigate("/shelters");
    } finally {
      setLoading(false);
    }
  };

  const handleShelterUpdate = () => {
    fetchShelter();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shelter) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/shelters")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{shelter.name}</h1>
            <p className="text-sm text-muted-foreground">Panel de Administración</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="capacity">Capacidad</TabsTrigger>
            <TabsTrigger value="supplies">Suministros</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
            <TabsTrigger value="logs">Registros</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-6">
            <ShelterDashboard shelter={shelter} />
          </TabsContent>

          <TabsContent value="capacity" className="space-y-4 mt-6">
            <ShelterCapacityManager 
              shelter={shelter} 
              onUpdate={handleShelterUpdate}
            />
          </TabsContent>

          <TabsContent value="supplies" className="space-y-4 mt-6">
            <ShelterSuppliesManager 
              shelter={shelter} 
              onUpdate={handleShelterUpdate}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-6">
            <ShelterReports shelterId={shelter.id} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 mt-6">
            <ShelterActivityLogs shelterId={shelter.id} />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-6">
            <ShelterAlerts shelterId={shelter.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShelterManage;
