import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, MapPin, Users, Camera, ArrowLeft } from 'lucide-react';
import { getCurrentPosition, GeolocationResult } from '@/lib/geolocation';

const SOS = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [formData, setFormData] = useState({
    type: 'flood_trap',
    severityLevel: 3,
    victimCount: 1,
    description: '',
  });

  useEffect(() => {
    // Get location immediately on mount
    getCurrentPosition()
      .then((pos) => {
        setLocation(pos);
        toast.success('Location acquired', {
          description: `Accuracy: ${Math.round(pos.accuracy)}m`,
        });
      })
      .catch((err) => {
        toast.error('Location error', {
          description: err.error || 'Could not get your location',
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) {
      toast.error('Location required', {
        description: 'We need your location to send help',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('sos_signals').insert([{
        user_id: user?.id as string,
        location: `POINT(${location.longitude} ${location.latitude})` as any,
        accuracy_meters: location.accuracy,
        severity_level: formData.severityLevel,
        type: formData.type as any,
        description: formData.description,
        victim_count: formData.victimCount,
        status: 'active' as any,
      }]);

      if (error) throw error;

      toast.success(t('sos_sent'), {
        description: 'Help is on the way',
        duration: 5000,
      });

      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast.error(t('error'), { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/30 to-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-destructive border-2">
          <CardHeader className="bg-destructive text-destructive-foreground">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="h-8 w-8" />
              {t('sos_emergency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Display */}
              <Card className="bg-accent/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-destructive mt-1" />
                    <div className="flex-1">
                      <Label className="text-sm font-semibold">{t('sos_location')}</Label>
                      {location ? (
                        <div className="text-sm space-y-1 mt-1">
                          <p className="font-mono">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                          <p className="text-muted-foreground">
                            {t('sos_accuracy')}: ±{Math.round(location.accuracy)}m
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('loading')}...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('sos_type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flood_trap">{t('flood_trap')}</SelectItem>
                    <SelectItem value="medical_emergency">{t('medical_emergency')}</SelectItem>
                    <SelectItem value="food_water">{t('food_water')}</SelectItem>
                    <SelectItem value="evacuation">{t('evacuation')}</SelectItem>
                    <SelectItem value="structural_collapse">{t('structural_collapse')}</SelectItem>
                    <SelectItem value="fire">{t('fire')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Level */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('sos_severity')} (1-5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={formData.severityLevel === level ? 'destructive' : 'outline'}
                      onClick={() => setFormData({ ...formData, severityLevel: level })}
                      className="h-14 text-xl font-bold"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Victim Count */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('sos_people')}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 10, 15, 20].slice(0, 8).map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={formData.victimCount === count ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, victimCount: count })}
                      className="h-12 text-lg"
                    >
                      {count}+
                    </Button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('sos_description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your situation..."
                  className="min-h-24 text-base"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-16 text-xl font-bold"
                variant="destructive"
                disabled={loading || !location}
              >
                {loading ? t('loading') : t('sos_send')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SOS;