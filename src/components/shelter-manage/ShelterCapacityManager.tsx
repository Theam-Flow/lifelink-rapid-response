import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Minus, Users, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ShelterCapacityManagerProps {
  shelter: any;
  onUpdate: () => void;
}

const ShelterCapacityManager = ({ shelter, onUpdate }: ShelterCapacityManagerProps) => {
  const [currentCapacity, setCurrentCapacity] = useState(shelter.capacity_current || 0);
  const [maxCapacity, setMaxCapacity] = useState(shelter.capacity_max || 100);
  const [checkInCount, setCheckInCount] = useState(1);
  const [checkOutCount, setCheckOutCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const capacityPercentage = maxCapacity ? (currentCapacity / maxCapacity) * 100 : 0;

  const handleCheckIn = async () => {
    if (currentCapacity + checkInCount > maxCapacity) {
      toast.error("No hay suficiente capacidad disponible");
      return;
    }

    setLoading(true);
    try {
      const newCapacity = currentCapacity + checkInCount;
      
      const { error: updateError } = await supabase
        .from("shelters")
        .update({ capacity_current: newCapacity })
        .eq("id", shelter.id);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "check_in",
        description: `Check-in de ${checkInCount} persona(s)`,
        metadata: { count: checkInCount, new_capacity: newCapacity },
      });

      setCurrentCapacity(newCapacity);
      toast.success(`Check-in exitoso: +${checkInCount} persona(s)`);
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al realizar check-in");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (currentCapacity - checkOutCount < 0) {
      toast.error("No puedes sacar más personas de las que hay");
      return;
    }

    setLoading(true);
    try {
      const newCapacity = currentCapacity - checkOutCount;
      
      const { error: updateError } = await supabase
        .from("shelters")
        .update({ capacity_current: newCapacity })
        .eq("id", shelter.id);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "check_out",
        description: `Check-out de ${checkOutCount} persona(s)`,
        metadata: { count: checkOutCount, new_capacity: newCapacity },
      });

      setCurrentCapacity(newCapacity);
      toast.success(`Check-out exitoso: -${checkOutCount} persona(s)`);
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al realizar check-out");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaxCapacity = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shelters")
        .update({ capacity_max: maxCapacity })
        .eq("id", shelter.id);

      if (error) throw error;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "capacity_update",
        description: `Capacidad máxima actualizada a ${maxCapacity}`,
        metadata: { old_max: shelter.capacity_max, new_max: maxCapacity },
      });

      toast.success("Capacidad máxima actualizada");
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al actualizar capacidad máxima");
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (capacityPercentage >= 90) return "bg-destructive";
    if (capacityPercentage >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado Actual de Ocupación</CardTitle>
          <CardDescription>
            Gestiona la ocupación en tiempo real de tu shelter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {currentCapacity} / {maxCapacity}
              </span>
            </div>
            <span className="text-lg font-semibold">
              {capacityPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={capacityPercentage} className={getProgressColor()} />
          <p className="text-sm text-muted-foreground">
            {maxCapacity - currentCapacity} espacios disponibles
          </p>
        </CardContent>
      </Card>

      {/* Check In/Out Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Check-In
            </CardTitle>
            <CardDescription>Registrar entrada de personas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cantidad de personas</Label>
              <Input
                type="number"
                min="1"
                value={checkInCount}
                onChange={(e) => setCheckInCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleCheckIn}
              disabled={loading || currentCapacity >= maxCapacity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Realizar Check-In
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Minus className="h-5 w-5 text-orange-500" />
              Check-Out
            </CardTitle>
            <CardDescription>Registrar salida de personas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cantidad de personas</Label>
              <Input
                type="number"
                min="1"
                value={checkOutCount}
                onChange={(e) => setCheckOutCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button 
              className="w-full" 
              variant="secondary"
              onClick={handleCheckOut}
              disabled={loading || currentCapacity === 0}
            >
              <Minus className="h-4 w-4 mr-2" />
              Realizar Check-Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Max Capacity Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Capacidad</CardTitle>
          <CardDescription>
            Ajusta la capacidad máxima del shelter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Capacidad Máxima</Label>
            <Input
              type="number"
              min="1"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 100)}
            />
          </div>
          <Button 
            onClick={handleUpdateMaxCapacity}
            disabled={loading || maxCapacity === shelter.capacity_max}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Capacidad Máxima
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShelterCapacityManager;
