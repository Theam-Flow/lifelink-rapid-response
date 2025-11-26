import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Supply {
  name: string;
  quantity: number;
  unit: string;
  level: 'good' | 'low' | 'critical';
  lastUpdated: string;
}

interface ShelterSuppliesManagerProps {
  shelter: any;
  onUpdate: () => void;
}

const ShelterSuppliesManager = ({ shelter, onUpdate }: ShelterSuppliesManagerProps) => {
  const [supplies, setSupplies] = useState<Record<string, Supply>>({});
  const [newSupply, setNewSupply] = useState<{ name: string; quantity: number; unit: string; level: 'good' | 'low' | 'critical' }>({ 
    name: "", 
    quantity: 0, 
    unit: "unidades", 
    level: "good" 
  });
  const [editingSupply, setEditingSupply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setSupplies(shelter.supplies_status || {});
  }, [shelter]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getLevelIcon = (level: string) => {
    if (level === 'critical' || level === 'low') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  const handleAddSupply = async () => {
    if (!newSupply.name || newSupply.quantity < 0) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const updatedSupplies = {
        ...supplies,
        [newSupply.name]: {
          ...newSupply,
          lastUpdated: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("shelters")
        .update({ supplies_status: updatedSupplies as any })
        .eq("id", shelter.id);

      if (error) throw error;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "supply_update",
        description: `Agregado suministro: ${newSupply.name}`,
        metadata: newSupply as any,
      });

      // Check if critical and create alert
      if (newSupply.level === 'critical') {
        await supabase.from("shelter_alerts").insert({
          shelter_id: shelter.id,
          alert_type: "critical_supply",
          severity: "critical",
          title: `Suministro crítico: ${newSupply.name}`,
          description: `El suministro ${newSupply.name} está en nivel crítico`,
        });
      }

      setSupplies(updatedSupplies);
      setNewSupply({ name: "", quantity: 0, unit: "unidades", level: "good" });
      setDialogOpen(false);
      toast.success("Suministro agregado exitosamente");
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al agregar suministro");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSupply = async (name: string, updates: Partial<Supply>) => {
    setLoading(true);
    try {
      const updatedSupplies = {
        ...supplies,
        [name]: {
          ...supplies[name],
          ...updates,
          lastUpdated: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("shelters")
        .update({ supplies_status: updatedSupplies as any })
        .eq("id", shelter.id);

      if (error) throw error;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "supply_update",
        description: `Actualizado suministro: ${name}`,
        metadata: updates as any,
      });

      // Check if now critical
      if (updates.level && updates.level === 'critical') {
        await supabase.from("shelter_alerts").insert({
          shelter_id: shelter.id,
          alert_type: "critical_supply",
          severity: "critical",
          title: `Suministro crítico: ${name}`,
          description: `El suministro ${name} ha bajado a nivel crítico`,
        });
      }

      setSupplies(updatedSupplies);
      setEditingSupply(null);
      toast.success("Suministro actualizado");
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al actualizar suministro");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupply = async (name: string) => {
    setLoading(true);
    try {
      const updatedSupplies = { ...supplies };
      delete updatedSupplies[name];

      const { error } = await supabase
        .from("shelters")
        .update({ supplies_status: updatedSupplies as any })
        .eq("id", shelter.id);

      if (error) throw error;

      // Log activity
      await supabase.from("shelter_activity_logs").insert({
        shelter_id: shelter.id,
        action_type: "supply_update",
        description: `Eliminado suministro: ${name}`,
      });

      setSupplies(updatedSupplies);
      toast.success("Suministro eliminado");
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al eliminar suministro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Supply Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Suministro
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Suministro</DialogTitle>
            <DialogDescription>
              Registra un nuevo suministro en el inventario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Suministro</Label>
              <Input
                value={newSupply.name}
                onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
                placeholder="Ej: Agua embotellada"
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                value={newSupply.quantity}
                onChange={(e) => setNewSupply({ ...newSupply, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={newSupply.unit}
                onChange={(e) => setNewSupply({ ...newSupply, unit: e.target.value })}
                placeholder="Ej: litros, cajas, unidades"
              />
            </div>
            <div className="space-y-2">
              <Label>Nivel de Stock</Label>
              <Select 
                value={newSupply.level} 
                onValueChange={(value: any) => setNewSupply({ ...newSupply, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Bueno</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSupply} disabled={loading} className="w-full">
              Agregar Suministro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(supplies).length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay suministros registrados</p>
              <p className="text-sm text-muted-foreground">Agrega tu primer suministro para comenzar</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(supplies).map(([name, supply]) => (
            <Card key={name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {name}
                      {getLevelIcon(supply.level)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {new Date(supply.lastUpdated).toLocaleDateString('es')}
                    </CardDescription>
                  </div>
                  <Badge variant={getLevelColor(supply.level)}>
                    {supply.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSupply === name ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      defaultValue={supply.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 0;
                        handleUpdateSupply(name, { quantity: newQuantity });
                      }}
                    />
                    <Select 
                      defaultValue={supply.level}
                      onValueChange={(value: any) => handleUpdateSupply(name, { level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Bueno</SelectItem>
                        <SelectItem value="low">Bajo</SelectItem>
                        <SelectItem value="critical">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold">{supply.quantity}</p>
                    <p className="text-sm text-muted-foreground">{supply.unit}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingSupply(editingSupply === name ? null : name)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSupply(name)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ShelterSuppliesManager;
