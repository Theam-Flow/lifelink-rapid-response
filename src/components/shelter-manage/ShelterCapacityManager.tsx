import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Minus, Users, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface ShelterCapacityManagerProps {
  shelter: any;
  onUpdate: () => void;
}

const ShelterCapacityManager = ({ shelter, onUpdate }: ShelterCapacityManagerProps) => {
  const { t } = useTranslation();
  const [currentCapacity, setCurrentCapacity] = useState(shelter.capacity_current || 0);
  const [maxCapacity, setMaxCapacity] = useState(shelter.capacity_max || 100);
  const [checkInCount, setCheckInCount] = useState(1);
  const [checkOutCount, setCheckOutCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const capacityPercentage = maxCapacity ? (currentCapacity / maxCapacity) * 100 : 0;

  const handleCheckIn = async () => {
    if (currentCapacity + checkInCount > maxCapacity) {
      toast.error(t('shelters.notEnoughCapacity'));
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
        description: t('shelters.checkInSuccess', { count: checkInCount }),
        metadata: { count: checkInCount, new_capacity: newCapacity },
      });

      setCurrentCapacity(newCapacity);
      toast.success(t('shelters.checkInSuccess', { count: checkInCount }));
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t('shelters.errorCheckIn'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (currentCapacity - checkOutCount < 0) {
      toast.error(t('shelters.cannotRemoveMore'));
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
        description: t('shelters.checkOutSuccess', { count: checkOutCount }),
        metadata: { count: checkOutCount, new_capacity: newCapacity },
      });

      setCurrentCapacity(newCapacity);
      toast.success(t('shelters.checkOutSuccess', { count: checkOutCount }));
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t('shelters.errorCheckOut'));
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
        description: `${t('shelters.maxCapacityUpdated')} ${maxCapacity}`,
        metadata: { old_max: shelter.capacity_max, new_max: maxCapacity },
      });

      toast.success(t('shelters.maxCapacityUpdated'));
      onUpdate();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t('shelters.errorUpdateMaxCapacity'));
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
          <CardTitle>{t('shelters.currentOccupancyStatus')}</CardTitle>
          <CardDescription>
            {t('shelters.manageRealtime')}
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
            {maxCapacity - currentCapacity} {t('shelters.spacesAvailable')}
          </p>
        </CardContent>
      </Card>

      {/* Check In/Out Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              {t('shelters.checkIn')}
            </CardTitle>
            <CardDescription>{t('shelters.registerEntry')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('shelters.numberOfPeople')}</Label>
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
              {t('shelters.performCheckIn')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Minus className="h-5 w-5 text-orange-500" />
              {t('shelters.checkOut')}
            </CardTitle>
            <CardDescription>{t('shelters.registerExit')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('shelters.numberOfPeople')}</Label>
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
              {t('shelters.performCheckOut')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Max Capacity Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('shelters.capacitySettings')}</CardTitle>
          <CardDescription>
            {t('shelters.adjustMaxCapacity')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('shelters.maxCapacity')}</Label>
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
            {t('shelters.saveMaxCapacity')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShelterCapacityManager;
